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
  findCard,
  getDistance,
  handLimit,
  isBlackCard,
  isRedCard,
  removeHand as removeHandCard,
  shuffle,
  withinDistanceOne,
} from './helpers'
import {
  armorKind,
  baguaJudgeSucceeds,
  countDiscardable,
  drawJudgeCard,
  horseLabel,
  ignoresArmor,
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
  if (card && before === 1 && p.generalId && getGeneral(p.generalId).skills.includes('lianying')) {
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
  p.rendeCount = 0

  const skills = getGeneral(p.generalId).skills

  // 判定階段：樂不思蜀／兵糧寸斷
  state.phase = 'judge'
  let skipDraw = false
  let skipPlay = false
  const pendingJudges = [...(p.judges ?? [])]
  for (const jCard of pendingJudges) {
    if (!p.judges?.some((x) => x.uid === jCard.uid)) continue
    p.judges = p.judges.filter((x) => x.uid !== jCard.uid)
    const jdef = getCardDef(jCard.defId)
    const judged = drawJudgeCard(state, shuffle)
    let suit = judged ? getCardDef(judged.defId).suit : null
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
      // 紅桃無效
      if (suit === 'heart') {
        log(state, `【樂不思蜀】判定為紅桃，無效。`)
      } else {
        skipPlay = true
        log(state, `【樂不思蜀】生效，${p.name} 本回合跳過出牌階段。`)
      }
    } else if (jdef.kind === 'bingliang') {
      // 梅花無效
      if (suit === 'club') {
        log(state, `【兵糧寸斷】判定為梅花，無效。`)
      } else {
        skipDraw = true
        log(state, `【兵糧寸斷】生效，${p.name} 本回合跳過摸牌階段。`)
      }
    }
  }

  // 洛神：準備／判定後，摸牌前
  if (skills.includes('luoshen')) {
    for (let i = 0; i < 8; i++) {
      const judged = drawJudgeCard(state, shuffle)
      if (!judged) break
      const def = getCardDef(judged.defId)
      const black = def.suit === 'spade' || def.suit === 'club'
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
    if (skills.includes('yingzi')) drawN++

    // 突襲：可少摸並拿別人手牌（簡化：若有敵人有手牌，少摸1並隨機得1張）
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

    draw(state, p.id, drawN)
    log(state, `${p.name} 摸了 ${drawN} 張牌。`)
  } else {
    log(state, `${p.name} 跳過摸牌階段。`)
  }

  if (skipPlay) {
    log(state, `${p.name} 跳過出牌階段。`)
    // 閉月仍可在結束時觸發：走 endPlayPhase 邏輯的摸牌部分
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
      if (p.shaUsedThisTurn && !getGeneral(p.generalId).skills.includes('paoxiao') && !hasZhuge(p)) {
        continue
      }
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

function hasZhuge(p: PlayerState): boolean {
  const w = p.equips.weapon
  return !!w && getCardDef(w.defId).kind === 'zhuge'
}

export function getPlayKindOptions(p: PlayerState, card: CardInstance): string[] {
  const kind = cardKind(card)
  const skills = getGeneral(p.generalId).skills
  const opts = [kind]
  if (skills.includes('wusheng') && isRedCard(card) && kind !== 'sha') opts.push('sha')
  if (skills.includes('longdan')) {
    if (kind === 'sha') opts.push('shan')
    if (kind === 'shan') opts.push('sha')
  }
  if (skills.includes('qixi') && isBlackCard(card)) opts.push('guohe')
  if (skills.includes('jijiu') && isRedCard(card)) opts.push('tao')
  if (skills.includes('qingguo') && isBlackCard(card)) opts.push('shan')
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
  const kind = asKind && getPlayKindOptions(p, card).includes(asKind) ? asKind : cardKind(card)
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
    // 簡化：重鑄——棄置此牌並摸一張
    takeHand(state, playerId, uid)
    discardCard(state, card)
    draw(state, playerId, 1)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
      note: '重鑄',
    })
    log(state, `${p.name} 重鑄【鐵索連環】，摸一張牌。`)
    setPlayPrompt(state)
    return
  }

  if (kind === 'nanman' || kind === 'wanjian') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    const others = state.players.filter((t) => {
      if (!t.alive || t.id === playerId) return false
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
  const targets = legalTargets(state, playerId, kind)
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
    const wuxieCards = p.hand.filter((c) => cardKind(c) === 'wuxie')
    if (!wuxieCards.length) continue
    let about = `是否無懈當前錦囊？`
    if (pickerId !== undefined) {
      about = `是否無懈【五穀豐登】中 ${state.players[pickerId]?.name ?? ''} 的選牌？`
    } else if (aoeTargetId !== undefined) {
      const tn = state.players[aoeTargetId]?.name ?? ''
      const trickName = w.trick.type === 'aoe_target' ? w.trick.name : '錦囊'
      about = `是否無懈【${trickName}】對 ${tn} 的效果？`
    }
    state.prompt = {
      kind: 'choice',
      message: `【無懈可擊】${p.name}：${about}`,
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
  const sourceSkills = source.generalId ? getGeneral(source.generalId).skills : []
  const ignoreTrickDist = sourceSkills.includes('qicai')

  if (kind === 'sha') {
    return enemiesOf(state, playerId).filter((t) => {
      const target = state.players[t]
      if (getGeneral(target.generalId).skills.includes('kongcheng') && target.hand.length === 0) {
        return false
      }
      return canReach(state, playerId, t)
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
        if (kind === 'bingliang' && !withinDistanceOne(state, playerId, t.id, ignoreTrickDist)) {
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
    const judged = drawJudgeCard(state, shuffle)
    if (judged) {
      discardCard(state, judged)
      const jdef = getCardDef(judged.defId)
      const red = jdef.suit === 'heart' || jdef.suit === 'diamond'
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
  if (!ignoreArm && armorKind(target) === 'bagua') {
    const judged = drawJudgeCard(state, shuffle)
    if (judged) {
      discardCard(state, judged)
      const ok = baguaJudgeSucceeds(judged)
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
  const skills = getGeneral(p.generalId).skills
  return p.hand.filter((c) => {
    const opts = [cardKind(c)]
    if (skills.includes('longdan')) {
      if (cardKind(c) === 'sha') opts.push('shan')
      if (cardKind(c) === 'shan') opts.push('sha')
    }
    if (skills.includes('qingguo') && isBlackCard(c)) opts.push('shan')
    if (skills.includes('wusheng') && isRedCard(c)) opts.push('sha')
    if (skills.includes('jijiu') && isRedCard(c)) opts.push('tao')
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
    const src = aoe?.sourceId ?? state.currentPlayer
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
  dealDamage(state, targetId, damage, sourceId, nature, damageCard)
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
        if (judged) {
          discardCard(state, judged)
          const jdef = getCardDef(judged.defId)
          const black = jdef.suit === 'spade' || jdef.suit === 'club'
          log(state, `${state.players[playerId].name} 雷擊判定：${jdef.name}${black ? '（黑，造成雷傷）' : '（紅，無效）'}`)
          if (getGeneral(state.players[playerId].generalId).skills.includes('tiandu')) {
            state.players[playerId].hand.push(judged)
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
  delete (state as GameSnapshot & { _aoe?: AoeQueue })._aoe
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
  for (const id of ids) {
    if (id.startsWith('hand:')) {
      const uid = id.slice(5)
      const idx = owner.hand.findIndex((c) => c.uid === uid)
      if (idx < 0) continue
      const c = owner.hand.splice(idx, 1)[0]
      const name = getCardDef(c.defId).name
      if (mode === 'steal') {
        actor.hand.push(c)
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
        log(state, `${actor.name} 獲得了 ${owner.name} 判定區的【${name}】。`)
      } else {
        discardCard(state, c)
        log(state, `${actor.name} 棄置了 ${owner.name} 判定區的【${name}】。`)
      }
    }
  }
}

function finishZonePickSkill(state: GameSnapshot, skillId: string, _ids: string[]): void {
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
  setPlayPrompt(state)
}

function isAwaitingZonePick(state: GameSnapshot): boolean {
  return (
    state.prompt.kind === 'choice' &&
    (state.prompt.choiceKey === 'zone_pick' ||
      state.prompt.choiceKey === 'ganglie' ||
      state.prompt.choiceKey === 'jianxiong' ||
      state.prompt.choiceKey === 'yaowu')
  )
}

function resumeAfterDamageFlow(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return

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
    const afterSkills = getGeneral(t.generalId).skills
    // 遺計：每受到1點傷害後摸兩張牌
    if (afterSkills.includes('yiji') && amount > 0) {
      const n = amount * 2
      draw(state, targetId, n)
      log(state, `${t.name} 發動遺計，摸 ${n} 張牌。`)
    }
    // 節命：摸已損失體力數（至少1）
    if (afterSkills.includes('jieming') && amount > 0) {
      const n = Math.max(1, t.maxHp - Math.max(t.hp, 0))
      draw(state, targetId, n)
      log(state, `${t.name} 發動節命，摸 ${n} 張牌。`)
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

  if (t.hp <= 0) {
    trySave(state, targetId, sourceId)
  }

  if (t.alive) {
    const skills = getGeneral(t.generalId).skills
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
      const judged = drawJudgeCard(state, shuffle)
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
  const t = state.players[targetId]
  // Self tao first (auto for dying)
  while (t.hp <= 0) {
    const tao = responseCards(t, 'tao')
    if (!tao.length) break
    const c = takeHand(state, targetId, tao[0].uid)!
    discardCard(state, c)
    t.hp += 1
    log(state, `${t.name} 使用【桃】求救，體力回覆至 ${t.hp}。`)
  }
  // 不屈（簡化）：瀕死摸一張，若仍有手牌則回至1體力
  if (t.hp <= 0 && t.generalId && getGeneral(t.generalId).skills.includes('buqu')) {
    draw(state, targetId, 1)
    if (t.hand.length > 0) {
      t.hp = 1
      log(state, `${t.name} 發動不屈，體力回覆至1。`)
    }
  }
  if (t.hp <= 0) {
    t.hand.forEach((c) => discardCard(state, c))
    t.hand = []
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
    } else {
      t.alive = false
      const seatLabel = (p: (typeof t)) => {
        if (p.isHuman) return p.generalId ? getGeneral(p.generalId).name : p.name
        const generic = !p.name || p.name === '友軍' || p.name === '敵軍' || p.name.startsWith('電腦')
        if (!generic) return p.name
        return p.generalId ? getGeneral(p.generalId).name : p.name
      }
      const victimName = seatLabel(t)
      const killer =
        killerId !== null && state.players[killerId] ? state.players[killerId] : null
      const killerName = killer ? seatLabel(killer) : null
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
  }
}

export function activateSkill(state: GameSnapshot, playerId: number, skillId: string): void {
  if (state.winnerIds) return
  if (state.prompt.kind !== 'choose_card' || state.prompt.actorId !== playerId) return
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return
  const p = state.players[playerId]

  if (skillId === 'kurou') {
    if (p.hp <= 0) return
    p.hp -= 1
    pushDamageFx(state, playerId, 1)
    log(state, `${p.name} 發動【苦肉】，失去1點體力。`)
    draw(state, playerId, 2)
    log(state, `${p.name} 摸兩張牌。`)
    if (p.hp <= 0) trySave(state, playerId, playerId)
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

  if (skillId === 'zhangba') {
    if (weaponKind(p) !== 'zhangba' || p.hand.length < 2) return
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
    if (selected.length !== 2) return
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
  if (uids.length !== 2) {
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
  const skills = getGeneral(p.generalId).skills

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
        state.prompt.choiceKey === 'zhangba_target'))
  ) {
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
