import { buildDeck, getCardDef } from '../data/cards'
import { cardPacksOnly } from '../data/packs'
import { getGeneral } from '../data/generals'
import type {
  CardInstance,
  EquipSlot,
  GameSnapshot,
  MatchConfig,
  PlayerState,
  PromptState,
  SeatSetup,
  Suit,
} from './types'
import {
  attackRangeOf,
  canReach,
  cardKind,
  checkVictory,
  enemiesOf,
  equipSlots,
  effectiveSuit,
  findCard,
  getDistance,
  handLimit,
  isBlackCard,
  isBlackFor,
  isRedCard,
  isRedFor,
  playerSkills,
  removeHand as removeHandCard,
  shuffle,
  withinDistanceOne,
} from './helpers'
import {
  armorKind,
  countDiscardable,
  drawJudgeCard,
  horseLabel,
  ignoresArmor,
  mayUseSha,
  oppositeGender,
  targetHorses,
  weaponKind,
} from './weapons'
import { SKILL_CATALOG } from './skillCatalog'
import { initAiMind, observePublicEvent } from '../ai/mind'
import {
  nextUid,
  nextFxSeq,
  resetUidSeq,
  setPlayFx,
  pushDamageFx,
  clearPlayFx,
  log,
  skillLabel,
  HUASHEN_POOL,
  pickHuashenSkill,
  turnSkipOf,
  draw,
  discardCard,
  takeHand,
  idlePrompt,
  type TurnSkip,
} from './core'
import { resolveChoice } from './choice'
import { askShan, findRecentShaDef, responseCards, handleResponse, passResponse, finishShaHit, applyShaDamage, continueShaQueue, onShaDodged, pindian } from './sha'
import { dealDamage, debugDealDamage, trySave, getDying, clearDying, getPendingDying, clearPendingDying, saveCardsFor, startDyingIfPending, beginDying, continueDyingAsk, tryBuquThenDeath, finalizeDeath } from './damage'
import { activateSkill, handleSkillCardPick, confirmSkillCards, finishRende, finishZhangba } from './skills-runtime'
export { activateSkill, handleSkillCardPick, confirmSkillCards, finishRende, finishZhangba } from './skills-runtime'
export { dealDamage, debugDealDamage, trySave, getDying, clearDying, getPendingDying, clearPendingDying, saveCardsFor, startDyingIfPending, beginDying, continueDyingAsk, tryBuquThenDeath, finalizeDeath } from './damage'
export { askShan, findRecentShaDef, responseCards, handleResponse, passResponse, finishShaHit, applyShaDamage, continueShaQueue, onShaDodged, pindian } from './sha'
export { resolveChoice } from './choice'

// Re-export core primitives used by UI/AI
export { clearPlayFx, setPlayFx } from './core'


export function createMatch(config: MatchConfig): GameSnapshot {
  resetUidSeq()
  const defs = buildDeck(cardPacksOnly(config.packs), {
    requiredKinds: config.requiredCardKinds,
    excludeKinds: config.excludeCardKinds,
  })
  const deck: CardInstance[] = shuffle(defs.map((d) => ({ uid: nextUid(), defId: d.id })))

  const defer = !!config.deferGeneralPick
  const players: PlayerState[] = config.players.map((p, i) => {
    if (defer || !p.generalId) {
      return {
        id: i,
        name: p.name,
        isHuman: p.isHuman,
        generalId: '',
        identity: p.identity,
        side: p.side,
        hp: 0,
        maxHp: 0,
        hand: [],
        equips: {},
        judges: [],
        alive: true,
        shaUsedThisTurn: false,
      }
    }
    const g = getGeneral(p.generalId)
    return {
      id: i,
      name: p.name,
      isHuman: p.isHuman,
      generalId: p.generalId,
      identity: p.identity,
      side: p.side,
      hp: g.maxHp,
      maxHp: g.maxHp,
      hand: [],
      equips: {},
      judges: [],
      alive: true,
      shaUsedThisTurn: false,
    }
  })

  // Lord +1 HP in identity (only when generals already known)
  if (!defer && (config.mode === 'identity5' || config.mode === 'identity8')) {
    const lord = players.find((p) => p.identity === 'lord')
    if (lord) {
      lord.maxHp += 1
      lord.hp += 1
    }
  }

  const human = players.find((p) => p.isHuman) ?? players[0]
  const state: GameSnapshot = {
    config,
    players,
    deck,
    discard: [],
    currentPlayer:
      config.mode === 'identity5' || config.mode === 'identity8'
        ? (players.find((p) => p.identity === 'lord')?.id ?? 0)
        : 0,
    phase: 'prepare',
    matchPhase: defer ? 'pick_general' : 'playing',
    round: 1,
    prompt: idlePrompt(),
    log: [],
    killLog: [],
    winnerIds: null,
    resultMessage: null,
    fx: { play: null, damages: [] },
  }
  initAiMind(state)

  if (defer) {
    const offered = config.offeredGenerals ?? []
    state.prompt = {
      kind: 'choose_general',
      message: '請選擇你的武將',
      actorId: human.id,
      generalIds: offered,
    }
    log(state, '座位與身份已確定。請選擇武將。')
    return state
  }

  // Initial deal: 4 each
  for (const pl of players) {
    draw(state, pl.id, 4)
  }
  applyBoardSetup(state)
  log(state, '發牌完成，戰斗開始。')
  beginTurn(state)
  return state
}

export function cardMatchesKey(defId: string, key: string): boolean {
  const d = getCardDef(defId)
  return d.kind === key || d.name === key
}

export function pullCardByKey(state: GameSnapshot, key: string): CardInstance | null {
  const fromDeck = state.deck.findIndex((c) => cardMatchesKey(c.defId, key))
  if (fromDeck >= 0) return state.deck.splice(fromDeck, 1)[0] ?? null
  const fromDiscard = state.discard.findIndex((c) => cardMatchesKey(c.defId, key))
  if (fromDiscard >= 0) return state.discard.splice(fromDiscard, 1)[0] ?? null
  for (const pl of state.players) {
    const hi = pl.hand.findIndex((c) => cardMatchesKey(c.defId, key))
    if (hi >= 0) return pl.hand.splice(hi, 1)[0] ?? null
  }
  return null
}

export function applySeatSetup(state: GameSnapshot, p: PlayerState, setup: SeatSetup): void {
  if (setup.maxHp != null) {
    p.maxHp = Math.max(1, setup.maxHp)
    p.hp = p.maxHp
  }
  if (setup.hp != null) {
    p.hp = Math.max(0, Math.min(setup.hp, p.maxHp))
    if (p.hp <= 0) p.hp = 1
  }
  if (setup.equipKinds?.length) {
    for (const key of setup.equipKinds) {
      const card = pullCardByKey(state, key)
      if (!card) continue
      const slot = getCardDef(card.defId).slot
      if (!slot) {
        state.deck.push(card)
        continue
      }
      const old = p.equips[slot]
      if (old) state.discard.push(old)
      p.equips[slot] = card
    }
  }
  if (setup.handKinds?.length) {
    state.deck.push(...p.hand)
    p.hand = []
    for (const key of setup.handKinds) {
      const card = pullCardByKey(state, key)
      if (card) p.hand.push(card)
    }
  }
  if (setup.handCount != null) {
    while (p.hand.length > setup.handCount) {
      const extra = p.hand.pop()
      if (extra) state.deck.push(extra)
    }
    if (p.hand.length < setup.handCount) {
      draw(state, p.id, setup.handCount - p.hand.length)
    }
  }
}

export function applyBoardSetup(state: GameSnapshot): void {
  const setup = state.config.boardSetup
  if (!setup) return
  const notes: string[] = []
  for (const p of state.players) {
    const seat = p.isHuman
      ? setup.player
      : p.side === 'ally'
        ? setup.allies
        : p.side === 'enemy'
          ? setup.enemies
          : undefined
    if (!seat) continue
    applySeatSetup(state, p, seat)
  }
  if (setup.player?.equipKinds?.length) notes.push(`你開場裝備：${setup.player.equipKinds.join('、')}`)
  if (setup.player?.handKinds?.length) notes.push('你開場手牌已指定')
  if (setup.player?.hp != null || setup.player?.maxHp != null) {
    notes.push(`你開場體力 ${state.players[0]?.hp}/${state.players[0]?.maxHp}`)
  }
  if (notes.length) log(state, `本關特殊開局：${notes.join('；')}。`)
}

/**
 * Human picks a general.
 * Multiplayer: humans pick one-by-one (prompt.actorId). AI is assigned only after
 * every human has a general — otherwise the second human was left at 0 HP.
 */
export function confirmGeneralPick(
  state: GameSnapshot,
  generalId: string,
  seatId?: number,
): void {
  if (state.matchPhase !== 'pick_general' || state.prompt.kind !== 'choose_general') return
  const offered = state.prompt.generalIds ?? []
  if (offered.length && !offered.includes(generalId)) return

  const pickerId = seatId ?? state.prompt.actorId
  if (pickerId == null) return
  const picker = state.players[pickerId]
  if (!picker?.isHuman || picker.generalId) return
  // Sequential: only the current actor may pick
  if (state.prompt.actorId !== null && state.prompt.actorId !== pickerId) return

  applyGeneral(picker, generalId)
  log(state, `${picker.name} 選擇了武將【${getGeneral(generalId).name}】。`)

  const used = new Set(
    state.players.filter((p) => p.generalId).map((p) => p.generalId),
  )
  const nextHuman = state.players.find((p) => p.isHuman && !p.generalId)
  if (nextHuman) {
    const pool = listPickPool().filter((id) => !used.has(id))
    // Same rule as free-play: 3 random, or full list when few left
    const nextOffer = pool.length <= 3 ? pool : shuffle([...pool]).slice(0, 3)
    state.prompt = {
      kind: 'choose_general',
      message: `請 ${nextHuman.name} 選擇武將`,
      actorId: nextHuman.id,
      generalIds: nextOffer,
    }
    return
  }

  // All humans have picked — assign AI generals, deal, start
  const pool = shuffle(listPickPool().filter((id) => !used.has(id)))
  for (const p of state.players) {
    if (p.isHuman || p.generalId) continue
    const gid = pool.pop()
    if (!gid) break
    applyGeneral(p, gid)
    used.add(gid)
    log(state, `${p.name} 亮出武將【${getGeneral(gid).name}】。`)
  }

  if (state.config.mode === 'identity5' || state.config.mode === 'identity8') {
    const lord = state.players.find((p) => p.identity === 'lord')
    if (lord) {
      lord.maxHp += 1
      lord.hp = lord.maxHp
    }
    state.currentPlayer = lord?.id ?? 0
  }

  state.matchPhase = 'playing'
  state.prompt = idlePrompt()
  initAiMind(state)
  for (const pl of state.players) {
    draw(state, pl.id, 4)
  }
  log(state, '發牌完成，戰斗開始。')
  beginTurn(state)
}

export function applyGeneral(p: PlayerState, generalId: string): void {
  const g = getGeneral(generalId)
  p.generalId = generalId
  p.maxHp = g.maxHp
  p.hp = g.maxHp
}

export function listPickPool(): string[] {
  return [
    'caocao',
    'liubei',
    'sunquan',
    'guanyu',
    'zhangfei',
    'zhouyu',
    'ganning',
    'zhaoyun',
    'simayi',
    'zhenji',
    'diaochan',
    'huatuo',
    'machao',
    'lvmeng',
    'xiahoudun',
    'zhangliao',
    'huanggai',
    'luxun',
    'daqiao',
    'sunshangxiang',
    'guojia',
    'xuchu',
    'zhugeliang',
    'huangyueying',
    'lvbu',
  ]
}

