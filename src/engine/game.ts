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
import { initAiMind, observePublicEvent } from '../ai/mind'

let uidSeq = 1
let fxSeq = 1
function nextUid(): string {
  return `c${uidSeq++}`
}

function nextFxSeq(): number {
  return fxSeq++
}

function setPlayFx(
  state: GameSnapshot,
  opts: {
    cardName: string
    suit?: Suit
    rank?: number
    sourceId: number
    targetIds: number[]
    note?: string
  },
): void {
  state.fx.play = {
    ...opts,
    seq: nextFxSeq(),
  }
  state.fx.damages = []
}

function pushDamageFx(state: GameSnapshot, playerId: number, amount: number): void {
  state.fx.damages = [
    ...state.fx.damages.filter((d) => d.playerId !== playerId),
    { playerId, amount, seq: nextFxSeq() },
  ]
}

/** Remove center played-card (and finished damage pops) after the effect resolves */
export function clearPlayFx(state: GameSnapshot): void {
  state.fx.play = null
  state.fx.damages = []
}

export function createMatch(config: MatchConfig): GameSnapshot {
  uidSeq = 1
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
  log(state, '發牌完成，戰斗開始。')
  beginTurn(state)
  return state
}

/** After human picks a general: assign AI generals, deal, start */
export function confirmGeneralPick(state: GameSnapshot, generalId: string): void {
  if (state.matchPhase !== 'pick_general' || state.prompt.kind !== 'choose_general') return
  const offered = state.prompt.generalIds ?? []
  if (offered.length && !offered.includes(generalId)) return

  const human = state.players.find((p) => p.isHuman)
  if (!human) return

  applyGeneral(human, generalId)
  log(state, `你選擇了武將【${getGeneral(generalId).name}】。`)

  const used = new Set<string>([generalId])
  const pool = listPickPool().filter((id) => !used.has(id))
  const shuffled = shuffle(pool)

  for (const p of state.players) {
    if (p.isHuman) continue
    const gid = shuffled.pop()
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
  initAiMind(state)
  for (const pl of state.players) {
    draw(state, pl.id, 4)
  }
  log(state, '發牌完成，戰斗開始。')
  beginTurn(state)
}

function applyGeneral(p: PlayerState, generalId: string): void {
  const g = getGeneral(generalId)
  p.generalId = generalId
  p.maxHp = g.maxHp
  p.hp = g.maxHp
}

function listPickPool(): string[] {
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

function idlePrompt(): PromptState {
  return { kind: 'idle', message: '', actorId: null }
}

function log(state: GameSnapshot, text: string): void {
  state.log.push({ text, t: Date.now() })
  if (state.log.length > 80) state.log.shift()
}

function draw(state: GameSnapshot, playerId: number, n: number): void {
  const p = state.players[playerId]
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break
      state.deck = shuffle(state.discard)
      state.discard = []
      log(state, '牌堆耗盡，重洗棄牌堆。')
    }
    const c = state.deck.pop()
    if (c) p.hand.push(c)
  }
}

function discardCard(state: GameSnapshot, card: CardInstance): void {
  state.discard.push(card)
}

/** Remove from hand and trigger 連營 if it was the last card */
function takeHand(state: GameSnapshot, playerId: number, uid: string): CardInstance | null {
  const p = state.players[playerId]
  const before = p.hand.length
  const card = removeHandCard(p, uid)
  if (card && state.currentPlayer !== playerId && playerSkills(p).includes('tuntian')) {
    p.tianCount = (p.tianCount ?? 0) + 1
    log(state, `${p.name} 發動屯田，獲得一張「田」（共 ${p.tianCount} 張）。`)
  }
  if (card && before === 1 && playerSkills(p).includes('lianying')) {
    draw(state, playerId, 1)
    log(state, `${p.name} 發動連營，摸一張牌。`)
  }
  return card
}