export function beginTurn(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p.alive) {
    advanceTurn(state)
    return
  }
  p.shaUsedThisTurn = false
  p.shaPlayedThisTurn = false
  p.jiuUsedThisTurn = false
  p.jiuActive = false
  p.luoyiActive = false
  p.zhihengUsed = false
  p.qiangxiUsed = false
  p.qingnangUsed = false
  p.jieyinUsed = false
  p.lijianUsed = false
  p.fanjianUsed = false
  p.guhuoUsed = false
  p.shensuNoDist = false
  p.shuangxiongAs = undefined
  p.tiaoxinUsed = false
  p.dimengUsed = false
  p.qiaobianUsed = false
  p.fangquanUsed = false
  p.tianyiUsed = false
  p.tianyiWin = false
  p.tianyiLose = false
  p.quhuUsed = false
  p.ganluUsed = false
  p.rendeCount = 0
  if (p.pojunAside?.length) {
    p.hand.push(...p.pojunAside)
    log(state, `${p.name} 收回破軍移出的 ${p.pojunAside.length} 張牌。`)
    p.pojunAside = []
  }
  ;(state as GameSnapshot & { _turnSkip?: TurnSkip })._turnSkip = {
    skipDraw: false,
    skipPlay: !!p.skipNextPlay,
    skipJudge: false,
  }
  p.skipNextPlay = false

  const skills = playerSkills(p)

  if (skills.includes('huashen') && !(p.extraSkills?.length)) {
    p.extraSkills = [pickHuashenSkill()]
    log(state, `${p.name} 發動化身，獲得【${skillLabel(p.extraSkills[0])}】。`)
  }

  if (skills.includes('zaoxian') && !p.zaoxianAwakened && (p.tianCount ?? 0) >= 3) {
    p.zaoxianAwakened = true
    p.maxHp = Math.max(1, p.maxHp - 1)
    p.hp = Math.min(p.hp, p.maxHp)
    p.extraSkills = [...new Set([...(p.extraSkills ?? []), 'jixi'])]
    log(state, `${p.name} 覺醒【鑿險】，減1點體力上限並獲得【急襲】。`)
  }
  if (skills.includes('zhiji') && !p.zhijiAwakened && p.hand.length === 0) {
    p.zhijiAwakened = true
    p.maxHp = Math.max(1, p.maxHp - 1)
    p.hp = Math.min(p.hp, p.maxHp)
    p.extraSkills = [...new Set([...(p.extraSkills ?? []), 'guanxing'])]
    draw(state, p.id, 2)
    log(state, `${p.name} 覺醒【志繼】，摸兩張牌並獲得【觀星】。`)
  }
  if (skills.includes('hunzi') && !p.hunziAwakened && p.hp <= 1) {
    p.hunziAwakened = true
    p.maxHp = Math.max(1, p.maxHp - 1)
    p.hp = Math.min(p.hp, p.maxHp)
    p.extraSkills = [...new Set([...(p.extraSkills ?? []), 'yingzi', 'yinghun'])]
    log(state, `${p.name} 覺醒【魂姿】，獲得【英姿】與【英魂】。`)
  }

  runPrepareSkills(state)
}

export function xiansiCandidates(state: GameSnapshot, p: PlayerState): PlayerState[] {
  return [...state.players.slice(p.id + 1), ...state.players.slice(0, p.id)].filter(
    (x) =>
      x.alive &&
      x.id !== p.id &&
      (x.hand.length > 0 || equipSlots().some((slot) => !!x.equips[slot])),
  )
}

export function stealToNi(state: GameSnapshot, p: PlayerState, victim: PlayerState): void {
  let card: CardInstance | undefined
  if (victim.hand.length) {
    card = victim.hand.splice(Math.floor(Math.random() * victim.hand.length), 1)[0]
    if (card && playerSkills(victim).includes('lianying') && victim.hand.length === 0) {
      draw(state, victim.id, 1)
      log(state, `${victim.name} 發動連營，摸一張牌。`)
    }
  } else {
    const slots = equipSlots().filter((slot) => victim.equips[slot])
    const slot = slots[Math.floor(Math.random() * slots.length)]
    if (slot) {
      card = victim.equips[slot]
      delete victim.equips[slot]
      if (card && getCardDef(card.defId).kind === 'baiyin') {
        victim.hp = Math.min(victim.maxHp, victim.hp + 1)
        log(state, `${victim.name} 失去【白銀獅子】，回覆1點體力。`)
      }
      if (card && playerSkills(victim).includes('xiaoji')) {
        draw(state, victim.id, 2)
        log(state, `${victim.name} 發動梟姬，摸兩張牌。`)
      }
    }
  }
  if (card) {
    p.niCards = [...(p.niCards ?? []), card]
    log(state, `${p.name} 發動【陷嗣】，將 ${victim.name} 的一張牌置為「逆」。`)
  }
}

export function runPrepareSkills(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p?.alive) {
    advanceTurn(state)
    return
  }
  const turn = turnSkipOf(state)
  const skills = playerSkills(p)

  if (skills.includes('yinghun') && p.hp < p.maxHp && !turn.yinghunAsked) {
    turn.yinghunAsked = true
    const others = state.players.filter((x) => x.alive && x.id !== p.id)
    if (others.length) {
      state.prompt = {
        kind: 'choice',
        message: `【英魂】選擇一名角色（已損失 ${p.maxHp - p.hp} 體力）`,
        actorId: p.id,
        choiceKey: 'yinghun_target',
        choices: others.map((x) => ({ id: String(x.id), label: x.name })),
      }
      return
    }
  }

  if (skills.includes('xiansi') && !turn.xiansiAsked) {
    turn.xiansiAsked = true
    const victims = xiansiCandidates(state, p)
    if (victims.length) {
      state.prompt = {
        kind: 'choice',
        message: '【陷嗣】選擇第一名角色，將其一張牌置為「逆」（可跳過）',
        actorId: p.id,
        choiceKey: 'xiansi_prep',
        selectedTargetIds: [],
        choices: [
          ...victims.map((x) => ({ id: String(x.id), label: x.name })),
          { id: 'skip', label: '不發動' },
        ],
      }
      return
    }
  }

  // 觀星：準備階段觀看牌堆頂並調整
  if (skills.includes('guanxing')) {
    const n = Math.min(
      5,
      Math.max(1, state.players.filter((x) => x.alive).length),
    )
    const peeked: CardInstance[] = []
    for (let i = 0; i < n; i++) {
      if (state.deck.length === 0) {
        if (state.discard.length === 0) break
        state.deck = shuffle(state.discard)
        state.discard = []
      }
      const c = state.deck.pop()
      if (c) peeked.push(c)
    }
    if (peeked.length) {
      ;(state as GameSnapshot & { _guanxing?: CardInstance[] })._guanxing = peeked
      const names = peeked.map((c) => getCardDef(c.defId).name).join('、')
      state.prompt = {
        kind: 'choice',
        message: `【觀星】牌堆頂：${names}`,
        actorId: p.id,
        choiceKey: 'guanxing',
        choices: [
          { id: 'keep', label: '按此順序放回牌堆頂' },
          { id: 'reverse', label: '反轉後放回牌堆頂' },
          { id: 'bottom', label: '全部置於牌堆底' },
        ],
      }
      return
    }
  }

  continueBeginTurn(state)
}

export function finishGuanxing(state: GameSnapshot, mode: 'keep' | 'reverse' | 'bottom'): void {
  const peeked =
    (state as GameSnapshot & { _guanxing?: CardInstance[] })._guanxing ?? []
  delete (state as GameSnapshot & { _guanxing?: CardInstance[] })._guanxing
  const p = state.players[state.currentPlayer]
  let ordered = [...peeked]
  if (mode === 'reverse') ordered = ordered.reverse()
  if (mode === 'bottom') {
    state.deck = [...ordered, ...state.deck]
    log(state, `${p.name} 發動觀星，將 ${ordered.length} 張牌置於牌堆底。`)
  } else {
    for (let i = ordered.length - 1; i >= 0; i--) {
      state.deck.push(ordered[i])
    }
    log(
      state,
      `${p.name} 發動觀星，將 ${ordered.length} 張牌${mode === 'reverse' ? '反轉後' : ''}放回牌堆頂。`,
    )
  }
  continueBeginTurn(state)
}

/** 鬼才／鬼道：有對應花色手牌時替換判定牌（鬼道限黑色）。 */
export type JudgePrefer = 'red' | 'black' | 'heart' | 'club' | 'nonheart'

export function applyJudgeReplaceSync(
  state: GameSnapshot,
  judged: CardInstance | null,
  prefer?: JudgePrefer,
): CardInstance | null {
  if (!judged || !prefer) return judged
  const n = state.players.length
  for (let i = 0; i < n; i++) {
    const seat = (state.currentPlayer + i) % n
    const pl = state.players[seat]
    if (!pl.alive || !pl.generalId) continue
    const sk = playerSkills(pl)
    const hasGuicai = sk.includes('guicai')
    const hasGuidao = sk.includes('guidao')
    if (!hasGuicai && !hasGuidao) continue

    const cand = pl.hand.find((c) => {
      const s = effectiveSuit(c, pl)
      const red = s === 'heart' || s === 'diamond'
      let match = false
      if (prefer === 'red') match = red
      else if (prefer === 'black') match = !red
      else if (prefer === 'heart') match = s === 'heart'
      else if (prefer === 'club') match = s === 'club'
      else if (prefer === 'nonheart') match = s !== 'heart'
      if (!match) return false
      if (hasGuicai) return true
      return hasGuidao && isBlackCard(c)
    })
    if (!cand) continue
    const skillName = hasGuicai ? '鬼才' : '鬼道'
    const rep = takeHand(state, seat, cand.uid)!
    discardCard(state, judged)
    log(
      state,
      `${pl.name} 發動${skillName}，用【${getCardDef(rep.defId).name}】替換判定牌。`,
    )
    return rep
  }
  return judged
}

export function continueBeginTurn(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p?.alive) {
    advanceTurn(state)
    return
  }
  const skills = playerSkills(p)
  const turn = turnSkipOf(state)

  if (skills.includes('xuanhuo') && !turn.xuanhuoAsked) {
    turn.xuanhuoAsked = true
    const others = state.players.filter((x) => x.alive && x.id !== p.id)
    if (others.length) {
      state.prompt = {
        kind: 'choice',
        message: '【眩惑】是否跳過摸牌階段，令另一名角色摸兩張牌？',
        actorId: p.id,
        choiceKey: 'xuanhuo',
        choices: [
          { id: 'yes', label: '發動眩惑' },
          { id: 'no', label: '正常摸牌' },
        ],
      }
      return
    }
  }

  if (skills.includes('shensu') && !turn.shensuAsked) {
    turn.shensuAsked = true
    state.prompt = {
      kind: 'choice',
      message: '【神速】是否跳過判定與摸牌階段，視為使用一張無距離限制的【殺】？',
      actorId: p.id,
      choiceKey: 'shensu',
      choices: [
        { id: 'shensu_skip', label: '發動神速' },
        { id: 'shensu_normal', label: '正常進行' },
      ],
    }
    return
  }
  if (skills.includes('shuangxiong') && !turn.shuangxiongAsked) {
    turn.shuangxiongAsked = true
    state.prompt = {
      kind: 'choice',
      message: '【雙雄】是否跳過摸牌並判定，將異色牌當【決鬥】？',
      actorId: p.id,
      choiceKey: 'shuangxiong',
      choices: [
        { id: 'yes', label: '發動雙雄' },
        { id: 'no', label: '正常摸牌' },
      ],
    }
    return
  }

  // 判定階段：樂不思蜀／兵糧寸斷／閃電
  state.phase = 'judge'
  let skipDraw = turn.skipDraw
  let skipPlay = turn.skipPlay
  if (!turn.skipJudge) {
  const pendingJudges = [...(p.judges ?? [])]
  for (const jCard of pendingJudges) {
    if (!p.judges?.some((x) => x.uid === jCard.uid)) continue
    p.judges = p.judges.filter((x) => x.uid !== jCard.uid)
    const jdef = getCardDef(jCard.defId)
    let judged = drawJudgeCard(state, shuffle)
    const preferJudge: JudgePrefer | undefined =
      jdef.kind === 'lebu'
        ? 'heart'
        : jdef.kind === 'bingliang'
          ? 'club'
          : jdef.kind === 'shandian'
            ? undefined
            : undefined
    judged = applyJudgeReplaceSync(state, judged, preferJudge)
    let suit = judged ? effectiveSuit(judged, p) : null
    if (judged) {
      discardCard(state, judged)
      log(
        state,
        `${p.name} 的【${jdef.name}】判定：${getCardDef(judged.defId).name}`,
      )
      if (skills.includes('tiandu')) {
        p.hand.push(judged)
        state.discard.pop()
        log(state, `${p.name} 發動天妒，獲得判定牌。`)
      }
    }
    if (jdef.kind === 'lebu') {
      discardCard(state, jCard)
      if (suit === 'heart') {
        log(state, `【樂不思蜀】判定為紅桃，無效。`)
      } else {
        skipPlay = true
        log(state, `【樂不思蜀】生效，${p.name} 本回合跳過出牌階段。`)
      }
    } else if (jdef.kind === 'bingliang') {
      discardCard(state, jCard)
      if (suit === 'club') {
        log(state, `【兵糧寸斷】判定為梅花，無效。`)
      } else {
        skipDraw = true
        log(state, `【兵糧寸斷】生效，${p.name} 本回合跳過摸牌階段。`)
      }
    } else if (jdef.kind === 'shandian') {
      const rank = judged ? (getCardDef(judged.defId).rank ?? 0) : 0
      const hit = suit === 'spade' && rank >= 2 && rank <= 9
      if (hit) {
        discardCard(state, jCard)
        log(state, `【閃電】擊中 ${p.name}，造成 3 點雷電傷害。`)
        ;(state as GameSnapshot & { _resumeBeginTurn?: boolean })._resumeBeginTurn = true
        if (dealDamage(state, p.id, 3, null, 'thunder', jCard)) return
        delete (state as GameSnapshot & { _resumeBeginTurn?: boolean })._resumeBeginTurn
      } else {
        log(state, `【閃電】未擊中，移至下家判定區。`)
        const n = state.players.length
        let passed = false
        for (let step = 1; step < n; step++) {
          const nid = (p.id + step) % n
          const np = state.players[nid]
          if (!np.alive) continue
          if ((np.judges ?? []).some((j) => getCardDef(j.defId).kind === 'shandian')) continue
          np.judges = [...(np.judges ?? []), jCard]
          log(state, `【閃電】進入 ${np.name} 的判定區。`)
          passed = true
          break
        }
        if (!passed) {
          p.judges = [...(p.judges ?? []), jCard]
        }
      }
    } else {
      discardCard(state, jCard)
    }
  }
  } else {
    log(state, `${p.name} 跳過判定階段。`)
  }

  // 洛神
  if (skills.includes('luoshen')) {
    for (let i = 0; i < 8; i++) {
      let judged = drawJudgeCard(state, shuffle)
      judged = applyJudgeReplaceSync(state, judged, 'black')
      if (!judged) break
      const def = getCardDef(judged.defId)
      const black = isBlackFor(p, judged)
      log(
        state,
        `${p.name} 洛神判定：${def.name}${black ? '（黑色，獲得）' : '（紅色，結束）'}`,
      )
      if (black) {
        p.hand.push(judged)
      } else {
        discardCard(state, judged)
        if (skills.includes('tiandu')) {
          p.hand.push(judged)
          state.discard.pop()
          log(state, `${p.name} 發動天妒，獲得判定牌。`)
        }
        break
      }
    }
  }

  state.phase = 'draw'
  if (!skipDraw && skills.includes('tuxi') && !turn.tuxiAsked) {
    const victims = state.players.filter((o) => o.alive && o.id !== p.id && o.hand.length > 0)
    if (victims.length) {
      turn.tuxiAsked = true
      state.prompt = {
        kind: 'choice',
        message: '【突襲】放棄摸牌，改為獲得一至兩名其他角色各一張手牌？',
        actorId: p.id,
        choiceKey: 'tuxi',
        choices: [
          { id: 'yes', label: '發動突襲' },
          { id: 'no', label: '正常摸牌' },
        ],
      }
      return
    }
  }
  if (!skipDraw && skills.includes('zaiqi') && p.hp < p.maxHp && !turn.zaiqiAsked) {
    turn.zaiqiAsked = true
    state.prompt = {
      kind: 'choice',
      message: '【再起】是否放棄摸牌，改為展示已損失體力數的牌並以紅桃回覆？',
      actorId: p.id,
      choiceKey: 'zaiqi',
      choices: [
        { id: 'yes', label: '發動再起' },
        { id: 'no', label: '正常摸牌' },
      ],
    }
    return
  }

  if (!skipDraw) {
    if (turn.zaiqiOn) {
      const n = p.maxHp - p.hp
      let recovered = 0
      for (let i = 0; i < n; i++) {
        const c = state.deck.pop()
        if (!c) break
        if (effectiveSuit(c, p) === 'heart') {
          discardCard(state, c)
          recovered++
        } else p.hand.push(c)
      }
      p.hp = Math.min(p.maxHp, p.hp + recovered)
      log(state, `${p.name} 發動再起，展示 ${n} 張牌並回覆 ${recovered} 點體力。`)
    } else {
      let drawN = 2
      if (playerSkills(p).includes('yingzi')) drawN++
      if (skills.includes('haoshi')) drawN += 2
      draw(state, p.id, drawN)
      log(state, `${p.name} 摸了 ${drawN} 張牌。`)
    }
    if (skills.includes('haoshi') && p.hand.length > 5) {
      const least = state.players
        .filter((x) => x.alive && x.id !== p.id)
        .sort((a, b) => a.hand.length - b.hand.length)[0]
      if (least) {
        const give = Math.floor(p.hand.length / 2)
        least.hand.push(...p.hand.splice(0, give))
        log(state, `${p.name} 發動好施，交給 ${least.name} ${give} 張牌。`)
      }
    }
  } else {
    log(state, `${p.name} 跳過摸牌階段。`)
  }

  if (turn.shensuVirtual) {
    turn.shensuVirtual = false
    const foes = enemiesOf(state, p.id)
    if (foes.length) {
      state.prompt = {
        kind: 'choice',
        message: '【神速】視為使用【殺】，選擇目標',
        actorId: p.id,
        choiceKey: 'shensu_sha',
        choices: [
          ...foes.map((id) => ({ id: String(id), label: state.players[id].name })),
          { id: 'skip', label: '不出殺' },
        ],
      }
      return
    }
  }

  if (skipPlay) {
    // 樂不思蜀／據守等：跳過出牌，但仍須進入棄牌（手牌超過體力上限時）
    log(state, `${p.name} 跳過出牌階段。`)
    finishEndPhase(state, p.id)
    return
  }

  state.phase = 'play'
  setPlayPrompt(state)
}

export function setPlayPrompt(state: GameSnapshot): void {
  const p = state.players[state.currentPlayer]
  state.prompt = {
    kind: 'choose_card',
    message: `${p.name} 的出牌階段`,
    actorId: p.id,
    cardUids: playableCards(state, p.id).map((c) => c.uid),
  }
}

export function playableCards(state: GameSnapshot, playerId: number): CardInstance[] {
  const p = state.players[playerId]
  if (!p.alive || state.phase !== 'play' || state.currentPlayer !== playerId) return []
  return p.hand.filter((c) => canPlayCard(state, playerId, c.uid))
}

export function canPlayCard(state: GameSnapshot, playerId: number, uid: string): boolean {
  const p = state.players[playerId]
  const card = findCard(p, uid)
  if (!card) return false
  const def = getCardDef(card.defId)
  const kind = cardKind(card)
  const playAs = getPlayKindOptions(p, card)

  if (def.type === 'equip') return true

  // 裸衣：不能用錦囊
  if (p.luoyiActive && def.type === 'trick') return false

  const tryKinds = playAs.length ? playAs : [kind]
  for (const k of tryKinds) {
    if (k === 'sha') {
      if (!mayUseSha(p)) continue
      if (enemiesOf(state, playerId).some((t) => canReach(state, playerId, t))) return true
      continue
    }
    if (k === 'tao') {
      if (p.hp < p.maxHp) return true
      continue
    }
    if (k === 'shan' || k === 'wuxie') continue
    if (k === 'jiu') {
      if (!p.jiuUsedThisTurn) return true
      continue
    }
    if (k === 'shandian') {
      if (!(p.judges ?? []).some((j) => getCardDef(j.defId).kind === 'shandian')) return true
      continue
    }
    if (k === 'wuzhong' || k === 'taoyuan' || k === 'wugu' || k === 'nanman' || k === 'wanjian')
      return true
    if (k === 'guohe' || k === 'shunshou' || k === 'juedou' || k === 'huogong') {
      if (legalTargets(state, playerId, k).length > 0) return true
      continue
    }
    if (k === 'lebu' || k === 'bingliang') {
      if (legalTargets(state, playerId, k).length > 0) return true
      continue
    }
    if (k === 'jiedao') {
      if (legalTargets(state, playerId, 'jiedao').length > 0) return true
      continue
    }
    if (k === 'tiesuo') {
      // 簡化：可重鑄（棄置摸一）或選兩名目標鏈接——本版改為棄置並摸一張
      return true
    }
  }
  return false
}

export function getPlayKindOptions(p: PlayerState, card: CardInstance): string[] {
  const kind = cardKind(card)
  const skills = playerSkills(p)
  const opts = [kind]
  if (skills.includes('wusheng') && isRedFor(p, card) && kind !== 'sha') opts.push('sha')
  if (skills.includes('longdan')) {
    if (kind === 'sha') opts.push('shan')
    if (kind === 'shan') opts.push('sha')
  }
  if (skills.includes('qixi') && isBlackFor(p, card)) opts.push('guohe')
  if (skills.includes('guose') && getCardDef(card.defId).suit === 'diamond' && kind !== 'lebu') {
    opts.push('lebu')
  }
  if (skills.includes('qingguo') && isBlackFor(p, card)) opts.push('shan')
  if (skills.includes('lianhuan') && effectiveSuit(card, p) === 'club') opts.push('tiesuo')
  if (skills.includes('huoji') && isRedFor(p, card)) opts.push('huogong')
  if (skills.includes('duanliang') && isBlackFor(p, card) && (kind === 'sha' || kind === 'shan' || getCardDef(card.defId).type === 'equip')) {
    opts.push('bingliang')
  }
  if (p.shuangxiongAs && (p.shuangxiongAs === 'red' ? isRedFor(p, card) : isBlackFor(p, card))) {
    opts.push('juedou')
  }
  return [...new Set(opts)]
}