function beginTurn(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p.alive) {
    advanceTurn(state)
    return
  }
  p.shaUsedThisTurn = false
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
  ;(state as GameSnapshot & {
    _turnSkip?: {
      skipDraw: boolean
      skipPlay: boolean
      xuanhuoAsked?: boolean
      shensuAsked?: boolean
      shuangxiongAsked?: boolean
    }
  })._turnSkip = {
    skipDraw: false,
    skipPlay: !!p.skipNextPlay,
  }
  p.skipNextPlay = false

  const skills = playerSkills(p)

  if (skills.includes('huashen') && !(p.extraSkills?.length)) {
    const pool = ['jianxiong', 'fankui', 'wusheng', 'qixi', 'yingzi']
    p.extraSkills = [pool[Math.floor(Math.random() * pool.length)]]
    log(state, `${p.name} 發動化身，獲得【${p.extraSkills[0]}】。`)
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

  if (playerSkills(p).includes('yinghun') && p.hp < p.maxHp) {
    const target = state.players.find((x) => x.alive && x.id !== p.id)
    if (target) {
      const lost = p.maxHp - p.hp
      draw(state, target.id, lost)
      if (target.hand.length) {
        const c = target.hand.shift()
        if (c) discardCard(state, c)
      }
      log(state, `${p.name} 發動英魂，令 ${target.name} 摸 ${lost} 張並棄一張。`)
    }
  }

  if (playerSkills(p).includes('xiansi')) {
    const victims = [...state.players.slice(p.id + 1), ...state.players.slice(0, p.id)]
      .filter(
        (x) =>
          x.alive &&
          x.id !== p.id &&
          (x.hand.length > 0 || equipSlots().some((slot) => !!x.equips[slot])),
      )
      .slice(0, 2)
    for (const victim of victims) {
      let card: CardInstance | undefined
      if (victim.hand.length) {
        card = victim.hand.splice(Math.floor(Math.random() * victim.hand.length), 1)[0]
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
  }

  // 觀星：準備階段觀看牌堆頂並調整
  if (playerSkills(p).includes('guanxing')) {
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

function finishGuanxing(state: GameSnapshot, mode: 'keep' | 'reverse' | 'bottom'): void {
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
type JudgePrefer = 'red' | 'black' | 'heart' | 'club' | 'nonheart'

function applyJudgeReplaceSync(
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
    const sk = getGeneral(pl.generalId).skills
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

function continueBeginTurn(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p?.alive) {
    advanceTurn(state)
    return
  }
  const skills = playerSkills(p)
  const turn = (state as GameSnapshot & {
    _turnSkip?: {
      skipDraw: boolean
      skipPlay: boolean
      xuanhuoAsked?: boolean
      shensuAsked?: boolean
      shuangxiongAsked?: boolean
    }
  })._turnSkip ?? { skipDraw: false, skipPlay: false }
  ;(state as GameSnapshot & { _turnSkip?: typeof turn })._turnSkip = turn

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
      message: '【神速】是否跳過摸牌階段，令本回合【殺】無距離限制？',
      actorId: p.id,
      choiceKey: 'shensu',
      choices: [
        { id: 'shensu_skip', label: '發動神速' },
        { id: 'shensu_normal', label: '正常摸牌' },
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

  // 判定階段：樂不思蜀／兵糧寸斷
  state.phase = 'judge'
  let skipDraw = turn.skipDraw
  let skipPlay = turn.skipPlay
  const pendingJudges = [...(p.judges ?? [])]
  for (const jCard of pendingJudges) {
    if (!p.judges?.some((x) => x.uid === jCard.uid)) continue
    p.judges = p.judges.filter((x) => x.uid !== jCard.uid)
    const jdef = getCardDef(jCard.defId)
    let judged = drawJudgeCard(state, shuffle)
    const preferJudge: JudgePrefer | undefined =
      jdef.kind === 'lebu' ? 'heart' : jdef.kind === 'bingliang' ? 'club' : undefined
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
    discardCard(state, jCard)
    if (jdef.kind === 'lebu') {
      if (suit === 'heart') {
        log(state, `【樂不思蜀】判定為紅桃，無效。`)
      } else {
        skipPlay = true
        log(state, `【樂不思蜀】生效，${p.name} 本回合跳過出牌階段。`)
      }
    } else if (jdef.kind === 'bingliang') {
      if (suit === 'club') {
        log(state, `【兵糧寸斷】判定為梅花，無效。`)
      } else {
        skipDraw = true
        log(state, `【兵糧寸斷】生效，${p.name} 本回合跳過摸牌階段。`)
      }
    }
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
  if (!skipDraw) {
    let drawN = 2
    if (playerSkills(p).includes('yingzi')) drawN++
    if (skills.includes('haoshi')) drawN += 2

    if (skills.includes('tuxi')) {
      const victims = state.players.filter((o) => o.alive && o.id !== p.id && o.hand.length > 0)
      if (victims.length) {
        drawN = Math.max(0, drawN - 1)
        const v = victims[Math.floor(Math.random() * victims.length)]
        const c = v.hand.splice(Math.floor(Math.random() * v.hand.length), 1)[0]
        p.hand.push(c)
        log(state, `${p.name} 發動突襲，獲得 ${v.name} 一張手牌。`)
        if (getGeneral(v.generalId).skills.includes('lianying') && v.hand.length === 0) {
          draw(state, v.id, 1)
          log(state, `${v.name} 發動連營，摸一張牌。`)
        }
      }
    }

    if (skills.includes('zaiqi') && p.hp < p.maxHp) {
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
      draw(state, p.id, drawN)
    }
    log(state, `${p.name} 摸了 ${drawN} 張牌。`)
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

  if (skipPlay) {
    log(state, `${p.name} 跳過出牌階段。`)
    if (skills.includes('biyue')) {
      draw(state, p.id, 1)
      log(state, `${p.name} 發動閉月，摸一張牌。`)
    }
    advanceTurn(state)
    return
  }

  state.phase = 'play'
  setPlayPrompt(state)
}

function setPlayPrompt(state: GameSnapshot): void {
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

function canPlayCard(state: GameSnapshot, playerId: number, uid: string): boolean {
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
  if (skills.includes('jijiu') && isRedFor(p, card)) opts.push('tao')
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
        (playerSkills(t).includes('huoshou') || playerSkills(t).includes('juxiang'))
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

function afterTrick(state: GameSnapshot, p: PlayerState): void {
  if (getGeneral(p.generalId).skills.includes('jizhi')) {
    draw(state, p.id, 1)
    log(state, `${p.name} 發動集智，摸一張牌。`)
  }
}

type PendingTrick =
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

type WuxieState = {
  trick: PendingTrick
  cursor: number
  nullified: boolean
  asked: number
}

function getWuxie(state: GameSnapshot): WuxieState | undefined {
  return (state as GameSnapshot & { _wuxie?: WuxieState })._wuxie
}

function clearWuxie(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _wuxie?: WuxieState })._wuxie
}

function beginWuxieWindow(state: GameSnapshot, trick: PendingTrick): void {
  ;(state as GameSnapshot & { _wuxie?: WuxieState })._wuxie = {
    trick,
    cursor: (trick.sourceId + 1) % state.players.length,
    nullified: false,
    asked: 0,
  }
  continueWuxieAsk(state)
}

function continueWuxieAsk(state: GameSnapshot): void {
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

function resolvePendingTrick(state: GameSnapshot, trick: PendingTrick): void {
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
    dealDamage(state, trick.targetId, 1, trick.sourceId, 'fire', trick.card)
    if (!isAwaitingZonePick(state)) setPlayPrompt(state)
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

type WuguState = {
  pool: CardInstance[]
  order: number[]
  index: number
  sourceId: number
}

function getWugu(state: GameSnapshot): WuguState | undefined {
  return (state as GameSnapshot & { _wugu?: WuguState })._wugu
}

function clearWugu(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _wugu?: WuguState })._wugu
}

function startWugu(state: GameSnapshot, sourceId: number): void {
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
function continueWugu(state: GameSnapshot): void {
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

function askWuguPickUi(state: GameSnapshot, pickerId: number): void {
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
function legalTargets(state: GameSnapshot, playerId: number, kind: string): number[] {
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
        if (t.generalId && getGeneral(t.generalId).skills.includes('qianxun')) return false
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
        if (
          kind === 'lebu' &&
          t.generalId &&
          getGeneral(t.generalId).skills.includes('qianxun')
        ) {
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
        { id: 'confirm', label: '確認出殺' },
      ],
    }
    return
  }

  const targets = selected.length ? selected : [targetId]
  finishTargetedCard(state, playerId, uid, kind, targets)
}

function finishTargetedCard(
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
    setPlayPrompt(state)
    return
  }
  // 借刀：先選持刀者，不扣牌，再選殺目標
  if (kind === 'jiedao') {
    const targetId = targetIds[0]
    if (targetId === undefined) return
    const holder = state.players[targetId]
    const killTargets = state.players
      .filter(
        (t) =>
          t.alive &&
          t.id !== targetId &&
          t.id !== playerId &&
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
    if (p.generalId && getGeneral(p.generalId).skills.includes('jiang')) {
      draw(state, playerId, 1)
      log(state, `${p.name} 發動激昂，摸一張牌。`)
    }
    for (const tid of targetIds) {
      observePublicEvent(state, { type: 'attack', sourceId: playerId, targetId: tid, kind: 'sha' })
      const tp = state.players[tid]
      if (tp.generalId && getGeneral(tp.generalId).skills.includes('jiang')) {
        draw(state, tid, 1)
        log(state, `${tp.name} 發動激昂，摸一張牌。`)
      }
    }

    const startShaVs = (tid: number, extras: number[]) => {
      const target = state.players[tid]
      if (getGeneral(target.generalId).skills.includes('liuli') && countDiscardable(target) > 0) {
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
    if (p.generalId && getGeneral(p.generalId).skills.includes('jiang')) {
      draw(state, playerId, 1)
      log(state, `${p.name} 發動激昂，摸一張牌。`)
    }
    const jt = state.players[targetId]
    if (jt.generalId && getGeneral(jt.generalId).skills.includes('jiang')) {
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

function playEquip(state: GameSnapshot, playerId: number, card: CardInstance): void {
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
function leaveEquipArea(
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
  if (p.alive && getGeneral(p.generalId).skills.includes('xiaoji')) {
    draw(state, playerId, 2)
    log(state, `${p.name} 發動梟姬，摸兩張牌。`)
  }
}

function askShan(state: GameSnapshot, sourceId: number, targetId: number, cardUid: string): void {
  const target = state.players[targetId]
  const source = state.players[sourceId]
  const prev = state.pending?.type === 'sha' ? state.pending : undefined
  const shaCard =
    prev?.damageCard ??
    state.discard.find((c) => c.uid === cardUid) ??
    { uid: cardUid, defId: '' }
  const shaDefId = shaCard.defId || findRecentShaDef(state)
  const ignoreArm = ignoresArmor(source)

  const xiansiBypass = (state as GameSnapshot & { _xiansiBypass?: number })._xiansiBypass
  if (
    xiansiBypass !== targetId &&
    playerSkills(target).includes('xiansi') &&
    (target.niCards?.length ?? 0) >= 2
  ) {
    state.pending = {
      type: 'sha',
      sourceId,
      targetId,
      cardUid,
      damageCard: prev?.damageCard ?? (shaCard.defId ? shaCard : undefined),
      extraTargets: prev?.extraTargets,
    }
    state.prompt = {
      kind: 'choice',
      message: '【陷嗣】是否棄置兩張「逆」，令此【殺】無效？',
      actorId: targetId,
      choiceKey: 'xiansi_cancel',
      choices: [
        { id: 'yes', label: '棄兩張「逆」抵消' },
        { id: 'no', label: '不發動' },
      ],
    }
    return
  }
  delete (state as GameSnapshot & { _xiansiBypass?: number })._xiansiBypass

  if (playerSkills(target).includes('xiangle')) {
    const basic = source.hand.find((c) => getCardDef(c.defId).type === 'basic')
    if (!basic) {
      log(state, `${target.name} 的【享樂】令此【殺】無效。`)
      continueShaQueue(state, sourceId, cardUid, prev?.extraTargets ?? [], prev?.damageCard)
      return
    }
    const paid = takeHand(state, sourceId, basic.uid)
    if (paid) discardCard(state, paid)
    log(state, `${source.name} 為【享樂】棄置一張基本牌。`)
  }

  // 仁王盾：黑色殺無效（青釭劍無視防具）
  if (!ignoreArm && armorKind(target) === 'renwang') {
    if (shaDefId && isBlackCard({ uid: cardUid, defId: shaDefId })) {
      log(state, `${target.name} 的【仁王盾】抵消了黑色【殺】。`)
      continueShaQueue(state, sourceId, cardUid, prev?.extraTargets ?? [], prev?.damageCard)
      return
    }
  }

  state.pending = {
    type: 'sha',
    sourceId,
    targetId,
    cardUid,
    damageCard: prev?.damageCard ?? (shaCard.defId ? shaCard : undefined),
    extraTargets: prev?.extraTargets,
  }

  // 鐵騎：殺的目標判定，紅色則其不能出閃
  let skipShan = false
  if (getGeneral(source.generalId).skills.includes('tieqi')) {
    let judged = drawJudgeCard(state, shuffle)
    judged = applyJudgeReplaceSync(state, judged, 'red')
    if (judged) {
      discardCard(state, judged)
      const jdef = getCardDef(judged.defId)
      const red = isRedFor(source, judged)
      log(state, `${source.name} 鐵騎判定：${jdef.name}${red ? '（紅，目標不能出閃）' : '（黑）'}`)
      if (red) skipShan = true
    }
  }
  // 烈弓：目標手牌數≥來源則不能出閃
  if (
    !skipShan &&
    source.generalId &&
    getGeneral(source.generalId).skills.includes('liegong') &&
    target.hand.length >= source.hand.length
  ) {
    skipShan = true
    log(state, `${source.name} 發動烈弓，${target.name} 不能出【閃】。`)
  }
  if (skipShan) {
    state.pending.skipShan = true
    finishShaHit(state, 1)
    return
  }

  // 八卦陣：可判定當閃（青釭劍無視）
  if (
    !ignoreArm &&
    (armorKind(target) === 'bagua' ||
      (!target.equips.armor && playerSkills(target).includes('bazhen')))
  ) {
    let judged = drawJudgeCard(state, shuffle)
    judged = applyJudgeReplaceSync(state, judged, 'red')
    if (judged) {
      discardCard(state, judged)
      const ok = isRedFor(target, judged)
      const jdef = getCardDef(judged.defId)
      log(
        state,
        `${target.name} 發動【八卦陣】判定為${jdef.name}（${jdef.suit === 'heart' || jdef.suit === 'diamond' ? '紅' : '黑'}）${ok ? '，視為打出閃' : '，判定失敗'}。`,
      )
      if (getGeneral(target.generalId).skills.includes('tiandu')) {
        target.hand.push(judged)
        state.discard.pop()
        log(state, `${target.name} 發動天妒，獲得判定牌。`)
      }
      if (ok) {
        onShaDodged(state, sourceId, targetId)
        return
      }
    }
  }

  const wushuang = getGeneral(source.generalId).skills.includes('wushuang')
  const shanNeeded = wushuang ? 2 : 1
  state.pending.shanNeeded = shanNeeded
  const shanCards = responseCards(target, 'shan')
  if (shanCards.length === 0) {
    finishShaHit(state, 1)
    return
  }
  state.prompt = {
    kind: 'respond_shan',
    message: `${target.name} 請打出【閃】${wushuang ? `（無雙：需 ${shanNeeded} 張）` : ''}`,
    actorId: targetId,
    cardUids: shanCards.map((c) => c.uid),
    respondKinds: ['shan'],
  }
}

function findRecentShaDef(state: GameSnapshot): string | null {
  for (let i = state.discard.length - 1; i >= 0; i--) {
    if (getCardDef(state.discard[i].defId).kind === 'sha') return state.discard[i].defId
  }
  return null
}

function responseCards(p: PlayerState, need: 'shan' | 'sha' | 'tao'): CardInstance[] {
  const skills = playerSkills(p)
  return p.hand.filter((c) => {
    const opts = [cardKind(c)]
    if (skills.includes('longdan')) {
      if (cardKind(c) === 'sha') opts.push('shan')
      if (cardKind(c) === 'shan') opts.push('sha')
    }
    if (skills.includes('qingguo') && isBlackFor(p, c)) opts.push('shan')
    if (skills.includes('wusheng') && isRedFor(p, c)) opts.push('sha')
    if (skills.includes('jijiu') && isRedFor(p, c)) opts.push('tao')
    return opts.includes(need)
  })
}

function handleResponse(state: GameSnapshot, playerId: number, uid: string): void {
  const p = state.players[playerId]
  const card = takeHand(state, playerId, uid)
  if (!card) return
  discardCard(state, card)
  const kind = state.prompt.kind
  const def = getCardDef(card.defId)

  if (kind === 'respond_shan') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: state.pending?.type === 'sha' ? [state.pending.sourceId] : [],
      note: '閃',
    })
    if (state.pending?.type === 'sha') {
      const sourceId = state.pending.sourceId
      const targetId = state.pending.targetId
      const needed = state.pending.shanNeeded ?? 1
      const left = needed - 1
      log(state, `${p.name} 打出【閃】${needed > 1 ? `（無雙還需 ${left} 張）` : '，抵消了殺'}。`)
      if (left > 0) {
        state.pending.shanNeeded = left
        const shanCards = responseCards(p, 'shan')
        if (!shanCards.length) {
          finishShaHit(state, 1)
          return
        }
        state.prompt = {
          kind: 'respond_shan',
          message: `${p.name} 請再打出【閃】（無雙還需 ${left}）`,
          actorId: playerId,
          cardUids: shanCards.map((c) => c.uid),
          respondKinds: ['shan'],
        }
        return
      }
      if (getGeneral(p.generalId).skills.includes('leiji')) {
        const foes = enemiesOf(state, playerId)
        ;(state as GameSnapshot & { _shaDodged?: { sourceId: number; targetId: number } })._shaDodged =
          { sourceId, targetId }
        // Preserve queue for after dodge chain
        const extras = state.pending.extraTargets
        const dmgCard = state.pending.damageCard
        const cuid = state.pending.cardUid
        ;(state as GameSnapshot & {
          _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
        })._shaQueue = {
          sourceId,
          cardUid: cuid,
          extras: extras ?? [],
          damageCard: dmgCard,
        }
        state.pending = undefined
        state.prompt = {
          kind: 'choice',
          message: '發動【雷擊】：選擇造成1點雷電傷害的目標（或不發動）',
          actorId: playerId,
          choiceKey: 'leiji',
          choices: [
            ...foes.map((fid) => ({
              id: String(fid),
              label: state.players[fid].name,
            })),
            { id: 'skip', label: '不發動' },
          ],
        }
        return
      }
      onShaDodged(state, sourceId, targetId)
      return
    }
    // AOE（萬箭齊發等）成功打出閃
    log(state, `${p.name} 打出【閃】，響應成功。`)
    resumeAfterResponse(state)
    return
  }

  if (kind === 'respond_sha') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [],
      note: '響應',
    })
    log(state, `${p.name} 打出【殺】。`)
    state.pending = undefined
    resumeAfterResponse(state)
  }
}

export function passResponse(state: GameSnapshot, playerId: number): void {
  if (state.prompt.actorId !== playerId) return
  if (state.prompt.kind === 'respond_shan') {
    if (state.pending?.type === 'sha') {
      log(state, `${state.players[playerId].name} 放棄出閃。`)
      finishShaHit(state, 1)
      return
    }
    // AOE：未出閃受傷
    const aoe = getAoeQueue(state)
    const src = aoe?.sourceId ?? state.currentPlayer
    log(state, `${state.players[playerId].name} 放棄出閃，受到傷害。`)
    dealDamage(state, playerId, 1, src, 'normal', aoe?.card)
    if (!isAwaitingZonePick(state)) resumeAfterResponse(state)
    return
  }
  if (state.prompt.kind === 'respond_sha') {
    const aoe = getAoeQueue(state)
    const huoshou = state.players.find((p) => p.alive && playerSkills(p).includes('huoshou'))
    const src = aoe?.kind === 'nanman' && huoshou ? huoshou.id : (aoe?.sourceId ?? state.currentPlayer)
    log(state, `${state.players[playerId].name} 放棄出殺，受到傷害。`)
    dealDamage(state, playerId, 1, src, 'normal', aoe?.card)
    if (!isAwaitingZonePick(state)) resumeAfterResponse(state)
  }
}

function finishShaHit(state: GameSnapshot, dmg: number): void {
  const pending = state.pending
  if (!pending || pending.type !== 'sha') return
  const source = state.players[pending.sourceId]
  const target = state.players[pending.targetId]
  let damage = dmg
  if (source.luoyiActive) damage++
  // 古錠刀：目標無手牌時傷害+1
  if (weaponKind(source) === 'guding' && target.hand.length === 0) {
    damage++
    log(state, `${source.name} 的【古錠刀】生效，傷害+1。`)
  }

  // 寒冰劍：可改為棄置目標兩張牌（不造成傷害）
  if (weaponKind(source) === 'hanbing' && countDiscardable(target) > 0) {
    state.prompt = {
      kind: 'choice',
      message: `是否發動【寒冰劍】：棄置 ${target.name} 的牌來代替造成傷害？`,
      actorId: source.id,
      choiceKey: 'hanbing',
      choices: [
        { id: 'yes', label: '發動（棄其牌）' },
        { id: 'no', label: '照常造成傷害' },
      ],
    }
    ;(state as GameSnapshot & { _shaDamage?: number })._shaDamage = damage
    return
  }

  applyShaDamage(state, pending.sourceId, pending.targetId, damage)
}

function applyShaDamage(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  damage: number,
): void {
  const pending = state.pending
  const extras = pending?.type === 'sha' ? pending.extraTargets ?? [] : []
  const cardUid = pending?.type === 'sha' ? pending.cardUid : ''
  const damageCard = pending?.type === 'sha' ? pending.damageCard : undefined
  const nature =
    damageCard?.defId && getCardDef(damageCard.defId).damageNature
      ? getCardDef(damageCard.defId).damageNature!
      : 'normal'
  const hpBefore = state.players[targetId].hp
  const interrupted = dealDamage(state, targetId, damage, sourceId, nature, damageCard)
  if (interrupted && state.players[targetId].hp === hpBefore) return
  const pojunSource = state.players[sourceId]
  const pojunTarget = state.players[targetId]
  if (
    pojunSource.alive &&
    pojunTarget.alive &&
    playerSkills(pojunSource).includes('pojun')
  ) {
    const n = Math.min(5, Math.max(1, pojunTarget.hp))
    draw(state, targetId, n)
    pojunTarget.skipNextPlay = true
    log(state, `${pojunSource.name} 發動【破軍】，令 ${pojunTarget.name} 摸 ${n} 張牌並跳過下個出牌階段。`)
  }
  const lierenSource = state.players[sourceId]
  const lierenTarget = state.players[targetId]
  if (
    lierenSource.alive &&
    lierenTarget.alive &&
    playerSkills(lierenSource).includes('lieren') &&
    lierenSource.hand.length &&
    lierenTarget.hand.length
  ) {
    const mine = lierenSource.hand[Math.floor(Math.random() * lierenSource.hand.length)]
    const theirs = lierenTarget.hand[Math.floor(Math.random() * lierenTarget.hand.length)]
    const myRank = getCardDef(mine.defId).rank ?? 0
    const theirRank = getCardDef(theirs.defId).rank ?? 0
    if (myRank > theirRank) {
      const stolen = takeHand(state, targetId, theirs.uid)
      if (stolen) lierenSource.hand.push(stolen)
      log(state, `${lierenSource.name} 發動烈刃拼點勝利，獲得 ${lierenTarget.name} 一張手牌。`)
    } else {
      log(state, `${lierenSource.name} 發動烈刃拼點未勝。`)
    }
  }
  delete (state as GameSnapshot & { _shaDamage?: number })._shaDamage
  if (state.winnerIds) {
    state.pending = undefined
    resumeAfterResponse(state)
    return
  }
  if (isAwaitingZonePick(state)) return
  const source = state.players[sourceId]
  const target = state.players[targetId]
  if (weaponKind(source) === 'qilingong' && target.alive) {
    const horses = targetHorses(target)
    if (horses.length) {
      ;(state as GameSnapshot & {
        _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
      })._shaQueue = { sourceId, cardUid, extras, damageCard }
      state.pending = undefined
      state.prompt = {
        kind: 'choice',
        message: `是否發動【麒麟弓】棄置 ${target.name} 的坐騎？`,
        actorId: sourceId,
        choiceKey: 'qilingong',
        targetIds: [targetId],
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
  continueShaQueue(state, sourceId, cardUid, extras, damageCard)
}

function continueShaQueue(
  state: GameSnapshot,
  sourceId: number,
  cardUid: string,
  extras: number[],
  damageCard?: CardInstance,
): void {
  state.pending = undefined
  delete (state as GameSnapshot & {
    _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
  })._shaQueue
  if (extras.length) {
    const [next, ...rest] = extras
    if (state.players[next]?.alive) {
      state.pending = {
        type: 'sha',
        sourceId,
        targetId: next,
        cardUid,
        damageCard,
        extraTargets: rest,
      }
      const p = state.players[sourceId]
      const target = state.players[next]
      if (getGeneral(target.generalId).skills.includes('liuli') && countDiscardable(target) > 0) {
        const redirect = legalTargets(state, sourceId, 'sha').filter(
          (x) => x !== next && x !== sourceId && canReach(state, next, x),
        )
        if (redirect.length) {
          state.prompt = {
            kind: 'choice',
            message: `【流離】：是否棄一張牌將殺轉移？`,
            actorId: next,
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
      if (weaponKind(p) === 'cixiong' && oppositeGender(p, target)) {
        state.prompt = {
          kind: 'choice',
          message: `【雌雄雙股劍】：${target.name} 請選擇`,
          actorId: next,
          choiceKey: 'cixiong',
          choices: [
            { id: 'discard', label: '棄一張手牌' },
            { id: 'draw', label: '令對方摸一張牌' },
          ],
        }
        return
      }
      askShan(state, sourceId, next, cardUid)
      return
    }
    continueShaQueue(state, sourceId, cardUid, rest, damageCard)
    return
  }
  resumeAfterResponse(state)
}

/** 殺被閃抵消後：青龍／貫石斧 */
function onShaDodged(state: GameSnapshot, sourceId: number, targetId: number): void {
  const source = state.players[sourceId]
  const wk = weaponKind(source)
  const pending = state.pending
  const extras = pending?.type === 'sha' ? pending.extraTargets ?? [] : []
  const cardUid = pending?.type === 'sha' ? pending.cardUid : ''
  const damageCard = pending?.type === 'sha' ? pending.damageCard : undefined

  if (playerSkills(source).includes('mengjin') && countDiscardable(state.players[targetId]) > 0) {
    const target = state.players[targetId]
    if (target.hand.length) {
      const card = target.hand.shift()
      if (card) discardCard(state, card)
    } else {
      const slot = equipSlots().find((s) => target.equips[s])
      if (slot) {
        const card = target.equips[slot]
        if (card) leaveEquipArea(state, targetId, slot, card)
      }
    }
    log(state, `${source.name} 發動猛進，棄置 ${target.name} 一張牌。`)
  }

  if (wk === 'qinglong') {
    const shaCards = source.hand.filter((c) => {
      const opts = getPlayKindOptions(source, c)
      return opts.includes('sha')
    })
    if (shaCards.length && canReach(state, sourceId, targetId)) {
      ;(state as GameSnapshot & {
        _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
      })._shaQueue = { sourceId, cardUid, extras, damageCard }
      state.prompt = {
        kind: 'choice',
        message: `【青龍偃月刀】：是否再出一張【殺】攻擊 ${state.players[targetId].name}？`,
        actorId: sourceId,
        choiceKey: 'qinglong',
        targetIds: [targetId],
        cardUids: shaCards.map((c) => c.uid),
        choices: [
          { id: 'yes', label: '再出一張殺' },
          { id: 'no', label: '不發動' },
        ],
      }
      return
    }
  }

  if (wk === 'guanshi' && countDiscardable(source) >= 2) {
    ;(state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue = { sourceId, cardUid, extras, damageCard }
    state.prompt = {
      kind: 'choice',
      message: `【貫石斧】：是否棄兩張牌令此【殺】仍造成傷害？`,
      actorId: sourceId,
      choiceKey: 'guanshi',
      targetIds: [targetId],
      choices: [
        { id: 'yes', label: '棄兩張牌並造成傷害' },
        { id: 'no', label: '不發動' },
      ],
    }
    return
  }

  continueShaQueue(state, sourceId, cardUid, extras, damageCard)
}

function pindian(state: GameSnapshot, a: number, b: number): boolean {
  const pa = state.players[a]
  const pb = state.players[b]
  const ca = pa.hand[Math.floor(Math.random() * pa.hand.length)]
  const cb = pb.hand[Math.floor(Math.random() * pb.hand.length)]
  if (!ca || !cb) return false
  takeHand(state, a, ca.uid)
  takeHand(state, b, cb.uid)
  discardCard(state, ca)
  discardCard(state, cb)
  const ar = getCardDef(ca.defId).rank ?? 0
  const br = getCardDef(cb.defId).rank ?? 0
  log(state, `${pa.name} 與 ${pb.name} 拼點：${ar} 對 ${br}。`)
  return ar > br
}

export function resolveChoice(state: GameSnapshot, playerId: number, choiceId: string): void {
  if (state.prompt.actorId !== playerId) return

  if (
    state.prompt.kind === 'skill_cards' &&
    (choiceId === 'confirm' || state.prompt.choiceKey === 'skill_confirm')
  ) {
    confirmSkillCards(state, playerId)
    return
  }

  if (state.prompt.kind !== 'choice') return
  const key = state.prompt.choiceKey
  const targetId = state.prompt.targetIds?.[0]

  if (key === 'xuanhuo') {
    const turn = (state as GameSnapshot & {
      _turnSkip?: { skipDraw: boolean; skipPlay: boolean }
    })._turnSkip
    if (choiceId !== 'yes' || !turn) {
      continueBeginTurn(state)
      return
    }
    turn.skipDraw = true
    const targets = state.players.filter((x) => x.alive && x.id !== playerId)
    state.prompt = {
      kind: 'choice',
      message: '【眩惑】選擇摸兩張牌的角色',
      actorId: playerId,
      choiceKey: 'xuanhuo_target',
      choices: targets.map((x) => ({ id: String(x.id), label: x.name })),
    }
    return
  }

  if (key === 'xuanhuo_target') {
    const tid = Number(choiceId)
    const target = state.players[tid]
    if (!target?.alive || tid === playerId) {
      continueBeginTurn(state)
      return
    }
    draw(state, tid, 2)
    log(state, `${state.players[playerId].name} 發動【眩惑】，令 ${target.name} 摸兩張牌。`)
    const count = Math.min(2, countDiscardable(target))
    if (count <= 0) {
      continueBeginTurn(state)
      return
    }
    ;(state as GameSnapshot & { _xuanhuo?: { actorId: number; targetId: number } })._xuanhuo = {
      actorId: playerId,
      targetId: tid,
    }
    beginZonePick(state, {
      actorId: playerId,
      ownerId: tid,
      count,
      skillId: 'xuanhuo',
      mode: 'steal',
      message: `【眩惑】選擇獲得 ${target.name} 的 ${count} 張牌`,
    })
    return
  }

  if (key === 'enyuan') {
    const pending = (state as GameSnapshot & {
      _enyuan?: { victimId: number; sourceId: number }
    })._enyuan
    delete (state as GameSnapshot & { _enyuan?: unknown })._enyuan
    if (!pending) {
      resumeAfterDamageFlow(state)
      return
    }
    const source = state.players[pending.sourceId]
    const victim = state.players[pending.victimId]
    const card = choiceId === 'lose_hp' ? null : takeHand(state, source.id, choiceId)
    if (card) {
      victim.hand.push(card)
      log(state, `${source.name} 因【恩怨】交給 ${victim.name} 一張手牌。`)
    } else {
      source.hp -= 1
      pushDamageFx(state, source.id, 1)
      log(state, `${source.name} 因【恩怨】失去1點體力（體力 ${Math.max(source.hp, 0)}）。`)
      if (source.hp <= 0) {
        const prior = getPendingDying(state)
        if (prior && prior.targetId !== source.id) {
          ;(state as GameSnapshot & {
            _enyuanDeferredDying?: { targetId: number; killerId: number | null }
          })._enyuanDeferredDying = prior
        }
        ;(state as GameSnapshot & {
          _pendingDying?: { targetId: number; killerId: number | null }
        })._pendingDying = { targetId: source.id, killerId: pending.victimId }
      }
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'buyi') {
    const d = getDying(state)
    if (!d) {
      resumeAfterDamageFlow(state)
      return
    }
    const dying = state.players[d.targetId]
    const holder = state.players[playerId]
    if (choiceId === 'yes' && dying.hand.length) {
      const card = dying.hand[0]
      const def = getCardDef(card.defId)
      if (def.type !== 'basic') {
        dying.hand.shift()
        discardCard(state, card)
        dying.hp = Math.min(dying.maxHp, dying.hp + 1)
        log(state, `${holder.name} 發動【補益】，展示並棄置 ${dying.name} 的【${def.name}】，令其回覆1點體力。`)
      } else {
        log(state, `${holder.name} 發動【補益】，展示 ${dying.name} 的基本牌【${def.name}】，未能回覆體力。`)
      }
    }
    continueDyingAsk(state)
    return
  }

  if (key === 'xiansi_cancel' && state.pending?.type === 'sha') {
    const pending = state.pending
    const target = state.players[pending.targetId]
    if (choiceId === 'yes' && (target.niCards?.length ?? 0) >= 2) {
      const spent = target.niCards!.splice(0, 2)
      spent.forEach((card) => discardCard(state, card))
      log(state, `${target.name} 發動【陷嗣】，棄置兩張「逆」令【殺】無效。`)
      onShaDodged(state, pending.sourceId, pending.targetId)
      return
    }
    ;(state as GameSnapshot & { _xiansiBypass?: number })._xiansiBypass = pending.targetId
    askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
    return
  }

  if (key === 'ganlu_first') {
    const first = Number(choiceId)
    const p = state.players[playerId]
    const wounded = p.maxHp - p.hp
    const firstPlayer = state.players[first]
    if (!firstPlayer?.alive) {
      setPlayPrompt(state)
      return
    }
    const firstCount = Object.values(firstPlayer.equips).filter(Boolean).length
    const targets = state.players.filter((x) => {
      if (!x.alive || x.id === first) return false
      const count = Object.values(x.equips).filter(Boolean).length
      return Math.abs(firstCount - count) <= wounded
    })
    if (!targets.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【甘露】選擇第二名角色',
      actorId: playerId,
      choiceKey: 'ganlu_second',
      selectedTargetIds: [first],
      choices: targets.map((x) => ({ id: String(x.id), label: x.name })),
    }
    return
  }

  if (key === 'ganlu_second') {
    const p = state.players[playerId]
    const a = state.players[state.prompt.selectedTargetIds?.[0] ?? -1]
    const b = state.players[Number(choiceId)]
    if (!a?.alive || !b?.alive || a.id === b.id) {
      setPlayPrompt(state)
      return
    }
    const ac = Object.values(a.equips).filter(Boolean).length
    const bc = Object.values(b.equips).filter(Boolean).length
    if (Math.abs(ac - bc) > p.maxHp - p.hp) {
      log(state, `${p.name} 無法發動【甘露】：裝備數差距過大。`)
      setPlayPrompt(state)
      return
    }
    ;[a.equips, b.equips] = [b.equips, a.equips]
    p.ganluUsed = true
    log(state, `${p.name} 發動【甘露】，交換 ${a.name} 與 ${b.name} 的裝備區。`)
    setPlayPrompt(state)
    return
  }

  if (key === 'xiansi_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    if (!state.players[tid]?.alive || !canReach(state, playerId, tid) || (p.niCards?.length ?? 0) < 2) {
      setPlayPrompt(state)
      return
    }
    const spent = p.niCards!.splice(0, 2)
    spent.forEach((card) => discardCard(state, card))
    p.shaUsedThisTurn = true
    const virtualUid = `xiansi-${playerId}-${Date.now()}`
    log(state, `${p.name} 發動【陷嗣】，棄置兩張「逆」，視為對 ${state.players[tid].name} 使用【殺】。`)
    state.pending = { type: 'sha', sourceId: playerId, targetId: tid, cardUid: virtualUid }
    askShan(state, playerId, tid, virtualUid)
    return
  }

  if (key === 'shensu') {
    const turn = (state as GameSnapshot & {
      _turnSkip?: { skipDraw: boolean; skipPlay: boolean; shensuAsked?: boolean }
    })._turnSkip
    if (turn && choiceId === 'shensu_skip') {
      turn.skipDraw = true
      state.players[playerId].shensuNoDist = true
      log(state, `${state.players[playerId].name} 發動神速，跳過摸牌並令【殺】無距離限制。`)
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'shuangxiong') {
    const p = state.players[playerId]
    const turn = (state as GameSnapshot & {
      _turnSkip?: { skipDraw: boolean; skipPlay: boolean }
    })._turnSkip
    if (turn && choiceId === 'yes') {
      turn.skipDraw = true
      let judged = drawJudgeCard(state, shuffle)
      judged = applyJudgeReplaceSync(state, judged)
      if (judged) {
        p.hand.push(judged)
        const red = isRedFor(p, judged)
        p.shuangxiongAs = red ? 'black' : 'red'
        log(state, `${p.name} 發動雙雄，獲得判定牌；本回合可將${red ? '黑' : '紅'}牌當【決鬥】。`)
      }
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'tiesuo_mode') {
    const uid = state.prompt.cardUids?.[0]
    if (!uid) return
    if (choiceId === 'recast') {
      const p = state.players[playerId]
      const card = takeHand(state, playerId, uid)
      if (card) {
        discardCard(state, card)
        draw(state, playerId, 1)
        log(state, `${p.name} 重鑄【鐵索連環】，摸一張牌。`)
      }
      setPlayPrompt(state)
      return
    }
    const targets = state.players.filter((p) => p.alive && p.id !== playerId).map((p) => p.id)
    state.prompt = {
      kind: 'choose_target',
      message: '【鐵索連環】選擇一至兩名目標',
      actorId: playerId,
      targetIds: targets,
      minTargets: 1,
      maxTargets: Math.min(2, targets.length),
      cardUids: [uid],
      respondKinds: ['tiesuo'],
      selectedTargetIds: [],
    }
    return
  }

  if (key === 'jushou') {
    const p = state.players[playerId]
    if (choiceId === 'yes') {
      draw(state, playerId, 4)
      p.skipNextPlay = true
      log(state, `${p.name} 發動據守，摸四張牌並跳過下回合出牌階段。`)
    }
    finishEndPhase(state, playerId)
    return
  }

  if (key === 'tianxiang') {
    const pending = (state as GameSnapshot & {
      _tianxiang?: {
        targetId: number
        amount: number
        sourceId: number | null
        nature: 'normal' | 'fire' | 'thunder'
        damageCard?: CardInstance
        heartUid: string
      }
    })._tianxiang
    delete (state as GameSnapshot & { _tianxiang?: unknown })._tianxiang
    if (!pending) return
    if (choiceId !== 'skip') {
      const card = takeHand(state, pending.targetId, pending.heartUid)
      if (card) discardCard(state, card)
      const to = Number(choiceId)
      if (card && state.players[to]?.alive) {
        log(state, `${state.players[pending.targetId].name} 發動天香，將傷害轉移給 ${state.players[to].name}。`)
        dealDamage(state, to, pending.amount, pending.sourceId, pending.nature, pending.damageCard)
        return
      }
    }
    ;(state as GameSnapshot & { _tianxiangBypass?: number })._tianxiangBypass = pending.targetId
    dealDamage(
      state,
      pending.targetId,
      pending.amount,
      pending.sourceId,
      pending.nature,
      pending.damageCard,
    )
    return
  }

  if (key === 'guhuo_as') {
    const p = state.players[playerId]
    const uid = state.prompt.selectedCardUids?.[0]
    const card = uid ? takeHand(state, playerId, uid) : null
    if (!card) {
      setPlayPrompt(state)
      return
    }
    discardCard(state, card)
    p.guhuoUsed = true
    log(state, `${p.name} 發動蠱惑，將一張牌當【${choiceId}】使用。`)
    if (choiceId === 'tao') p.hp = Math.min(p.maxHp, p.hp + 1)
    else if (choiceId === 'wuzhong') draw(state, playerId, 2)
    else if (choiceId === 'sha') {
      const targets = legalTargets(state, playerId, 'sha')
      if (targets.length) {
        state.prompt = {
          kind: 'choice',
          message: '【蠱惑】選擇殺的目標',
          actorId: playerId,
          choiceKey: 'guhuo_sha_target',
          selectedCardUids: [card.uid],
          choices: targets.map((id) => ({ id: String(id), label: state.players[id].name })),
        }
        return
      }
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'guhuo_sha_target') {
    const tid = Number(choiceId)
    const uid = state.prompt.selectedCardUids?.[0] ?? ''
    const p = state.players[playerId]
    p.shaUsedThisTurn = true
    state.pending = { type: 'sha', sourceId: playerId, targetId: tid, cardUid: uid }
    askShan(state, playerId, tid, uid)
    return
  }

  if (key === 'tianyi_target' || key === 'quhu_target' || key === 'zhiba_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const won = pindian(state, playerId, tid)
    if (key === 'tianyi_target') {
      p.tianyiUsed = true
      p.tianyiWin = won
      p.tianyiLose = !won
      if (won) p.shaUsedThisTurn = false
      log(state, `${p.name} 發動天義${won ? '勝利，本回合可不限距離使用殺' : '失敗，本回合不能使用殺'}。`)
    } else if (key === 'quhu_target') {
      p.quhuUsed = true
      if (won) {
        const victim = state.players.find(
          (x) => x.alive && x.id !== tid && canReach(state, tid, x.id),
        )
        dealDamage(state, victim?.id ?? tid, 1, tid)
      } else dealDamage(state, playerId, 1, tid)
      log(state, `${p.name} 發動驅虎${won ? '成功' : '失敗'}。`)
    } else {
      p.zhibaUsedOn = [...(p.zhibaUsedOn ?? []), tid]
      if (won) draw(state, playerId, 1)
      log(state, `${p.name} 發動制霸${won ? '勝利並摸一張牌' : '未勝'}。`)
    }
    if (!isAwaitingZonePick(state) && !getDying(state)) setPlayPrompt(state)
    return
  }

  if (key === 'tiaoxin_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const target = state.players[tid]
    p.tiaoxinUsed = true
    const sha = responseCards(target, 'sha')[0]
    if (sha && canReach(state, tid, playerId)) {
      const card = takeHand(state, tid, sha.uid)
      if (card) discardCard(state, card)
      state.pending = { type: 'sha', sourceId: tid, targetId: playerId, cardUid: sha.uid, damageCard: sha }
      log(state, `${target.name} 響應挑釁，對 ${p.name} 使用【殺】。`)
      askShan(state, tid, playerId, sha.uid)
      return
    }
    const card = target.hand.shift()
    if (card) discardCard(state, card)
    else {
      const slot = equipSlots().find((s) => target.equips[s])
      const equip = slot ? target.equips[slot] : undefined
      if (slot && equip) leaveEquipArea(state, tid, slot, equip)
    }
    log(state, `${target.name} 無法響應挑釁，棄置一張牌。`)
    setPlayPrompt(state)
    return
  }

  if (key === 'dimeng_first') {
    const first = Number(choiceId)
    const targets = state.players.filter((t) => t.alive && t.id !== playerId && t.id !== first)
    state.prompt = {
      kind: 'choice',
      message: '【締盟】選擇第二名角色',
      actorId: playerId,
      choiceKey: 'dimeng_second',
      selectedTargetIds: [first],
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (key === 'dimeng_second') {
    const p = state.players[playerId]
    const a = state.players[state.prompt.selectedTargetIds?.[0] ?? -1]
    const b = state.players[Number(choiceId)]
    if (!a || !b) return
    const cost = Math.abs(a.hand.length - b.hand.length)
    if (p.hand.length < cost) {
      log(state, `${p.name} 手牌不足，無法支付締盟代價。`)
    } else {
      for (let i = 0; i < cost; i++) {
        const card = p.hand.shift()
        if (card) discardCard(state, card)
      }
      ;[a.hand, b.hand] = [b.hand, a.hand]
      p.dimengUsed = true
      log(state, `${p.name} 發動締盟，交換 ${a.name} 與 ${b.name} 的手牌。`)
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'fangquan_target') {
    const p = state.players[playerId]
    const target = state.players[Number(choiceId)]
    if (target?.alive) draw(state, target.id, 2)
    p.fangquanUsed = true
    log(state, `${p.name} 發動放權，令 ${target?.name ?? ''} 摸兩張牌。`)
    finishEndPhase(state, playerId)
    return
  }

  if (key === 'jixi_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    p.tianCount = Math.max(0, (p.tianCount ?? 0) - 1)
    log(state, `${p.name} 發動急襲，消耗一張「田」。`)
    beginZonePick(state, {
      actorId: playerId,
      ownerId: tid,
      count: 1,
      skillId: 'shunshou',
      mode: 'steal',
      message: `【急襲】選擇獲得 ${state.players[tid].name} 的一張牌`,
    })
    return
  }

  if (key === 'zhijian_target') {
    const p = state.players[playerId]
    const target = state.players[Number(choiceId)]
    const uid = state.prompt.selectedCardUids?.[0]
    const card = uid ? takeHand(state, playerId, uid) : null
    if (card && target) {
      const slot = getCardDef(card.defId).slot
      if (slot) {
        const old = target.equips[slot]
        if (old) leaveEquipArea(state, target.id, slot, old)
        target.equips[slot] = card
        draw(state, playerId, 1)
        log(state, `${p.name} 發動直諫，為 ${target.name} 裝備牌並摸一張。`)
      }
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'guohe' && targetId !== undefined) {
    applyZoneCardIds(state, playerId, targetId, [choiceId], 'discard')
    setPlayPrompt(state)
    return
  }

  if (key === 'fangtian_confirm') {
    const uid = state.prompt.cardUids?.[0]
    const kind = state.prompt.respondKinds?.[0] ?? 'sha'
    const selected = [...(state.prompt.selectedTargetIds ?? [])]
    if (choiceId.startsWith('add:')) {
      const tid = Number(choiceId.slice(4))
      if (!selected.includes(tid)) selected.push(tid)
      const remaining = (state.prompt.targetIds ?? []).filter((id) => !selected.includes(id))
      const maxTargets = 3
      if (selected.length < maxTargets && remaining.length) {
        state.prompt = {
          kind: 'choice',
          message: `已選 ${selected.map((id) => state.players[id].name).join('、')}。可再選或確認。`,
          actorId: playerId,
          choiceKey: 'fangtian_confirm',
          cardUids: uid ? [uid] : undefined,
          respondKinds: [kind],
          targetIds: remaining,
          selectedTargetIds: selected,
          choices: [
            ...remaining.map((rid) => ({
              id: `add:${rid}`,
              label: `再指定 ${state.players[rid].name}`,
            })),
            { id: 'confirm', label: '確認出殺' },
          ],
        }
        return
      }
    }
    if (!uid || !selected.length) {
      setPlayPrompt(state)
      return
    }
    finishTargetedCard(state, playerId, uid, kind, selected)
    return
  }

  if (key === 'liuli' && state.pending?.type === 'sha') {
    if (choiceId === 'skip') {
      askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
      return
    }
    const newTarget = Number(choiceId)
    if (Number.isNaN(newTarget) || !state.players[newTarget]?.alive) {
      askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
      return
    }
    ;(state as GameSnapshot & { _liuliTo?: number })._liuliTo = newTarget
    beginZonePick(state, {
      actorId: playerId,
      ownerId: playerId,
      count: 1,
      skillId: 'liuli',
      mode: 'discard',
      message: '【流離】選擇一張牌棄置以轉移殺',
    })
    return
  }

  if (key === 'leiji') {
    const dodged = (state as GameSnapshot & { _shaDodged?: { sourceId: number; targetId: number } })
      ._shaDodged
    if (choiceId !== 'skip') {
      const tid = Number(choiceId)
      if (!Number.isNaN(tid) && state.players[tid]?.alive) {
        // Classic: judge — black = 2 thunder damage. Simplified: 1 thunder always after judge black
        const judged = drawJudgeCard(state, shuffle)
        let j2 = applyJudgeReplaceSync(state, judged, 'black')
        if (j2) {
          discardCard(state, j2)
          const jdef = getCardDef(j2.defId)
          const black = jdef.suit === 'spade' || jdef.suit === 'club'
          log(state, `${state.players[playerId].name} 雷擊判定：${jdef.name}${black ? '（黑，造成雷傷）' : '（紅，無效）'}`)
          if (getGeneral(state.players[playerId].generalId).skills.includes('tiandu')) {
            state.players[playerId].hand.push(j2)
            state.discard.pop()
            log(state, `${state.players[playerId].name} 發動天妒，獲得判定牌。`)
          }
          if (black) {
            if (dealDamage(state, tid, 2, playerId, 'thunder')) return
          }
        }
      }
    }
    delete (state as GameSnapshot & { _shaDodged?: unknown })._shaDodged
    if (dodged) {
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
    } else {
      const q = (state as GameSnapshot & {
        _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
      })._shaQueue
      if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
      else resumeAfterResponse(state)
    }
    return
  }

  if (key === 'cixiong' && state.pending?.type === 'sha') {
    const sourceId = state.pending.sourceId
    const tid = state.pending.targetId
    const target = state.players[tid]
    if (choiceId === 'discard') {
      if (target.hand.length === 0) {
        draw(state, sourceId, 1)
        log(state, `${target.name} 無手牌可棄，${state.players[sourceId].name} 摸一張牌。`)
        askShan(state, sourceId, tid, state.pending.cardUid)
        return
      }
      beginZonePick(state, {
        actorId: tid,
        ownerId: tid,
        count: 1,
        skillId: 'cixiong',
        mode: 'discard',
        handOnly: true,
        message: `【雌雄雙股劍】選擇一張手牌棄置`,
      })
      return
    }
    draw(state, sourceId, 1)
    log(state, `${state.players[sourceId].name} 因【雌雄雙股劍】摸一張牌。`)
    askShan(state, sourceId, tid, state.pending.cardUid)
    return
  }

  if (key === 'hanbing' && state.pending?.type === 'sha') {
    const sourceId = state.pending.sourceId
    const tid = state.pending.targetId
    const damage = (state as GameSnapshot & { _shaDamage?: number })._shaDamage ?? 1
    if (choiceId === 'yes') {
      const n = Math.min(2, countDiscardable(state.players[tid]))
      if (n <= 0) {
        applyShaDamage(state, sourceId, tid, damage)
        return
      }
      beginZonePick(state, {
        actorId: sourceId,
        ownerId: tid,
        count: n,
        skillId: 'hanbing',
        mode: 'discard',
        message: `【寒冰劍】選擇棄置 ${state.players[tid].name} 的 ${n} 張牌`,
      })
      return
    }
    applyShaDamage(state, sourceId, tid, damage)
    return
  }

  if (key === 'qilingong' && targetId !== undefined) {
    const target = state.players[targetId]
    if (choiceId === 'horseMinus' || choiceId === 'horsePlus') {
      const slot = choiceId as 'horseMinus' | 'horsePlus'
      const eq = target.equips[slot]
      if (eq) {
        leaveEquipArea(state, targetId, slot, eq)
        log(state, `${state.players[playerId].name} 發動【麒麟弓】，棄置坐騎。`)
      }
    } else {
      log(state, `${state.players[playerId].name} 不發動【麒麟弓】。`)
    }
    const q = (state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue
    if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
    else resumeAfterResponse(state)
    return
  }

  if (key === 'qinglong' && targetId !== undefined) {
    if (choiceId === 'yes') {
      const uids = state.prompt.cardUids ?? []
      const source = state.players[playerId]
      const uid = uids.find((u) => findCard(source, u))
      if (uid) {
        const card = takeHand(state, source.id, uid)!
        discardCard(state, card)
        const def = getCardDef(card.defId)
        setPlayFx(state, {
          cardName: def.name,
          suit: def.suit,
          rank: def.rank,
          sourceId: playerId,
          targetIds: [targetId],
          note: '青龍',
        })
        log(state, `${source.name} 發動【青龍偃月刀】，再出【殺】。`)
        source.shaUsedThisTurn = true
        const q = (state as GameSnapshot & {
          _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
        })._shaQueue
        state.pending = {
          type: 'sha',
          sourceId: playerId,
          targetId,
          cardUid: card.uid,
          damageCard: card,
          extraTargets: q?.extras,
        }
        askShan(state, playerId, targetId, card.uid)
        return
      }
    }
    const q = (state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue
    if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
    else {
      state.pending = undefined
      resumeAfterResponse(state)
    }
    return
  }

  if (key === 'guanshi' && state.pending?.type === 'sha' && targetId !== undefined) {
    if (choiceId === 'yes') {
      beginZonePick(state, {
        actorId: playerId,
        ownerId: playerId,
        count: 2,
        skillId: 'guanshi',
        mode: 'discard',
        message: '【貫石斧】選擇兩張牌棄置，令此殺仍造成傷害',
      })
      return
    }
    const extras = state.pending.extraTargets ?? []
    const cardUid = state.pending.cardUid
    const damageCard = state.pending.damageCard
    continueShaQueue(state, state.pending.sourceId, cardUid, extras, damageCard)
    return
  }

  if (key === 'ganglie') {
    const sourceId = state.prompt.targetIds?.[0]
    if (sourceId === undefined) {
      resumeAfterDamageFlow(state)
      return
    }
    if (choiceId === 'damage') {
      dealDamage(state, sourceId, 1, playerId)
      if (!isAwaitingZonePick(state)) resumeAfterDamageFlow(state)
      return
    }
    if (choiceId === 'discard') {
      beginZonePick(state, {
        actorId: sourceId,
        ownerId: sourceId,
        count: 2,
        skillId: 'ganglie',
        mode: 'discard',
        message: '【剛烈】選擇兩張牌棄置',
      })
      return
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'zone_pick') {
    handleZonePickClick(state, playerId, choiceId)
    return
  }

  if (key === 'skill_confirm') {
    confirmSkillCards(state, playerId)
    return
  }

  if (key === 'rende_target') {
    const uids = state.prompt.selectedCardUids ?? []
    const tid = Number(choiceId)
    finishRende(state, playerId, uids, tid)
    return
  }

  if (key === 'zhangba_target') {
    const uids = state.prompt.selectedCardUids ?? []
    const tid = Number(choiceId)
    finishZhangba(state, playerId, uids, tid)
    return
  }

  if (key === 'wuxie') {
    const w = getWuxie(state)
    if (!w) {
      setPlayPrompt(state)
      return
    }
    if (choiceId === 'use') {
      const uid = state.prompt.cardUids?.[0]
      const p = state.players[playerId]
      const card = uid ? takeHand(state, playerId, uid) : null
      if (card) {
        discardCard(state, card)
        w.nullified = !w.nullified
        log(
          state,
          `${p.name} 使用【無懈可擊】${w.nullified ? '抵消' : '再次無懈，效果恢復'}錦囊。`,
        )
        if (state.players.find((x) => x.identity === 'lord')?.id !== undefined) {
          const lord = state.players.find((x) => x.identity === 'lord')
          const trick = w.trick
          const protectsLord =
            (trick.type === 'aoe_target' && lord && trick.targetId === lord.id) ||
            (trick.type === 'juedou' && lord && trick.targetId === lord.id) ||
            (trick.type === 'guohe' && lord && trick.targetId === lord.id) ||
            (trick.type === 'huogong' && lord && trick.targetId === lord.id) ||
            (trick.type === 'delayed' && lord && trick.targetId === lord.id)
          if (protectsLord && w.nullified) {
            observePublicEvent(state, {
              type: 'defend_lord',
              sourceId: playerId,
              via: '使用【無懈可擊】守護主公相關效果',
            })
          }
        }
      }
    }
    continueWuxieAsk(state)
    return
  }

  if (key === 'wugu') {
    const w = getWugu(state)
    if (!w) {
      setPlayPrompt(state)
      return
    }
    const idx = w.pool.findIndex((c) => c.uid === choiceId)
    if (idx < 0) return
    const [got] = w.pool.splice(idx, 1)
    state.players[playerId].hand.push(got)
    log(
      state,
      `${state.players[playerId].name} 獲得【${getCardDef(got.defId).name}】。`,
    )
    w.index++
    continueWugu(state)
    return
  }

  if (key === 'jianxiong') {
    const p = state.players[playerId]
    const uid = state.prompt.cardUids?.[0]
    if (choiceId === 'take' && uid) {
      const idx = state.discard.findIndex((c) => c.uid === uid)
      if (idx >= 0) {
        const [got] = state.discard.splice(idx, 1)
        p.hand.push(got)
        log(state, `${p.name} 發動奸雄，獲得【${getCardDef(got.defId).name}】。`)
      } else {
        log(state, `${p.name} 發動奸雄，但該牌已不在棄牌堆。`)
      }
    } else {
      log(state, `${p.name} 不發動奸雄。`)
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'play_as') {
    const uid = state.prompt.cardUids?.[0]
    if (!uid) {
      setPlayPrompt(state)
      return
    }
    selectCard(state, playerId, uid, choiceId)
    return
  }

  if (key === 'guanxing') {
    const mode =
      choiceId === 'reverse' ? 'reverse' : choiceId === 'bottom' ? 'bottom' : 'keep'
    finishGuanxing(state, mode)
    return
  }

  if (key === 'qiangxi_cost') {
    const foes = state.prompt.targetIds ?? []
    ;(state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost = choiceId
    state.prompt = {
      kind: 'choice',
      message: '【強襲】選擇造成傷害的目標',
      actorId: playerId,
      choiceKey: 'qiangxi_target',
      choices: foes.map((tid) => ({
        id: String(tid),
        label: state.players[tid].name,
      })),
    }
    return
  }

  if (key === 'qiangxi_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const cost = (state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost
    delete (state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost
    if (!state.players[tid]?.alive) {
      setPlayPrompt(state)
      return
    }
    p.qiangxiUsed = true
    if (cost === 'hp') {
      p.hp -= 1
      pushDamageFx(state, playerId, 1)
      log(state, `${p.name} 發動【強襲】，失去1點體力。`)
      if (p.hp <= 0) {
        trySave(state, playerId, playerId)
      }
    } else if (cost?.startsWith('equip:')) {
      const w = p.equips.weapon
      if (w) {
        leaveEquipArea(state, playerId, 'weapon', w)
        log(state, `${p.name} 發動【強襲】，棄置武器【${getCardDef(w.defId).name}】。`)
      }
    } else if (cost?.startsWith('hand:')) {
      const uid = cost.slice(5)
      const c = takeHand(state, playerId, uid)
      if (c) {
        discardCard(state, c)
        log(state, `${p.name} 發動【強襲】，棄置【${getCardDef(c.defId).name}】。`)
      }
    }
    log(state, `${p.name} 對 ${state.players[tid].name} 造成1點傷害（強襲）。`)
    if (dealDamage(state, tid, 1, playerId)) return
    if (getDying(state) || isAwaitingZonePick(state)) return
    checkVictory(state)
    if (!state.winnerIds) setPlayPrompt(state)
    return
  }

  if (key === 'qingnang_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    for (const uid of uids) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    const t = state.players[tid]
    if (t?.alive && t.hp < t.maxHp) {
      t.hp += 1
      log(state, `${p.name} 發動【青囊】，${t.name} 回覆1點體力（${t.hp}）。`)
    }
    p.qingnangUsed = true
    setPlayPrompt(state)
    return
  }

  if (key === 'jieyin_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    for (const uid of uids) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    const t = state.players[tid]
    if (p.hp < p.maxHp) {
      p.hp += 1
      log(state, `${p.name} 因【結姻】回覆1點體力（${p.hp}）。`)
    }
    if (t?.alive && t.hp < t.maxHp) {
      t.hp += 1
      log(state, `${t.name} 因【結姻】回覆1點體力（${t.hp}）。`)
    }
    p.jieyinUsed = true
    setPlayPrompt(state)
    return
  }

  if (key === 'lijian_first') {
    const first = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    const males = state.players.filter(
      (t) =>
        t.alive &&
        t.id !== playerId &&
        t.id !== first &&
        t.generalId &&
        getGeneral(t.generalId).gender === 'male',
    )
    state.prompt = {
      kind: 'choice',
      message: '【離間】選擇決鬥的另一方',
      actorId: playerId,
      choiceKey: 'lijian_second',
      selectedCardUids: uids,
      selectedTargetIds: [first],
      choices: males.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (key === 'lijian_second') {
    const p = state.players[playerId]
    const first = state.prompt.selectedTargetIds?.[0]
    const second = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    for (const uid of uids) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    p.lijianUsed = true
    if (first === undefined || !state.players[first]?.alive || !state.players[second]?.alive) {
      setPlayPrompt(state)
      return
    }
    log(
      state,
      `${p.name} 發動【離間】，令 ${state.players[first].name} 與 ${state.players[second].name} 決鬥。`,
    )
    resolveJuedou(state, first, second)
    return
  }

  if (key === 'fanjian_target') {
    const tid = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    state.prompt = {
      kind: 'choice',
      message: `【反間】${state.players[tid].name} 請猜花色`,
      actorId: tid,
      choiceKey: 'fanjian_suit',
      selectedCardUids: uids,
      selectedTargetIds: [playerId, tid],
      choices: [
        { id: 'spade', label: '黑桃' },
        { id: 'heart', label: '紅桃' },
        { id: 'club', label: '梅花' },
        { id: 'diamond', label: '方塊' },
      ],
    }
    return
  }

  if (key === 'fanjian_suit') {
    const sourceId = state.prompt.selectedTargetIds?.[0]
    const tid = state.prompt.selectedTargetIds?.[1]
    const uid = state.prompt.selectedCardUids?.[0]
    if (sourceId === undefined || tid === undefined || !uid) {
      setPlayPrompt(state)
      return
    }
    const source = state.players[sourceId]
    const target = state.players[tid]
    const card = takeHand(state, sourceId, uid)
    if (!card) {
      setPlayPrompt(state)
      return
    }
    const suit = getCardDef(card.defId).suit
    target.hand.push(card)
    source.fanjianUsed = true
    const guess = choiceId
    const ok = suit === guess
    log(
      state,
      `${target.name} 猜${({ spade: '黑桃', heart: '紅桃', club: '梅花', diamond: '方塊' } as Record<string, string>)[guess] ?? guess}，實為【${getCardDef(card.defId).name}】${ok ? '（猜對）' : '（猜錯）'}。`,
    )
    if (!ok) {
      if (dealDamage(state, tid, 1, sourceId)) return
      if (getDying(state) || isAwaitingZonePick(state)) return
    }
    checkVictory(state)
    if (!state.winnerIds) setPlayPrompt(state)
    return
  }

  if (key === 'jieming') {
    const tid = Number(choiceId)
    const t = state.players[tid]
    if (t?.alive) {
      const n = Math.max(1, t.maxHp - t.hp)
      draw(state, tid, n)
      log(state, `${state.players[playerId].name} 發動節命，令 ${t.name} 摸 ${n} 張牌。`)
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'yaowu') {
    const p = state.players[playerId]
    if (choiceId === 'recover') {
      if (p.hp < p.maxHp) {
        p.hp += 1
        log(state, `${p.name} 因【耀武】回覆1點體力（體力 ${p.hp}）。`)
      } else {
        draw(state, playerId, 1)
        log(state, `${p.name} 體力已滿，因【耀武】改為摸一張牌。`)
      }
    } else {
      draw(state, playerId, 1)
      log(state, `${p.name} 因【耀武】摸一張牌。`)
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'dying_save') {
    const d = getDying(state)
    if (!d) {
      setPlayPrompt(state)
      return
    }
    const dying = state.players[d.targetId]
    const saver = state.players[playerId]
    if (choiceId === 'skip') {
      log(state, `${saver.name} 不出【桃】。`)
      continueDyingAsk(state)
      return
    }
    const uid = choiceId
    if (!(state.prompt.cardUids ?? []).includes(uid)) return
    const card = takeHand(state, playerId, uid)
    if (!card) return
    discardCard(state, card)
    const def = getCardDef(card.defId)
    const asJijiu = cardKind(card) !== 'tao'
    dying.hp += 1
    d.savedThisRound = true
    log(
      state,
      asJijiu
        ? `${saver.name} 發動急救，將【${def.name}】當【桃】使用，${dying.name} 體力回覆至 ${dying.hp}。`
        : `${saver.name} 對 ${dying.name} 使用【桃】，體力回覆至 ${dying.hp}。`,
    )
    continueDyingAsk(state)
    return
  }

  if (key === 'jiedao') {
    const ids = state.prompt.selectedTargetIds ?? []
    const sourceId = ids[0]
    const holderId = ids[1]
    const killTargetId = ids[2]
    if (sourceId === undefined || holderId === undefined || killTargetId === undefined) {
      setPlayPrompt(state)
      return
    }
    const holder = state.players[holderId]
    if (choiceId === 'sha') {
      const uid = state.prompt.cardUids?.[0]
      if (uid) {
        const card = takeHand(state, holderId, uid)
        if (card) {
          discardCard(state, card)
          holder.shaUsedThisTurn = true
          log(
            state,
            `${holder.name} 因【借刀殺人】對 ${state.players[killTargetId].name} 使用【殺】。`,
          )
          observePublicEvent(state, {
            type: 'attack',
            sourceId: holderId,
            targetId: killTargetId,
            kind: 'sha',
          })
          state.pending = {
            type: 'sha',
            sourceId: holderId,
            targetId: killTargetId,
            cardUid: card.uid,
            damageCard: card,
          }
          askShan(state, holderId, killTargetId, card.uid)
          return
        }
      }
    }
    // Give weapon to 借刀 user
    const weapon = holder.equips.weapon
    if (weapon) {
      holder.equips.weapon = undefined
      state.players[sourceId].hand.push(weapon)
      log(
        state,
        `${holder.name} 交出【${getCardDef(weapon.defId).name}】給 ${state.players[sourceId].name}。`,
      )
      if (getGeneral(holder.generalId).skills.includes('xiaoji')) {
        draw(state, holderId, 2)
        log(state, `${holder.name} 發動梟姬，摸兩張牌。`)
      }
    }
    setPlayPrompt(state)
    return
  }
}

function resumeAfterResponse(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  const queue = getAoeQueue(state)
  if (queue) {
    continueAoe(state)
    return
  }
  if (state.phase === 'play') setPlayPrompt(state)
}

type AoeQueue = {
  sourceId: number
  targets: number[]
  need: 'sha' | 'shan'
  name: string
  kind: string
  card?: CardInstance
}

function getAoeQueue(state: GameSnapshot): AoeQueue | undefined {
  return (state as GameSnapshot & { _aoe?: AoeQueue })._aoe
}

function clearAoeQueue(state: GameSnapshot): void {
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
function continueAoe(state: GameSnapshot): void {
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

function resolveAOE(
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

function askAOEResponse(
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

function resolveJuedou(
  state: GameSnapshot,
  a: number,
  b: number,
  damageCard?: CardInstance,
): void {
  // Simplified: each needs sha alternately; AI/human — deal damage to one who can't
  const pb = state.players[b]
  const cards = responseCards(pb, 'sha')
  if (cards.length === 0) {
    if (dealDamage(state, b, 1, a, 'normal', damageCard)) return
  } else {
    const c = takeHand(state, b, cards[0].uid)!
    discardCard(state, c)
    const pa = state.players[a]
    const cardsA = responseCards(pa, 'sha')
    if (cardsA.length === 0) {
      if (dealDamage(state, a, 1, b, 'normal', damageCard)) return
    } else {
      const c2 = takeHand(state, a, cardsA[0].uid)!
      discardCard(state, c2)
      if (dealDamage(state, b, 1, a, 'normal', damageCard)) return
    }
  }
  checkVictory(state)
  if (!state.winnerIds && !isAwaitingZonePick(state)) setPlayPrompt(state)
}

function listZoneOptions(
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

function beginZonePick(
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

function buildZonePickChoices(
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

function handleZonePickClick(state: GameSnapshot, playerId: number, choiceId: string): void {
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

function applyZoneCardIds(
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
      if (getGeneral(owner.generalId).skills.includes('lianying') && owner.hand.length === 0) {
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
        if (getGeneral(owner.generalId).skills.includes('xiaoji')) {
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

function finishZonePickSkill(state: GameSnapshot, skillId: string, _ids: string[]): void {
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

function isAwaitingZonePick(state: GameSnapshot): boolean {
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

function resumeAfterDamageFlow(state: GameSnapshot): void {
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
  resumeAfterResponse(state)
}

function askDismantle(state: GameSnapshot, sourceId: number, targetId: number): void {
  beginZonePick(state, {
    actorId: sourceId,
    ownerId: targetId,
    count: 1,
    skillId: 'guohe',
    mode: 'discard',
    message: `【過河拆橋】選擇棄置 ${state.players[targetId].name} 的一張牌`,
  })
}

function suitShort(suit: string): string {
  return ({ spade: '♠', heart: '♥', club: '♣', diamond: '♦' } as Record<string, string>)[suit] ?? ''
}

function rankShort(rank: number | undefined): string {
  if (rank === undefined) return ''
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function dealDamage(
  state: GameSnapshot,
  targetId: number,
  amount: number,
  sourceId: number | null,
  nature: 'normal' | 'fire' | 'thunder' = 'normal',
  damageCard?: CardInstance,
): boolean {
  const t = state.players[targetId]
  if (!t.alive) return false
  const bypass = (state as GameSnapshot & { _tianxiangBypass?: number })._tianxiangBypass
  if (bypass !== targetId && playerSkills(t).includes('tianxiang')) {
    const heart = t.hand.find((c) => effectiveSuit(c, t) === 'heart')
    const others = state.players.filter((p) => p.alive && p.id !== targetId)
    if (heart && others.length) {
      ;(state as GameSnapshot & {
        _tianxiang?: {
          targetId: number
          amount: number
          sourceId: number | null
          nature: 'normal' | 'fire' | 'thunder'
          damageCard?: CardInstance
          heartUid: string
        }
      })._tianxiang = { targetId, amount, sourceId, nature, damageCard, heartUid: heart.uid }
      state.prompt = {
        kind: 'choice',
        message: '【天香】棄一張紅桃手牌，將傷害轉移給另一名角色？',
        actorId: targetId,
        choiceKey: 'tianxiang',
        choices: [
          ...others.map((p) => ({ id: String(p.id), label: `轉移給 ${p.name}` })),
          { id: 'skip', label: '不發動' },
        ],
      }
      return true
    }
  }
  delete (state as GameSnapshot & { _tianxiangBypass?: number })._tianxiangBypass
  const source = sourceId !== null ? state.players[sourceId] : null
  const ignoreArm = source ? ignoresArmor(source) : false

  // 白銀獅子：傷害至多為1
  if (!ignoreArm && armorKind(t) === 'baiyin' && amount > 1) {
    log(state, `${t.name} 的【白銀獅子】將傷害降至1點。`)
    amount = 1
  }
  // 藤甲：火焰傷害+1
  if (!ignoreArm && armorKind(t) === 'tengjia' && nature === 'fire') {
    amount++
    log(state, `${t.name} 的【藤甲】使火焰傷害+1。`)
  }

  t.hp -= amount
  pushDamageFx(state, targetId, amount)
  const natureLabel = nature === 'fire' ? '火焰' : nature === 'thunder' ? '雷電' : ''
  log(state, `${t.name} 受到 ${amount} 點${natureLabel}傷害（體力 ${Math.max(t.hp, 0)}）。`)

  if ((nature === 'fire' || nature === 'thunder') && t.chained) {
    t.chained = false
    const chained = state.players.filter((p) => p.alive && p.id !== targetId && p.chained)
    for (const other of chained) {
      other.chained = false
      log(state, `鐵索連環傳導至 ${other.name}。`)
      dealDamage(state, other.id, amount, sourceId, nature, damageCard)
    }
  }

  if (sourceId !== null && amount > 0) {
    observePublicEvent(state, {
      type: 'damage',
      sourceId,
      targetId,
      amount,
    })
  }

  // After-damage skills that still apply while dying (e.g. 遺計 can draw 桃 before save)
  if (t.generalId) {
    const afterSkills = playerSkills(t)
    // 遺計：每受到1點傷害後摸兩張牌
    if (afterSkills.includes('yiji') && amount > 0) {
      const n = amount * 2
      draw(state, targetId, n)
      log(state, `${t.name} 發動遺計，摸 ${n} 張牌。`)
    }
    if (afterSkills.includes('fangzhu') && amount > 0) {
      const other = state.players.find((p) => p.alive && p.id !== targetId)
      if (other) {
        const lost = Math.max(1, t.maxHp - t.hp)
        draw(state, other.id, lost)
        other.skipNextPlay = true
        log(state, `${t.name} 發動放逐，令 ${other.name} 摸 ${lost} 張並跳過下回合出牌階段。`)
      }
    }
    if (afterSkills.includes('xinsheng') && amount > 0) {
      const pool = ['jianxiong', 'fankui', 'wusheng', 'qixi', 'yingzi']
      t.extraSkills = [pool[Math.floor(Math.random() * pool.length)]]
      log(state, `${t.name} 發動新生，重新獲得一項化身技能。`)
    }
  }

  // 狂骨：來源對距離1目標造成傷害後回1體力
  if (source && sourceId !== null && amount > 0 && source.generalId) {
    if (getGeneral(source.generalId).skills.includes('kuanggu')) {
      if (getDistance(state, sourceId, targetId) <= 1 && source.hp < source.maxHp) {
        source.hp += 1
        log(state, `${source.name} 發動狂骨，回復1點體力。`)
      }
    }
  }

  if (amount > 0 && damageCard && cardKind(damageCard) === 'sha') {
    const caiwenji = state.players.find(
      (p) => p.alive && p.hand.length > 0 && playerSkills(p).includes('beige'),
    )
    if (caiwenji) {
      const cost = takeHand(state, caiwenji.id, caiwenji.hand[0].uid)
      if (cost) discardCard(state, cost)
      const judged = drawJudgeCard(state, shuffle)
      if (judged) {
        discardCard(state, judged)
        const suit = effectiveSuit(judged, caiwenji)
        log(state, `${caiwenji.name} 發動悲歌，判定為${suitShort(suit ?? '')}。`)
        if (suit === 'heart') {
          if (source) {
            for (let i = 0; i < 2; i++) {
              const card = source.hand.shift()
              if (card) discardCard(state, card)
            }
          }
        } else if (suit === 'diamond' && source?.hand.length) {
          const card = source.hand.shift()
          if (card) t.hand.push(card)
        } else if (suit === 'club' && sourceId !== null) {
          dealDamage(state, sourceId, 1, caiwenji.id)
        } else if (suit === 'spade') {
          draw(state, targetId, 2)
        }
      }
    }
  }

  if (t.hp <= 0) {
    ;(state as GameSnapshot & {
      _pendingDying?: { targetId: number; killerId: number | null }
    })._pendingDying = { targetId, killerId: sourceId }
  }

  if (
    amount > 0 &&
    sourceId !== null &&
    source?.alive &&
    playerSkills(t).includes('enyuan')
  ) {
    ;(state as GameSnapshot & {
      _enyuan?: { victimId: number; sourceId: number }
    })._enyuan = { victimId: targetId, sourceId }
    state.prompt = {
      kind: 'choice',
      message: '【恩怨】交給法正一張手牌，否則失去1點體力',
      actorId: sourceId,
      choiceKey: 'enyuan',
      choices: [
        ...source.hand.map((card) => ({
          id: card.uid,
          label: `交出【${getCardDef(card.defId).name}】`,
        })),
        { id: 'lose_hp', label: '失去1點體力' },
      ],
    }
    return true
  }

  if (t.alive) {
    const skills = getGeneral(t.generalId).skills
    // 節命：令一名角色摸已損失體力數（至少1）
    if (skills.includes('jieming') && amount > 0) {
      const alive = state.players.filter((x) => x.alive)
      state.prompt = {
        kind: 'choice',
        message: `【節命】${t.name}：選擇一名角色摸牌`,
        actorId: targetId,
        choiceKey: 'jieming',
        choices: alive.map((x) => {
          const n = Math.max(1, x.maxHp - Math.max(x.hp, 0))
          return { id: String(x.id), label: `${x.name}（摸${n}）` }
        }),
      }
      return true
    }
    // 奸雄：可選擇獲得造成傷害的牌（可拒絕）
    if (skills.includes('jianxiong') && sourceId !== null) {
      const canTake =
        !!damageCard && state.discard.some((c) => c.uid === damageCard.uid)
      if (canTake && damageCard) {
        const cname = getCardDef(damageCard.defId).name
        state.prompt = {
          kind: 'choice',
          message: `【奸雄】是否獲得造成傷害的【${cname}】？`,
          actorId: targetId,
          choiceKey: 'jianxiong',
          cardUids: [damageCard.uid],
          choices: [
            { id: 'take', label: `獲得【${cname}】` },
            { id: 'skip', label: '不發動' },
          ],
        }
        return true
      }
    }
    // 反饋：選擇獲得傷害來源一張牌
    if (skills.includes('fankui') && sourceId !== null && source && countDiscardable(source) > 0) {
      beginZonePick(state, {
        actorId: targetId,
        ownerId: sourceId,
        count: 1,
        skillId: 'fankui',
        mode: 'steal',
        message: `【反饋】選擇獲得 ${source.name} 的一張牌`,
      })
      return true
    }
    // 剛烈：判定，非紅桃則來源棄兩張或受1傷
    if (skills.includes('ganglie') && sourceId !== null && source) {
      let judged = drawJudgeCard(state, shuffle)
      judged = applyJudgeReplaceSync(state, judged, 'nonheart')
      if (judged) {
        discardCard(state, judged)
        const jdef = getCardDef(judged.defId)
        const heart = jdef.suit === 'heart'
        log(state, `${t.name} 剛烈判定：${jdef.name}${heart ? '（紅桃，無效）' : '（非紅桃）'}`)
        if (getGeneral(t.generalId).skills.includes('tiandu')) {
          t.hand.push(judged)
          state.discard.pop()
          log(state, `${t.name} 發動天妒，獲得判定牌。`)
        }
        if (!heart) {
          if (countDiscardable(source) >= 2) {
            state.prompt = {
              kind: 'choice',
              message: `【剛烈】${source.name} 請選擇：棄兩張牌或受到1點傷害`,
              actorId: sourceId,
              choiceKey: 'ganglie',
              targetIds: [sourceId],
              choices: [
                { id: 'discard', label: '棄兩張牌' },
                { id: 'damage', label: '受到1點傷害' },
              ],
            }
            return true
          }
          const nested = dealDamage(state, sourceId, 1, targetId)
          log(state, `${t.name} 剛烈對 ${source.name} 造成傷害！`)
          return nested
        }
      }
    }
  }

  // 耀武：受到紅色【殺】傷害時，來源回1或摸1（華雄瀕死/陣亡仍觸發）
  if (
    amount > 0 &&
    source &&
    sourceId !== null &&
    damageCard &&
    t.generalId &&
    getGeneral(t.generalId).skills.includes('yaowu') &&
    cardKind(damageCard) === 'sha' &&
    isRedCard(damageCard)
  ) {
    log(state, `${t.name} 的【耀武】發動。`)
    state.prompt = {
      kind: 'choice',
      message: `【耀武】${source.name}：因擊中 ${t.name}，請選擇`,
      actorId: sourceId,
      choiceKey: 'yaowu',
      choices: [
        { id: 'recover', label: '回覆1點體力' },
        { id: 'draw', label: '摸一張牌' },
      ],
    }
    return true
  }

  if (startDyingIfPending(state)) return true

  checkVictory(state)
  return false
}

/** Exposed for skill regression tests */
export function debugDealDamage(
  state: GameSnapshot,
  targetId: number,
  amount: number,
  sourceId: number | null,
  nature: 'normal' | 'fire' | 'thunder' = 'normal',
  damageCard?: CardInstance,
): boolean {
  return dealDamage(state, targetId, amount, sourceId, nature, damageCard)
}

function trySave(state: GameSnapshot, targetId: number, killerId: number | null = null): void {
  ;(state as GameSnapshot & {
    _pendingDying?: { targetId: number; killerId: number | null }
  })._pendingDying = { targetId, killerId }
  startDyingIfPending(state)
}

type DyingState = {
  targetId: number
  killerId: number | null
  /** Next seat to consider */
  cursor: number
  /** Seat where this ask round started */
  startSeat: number
  /** Seats examined in the current ask round */
  checked: number
  /** Someone used 桃 this round */
  savedThisRound: boolean
  buyiAsked?: number[]
}

function getDying(state: GameSnapshot): DyingState | undefined {
  return (state as GameSnapshot & { _dying?: DyingState })._dying
}

function clearDying(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _dying?: DyingState })._dying
}

function getPendingDying(
  state: GameSnapshot,
): { targetId: number; killerId: number | null } | undefined {
  return (state as GameSnapshot & {
    _pendingDying?: { targetId: number; killerId: number | null }
  })._pendingDying
}

function clearPendingDying(state: GameSnapshot): void {
  delete (state as GameSnapshot & {
    _pendingDying?: { targetId: number; killerId: number | null }
  })._pendingDying
}

/** Cards that can save in dying: 【桃】 or 華佗急救（紅牌當桃）. */
function saveCardsFor(p: PlayerState): CardInstance[] {
  return responseCards(p, 'tao')
}

/**
 * If someone is pending 瀕死 and not already in a save window, start asking for 桃.
 * @returns true if a dying window is now active
 */
function startDyingIfPending(state: GameSnapshot): boolean {
  if (getDying(state)) return true
  const pd = getPendingDying(state)
  if (!pd) return false
  const t = state.players[pd.targetId]
  if (!t?.alive || t.hp > 0) {
    clearPendingDying(state)
    return false
  }
  clearPendingDying(state)
  beginDying(state, pd.targetId, pd.killerId)
  return true
}

function beginDying(
  state: GameSnapshot,
  targetId: number,
  killerId: number | null,
): void {
  const t = state.players[targetId]
  const start = state.currentPlayer
  log(state, `${t.name} 進入瀕死狀態（體力 ${t.hp}）！請出【桃】急救。`)
  ;(state as GameSnapshot & { _dying?: DyingState })._dying = {
    targetId,
    killerId,
    cursor: start,
    startSeat: start,
    checked: 0,
    savedThisRound: false,
  }
  continueDyingAsk(state)
}

function continueDyingAsk(state: GameSnapshot): void {
  const d = getDying(state)
  if (!d) return
  const t = state.players[d.targetId]
  if (!t || !t.alive) {
    clearDying(state)
    resumeAfterDamageFlow(state)
    return
  }
  if (t.hp > 0) {
    log(state, `${t.name} 脫離瀕死（體力 ${t.hp}）。`)
    clearDying(state)
    resumeAfterDamageFlow(state)
    return
  }

  const buyiHolder = state.players.find(
    (p) =>
      p.alive &&
      playerSkills(p).includes('buyi') &&
      !(d.buyiAsked ?? []).includes(p.id),
  )
  if (buyiHolder) {
    d.buyiAsked = [...(d.buyiAsked ?? []), buyiHolder.id]
    if (t.hand.length) {
      state.prompt = {
        kind: 'choice',
        message: `【補益】是否展示 ${t.name} 的一張手牌？`,
        actorId: buyiHolder.id,
        choiceKey: 'buyi',
        targetIds: [t.id],
        choices: [
          { id: 'yes', label: '發動補益' },
          { id: 'no', label: '不發動' },
        ],
      }
      return
    }
  }

  const n = state.players.length
  const wansha = playerSkills(state.players[state.currentPlayer]).includes('wansha')
  // Full round with no peach → death (after optional 不屈)
  while (d.checked < n) {
    const seat = d.cursor
    d.cursor = (d.cursor + 1) % n
    d.checked++
    const p = state.players[seat]
    if (!p.alive) continue
    if (wansha && seat !== state.currentPlayer) continue
    const cards = saveCardsFor(p)
    if (!cards.length) continue

    const need = 1 - t.hp
    const victimGen = t.generalId ? getGeneral(t.generalId).name : t.name
    state.prompt = {
      kind: 'choice',
      message: `【瀕死】${t.name}（${victimGen}）體力 ${t.hp}，尚需 ${need} 張【桃】。${p.name} 是否急救？`,
      actorId: seat,
      choiceKey: 'dying_save',
      cardUids: cards.map((c) => c.uid),
      targetIds: [d.targetId],
      choices: [
        ...cards.map((c) => {
          const def = getCardDef(c.defId)
          const asJijiu = cardKind(c) !== 'tao'
          return {
            id: c.uid,
            label: asJijiu ? `急救：【${def.name}】當桃` : `使用【${def.name}】`,
          }
        }),
        { id: 'skip', label: '不救' },
      ],
    }
    return
  }

  if (d.savedThisRound) {
    // Need more peaches — another ask round from current turn seat
    d.cursor = d.startSeat
    d.checked = 0
    d.savedThisRound = false
    continueDyingAsk(state)
    return
  }

  // Nobody saved this round
  tryBuquThenDeath(state, d.targetId, d.killerId)
}

function tryBuquThenDeath(
  state: GameSnapshot,
  targetId: number,
  killerId: number | null,
): void {
  const t = state.players[targetId]
  clearDying(state)
  if (!t || !t.alive || t.hp > 0) {
    resumeAfterDamageFlow(state)
    return
  }
  // 不屈（簡化）：瀕死摸一張，若仍有手牌則回至1體力
  if (playerSkills(t).includes('niepan') && !t.niepanUsed) {
    t.hand.forEach((c) => discardCard(state, c))
    t.hand = []
    for (const slot of equipSlots()) {
      const card = t.equips[slot]
      if (card) leaveEquipArea(state, targetId, slot, card)
    }
    for (const card of t.judges) discardCard(state, card)
    t.judges = []
    t.hp = Math.min(3, t.maxHp)
    t.chained = false
    t.niepanUsed = true
    draw(state, targetId, 3)
    log(state, `${t.name} 發動涅槃，棄置所有牌，回覆至 ${t.hp} 點體力並摸三張。`)
    resumeAfterDamageFlow(state)
    return
  }
  if (t.generalId && getGeneral(t.generalId).skills.includes('buqu')) {
    draw(state, targetId, 1)
    if (t.hand.length > 0) {
      t.hp = 1
      log(state, `${t.name} 發動不屈，體力回覆至1。`)
      resumeAfterDamageFlow(state)
      return
    }
  }
  finalizeDeath(state, targetId, killerId)
  resumeAfterDamageFlow(state)
}

function finalizeDeath(
  state: GameSnapshot,
  targetId: number,
  killerId: number | null,
): void {
  const t = state.players[targetId]
  if (!t || !t.alive) return
  if (t.hp > 0) return

  t.hand.forEach((c) => discardCard(state, c))
  t.hand = []
  t.niCards?.forEach((c) => discardCard(state, c))
  t.niCards = []
  for (const slot of equipSlots()) {
    const e = t.equips[slot]
    if (e) leaveEquipArea(state, targetId, slot, e)
  }
  if (t.judges?.length) {
    for (const j of t.judges) discardCard(state, j)
    t.judges = []
  }
  if (t.hp > 0) {
    log(state, `${t.name} 因失去裝備回覆體力，脫離瀕死（體力 ${t.hp}）。`)
    return
  }
  t.alive = false
  const seatLabel = (p: PlayerState) => {
    if (p.isHuman) return p.generalId ? getGeneral(p.generalId).name : p.name
    const generic = !p.name || p.name === '友軍' || p.name === '敵軍' || p.name.startsWith('電腦')
    if (!generic) return p.name
    return p.generalId ? getGeneral(p.generalId).name : p.name
  }
  const victimName = seatLabel(t)
  const killer =
    killerId !== null && state.players[killerId] ? state.players[killerId] : null
  const killerName = killer ? seatLabel(killer) : null
  if (killer && playerSkills(t).includes('duanchang')) {
    killer.skillsDisabled = true
    killer.extraSkills = []
    log(state, `${t.name} 發動斷腸，${killer.name} 失去所有武將技能。`)
  }
  state.killLog.push({
    victimId: targetId,
    victimName,
    killerId: killer?.id ?? null,
    killerName,
  })
  observePublicEvent(state, { type: 'death', playerId: targetId })
  if (killerName) {
    log(state, `${victimName} 陣亡，為 ${killerName} 所殺。`)
  } else {
    log(state, `${victimName} 陣亡。`)
  }
  // 行殤：其他角色死亡時摸兩張
  for (const p of state.players) {
    if (!p.alive || p.id === targetId || !p.generalId) continue
    if (getGeneral(p.generalId).skills.includes('xingshang')) {
      draw(state, p.id, 2)
      log(state, `${p.name} 發動行殤，摸兩張牌。`)
    }
  }
}

export function activateSkill(state: GameSnapshot, playerId: number, skillId: string): void {
  if (state.winnerIds) return
  if (state.prompt.kind !== 'choose_card' || state.prompt.actorId !== playerId) return
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return
  const p = state.players[playerId]

  if (skillId === 'ganlu') {
    if (p.ganluUsed) return
    const wounded = p.maxHp - p.hp
    const targets = state.players.filter((a) => {
      if (!a.alive) return false
      const ac = Object.values(a.equips).filter(Boolean).length
      return state.players.some((b) => {
        if (!b.alive || b.id === a.id) return false
        const bc = Object.values(b.equips).filter(Boolean).length
        return Math.abs(ac - bc) <= wounded
      })
    })
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【甘露】選擇第一名角色',
      actorId: playerId,
      choiceKey: 'ganlu_first',
      choices: targets.map((x) => ({ id: String(x.id), label: x.name })),
    }
    return
  }

  if (skillId === 'xiansi') {
    if ((p.niCards?.length ?? 0) < 2 || !mayUseSha(p)) return
    const targets = enemiesOf(state, playerId)
      .map((id) => state.players[id])
      .filter((t) => t && canReach(state, playerId, t.id))
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【陷嗣】選擇【殺】的目標',
      actorId: playerId,
      choiceKey: 'xiansi_target',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'kurou') {
    if (p.hp <= 0) return
    p.hp -= 1
    pushDamageFx(state, playerId, 1)
    log(state, `${p.name} 發動【苦肉】，失去1點體力。`)
    draw(state, playerId, 2)
    log(state, `${p.name} 摸兩張牌。`)
    if (p.hp <= 0) {
      trySave(state, playerId, playerId)
      if (getDying(state) || isAwaitingZonePick(state)) return
    }
    checkVictory(state)
    if (!state.winnerIds && p.alive) setPlayPrompt(state)
    return
  }

  if (skillId === 'zhiheng') {
    if (p.zhihengUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【制衡】選擇要棄置的手牌，然後確認',
      actorId: playerId,
      skillId: 'zhiheng',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: p.hand.length,
      choices: [{ id: 'confirm', label: '確認制衡' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'rende') {
    if (!p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【仁德】選擇要交出的手牌，然後確認',
      actorId: playerId,
      skillId: 'rende',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: p.hand.length,
      choices: [{ id: 'confirm', label: '選擇目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'luoyi') {
    if (p.luoyiActive || p.hand.length < 2) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【裸衣】選擇兩張手牌棄置',
      actorId: playerId,
      skillId: 'luoyi',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 2,
      maxTargets: 2,
      choices: [{ id: 'confirm', label: '確認裸衣' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'qiangxi') {
    if (p.qiangxiUsed) return
    const range = attackRangeOf(p)
    const foes = enemiesOf(state, playerId)
      .map((id) => state.players[id])
      .filter((t) => t && getDistance(state, playerId, t.id) <= range)
    if (!foes.length) return
    const weaponChoices: { id: string; label: string }[] = []
    if (p.equips.weapon) {
      weaponChoices.push({
        id: `equip:weapon`,
        label: `棄置裝備【${getCardDef(p.equips.weapon.defId).name}】`,
      })
    }
    for (const c of p.hand) {
      if (getCardDef(c.defId).slot === 'weapon') {
        weaponChoices.push({
          id: `hand:${c.uid}`,
          label: `棄置手牌【${getCardDef(c.defId).name}】`,
        })
      }
    }
    state.prompt = {
      kind: 'choice',
      message: '【強襲】選擇代價',
      actorId: playerId,
      choiceKey: 'qiangxi_cost',
      targetIds: foes.map((t) => t.id),
      choices: [
        ...(p.hp > 0 ? [{ id: 'hp', label: '失去1點體力' }] : []),
        ...weaponChoices,
      ],
    }
    return
  }

  if (skillId === 'qingnang') {
    if (p.qingnangUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【青囊】選擇一張手牌棄置',
      actorId: playerId,
      skillId: 'qingnang',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '選擇回覆目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'jieyin') {
    if (p.jieyinUsed || p.hand.length < 2) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【結姻】選擇兩張手牌棄置',
      actorId: playerId,
      skillId: 'jieyin',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 2,
      maxTargets: 2,
      choices: [{ id: 'confirm', label: '選擇男性目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'lijian') {
    if (p.lijianUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【離間】選擇一張手牌棄置',
      actorId: playerId,
      skillId: 'lijian',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '選擇兩名男性' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'fanjian') {
    if (p.fanjianUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【反間】選擇要交出的一張手牌',
      actorId: playerId,
      skillId: 'fanjian',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '選擇目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'guhuo' || skillId === 'qiaobian' || skillId === 'zhijian') {
    if (skillId === 'guhuo' && (p.guhuoUsed || !p.hand.length)) return
    if (skillId === 'qiaobian' && (p.qiaobianUsed || !p.hand.length)) return
    const cards =
      skillId === 'zhijian'
        ? p.hand.filter((c) => getCardDef(c.defId).type === 'equip')
        : p.hand
    if (!cards.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: `【${skillId === 'guhuo' ? '蠱惑' : skillId === 'qiaobian' ? '巧變' : '直諫'}】選擇一張手牌`,
      actorId: playerId,
      skillId,
      cardUids: cards.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '確認' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'tianyi' || skillId === 'quhu' || skillId === 'zhiba') {
    const enemySet = new Set(enemiesOf(state, playerId))
    const targets = state.players.filter((t) => {
      if (!t.alive || t.id === playerId || !t.hand.length) return false
      if (!enemySet.has(t.id)) return false
      if (skillId === 'quhu') return t.hp > p.hp
      if (skillId === 'zhiba') return !(p.zhibaUsedOn ?? []).includes(t.id)
      return true
    })
    if (!p.hand.length || !targets.length) return
    state.prompt = {
      kind: 'choice',
      message: `【${skillId === 'tianyi' ? '天義' : skillId === 'quhu' ? '驅虎' : '制霸'}】選擇拼點目標`,
      actorId: playerId,
      choiceKey: `${skillId}_target`,
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'tiaoxin') {
    const targets = enemiesOf(state, playerId)
      .map((id) => state.players[id])
      .filter((t) => t && canReach(state, playerId, t.id))
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【挑釁】選擇目標',
      actorId: playerId,
      choiceKey: 'tiaoxin_target',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'dimeng') {
    const targets = state.players.filter((t) => t.alive && t.id !== playerId)
    if (targets.length < 2) return
    state.prompt = {
      kind: 'choice',
      message: '【締盟】選擇第一名角色',
      actorId: playerId,
      choiceKey: 'dimeng_first',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'luanwu') {
    if (p.luanwuUsed) return
    p.luanwuUsed = true
    log(state, `${p.name} 發動限定技【亂武】。`)
    for (const tid of enemiesOf(state, playerId)) {
      const target = state.players[tid]
      if (!target?.alive) continue
      target.hp -= 1
      pushDamageFx(state, target.id, 1)
      log(state, `${target.name} 因亂武失去1點體力。`)
      if (target.hp <= 0) trySave(state, target.id, playerId)
      if (getDying(state)) return
    }
    setPlayPrompt(state)
    return
  }

  if (skillId === 'fangquan') {
    const targets = state.players.filter((t) => t.alive && t.id !== playerId)
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【放權】選擇摸兩張牌的角色',
      actorId: playerId,
      choiceKey: 'fangquan_target',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'jixi') {
    const targets = legalTargets(state, playerId, 'shunshou')
    if (!(p.tianCount ?? 0) || !targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【急襲】選擇順手牽羊的目標',
      actorId: playerId,
      choiceKey: 'jixi_target',
      choices: targets.map((id) => ({ id: String(id), label: state.players[id].name })),
    }
    return
  }

  if (skillId === 'zhangba') {
    if (weaponKind(p) !== 'zhangba' || p.hand.length < 2 || !mayUseSha(p)) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【丈八蛇矛】選擇兩張手牌當【殺】使用',
      actorId: playerId,
      skillId: 'zhangba',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 2,
      maxTargets: 2,
      choices: [{ id: 'confirm', label: '選擇殺的目標' }],
      choiceKey: 'skill_confirm',
    }
  }
}

function handleSkillCardPick(state: GameSnapshot, _playerId: number, uid: string): void {
  if (state.prompt.kind !== 'skill_cards') return
  const allowed = state.prompt.cardUids ?? []
  if (!allowed.includes(uid)) return
  const selected = [...(state.prompt.selectedCardUids ?? [])]
  const idx = selected.indexOf(uid)
  if (idx >= 0) selected.splice(idx, 1)
  else {
    const max = state.prompt.maxTargets ?? 99
    if (selected.length >= max) return
    selected.push(uid)
  }
  const min = state.prompt.minTargets ?? 1
  state.prompt = {
    ...state.prompt,
    selectedCardUids: selected,
    message: `${state.prompt.message.split('（')[0]}（已選 ${selected.length} 張${selected.length >= min ? '，可確認' : ''}）`,
  }
}

function confirmSkillCards(state: GameSnapshot, playerId: number): void {
  const prompt = state.prompt
  if (prompt.kind !== 'skill_cards') return
  const skillId = prompt.skillId
  const selected = prompt.selectedCardUids ?? []
  const min = prompt.minTargets ?? 1
  if (!skillId || selected.length < min) return
  const p = state.players[playerId]

  if (skillId === 'guhuo') {
    state.prompt = {
      kind: 'choice',
      message: '【蠱惑】選擇此牌視為的牌名',
      actorId: playerId,
      choiceKey: 'guhuo_as',
      selectedCardUids: selected,
      choices: [
        { id: 'sha', label: '殺' },
        { id: 'shan', label: '閃' },
        { id: 'tao', label: '桃' },
        { id: 'wuzhong', label: '無中生有' },
      ],
    }
    return
  }

  if (skillId === 'qiaobian') {
    const card = takeHand(state, playerId, selected[0])
    if (card) discardCard(state, card)
    draw(state, playerId, 1)
    p.qiaobianUsed = true
    log(state, `${p.name} 發動巧變，棄一張牌並摸一張牌。`)
    setPlayPrompt(state)
    return
  }

  if (skillId === 'zhijian') {
    const targets = state.players.filter((t) => t.alive && t.id !== playerId)
    state.prompt = {
      kind: 'choice',
      message: '【直諫】選擇獲得裝備的角色',
      actorId: playerId,
      choiceKey: 'zhijian_target',
      selectedCardUids: selected,
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'zhiheng') {
    for (const uid of selected) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    draw(state, playerId, selected.length)
    p.zhihengUsed = true
    log(state, `${p.name} 發動【制衡】，棄 ${selected.length} 張並摸 ${selected.length} 張。`)
    setPlayPrompt(state)
    return
  }

  if (skillId === 'luoyi') {
    if (selected.length !== 2) return
    for (const uid of selected) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    p.luoyiActive = true
    log(state, `${p.name} 發動【裸衣】：本回合殺傷害+1，不能使用錦囊。`)
    setPlayPrompt(state)
    return
  }

  if (skillId === 'rende') {
    const others = state.players.filter((o) => o.alive && o.id !== playerId)
    if (!others.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【仁德】選擇交給牌的角色',
      actorId: playerId,
      choiceKey: 'rende_target',
      selectedCardUids: selected,
      choices: others.map((o) => ({ id: String(o.id), label: o.name })),
    }
    return
  }

  if (skillId === 'zhangba') {
    if (selected.length !== 2 || !mayUseSha(p)) {
      setPlayPrompt(state)
      return
    }
    const targets = legalTargets(state, playerId, 'sha')
    if (!targets.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【丈八蛇矛】選擇【殺】的目標',
      actorId: playerId,
      choiceKey: 'zhangba_target',
      selectedCardUids: selected,
      choices: targets.map((tid) => ({
        id: String(tid),
        label: state.players[tid].name,
      })),
    }
    return
  }

  if (skillId === 'qingnang') {
    const wounded = state.players.filter((t) => t.alive && t.hp < t.maxHp)
    if (!wounded.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【青囊】選擇回覆體力的角色',
      actorId: playerId,
      choiceKey: 'qingnang_target',
      selectedCardUids: selected,
      choices: wounded.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'jieyin') {
    const males = state.players.filter(
      (t) => t.alive && t.generalId && getGeneral(t.generalId).gender === 'male',
    )
    if (!males.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【結姻】選擇一名男性角色',
      actorId: playerId,
      choiceKey: 'jieyin_target',
      selectedCardUids: selected,
      choices: males.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'lijian') {
    const males = state.players.filter(
      (t) =>
        t.alive &&
        t.id !== playerId &&
        t.generalId &&
        getGeneral(t.generalId).gender === 'male',
    )
    if (males.length < 2) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【離間】選擇先出【殺】的男性（決鬥發起方）',
      actorId: playerId,
      choiceKey: 'lijian_first',
      selectedCardUids: selected,
      choices: males.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'fanjian') {
    const others = state.players.filter((t) => t.alive && t.id !== playerId)
    if (!others.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【反間】選擇獲得此牌的角色',
      actorId: playerId,
      choiceKey: 'fanjian_target',
      selectedCardUids: selected,
      choices: others.map((t) => ({ id: String(t.id), label: t.name })),
    }
  }
}

function finishRende(
  state: GameSnapshot,
  playerId: number,
  uids: string[],
  targetId: number,
): void {
  const p = state.players[playerId]
  const target = state.players[targetId]
  if (!target?.alive) {
    setPlayPrompt(state)
    return
  }
  let moved = 0
  for (const uid of uids) {
    const c = takeHand(state, playerId, uid)
    if (c) {
      target.hand.push(c)
      moved++
    }
  }
  p.rendeCount = (p.rendeCount ?? 0) + moved
  log(state, `${p.name} 發動【仁德】，將 ${moved} 張牌交給 ${target.name}。`)
  if (p.rendeCount >= 2 && p.hp < p.maxHp) {
    // Heal once when reaching 2+ this turn (simplified: heal 1 if count crossed 2)
    const prev = p.rendeCount - moved
    if (prev < 2) {
      p.hp++
      log(state, `${p.name} 因仁德回覆1點體力（${p.hp}）。`)
    }
  }
  setPlayPrompt(state)
}

function finishZhangba(
  state: GameSnapshot,
  playerId: number,
  uids: string[],
  targetId: number,
): void {
  const p = state.players[playerId]
  if (uids.length !== 2 || !mayUseSha(p)) {
    setPlayPrompt(state)
    return
  }
  const cards: CardInstance[] = []
  for (const uid of uids) {
    const c = takeHand(state, playerId, uid)
    if (c) {
      discardCard(state, c)
      cards.push(c)
    }
  }
  if (cards.length < 2) {
    setPlayPrompt(state)
    return
  }
  p.shaUsedThisTurn = true
  const def = getCardDef(cards[0].defId)
  setPlayFx(state, {
    cardName: '殺',
    suit: def.suit,
    rank: def.rank,
    sourceId: playerId,
    targetIds: [targetId],
    note: '丈八',
  })
  log(state, `${p.name} 發動【丈八蛇矛】，將兩張牌當【殺】對 ${state.players[targetId].name} 使用。`)
  state.pending = {
    type: 'sha',
    sourceId: playerId,
    targetId,
    cardUid: cards[0].uid,
    damageCard: cards[0],
  }
  askShan(state, playerId, targetId, cards[0].uid)
}

export function endPlayPhase(state: GameSnapshot, playerId: number): void {
  if (state.currentPlayer !== playerId || state.phase !== 'play') return
  if (state.prompt.kind === 'respond_shan' || state.prompt.kind === 'respond_sha') return
  const p = state.players[playerId]
  const skills = playerSkills(p)

  if (skills.includes('jushou')) {
    state.prompt = {
      kind: 'choice',
      message: '【據守】是否摸四張牌並跳過下回合出牌階段？',
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

function finishEndPhase(state: GameSnapshot, playerId: number): void {
  const p = state.players[playerId]
  const skills = playerSkills(p)

  // 閉月
  if (skills.includes('biyue')) {
    draw(state, playerId, 1)
    log(state, `${p.name} 發動閉月，摸一張牌。`)
  }

  // 克己：未出殺跳過棄牌
  if (skills.includes('keji') && !p.shaUsedThisTurn) {
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

function handleDiscardPick(state: GameSnapshot, playerId: number, uid: string): void {
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

function advanceTurn(state: GameSnapshot): void {
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
  beginTurn(state)
}

export function cancelTarget(state: GameSnapshot, playerId: number): void {
  if (state.prompt.actorId !== playerId) return
  if (
    state.prompt.kind === 'choose_target' ||
    state.prompt.kind === 'skill_cards' ||
    (state.prompt.kind === 'choice' &&
      (state.prompt.choiceKey === 'fangtian_confirm' ||
        state.prompt.choiceKey === 'rende_target' ||
        state.prompt.choiceKey === 'zhangba_target' ||
        state.prompt.choiceKey === 'qiangxi_cost' ||
        state.prompt.choiceKey === 'qiangxi_target' ||
        state.prompt.choiceKey === 'tiaoxin_target' ||
        state.prompt.choiceKey === 'xiansi_target' ||
        state.prompt.choiceKey === 'tianyi_target' ||
        state.prompt.choiceKey === 'quhu_target' ||
        state.prompt.choiceKey === 'zhiba_target'))
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