/** Player / AI action entry points */
export function selectCard(state: GameSnapshot, playerId: number, uid: string, asKind?: string): void {
  if (state.winnerIds) return
  const prompt = state.prompt
  if (prompt.actorId !== playerId) return

  if (prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha') {
    handleResponse(state, playerId, uid)
    return
  }
  if (prompt.kind === 'discard') {
    handleDiscardPick(state, playerId, uid)
    return
  }
  if (prompt.kind === 'skill_cards') {
    handleSkillCardPick(state, playerId, uid)
    return
  }
  if (prompt.kind !== 'choose_card') return

  const p = state.players[playerId]
  const card = findCard(p, uid)
  if (!card) return
  const opts = getPlayKindOptions(p, card)
  if (!asKind && opts.length > 1) {
    const labels: Record<string, string> = {
      sha: '當【殺】',
      shan: '當【閃】',
      tao: '當【桃】',
      guohe: '當【過河拆橋】',
      lebu: '當【樂不思蜀】',
      tiesuo: '當【鐵索連環】',
      huogong: '當【火攻】',
      bingliang: '當【兵糧寸斷】',
      juedou: '當【決鬥】',
    }
    state.prompt = {
      kind: 'choice',
      message: `選擇【${getCardDef(card.defId).name}】的使用方式`,
      actorId: playerId,
      choiceKey: 'play_as',
      cardUids: [uid],
      choices: opts.map((k) => ({
        id: k,
        label: labels[k] ?? `當【${k}】`,
      })),
    }
    return
  }
  const kind = asKind && opts.includes(asKind) ? asKind : cardKind(card)
  const def = getCardDef(card.defId)

  if (def.type === 'equip') {
    playEquip(state, playerId, card)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
      note: '裝備',
    })
    setPlayPrompt(state)
    return
  }

  if (kind === 'tao') {
    if (p.hp >= p.maxHp) return
    takeHand(state, playerId, uid)
    discardCard(state, card)
    p.hp = Math.min(p.maxHp, p.hp + 1)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【桃】，體力回覆至 ${p.hp}。`)
    setPlayPrompt(state)
    return
  }

  if (kind === 'jiu') {
    if (p.jiuUsedThisTurn) return
    takeHand(state, playerId, uid)
    discardCard(state, card)
    p.jiuUsedThisTurn = true
    p.jiuActive = true
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【酒】，本回合下一張【殺】傷害+1。`)
    setPlayPrompt(state)
    return
  }

  if (kind === 'shandian') {
    if ((p.judges ?? []).some((j) => getCardDef(j.defId).kind === 'shandian')) return
    takeHand(state, playerId, uid)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【閃電】。`)
    afterTrick(state, p)
    beginWuxieWindow(state, {
      type: 'delayed',
      sourceId: playerId,
      targetId: playerId,
      card,
      kind: 'shandian',
      name: def.name,
    })
    return
  }

  if (kind === 'taoyuan') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: state.players.filter((t) => t.alive).map((t) => t.id),
    })
    log(state, `${p.name} 使用【桃園結義】。`)
    afterTrick(state, p)
    beginWuxieWindow(state, {
      type: 'taoyuan',
      sourceId: playerId,
      healed: [],
    })
    return
  }

  if (kind === 'wugu') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: state.players.filter((t) => t.alive).map((t) => t.id),
    })
    log(state, `${p.name} 使用【五穀豐登】。`)
    afterTrick(state, p)
    // Per-player 無懈 happens before each pick; do not nullify the whole card here.
    startWugu(state, playerId)
    return
  }

  if (kind === 'tiesuo') {
    state.prompt = {
      kind: 'choice',
      message: '【鐵索連環】選擇重鑄，或橫置／重置一至兩名角色',
      actorId: playerId,
      choiceKey: 'tiesuo_mode',
      cardUids: [uid],
      choices: [
        { id: 'recast', label: '重鑄摸一張' },
        { id: 'link', label: '選擇連環目標' },
      ],
    }
    return
  }

  if (kind === 'nanman' || kind === 'wanjian') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    const others = state.players.filter((t) => {
      if (!t.alive || t.id === playerId) return false
      if (
        kind === 'nanman' &&
        (playerSkills(t).includes('huoshou') ||
          playerSkills(t).includes('juxiang') ||
          playerSkills(t).includes('weimu'))
      ) {
        log(state, `${t.name} 的技能使【南蠻入侵】對其無效。`)
        return false
      }
      if (armorKind(t) === 'tengjia') {
        log(state, `${t.name} 的【藤甲】使【${def.name}】無效。`)
        return false
      }
      return true
    })
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: others.map((t) => t.id),
    })
    log(state, `${p.name} 使用【${def.name}】。`)
    afterTrick(state, p)
    observePublicEvent(state, { type: 'aoe', sourceId: playerId, kind })
    // Per-target 無懈 (like 五穀豐登), not whole-card cancel
    resolveAOE(
      state,
      playerId,
      others.map((t) => t.id),
      kind === 'nanman' ? 'sha' : 'shan',
      def.name,
      card,
    )
    return
  }

  if (kind === 'wuzhong') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【無中生有】。`)
    afterTrick(state, p)
    beginWuxieWindow(state, { type: 'wuzhong', sourceId: playerId })
    return
  }

  // Needs target
  const targets = legalTargets(state, playerId, kind).filter(
    (tid) =>
      !(
        isBlackFor(p, card) &&
        ['guohe', 'shunshou', 'juedou', 'huogong', 'lebu', 'bingliang', 'jiedao'].includes(kind) &&
        playerSkills(state.players[tid]).includes('weimu')
      ),
  )
  if (targets.length === 0) return

  const fangtian =
    kind === 'sha' && weaponKind(p) === 'fangtian' && p.hand.length === 1
  const maxTargets = fangtian ? Math.min(3, targets.length) : 1
  state.prompt = {
    kind: 'choose_target',
    message:
      maxTargets > 1
        ? `【方天畫戟】選擇 1～${maxTargets} 名目標（點選目標後確認）`
        : `選擇【${getCardDef(card.defId).name}】的目標`,
    actorId: playerId,
    targetIds: targets,
    minTargets: 1,
    maxTargets,
    cardUids: [uid],
    respondKinds: [kind],
    selectedTargetIds: [],
  }
}

export function afterTrick(state: GameSnapshot, p: PlayerState): void {
  if (playerSkills(p).includes('jizhi')) {
    draw(state, p.id, 1)
    log(state, `${p.name} 發動集智，摸一張牌。`)
  }
}

export type PendingTrick =
  | { type: 'wuzhong'; sourceId: number }
  | { type: 'taoyuan'; sourceId: number; healed: number[] }
  | { type: 'wugu'; sourceId: number }
  | { type: 'wugu_pick'; sourceId: number; pickerId: number }
  | {
      type: 'aoe_target'
      sourceId: number
      targetId: number
      kind: string
      name: string
      need: 'sha' | 'shan'
      card?: CardInstance
    }
  | { type: 'guohe'; sourceId: number; targetId: number }
  | { type: 'shunshou'; sourceId: number; targetId: number }
  | { type: 'juedou'; sourceId: number; targetId: number; card: CardInstance }
  | { type: 'huogong'; sourceId: number; targetId: number; card: CardInstance }
  | {
      type: 'delayed'
      sourceId: number
      targetId: number
      card: CardInstance
      kind: string
      name: string
    }
  | { type: 'jiedao'; sourceId: number; holderId: number; killTargetId: number }

export type WuxieState = {
  trick: PendingTrick
  cursor: number
  nullified: boolean
  asked: number
}

export function getWuxie(state: GameSnapshot): WuxieState | undefined {
  return (state as GameSnapshot & { _wuxie?: WuxieState })._wuxie
}

export function clearWuxie(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _wuxie?: WuxieState })._wuxie
}

export function beginWuxieWindow(state: GameSnapshot, trick: PendingTrick): void {
  ;(state as GameSnapshot & { _wuxie?: WuxieState })._wuxie = {
    trick,
    cursor: (trick.sourceId + 1) % state.players.length,
    nullified: false,
    asked: 0,
  }
  continueWuxieAsk(state)
}

export function continueWuxieAsk(state: GameSnapshot): void {
  const w = getWuxie(state)
  if (!w) return
  const n = state.players.length
  const pickerId = w.trick.type === 'wugu_pick' ? w.trick.pickerId : undefined
  const aoeTargetId = w.trick.type === 'aoe_target' ? w.trick.targetId : undefined
  while (w.asked < n) {
    const seat = w.cursor
    w.cursor = (w.cursor + 1) % n
    w.asked++
    const p = state.players[seat]
    if (!p.alive) continue
    const wuxieCards = p.hand.filter(
      (c) => cardKind(c) === 'wuxie' || (playerSkills(p).includes('kanpo') && isBlackFor(p, c)),
    )
    if (!wuxieCards.length) continue
    let about = `是否無懈當前錦囊？`
    if (pickerId !== undefined) {
      about = `是否無懈【五穀豐登】中 ${state.players[pickerId]?.name ?? ''} 的選牌？`
    } else if (aoeTargetId !== undefined) {
      const tn = state.players[aoeTargetId]?.name ?? ''
      const trickName = w.trick.type === 'aoe_target' ? w.trick.name : '錦囊'
      about = `是否無懈【${trickName}】對 ${tn} 的效果？`
    }
    // Do not put the asked seat's name in the message — spectators must not learn who holds 無懈.
    state.prompt = {
      kind: 'choice',
      message: `【無懈可擊】${about}`,
      actorId: seat,
      choiceKey: 'wuxie',
      cardUids: wuxieCards.map((c) => c.uid),
      choices: [
        { id: 'use', label: '使用無懈可擊' },
        { id: 'skip', label: '不使用' },
      ],
    }
    return
  }
  // No more asks
  const trick = w.trick
  const nullified = w.nullified
  clearWuxie(state)
  if (nullified) {
    if (trick.type === 'wugu_pick') {
      const picker = state.players[trick.pickerId]
      log(state, `【五穀豐登】${picker?.name ?? ''} 選牌被【無懈可擊】抵消，跳過。`)
      const wg = getWugu(state)
      if (wg) {
        wg.index++
        continueWugu(state)
      } else {
        setPlayPrompt(state)
      }
      return
    }
    if (trick.type === 'aoe_target') {
      const tgt = state.players[trick.targetId]
      log(state, `【${trick.name}】對 ${tgt?.name ?? ''} 的效果被【無懈可擊】抵消。`)
      const queue = getAoeQueue(state)
      if (queue && queue.targets[0] === trick.targetId) {
        queue.targets.shift()
      }
      continueAoe(state)
      return
    }
    log(state, `錦囊效果被【無懈可擊】抵消。`)
    if (trick.type === 'delayed') discardCard(state, trick.card)
    if (state.phase === 'play') setPlayPrompt(state)
    return
  }
  resolvePendingTrick(state, trick)
}

export function resolvePendingTrick(state: GameSnapshot, trick: PendingTrick): void {
  if (trick.type === 'wuzhong') {
    draw(state, trick.sourceId, 2)
    log(state, `${state.players[trick.sourceId].name} 因【無中生有】摸兩張牌。`)
    setPlayPrompt(state)
    return
  }
  if (trick.type === 'taoyuan') {
    const healed: number[] = []
    for (const pl of state.players) {
      if (pl.alive && pl.hp < pl.maxHp) {
        pl.hp++
        healed.push(pl.id)
      }
    }
    log(state, `【桃園結義】生效，傷者各回 1 體力。`)
    const lord = state.players.find((pl) => pl.identity === 'lord' && pl.alive)
    if (lord && healed.includes(lord.id)) {
      observePublicEvent(state, {
        type: 'heal',
        sourceId: trick.sourceId,
        targetId: lord.id,
        kind: 'taoyuan',
      })
    }
    setPlayPrompt(state)
    return
  }
  if (trick.type === 'wugu') {
    startWugu(state, trick.sourceId)
    return
  }
  if (trick.type === 'wugu_pick') {
    askWuguPickUi(state, trick.pickerId)
    return
  }
  if (trick.type === 'aoe_target') {
    const queue = getAoeQueue(state)
    if (queue && queue.targets[0] === trick.targetId) {
      queue.targets.shift()
    }
    askAOEResponse(state, trick.sourceId, trick.targetId, trick.need, trick.name)
    return
  }
  if (trick.type === 'guohe') {
    askDismantle(state, trick.sourceId, trick.targetId)
    return
  }
  if (trick.type === 'shunshou') {
    beginZonePick(state, {
      actorId: trick.sourceId,
      ownerId: trick.targetId,
      count: 1,
      skillId: 'shunshou',
      mode: 'steal',
      message: `【順手牽羊】選擇獲得 ${state.players[trick.targetId].name} 的一張牌`,
    })
    return
  }
  if (trick.type === 'juedou') {
    resolveJuedou(state, trick.sourceId, trick.targetId, trick.card)
    return
  }
  if (trick.type === 'huogong') {
    startHuogong(state, trick.sourceId, trick.targetId, trick.card)
    return
  }
  if (trick.type === 'delayed') {
    const t = state.players[trick.targetId]
    if (!t.judges) t.judges = []
    t.judges.push(trick.card)
    log(state, `【${trick.name}】進入 ${t.name} 的判定區。`)
    setPlayPrompt(state)
    return
  }
  if (trick.type === 'jiedao') {
    // Ask holder to kill or give weapon
    const holder = state.players[trick.holderId]
    const shaCards = responseCards(holder, 'sha')
    state.prompt = {
      kind: 'choice',
      message: `【借刀殺人】${holder.name}：是否對 ${state.players[trick.killTargetId].name} 出【殺】？否則交出武器。`,
      actorId: trick.holderId,
      choiceKey: 'jiedao',
      targetIds: [trick.killTargetId],
      cardUids: shaCards.map((c) => c.uid),
      selectedTargetIds: [trick.sourceId, trick.holderId, trick.killTargetId],
      choices: [
        ...(shaCards.length
          ? [{ id: 'sha', label: '打出【殺】' }]
          : []),
        { id: 'give', label: '交出武器' },
      ],
    }
    return
  }
}

export type WuguState = {
  pool: CardInstance[]
  order: number[]
  index: number
  sourceId: number
}

export function getWugu(state: GameSnapshot): WuguState | undefined {
  return (state as GameSnapshot & { _wugu?: WuguState })._wugu
}

export function clearWugu(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _wugu?: WuguState })._wugu
}

export function startWugu(state: GameSnapshot, sourceId: number): void {
  const order: number[] = []
  const n = state.players.length
  for (let i = 0; i < n; i++) {
    const id = (sourceId + i) % n
    if (state.players[id].alive) order.push(id)
  }
  const pool: CardInstance[] = []
  for (let i = 0; i < order.length; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break
      state.deck = shuffle(state.discard)
      state.discard = []
    }
    const c = state.deck.pop()
    if (c) pool.push(c)
  }
  if (!pool.length) {
    log(state, `【五穀豐登】牌堆不足，無效。`)
    setPlayPrompt(state)
    return
  }
  log(state, `【五穀豐登】亮出 ${pool.length} 張牌。`)
  ;(state as GameSnapshot & { _wugu?: WuguState })._wugu = {
    pool,
    order,
    index: 0,
    sourceId,
  }
  continueWugu(state)
}

/** Before each pick: offer 無懈 against that player's obtain effect. */
export function continueWugu(state: GameSnapshot): void {
  const w = getWugu(state)
  if (!w) return
  if (w.index >= w.order.length || !w.pool.length) {
    for (const c of w.pool) discardCard(state, c)
    clearWugu(state)
    setPlayPrompt(state)
    return
  }
  const pickerId = w.order[w.index]
  beginWuxieWindow(state, {
    type: 'wugu_pick',
    sourceId: w.sourceId,
    pickerId,
  })
}

export function askWuguPickUi(state: GameSnapshot, pickerId: number): void {
  const w = getWugu(state)
  if (!w) return
  const p = state.players[pickerId]
  if (!p?.alive || !w.pool.length) {
    w.index++
    continueWugu(state)
    return
  }
  state.prompt = {
    kind: 'choice',
    message: `【五穀豐登】${p.name} 選擇一張牌`,
    actorId: pickerId,
    choiceKey: 'wugu',
    choices: w.pool.map((c) => {
      const d = getCardDef(c.defId)
      return { id: c.uid, label: d.name }
    }),
  }
}

/**
 * Legal targets by card kind. Distance rules (classic):
 * - 殺: attack range (weapon)
 * - 過河拆橋 / 決鬥 / 火攻 / 樂不思蜀: no distance limit
 * - 順手牽羊 / 兵糧寸斷: distance ≤ 1 (seat + −1/+1 horses + 馬術)
 * - 奇才: your tricks ignore distance
 * - 借刀: first pick = weapon holder (no dist); kill target = holder's attack range
 */
export function legalTargets(state: GameSnapshot, playerId: number, kind: string): number[] {
  const source = state.players[playerId]
  const sourceSkills = playerSkills(source)
  const ignoreTrickDist = sourceSkills.includes('qicai')

  if (kind === 'sha') {
    return enemiesOf(state, playerId).filter((t) => {
      const target = state.players[t]
      if (playerSkills(target).includes('kongcheng') && target.hand.length === 0) {
        return false
      }
      return source.shensuNoDist || source.tianyiWin || canReach(state, playerId, t)
    })
  }

  // No distance: 過河拆橋、決鬥、火攻
  if (kind === 'guohe' || kind === 'juedou' || kind === 'huogong') {
    return state.players
      .filter((t) => {
        if (!t.alive || t.id === playerId) return false
        if (kind === 'juedou' && playerSkills(t).includes('kongcheng') && t.hand.length === 0) {
          return false
        }
        if (kind === 'guohe') {
          const hasJudge = (t.judges?.length ?? 0) > 0
          if (t.hand.length === 0 && equipSlots().every((s) => !t.equips[s]) && !hasJudge) {
            return false
          }
        }
        return true
      })
      .map((t) => t.id)
  }

  // Distance 1: 順手牽羊
  if (kind === 'shunshou') {
    return state.players
      .filter((t) => {
        if (!t.alive || t.id === playerId) return false
        if (playerSkills(t).includes('qianxun')) return false
        const hasJudge = (t.judges?.length ?? 0) > 0
        if (t.hand.length === 0 && equipSlots().every((s) => !t.equips[s]) && !hasJudge) {
          return false
        }
        return withinDistanceOne(state, playerId, t.id, ignoreTrickDist)
      })
      .map((t) => t.id)
  }

  // 樂不思蜀: no distance; 兵糧寸斷: distance 1
  if (kind === 'lebu' || kind === 'bingliang') {
    return state.players
      .filter((t) => {
        if (!t.alive || t.id === playerId) return false
        if (kind === 'lebu' && playerSkills(t).includes('qianxun')) {
          return false
        }
        if ((t.judges ?? []).some((j) => getCardDef(j.defId).kind === kind)) return false
        if (
          kind === 'bingliang' &&
          !(sourceSkills.includes('duanliang')
            ? getDistance(state, playerId, t.id) <= 2
            : withinDistanceOne(state, playerId, t.id, ignoreTrickDist))
        ) {
          return false
        }
        return true
      })
      .map((t) => t.id)
  }

  if (kind === 'jiedao') {
    // First pick: someone with a weapon (no distance)
    return state.players
      .filter((t) => t.alive && t.id !== playerId && !!t.equips.weapon)
      .map((t) => t.id)
  }
  return []
}

export function selectTarget(state: GameSnapshot, playerId: number, targetId: number): void {
  if (state.prompt.kind !== 'choose_target' || state.prompt.actorId !== playerId) return
  if (!state.prompt.targetIds?.includes(targetId)) return
  const uid = state.prompt.cardUids?.[0]
  const kind = state.prompt.respondKinds?.[0]
  if (!uid || !kind) return
  const selectedCard = findCard(state.players[playerId], uid)
  if (
    selectedCard &&
    isBlackFor(state.players[playerId], selectedCard) &&
    ['guohe', 'shunshou', 'juedou', 'huogong', 'lebu', 'bingliang', 'jiedao'].includes(kind) &&
    playerSkills(state.players[targetId]).includes('weimu')
  ) {
    return
  }

  if (kind === 'jiedao_kill') {
    const holderId = state.prompt.selectedTargetIds?.[0]
    if (holderId === undefined) return
    const p = state.players[playerId]
    const card = takeHand(state, playerId, uid)
    if (!card) return
    discardCard(state, card)
    const def = getCardDef(card.defId)
    const holder = state.players[holderId]
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [holderId, targetId],
    })
    log(
      state,
      `${p.name} 使用【借刀殺人】，令 ${holder.name} 對 ${state.players[targetId].name} 出殺。`,
    )
    afterTrick(state, p)
    beginWuxieWindow(state, {
      type: 'jiedao',
      sourceId: playerId,
      holderId,
      killTargetId: targetId,
    })
    return
  }

  const maxTargets = state.prompt.maxTargets ?? 1
  const selected = [...(state.prompt.selectedTargetIds ?? [])]
  if (!selected.includes(targetId)) selected.push(targetId)

  if (maxTargets > 1 && selected.length < maxTargets && selected.length >= 1) {
    const remaining = (state.prompt.targetIds ?? []).filter((id) => !selected.includes(id))
    state.prompt = {
      kind: 'choice',
      message: `已選 ${selected.map((id) => state.players[id].name).join('、')}。可再選或確認。`,
      actorId: playerId,
      choiceKey: 'fangtian_confirm',
      cardUids: [uid],
      respondKinds: [kind],
      targetIds: remaining,
      selectedTargetIds: selected,
      choices: [
        ...remaining.map((tid) => ({
          id: `add:${tid}`,
          label: `再指定 ${state.players[tid].name}`,
        })),
        { id: 'confirm', label: kind === 'tiesuo' ? '確認連環' : '確認出殺' },
      ],
    }
    return
  }

  const targets = selected.length ? selected : [targetId]
  finishTargetedCard(state, playerId, uid, kind, targets)
}

export function finishTargetedCard(
  state: GameSnapshot,
  playerId: number,
  uid: string,
  kind: string,
  targetIds: number[],
): void {
  if (kind === 'tiesuo') {
    const p = state.players[playerId]
    const card = takeHand(state, playerId, uid)
    if (!card) return
    discardCard(state, card)
    for (const tid of targetIds.slice(0, 2)) {
      const target = state.players[tid]
      target.chained = !target.chained
      log(state, `${p.name} 令 ${target.name}${target.chained ? '橫置' : '重置'}。`)
    }
    afterTrick(state, p)
    setPlayPrompt(state)
    return
  }
  if (kind === 'jiedao') {
    const targetId = targetIds[0]
    if (targetId === undefined) return
    const holder = state.players[targetId]
    const killTargets = state.players
      .filter(
        (t) =>
          t.alive &&
          t.id !== targetId &&
          canReach(state, targetId, t.id),
      )
      .map((t) => t.id)
    if (!killTargets.length) {
      log(state, `${holder.name} 的攻擊範圍內沒有可殺目標，無法借刀。`)
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choose_target',
      message: `【借刀殺人】選擇 ${holder.name} 殺的目標`,
      actorId: playerId,
      targetIds: killTargets,
      cardUids: [uid],
      respondKinds: ['jiedao_kill'],
      selectedTargetIds: [targetId],
    }
    return
  }

  if (kind === 'lebu' || kind === 'bingliang') {
    const targetId = targetIds[0]
    if (targetId === undefined) return
    const p = state.players[playerId]
    const card = takeHand(state, playerId, uid)
    if (!card) return
    const def = getCardDef(card.defId)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【${def.name}】。`)
    afterTrick(state, p)
    beginWuxieWindow(state, {
      type: 'delayed',
      sourceId: playerId,
      targetId,
      card,
      kind,
      name: def.name,
    })
    return
  }

  const p = state.players[playerId]
  const card = takeHand(state, playerId, uid)
  if (!card) return
  discardCard(state, card)
  const def = getCardDef(card.defId)

  if (kind === 'sha') {
    p.shaUsedThisTurn = true
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds,
    })
    log(
      state,
      `${p.name} 對 ${targetIds.map((id) => state.players[id].name).join('、')} 使用【殺】。`,
    )
    if (playerSkills(p).includes('jiang')) {
      draw(state, playerId, 1)
      log(state, `${p.name} 發動激昂，摸一張牌。`)
    }
    for (const tid of targetIds) {
      observePublicEvent(state, { type: 'attack', sourceId: playerId, targetId: tid, kind: 'sha' })
      const tp = state.players[tid]
      if (playerSkills(tp).includes('jiang')) {
        draw(state, tid, 1)
        log(state, `${tp.name} 發動激昂，摸一張牌。`)
      }
    }

    const startShaVs = (tid: number, extras: number[]) => {
      const target = state.players[tid]
      if (playerSkills(target).includes('liuli') && countDiscardable(target) > 0) {
        const redirect = legalTargets(state, playerId, 'sha').filter(
          (x) => x !== tid && x !== playerId && canReach(state, tid, x),
        )
        if (redirect.length) {
          state.pending = {
            type: 'sha',
            sourceId: playerId,
            targetId: tid,
            cardUid: card.uid,
            damageCard: card,
            extraTargets: extras,
          }
          state.prompt = {
            kind: 'choice',
            message: `【流離】：是否棄一張牌將殺轉移？`,
            actorId: tid,
            choiceKey: 'liuli',
            targetIds: redirect,
            choices: [
              ...redirect.map((rid) => ({
                id: String(rid),
                label: `轉移給 ${state.players[rid].name}`,
              })),
              { id: 'skip', label: '不發動' },
            ],
          }
          return
        }
      }
      if (weaponKind(p) === 'cixiong' && oppositeGender(p, state.players[tid])) {
        state.pending = {
          type: 'sha',
          sourceId: playerId,
          targetId: tid,
          cardUid: card.uid,
          damageCard: card,
          extraTargets: extras,
        }
        state.prompt = {
          kind: 'choice',
          message: `【雌雄雙股劍】：${state.players[tid].name} 請選擇`,
          actorId: tid,
          choiceKey: 'cixiong',
          choices: [
            { id: 'discard', label: '棄一張手牌' },
            { id: 'draw', label: '令對方摸一張牌' },
          ],
        }
        return
      }
      state.pending = {
        type: 'sha',
        sourceId: playerId,
        targetId: tid,
        cardUid: card.uid,
        damageCard: card,
        extraTargets: extras,
      }
      askShan(state, playerId, tid, card.uid)
    }

    const [first, ...rest] = targetIds
    startShaVs(first, rest)
    return
  }

  const targetId = targetIds[0]
  if (targetId === undefined) {
    setPlayPrompt(state)
    return
  }

  if (kind === 'juedou') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【決鬥】。`)
    if (playerSkills(p).includes('jiang')) {
      draw(state, playerId, 1)
      log(state, `${p.name} 發動激昂，摸一張牌。`)
    }
    const jt = state.players[targetId]
    if (playerSkills(jt).includes('jiang')) {
      draw(state, targetId, 1)
      log(state, `${jt.name} 發動激昂，摸一張牌。`)
    }
    afterTrick(state, p)
    observePublicEvent(state, { type: 'attack', sourceId: playerId, targetId, kind: 'juedou' })
    beginWuxieWindow(state, { type: 'juedou', sourceId: playerId, targetId, card })
    return
  }

  if (kind === 'guohe') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【過河拆橋】。`)
    afterTrick(state, p)
    observePublicEvent(state, { type: 'attack', sourceId: playerId, targetId, kind: '過河拆橋' })
    beginWuxieWindow(state, { type: 'guohe', sourceId: playerId, targetId })
    return
  }

  if (kind === 'shunshou') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【順手牽羊】。`)
    afterTrick(state, p)
    observePublicEvent(state, { type: 'attack', sourceId: playerId, targetId, kind: '順手牽羊' })
    beginWuxieWindow(state, { type: 'shunshou', sourceId: playerId, targetId })
    return
  }

  if (kind === 'huogong') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【火攻】。`)
    afterTrick(state, p)
    observePublicEvent(state, { type: 'attack', sourceId: playerId, targetId, kind: 'huogong' })
    beginWuxieWindow(state, { type: 'huogong', sourceId: playerId, targetId, card })
    return
  }

  setPlayFx(state, {
    cardName: def.name,
    suit: def.suit,
    rank: def.rank,
    sourceId: playerId,
    targetIds: [targetId],
  })
  log(state, `${p.name} 使用【${def.name}】。`)
  setPlayPrompt(state)
}

export function playEquip(state: GameSnapshot, playerId: number, card: CardInstance): void {
  const p = state.players[playerId]
  const def = getCardDef(card.defId)
  if (!def.slot) return
  takeHand(state, playerId, card.uid)
  const old = p.equips[def.slot]
  if (old) {
    leaveEquipArea(state, playerId, def.slot, old)
  }
  p.equips[def.slot] = card
  log(state, `${p.name} 裝備【${def.name}】。`)
}

/** Remove an equip and resolve 白銀獅子 / 梟姬 */
export function leaveEquipArea(
  state: GameSnapshot,
  playerId: number,
  slot: EquipSlot,
  card: CardInstance,
): void {
  const p = state.players[playerId]
  delete p.equips[slot]
  const kind = getCardDef(card.defId).kind
  discardCard(state, card)
  if (kind === 'baiyin') {
    p.hp = Math.min(p.maxHp, p.hp + 1)
    log(state, `${p.name} 失去【白銀獅子】，回覆1點體力（${p.hp}）。`)
  }
  if (p.alive && playerSkills(p).includes('xiaoji')) {
    draw(state, playerId, 2)
    log(state, `${p.name} 發動梟姬，摸兩張牌。`)
  }
}

export function notifyMovedEquips(
  state: GameSnapshot,
  p: PlayerState,
  oldEquips: PlayerState['equips'],
): void {
  for (const slot of equipSlots()) {
    const was = oldEquips[slot]
    const now = p.equips[slot]
    if (was && (!now || now.uid !== was.uid)) {
      if (getCardDef(was.defId).kind === 'baiyin') {
        p.hp = Math.min(p.maxHp, p.hp + 1)
        log(state, `${p.name} 失去【白銀獅子】，回覆1點體力（${p.hp}）。`)
      }
      if (p.alive && playerSkills(p).includes('xiaoji')) {
        draw(state, p.id, 2)
        log(state, `${p.name} 發動梟姬，摸兩張牌。`)
      }
    }
  }
}

export function continueLuanwu(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  if (getDying(state) || startDyingIfPending(state)) return
  const extra = state as GameSnapshot & { _luanwu?: { sourceId: number; queue: number[] } }
  const L = extra._luanwu
  if (!L) {
    if (state.phase === 'play') setPlayPrompt(state)
    return
  }
  while (L.queue.length) {
    const tid = L.queue.shift()!
    const t = state.players[tid]
    if (!t?.alive) continue
    const others = state.players.filter((x) => x.alive && x.id !== tid)
    if (!others.length) continue
    let minD = 99
    for (const o of others) minD = Math.min(minD, getDistance(state, tid, o.id))
    const nearest = others.filter((o) => getDistance(state, tid, o.id) === minD)
    const shaCards = responseCards(t, 'sha')
    const canKill = shaCards.length > 0 && nearest.some((o) => canReach(state, tid, o.id))
    if (canKill) {
      state.prompt = {
        kind: 'choice',
        message: `【亂武】${t.name}：對距離最近的角色使用【殺】，否則失去1點體力`,
        actorId: tid,
        choiceKey: 'luanwu_act',
        cardUids: shaCards.map((c) => c.uid),
        choices: [
          ...nearest
            .filter((o) => canReach(state, tid, o.id))
            .map((o) => ({ id: `sha:${o.id}`, label: `對 ${o.name} 出殺` })),
          { id: 'lose', label: '失去1點體力' },
        ],
      }
      return
    }
    t.hp -= 1
    pushDamageFx(state, tid, 1)
    log(state, `${t.name} 因亂武失去1點體力。`)
    if (t.hp <= 0) {
      trySave(state, tid, L.sourceId)
      return
    }
  }
  delete extra._luanwu
  if (state.phase === 'play') setPlayPrompt(state)
}

export function resumeAfterResponse(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  const luanwu = (state as GameSnapshot & { _luanwu?: { sourceId: number; queue: number[] } })._luanwu
  if (luanwu) {
    continueLuanwu(state)
    return
  }
  const queue = getAoeQueue(state)
  if (queue) {
    continueAoe(state)
    return
  }
  // 神速 virtual 殺 is resolved while phase is still 'draw'; after it finishes,
  // advance into the play phase so the respond_shan prompt is cleared (otherwise
  // the defender keeps being asked for 閃 forever).
  if (state.phase === 'play' || state.phase === 'draw') {
    state.phase = 'play'
    setPlayPrompt(state)
  }
}

export type AoeQueue = {
  sourceId: number
  targets: number[]
  need: 'sha' | 'shan'
  name: string
  kind: string
  card?: CardInstance
}

export function getAoeQueue(state: GameSnapshot): AoeQueue | undefined {
  return (state as GameSnapshot & { _aoe?: AoeQueue })._aoe
}

export function clearAoeQueue(state: GameSnapshot): void {
  const queue = getAoeQueue(state)
  delete (state as GameSnapshot & { _aoe?: AoeQueue })._aoe
  if (queue?.kind === 'nanman') {
    const zhurong = state.players.find((p) => p.alive && playerSkills(p).includes('juxiang'))
    if (zhurong) {
      draw(state, zhurong.id, 1)
      log(state, `${zhurong.name} 發動巨象，摸一張牌。`)
    }
  }
}

/** Before each AOE target: offer 無懈 against that seat only. */
export function continueAoe(state: GameSnapshot): void {
  const queue = getAoeQueue(state)
  if (!queue) {
    if (state.phase === 'play') setPlayPrompt(state)
    return
  }
  if (!queue.targets.length) {
    clearAoeQueue(state)
    if (state.phase === 'play') setPlayPrompt(state)
    return
  }
  const next = queue.targets[0]
  beginWuxieWindow(state, {
    type: 'aoe_target',
    sourceId: queue.sourceId,
    targetId: next,
    kind: queue.kind,
    name: queue.name,
    need: queue.need,
    card: queue.card,
  })
}

export function resolveAOE(
  state: GameSnapshot,
  sourceId: number,
  targets: number[],
  need: 'sha' | 'shan',
  name: string,
  card?: CardInstance,
): void {
  const kind = need === 'sha' ? 'nanman' : 'wanjian'
  ;(state as GameSnapshot & { _aoe?: AoeQueue })._aoe = {
    sourceId,
    targets: [...targets],
    need,
    name,
    kind,
    card,
  }
  continueAoe(state)
}

export function askAOEResponse(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  need: 'sha' | 'shan',
  name: string,
): void {
  const target = state.players[targetId]
  const cards = responseCards(target, need)
  const aoe = getAoeQueue(state)
  if (aoe?.kind === 'nanman') {
    const menghuo = state.players.find((p) => p.alive && playerSkills(p).includes('huoshou'))
    if (menghuo) sourceId = menghuo.id
  }
  if (cards.length === 0) {
    dealDamage(state, targetId, 1, sourceId, 'normal', aoe?.card)
    log(state, `${target.name} 無法響應【${name}】，受到 1 點傷害。`)
    if (!isAwaitingZonePick(state)) resumeAfterResponse(state)
    return
  }
  state.prompt = {
    kind: need === 'shan' ? 'respond_shan' : 'respond_sha',
    message: `${target.name} 請打出【${need === 'shan' ? '閃' : '殺'}】響應【${name}】`,
    actorId: targetId,
    cardUids: cards.map((c) => c.uid),
    respondKinds: [need],
  }
}

export function resolveJuedou(
  state: GameSnapshot,
  a: number,
  b: number,
  damageCard?: CardInstance,
): void {
  type JuedouState = {
    sourceId: number
    targetId: number
    currentId: number
    shaNeeded: number
    card?: CardInstance
  }
  const extra = state as GameSnapshot & { _juedou?: JuedouState }
  extra._juedou = {
    sourceId: a,
    targetId: b,
    currentId: b,
    shaNeeded: juedouShaNeeded(state, a, b, b),
    card: damageCard,
  }
  askJuedouSha(state)
}

export function juedouShaNeeded(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  responderId: number,
): number {
  const otherId = responderId === sourceId ? targetId : sourceId
  return playerSkills(state.players[otherId]).includes('wushuang') ? 2 : 1
}

export function getJuedou(state: GameSnapshot): {
  sourceId: number
  targetId: number
  currentId: number
  shaNeeded: number
  card?: CardInstance
} | undefined {
  return (state as GameSnapshot & { _juedou?: {
    sourceId: number
    targetId: number
    currentId: number
    shaNeeded: number
    card?: CardInstance
  } })._juedou
}

export function askJuedouSha(state: GameSnapshot): void {
  const j = getJuedou(state)
  if (!j) {
    if (state.phase === 'play') setPlayPrompt(state)
    return
  }
  const p = state.players[j.currentId]
  if (!p?.alive) {
    finishJuedouLose(state, j.currentId)
    return
  }
  const cards = responseCards(p, 'sha')
  if (!cards.length) {
    finishJuedouLose(state, j.currentId)
    return
  }
  state.prompt = {
    kind: 'respond_sha',
    message: `【決鬥】${p.name} 請打出【殺】${j.shaNeeded > 1 ? `（無雙：需 ${j.shaNeeded} 張）` : ''}`,
    actorId: j.currentId,
    cardUids: cards.map((c) => c.uid),
    respondKinds: ['sha'],
  }
}

export function onJuedouShaPlayed(state: GameSnapshot): void {
  const j = getJuedou(state)
  if (!j) return
  j.shaNeeded -= 1
  if (j.shaNeeded > 0) {
    askJuedouSha(state)
    return
  }
  j.currentId = j.currentId === j.sourceId ? j.targetId : j.sourceId
  j.shaNeeded = juedouShaNeeded(state, j.sourceId, j.targetId, j.currentId)
  askJuedouSha(state)
}

export function finishJuedouLose(state: GameSnapshot, loserId: number): void {
  const j = getJuedou(state)
  delete (state as GameSnapshot & { _juedou?: unknown })._juedou
  if (!j) {
    if (state.phase === 'play') setPlayPrompt(state)
    return
  }
  const winnerId = loserId === j.sourceId ? j.targetId : j.sourceId
  let dmg = 1
  const winner = state.players[winnerId]
  if (winner?.luoyiActive && winnerId === j.sourceId) dmg++
  log(state, `${state.players[loserId]?.name ?? ''} 無法打出【殺】，【決鬥】受傷。`)
  if (dealDamage(state, loserId, dmg, winnerId, 'normal', j.card)) return
  checkVictory(state)
  if (!state.winnerIds && !isAwaitingZonePick(state)) setPlayPrompt(state)
}

export function startHuogong(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  card?: CardInstance,
): void {
  const target = state.players[targetId]
  if (!target?.alive) {
    setPlayPrompt(state)
    return
  }
  if (!target.hand.length) {
    log(state, `${target.name} 沒有手牌，【火攻】無效。`)
    setPlayPrompt(state)
    return
  }
  ;(state as GameSnapshot & {
    _huogong?: { sourceId: number; targetId: number; card?: CardInstance }
  })._huogong = { sourceId, targetId, card }
  state.prompt = {
    kind: 'choice',
    message: `【火攻】${target.name} 展示一張手牌`,
    actorId: targetId,
    choiceKey: 'huogong_show',
    choices: target.hand.map((c) => {
      const d = getCardDef(c.defId)
      return { id: c.uid, label: `${d.name}${d.suit ? ` ${suitShort(d.suit)}` : ''}` }
    }),
  }
}

export function listZoneOptions(
  p: PlayerState,
  opts: { handOnly?: boolean; revealHand: boolean },
): { id: string; label: string }[] {
  const choices: { id: string; label: string }[] = []
  let hiddenIndex = 0
  for (const c of p.hand) {
    hiddenIndex++
    if (opts.revealHand) {
      const cdef = getCardDef(c.defId)
      choices.push({
        id: `hand:${c.uid}`,
        label: `手牌・${cdef.name}${cdef.suit ? ` ${suitShort(cdef.suit)}${rankShort(cdef.rank)}` : ''}`,
      })
    } else {
      choices.push({
        id: `hand:${c.uid}`,
        label: `手牌（暗・${hiddenIndex}）`,
      })
    }
  }
  if (!opts.handOnly) {
    for (const slot of equipSlots()) {
      const e = p.equips[slot]
      if (e) {
        choices.push({
          id: `equip:${slot}`,
          label: `裝備・${getCardDef(e.defId).name}`,
        })
      }
    }
    for (const j of p.judges ?? []) {
      const jdef = getCardDef(j.defId)
      choices.push({
        id: `judge:${j.uid}`,
        label: `判定・${jdef.name}`,
      })
    }
  }
  return choices
}

export function beginZonePick(
  state: GameSnapshot,
  opts: {
    actorId: number
    ownerId: number
    count: number
    skillId: string
    mode: 'discard' | 'steal'
    message: string
    handOnly?: boolean
  },
): void {
  const owner = state.players[opts.ownerId]
  const revealHand = opts.actorId === opts.ownerId
  const options = listZoneOptions(owner, {
    handOnly: opts.handOnly,
    revealHand,
  })
  const count = Math.min(opts.count, options.length)
  if (count <= 0) {
    finishZonePickSkill(state, opts.skillId, [])
    return
  }
  if (options.length === count && count === 1) {
    applyZoneCardIds(state, opts.actorId, opts.ownerId, [options[0].id], opts.mode)
    finishZonePickSkill(state, opts.skillId, [options[0].id])
    return
  }
  state.prompt = {
    kind: 'choice',
    message: opts.message,
    actorId: opts.actorId,
    choiceKey: 'zone_pick',
    skillId: opts.skillId,
    pickOwnerId: opts.ownerId,
    pickMode: opts.mode,
    targetIds: [opts.ownerId],
    minTargets: count,
    maxTargets: count,
    selectedCardUids: [],
    choices: buildZonePickChoices(options, [], count),
  }
}

export function buildZonePickChoices(
  options: { id: string; label: string }[],
  selected: string[],
  need: number,
): { id: string; label: string }[] {
  const toggles = options.map((o) => ({
    id: o.id,
    label: `${selected.includes(o.id) ? '✓ ' : ''}${o.label}`,
  }))
  return [
    ...toggles,
    {
      id: 'confirm',
      label: selected.length >= need ? `確認（${selected.length}/${need}）` : `請再選（${selected.length}/${need}）`,
    },
  ]
}

export function handleZonePickClick(state: GameSnapshot, playerId: number, choiceId: string): void {
  if (state.prompt.kind !== 'choice' || state.prompt.choiceKey !== 'zone_pick') return
  if (state.prompt.actorId !== playerId) return
  const need = state.prompt.minTargets ?? 1
  const ownerId = state.prompt.pickOwnerId ?? state.prompt.targetIds?.[0]
  const mode = state.prompt.pickMode ?? 'discard'
  const skillId = state.prompt.skillId ?? ''
  if (ownerId === undefined) return

  const owner = state.players[ownerId]
  const handOnly = skillId === 'cixiong'
  const revealHand = playerId === ownerId
  const options = listZoneOptions(owner, { handOnly, revealHand })
  let selected = [...(state.prompt.selectedCardUids ?? [])]

  if (choiceId === 'confirm') {
    if (selected.length < need) return
    const picked = selected.slice(0, need)
    applyZoneCardIds(state, playerId, ownerId, picked, mode)
    finishZonePickSkill(state, skillId, picked)
    return
  }

  if (!options.some((o) => o.id === choiceId)) return
  const idx = selected.indexOf(choiceId)
  if (idx >= 0) selected.splice(idx, 1)
  else if (selected.length < need) selected.push(choiceId)
  else {
    // replace last
    selected[selected.length - 1] = choiceId
  }

  // Single-pick: selecting one card can auto-confirm
  if (need === 1 && selected.length === 1) {
    applyZoneCardIds(state, playerId, ownerId, selected, mode)
    finishZonePickSkill(state, skillId, selected)
    return
  }

  state.prompt = {
    ...state.prompt,
    selectedCardUids: selected,
    message: `${(state.prompt.message ?? '').split('（')[0]}（已選 ${selected.length}/${need}）`,
    choices: buildZonePickChoices(options, selected, need),
  }
}

export function applyZoneCardIds(
  state: GameSnapshot,
  actorId: number,
  ownerId: number,
  ids: string[],
  mode: 'discard' | 'steal',
): void {
  const owner = state.players[ownerId]
  const actor = state.players[actorId]
  let moved = 0
  for (const id of ids) {
    if (id.startsWith('hand:')) {
      const uid = id.slice(5)
      const idx = owner.hand.findIndex((c) => c.uid === uid)
      if (idx < 0) continue
      const c = owner.hand.splice(idx, 1)[0]
      const name = getCardDef(c.defId).name
      if (mode === 'steal') {
        actor.hand.push(c)
        moved++
        log(state, `${actor.name} 獲得了 ${owner.name} 的【${name}】。`)
      } else if (actorId === ownerId) {
        discardCard(state, c)
        log(state, `${owner.name} 棄置了【${name}】。`)
      } else {
        discardCard(state, c)
        log(state, `${actor.name} 棄置了 ${owner.name} 的【${name}】。`)
      }
      if (playerSkills(owner).includes('lianying') && owner.hand.length === 0) {
        draw(state, ownerId, 1)
        log(state, `${owner.name} 發動連營，摸一張牌。`)
      }
      continue
    }
    if (id.startsWith('equip:')) {
      const slot = id.slice(6) as EquipSlot
      const e = owner.equips[slot]
      if (!e) continue
      const name = getCardDef(e.defId).name
      if (mode === 'steal') {
        delete owner.equips[slot]
        actor.hand.push(e)
        moved++
        if (getCardDef(e.defId).kind === 'baiyin' && owner.alive) {
          owner.hp = Math.min(owner.maxHp, owner.hp + 1)
          log(state, `${owner.name} 失去【白銀獅子】，回覆1點體力。`)
        }
        if (playerSkills(owner).includes('xiaoji')) {
          draw(state, ownerId, 2)
          log(state, `${owner.name} 發動梟姬，摸兩張牌。`)
        }
        log(state, `${actor.name} 獲得了【${name}】。`)
      } else {
        leaveEquipArea(state, ownerId, slot, e)
        if (actorId === ownerId) log(state, `${owner.name} 棄置了【${name}】。`)
        else log(state, `${actor.name} 棄置了 ${owner.name} 的【${name}】。`)
      }
      continue
    }
    if (id.startsWith('judge:')) {
      const uid = id.slice(6)
      if (!owner.judges) owner.judges = []
      const idx = owner.judges.findIndex((c) => c.uid === uid)
      if (idx < 0) continue
      const c = owner.judges.splice(idx, 1)[0]
      const name = getCardDef(c.defId).name
      if (mode === 'steal') {
        actor.hand.push(c)
        moved++
        log(state, `${actor.name} 獲得了 ${owner.name} 判定區的【${name}】。`)
      } else {
        discardCard(state, c)
        log(state, `${actor.name} 棄置了 ${owner.name} 判定區的【${name}】。`)
      }
    }
  }
  if (mode === 'steal' && moved >= 2 && playerSkills(actor).includes('enyuan') && owner.alive) {
    draw(state, ownerId, 1)
    log(state, `${actor.name} 的【恩怨】發動，${owner.name} 摸一張牌。`)
  }
}

export function finishZonePickSkill(state: GameSnapshot, skillId: string, _ids: string[]): void {
  // Clear completed zone_pick so damage / resume flows do not treat it as still open.
  if (state.prompt.kind === 'choice' && state.prompt.choiceKey === 'zone_pick') {
    state.prompt = idlePrompt()
  }

  if (skillId === 'guanshi') {
    if (state.pending?.type === 'sha') {
      const name = state.players[state.pending.sourceId].name
      log(state, `${name} 發動【貫石斧】，棄牌令殺生效。`)
    }
    finishShaHit(state, 1)
    return
  }
  if (skillId === 'hanbing' && state.pending?.type === 'sha') {
    log(state, `${state.players[state.pending.sourceId].name} 發動【寒冰劍】，改為棄置對方的牌。`)
    const extras = state.pending.extraTargets ?? []
    const cardUid = state.pending.cardUid
    const damageCard = state.pending.damageCard
    const sourceId = state.pending.sourceId
    continueShaQueue(state, sourceId, cardUid, extras, damageCard)
    return
  }
  if (skillId === 'guohe' || skillId === 'shunshou') {
    setPlayPrompt(state)
    return
  }
  if (skillId === 'liuli' && state.pending?.type === 'sha') {
    const to = (state as GameSnapshot & { _liuliTo?: number })._liuliTo
    delete (state as GameSnapshot & { _liuliTo?: number })._liuliTo
    if (to === undefined || !state.players[to]?.alive) {
      askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
      return
    }
    const fromName = state.players[state.pending.targetId].name
    log(state, `${fromName} 發動【流離】，將殺轉移給 ${state.players[to].name}。`)
    state.pending.targetId = to
    askShan(state, state.pending.sourceId, to, state.pending.cardUid)
    return
  }
  if (skillId === 'cixiong' && state.pending?.type === 'sha') {
    askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
    return
  }
  if (skillId === 'fankui' || skillId === 'ganglie') {
    resumeAfterDamageFlow(state)
    return
  }
  if (skillId === 'xuanhuo') {
    const pending = (state as GameSnapshot & {
      _xuanhuo?: { actorId: number; targetId: number }
    })._xuanhuo
    delete (state as GameSnapshot & { _xuanhuo?: unknown })._xuanhuo
    if (pending) {
      log(state, `${state.players[pending.actorId].name} 因【眩惑】獲得 ${state.players[pending.targetId].name} 的牌。`)
    }
    continueBeginTurn(state)
    return
  }
  setPlayPrompt(state)
}

export function isAwaitingZonePick(state: GameSnapshot): boolean {
  return (
    state.prompt.kind === 'choice' &&
    (state.prompt.choiceKey === 'zone_pick' ||
      state.prompt.choiceKey === 'ganglie' ||
      state.prompt.choiceKey === 'jianxiong' ||
      state.prompt.choiceKey === 'enyuan' ||
      state.prompt.choiceKey === 'buyi' ||
      state.prompt.choiceKey === 'xiansi_cancel' ||
      state.prompt.choiceKey === 'yaowu' ||
      state.prompt.choiceKey === 'dying_save' ||
      state.prompt.choiceKey === 'jieming')
  )
}

export function resumeAfterDamageFlow(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return

  const deferred = (state as GameSnapshot & {
    _enyuanDeferredDying?: { targetId: number; killerId: number | null }
  })._enyuanDeferredDying
  if (!getDying(state) && deferred) {
    delete (state as GameSnapshot & { _enyuanDeferredDying?: unknown })._enyuanDeferredDying
    ;(state as GameSnapshot & {
      _pendingDying?: { targetId: number; killerId: number | null }
    })._pendingDying = deferred
  }

  const fangzhu = (state as GameSnapshot & { _fangzhu?: { actorId: number; lost: number } })._fangzhu
  if (fangzhu && state.prompt.choiceKey !== 'fangzhu_target') {
    const others = state.players.filter((p) => p.alive && p.id !== fangzhu.actorId)
    if (others.length && state.players[fangzhu.actorId]?.alive !== undefined) {
      state.prompt = {
        kind: 'choice',
        message: `【放逐】選擇一名角色摸 ${fangzhu.lost} 張並跳過其下回合出牌階段`,
        actorId: fangzhu.actorId,
        choiceKey: 'fangzhu_target',
        choices: others.map((p) => ({ id: String(p.id), label: p.name })),
      }
      return
    }
    delete (state as GameSnapshot & { _fangzhu?: unknown })._fangzhu
  }

  const beigePend = (state as GameSnapshot & {
    _beige?: { actorId: number; sourceId: number | null; targetId: number }
  })._beige
  if (beigePend && state.prompt.choiceKey !== 'beige' && state.prompt.choiceKey !== 'beige_card') {
    const actor = state.players[beigePend.actorId]
    if (actor?.alive && actor.hand.length) {
      state.prompt = {
        kind: 'choice',
        message: `【悲歌】是否棄一張牌判定，改變此次【殺】的後果？`,
        actorId: actor.id,
        choiceKey: 'beige',
        choices: [
          { id: 'yes', label: '發動悲歌' },
          { id: 'skip', label: '不發動' },
        ],
      }
      return
    }
    delete (state as GameSnapshot & { _beige?: unknown })._beige
  }

  if (startDyingIfPending(state)) return

  const dodged = (state as GameSnapshot & { _shaDodged?: { sourceId: number; targetId: number } })
    ._shaDodged
  if (dodged) {
    delete (state as GameSnapshot & { _shaDodged?: unknown })._shaDodged
    const q = (state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue
    if (q) {
      state.pending = {
        type: 'sha',
        sourceId: dodged.sourceId,
        targetId: dodged.targetId,
        cardUid: q.cardUid,
        damageCard: q.damageCard,
        extraTargets: q.extras,
      }
    }
    onShaDodged(state, dodged.sourceId, dodged.targetId)
    return
  }

  if (state.pending?.type === 'sha') {
    const pending = state.pending
    const source = state.players[pending.sourceId]
    const target = state.players[pending.targetId]
    if (weaponKind(source) === 'qilingong' && target.alive) {
      const horses = targetHorses(target)
      if (horses.length) {
        ;(state as GameSnapshot & {
          _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
        })._shaQueue = {
          sourceId: pending.sourceId,
          cardUid: pending.cardUid,
          extras: pending.extraTargets ?? [],
          damageCard: pending.damageCard,
        }
        state.pending = undefined
        state.prompt = {
          kind: 'choice',
          message: `是否發動【麒麟弓】棄置 ${target.name} 的坐騎？`,
          actorId: pending.sourceId,
          choiceKey: 'qilingong',
          targetIds: [pending.targetId],
          choices: [
            ...horses.map((slot) => ({
              id: slot,
              label: `棄置【${horseLabel(slot, target)}】`,
            })),
            { id: 'skip', label: '不發動' },
          ],
        }
        return
      }
    }
    continueShaQueue(
      state,
      pending.sourceId,
      pending.cardUid,
      pending.extraTargets ?? [],
      pending.damageCard,
    )
    return
  }
  if ((state as GameSnapshot & { _resumeBeginTurn?: boolean })._resumeBeginTurn) {
    delete (state as GameSnapshot & { _resumeBeginTurn?: boolean })._resumeBeginTurn
    if (state.players[state.currentPlayer]?.alive) {
      continueBeginTurn(state)
      return
    }
    advanceTurn(state)
    return
  }
  resumeAfterResponse(state)
}

export function askDismantle(state: GameSnapshot, sourceId: number, targetId: number): void {
  beginZonePick(state, {
    actorId: sourceId,
    ownerId: targetId,
    count: 1,
    skillId: 'guohe',
    mode: 'discard',
    message: `【過河拆橋】選擇棄置 ${state.players[targetId].name} 的一張牌`,
  })
}

export function suitShort(suit: string): string {
  return ({ spade: '♠', heart: '♥', club: '♣', diamond: '♦' } as Record<string, string>)[suit] ?? ''
}

export function rankShort(rank: number | undefined): string {
  if (rank === undefined) return ''
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

export function endPlayPhase(state: GameSnapshot, playerId: number): void {
  if (state.currentPlayer !== playerId || state.phase !== 'play') return
  if (state.prompt.kind === 'respond_shan' || state.prompt.kind === 'respond_sha') return
  const p = state.players[playerId]
  const skills = playerSkills(p)

  if (skills.includes('jushou')) {
    state.prompt = {
      kind: 'choice',
      message: '【據守】是否摸三張牌並跳過下回合出牌階段？',
      actorId: playerId,
      choiceKey: 'jushou',
      choices: [
        { id: 'yes', label: '發動據守' },
        { id: 'no', label: '不發動' },
      ],
    }
    return
  }
  finishEndPhase(state, playerId)
}

export function finishEndPhase(state: GameSnapshot, playerId: number): void {
  const p = state.players[playerId]
  const skills = playerSkills(p)

  // 閉月
  if (skills.includes('biyue')) {
    draw(state, playerId, 1)
    log(state, `${p.name} 發動閉月，摸一張牌。`)
  }

  // 克己：未出殺跳過棄牌
  if (skills.includes('keji') && !p.shaUsedThisTurn && !p.shaPlayedThisTurn) {
    log(state, `${p.name} 發動克己，跳過棄牌階段。`)
    advanceTurn(state)
    return
  }

  const limit = handLimit(p)
  const extra = p.hand.length - limit
  if (extra > 0) {
    state.phase = 'discard'
    state.prompt = {
      kind: 'discard',
      message: `${p.name} 需棄 ${extra} 張牌`,
      actorId: playerId,
      cardUids: p.hand.map((c) => c.uid),
      discardCount: extra,
    }
    return
  }
  advanceTurn(state)
}

export function handleDiscardPick(state: GameSnapshot, playerId: number, uid: string): void {
  const p = state.players[playerId]
  const need = state.prompt.discardCount ?? 0
  const c = takeHand(state, playerId, uid)
  if (!c) return
  discardCard(state, c)
  const left = need - 1
  if (left > 0) {
    state.prompt = {
      ...state.prompt,
      discardCount: left,
      message: `${p.name} 需棄 ${left} 張牌`,
      cardUids: p.hand.map((x) => x.uid),
    }
    return
  }
  const guzheng = state.players.find(
    (x) => x.alive && x.id !== playerId && playerSkills(x).includes('guzheng'),
  )
  if (guzheng) {
    draw(state, guzheng.id, 1)
    log(state, `${guzheng.name} 發動固政，摸一張牌。`)
  }
  advanceTurn(state)
}

export function advanceTurn(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  const n = state.players.length
  let next = state.currentPlayer
  for (let i = 0; i < n; i++) {
    next = (next + 1) % n
    if (state.players[next].alive) break
  }
  if (next <= state.currentPlayer) state.round++
  state.currentPlayer = next
  checkVictory(state)
  if (state.winnerIds) return
  beginTurn(state)
}

export function cancelTarget(state: GameSnapshot, playerId: number): void {
  if (state.prompt.actorId !== playerId) return
  const key = state.prompt.choiceKey
  if (key === 'tuxi' || key === 'tuxi_target' || key === 'tuxi_second') {
    if (key === 'tuxi_second' || (state.prompt.selectedTargetIds?.length ?? 0) > 0) {
      turnSkipOf(state).skipDraw = true
    }
    continueBeginTurn(state)
    return
  }
  if (key === 'yinghun_target') {
    runPrepareSkills(state)
    return
  }
  if (key === 'shensu_sha') {
    if (turnSkipOf(state).skipPlay) {
      log(state, `${state.players[playerId].name} 跳過出牌階段。`)
      finishEndPhase(state, playerId)
    } else {
      state.phase = 'play'
      setPlayPrompt(state)
    }
    return
  }
  if (
    state.prompt.kind === 'choose_target' ||
    state.prompt.kind === 'skill_cards' ||
    (state.prompt.kind === 'choice' &&
      (key === 'fangtian_confirm' ||
        key === 'rende_target' ||
        key === 'zhangba_target' ||
        key === 'qiangxi_cost' ||
        key === 'qiangxi_target' ||
        key === 'tiaoxin_target' ||
        key === 'xiansi_target' ||
        key === 'tianyi_target' ||
        key === 'quhu_target' ||
        key === 'zhiba_target'))
  ) {
    delete (state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost
    setPlayPrompt(state)
  }
}

export function legalTargetsForPrompt(state: GameSnapshot): number[] {
  return state.prompt.targetIds ?? []
}

/** Compute legal targets for a card kind (for UI/tests) */
export function getLegalTargets(
  state: GameSnapshot,
  playerId: number,
  kind: string,
): number[] {
  return legalTargets(state, playerId, kind)
}

export function getAttackRange(p: PlayerState): number {
  return attackRangeOf(p)
}
