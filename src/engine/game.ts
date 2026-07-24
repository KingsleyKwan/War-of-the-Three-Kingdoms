import { buildDeck, getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type {
  CardInstance,
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
  handLimit,
  isBlackCard,
  isRedCard,
  removeHand,
  shuffle,
} from './helpers'

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

export function createMatch(config: MatchConfig): GameSnapshot {
  uidSeq = 1
  const defs = buildDeck(config.packs)
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
        hp: 0,
        maxHp: 0,
        hand: [],
        equips: {},
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
      hp: g.maxHp,
      maxHp: g.maxHp,
      hand: [],
      equips: {},
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
    winnerIds: null,
    resultMessage: null,
    fx: { play: null, damages: [] },
  }

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

function beginTurn(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p.alive) {
    advanceTurn(state)
    return
  }
  p.shaUsedThisTurn = false
  state.phase = 'draw'
  let drawN = 2
  const skills = getGeneral(p.generalId).skills
  if (skills.includes('yingzi') || skills.includes('tiandu') || skills.includes('yiji') || skills.includes('guicai')) {
    // simplified extra draw for some Wei/Wu support
    if (skills.includes('yingzi')) drawN++
  }
  if (skills.includes('guojia') || skills.includes('tiandu')) {
    /* already covered */
  }
  // 郭嘉 simplified: +1 draw
  if (p.generalId === 'guojia') drawN++

  draw(state, p.id, drawN)
  log(state, `${p.name} 摸了 ${drawN} 張牌。`)
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
  const kind = resolvePlayKind(p, card)

  if (def.type === 'equip') return true
  if (kind === 'sha') {
    if (p.shaUsedThisTurn && !getGeneral(p.generalId).skills.includes('paoxiao') && !hasZhuge(p)) {
      return false
    }
    return enemiesOf(state, playerId).some((t) => canReach(state, playerId, t))
  }
  if (kind === 'tao') return p.hp < p.maxHp
  if (kind === 'shan' || kind === 'wuxie') return false
  if (kind === 'wuzhong' || kind === 'taoyuan' || kind === 'wugu' || kind === 'nanman' || kind === 'wanjian') {
    return true
  }
  if (kind === 'guohe' || kind === 'shunshou' || kind === 'juedou' || kind === 'huogong') {
    return state.players.some((t) => t.alive && t.id !== playerId)
  }
  if (kind === 'jiedao') return false // defer complex
  return false
}

function hasZhuge(p: PlayerState): boolean {
  const w = p.equips.weapon
  return !!w && getCardDef(w.defId).kind === 'zhuge'
}

function resolvePlayKind(p: PlayerState, card: CardInstance): string {
  const kind = cardKind(card)
  const skills = getGeneral(p.generalId).skills
  // default play as printed; conversions offered via AI/UI as alternate — keep printed for MVP playability
  if (skills.includes('wusheng') && isRedCard(card) && kind !== 'sha' && kind !== 'tao') {
    // allow treating as sha if cannot play otherwise — handled in canPlay by checking both
  }
  return kind
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
    removeHand(p, uid)
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

  if (kind === 'wuzhong') {
    removeHand(p, uid)
    discardCard(state, card)
    draw(state, playerId, 2)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【無中生有】，摸兩張牌。`)
    afterTrick(state, p)
    setPlayPrompt(state)
    return
  }

  if (kind === 'taoyuan') {
    removeHand(p, uid)
    discardCard(state, card)
    const healed = state.players.filter((pl) => pl.alive && pl.hp < pl.maxHp).map((pl) => pl.id)
    for (const pl of state.players) {
      if (pl.alive && pl.hp < pl.maxHp) pl.hp++
    }
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: healed.length ? healed : [playerId],
    })
    log(state, `${p.name} 使用【桃園結義】。`)
    afterTrick(state, p)
    setPlayPrompt(state)
    return
  }

  if (kind === 'nanman' || kind === 'wanjian') {
    removeHand(p, uid)
    discardCard(state, card)
    const others = state.players.filter((t) => t.alive && t.id !== playerId)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: others.map((t) => t.id),
    })
    log(state, `${p.name} 使用【${def.name}】。`)
    afterTrick(state, p)
    resolveAOE(state, playerId, others.map((t) => t.id), kind === 'nanman' ? 'sha' : 'shan', def.name)
    return
  }

  // Needs target
  const targets = legalTargets(state, playerId, kind)
  if (targets.length === 0) return

  state.prompt = {
    kind: 'choose_target',
    message: `選擇【${getCardDef(card.defId).name}】的目標`,
    actorId: playerId,
    targetIds: targets,
    minTargets: 1,
    maxTargets: 1,
    cardUids: [uid],
    respondKinds: [kind],
  }
}

function afterTrick(state: GameSnapshot, p: PlayerState): void {
  if (getGeneral(p.generalId).skills.includes('jizhi')) {
    draw(state, p.id, 1)
    log(state, `${p.name} 發動集智，摸一張牌。`)
  }
}

function legalTargets(state: GameSnapshot, playerId: number, kind: string): number[] {
  if (kind === 'sha') {
    return enemiesOf(state, playerId).filter((t) => {
      const target = state.players[t]
      // 空城
      if (getGeneral(target.generalId).skills.includes('kongcheng') && target.hand.length === 0) {
        return false
      }
      return canReach(state, playerId, t)
    })
  }
  if (kind === 'guohe' || kind === 'shunshou' || kind === 'juedou' || kind === 'huogong') {
    return state.players.filter((t) => t.alive && t.id !== playerId).map((t) => t.id)
  }
  return []
}

export function selectTarget(state: GameSnapshot, playerId: number, targetId: number): void {
  if (state.prompt.kind !== 'choose_target' || state.prompt.actorId !== playerId) return
  if (!state.prompt.targetIds?.includes(targetId)) return
  const uid = state.prompt.cardUids?.[0]
  const kind = state.prompt.respondKinds?.[0]
  if (!uid || !kind) return

  const p = state.players[playerId]
  const card = removeHand(p, uid)
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
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【殺】。`)
    askShan(state, playerId, targetId, card.uid)
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
    afterTrick(state, p)
    resolveJuedou(state, playerId, targetId)
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
    dismantle(state, targetId)
    setPlayPrompt(state)
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
    steal(state, playerId, targetId)
    setPlayPrompt(state)
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
    dealDamage(state, targetId, 1, playerId)
    setPlayPrompt(state)
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
  removeHand(p, card.uid)
  const old = p.equips[def.slot]
  if (old) {
    discardCard(state, old)
    if (getGeneral(p.generalId).skills.includes('xiaoji')) {
      draw(state, playerId, 2)
      log(state, `${p.name} 發動梟姬，摸兩張牌。`)
    }
  }
  p.equips[def.slot] = card
  log(state, `${p.name} 裝備【${def.name}】。`)
}

function askShan(state: GameSnapshot, sourceId: number, targetId: number, cardUid: string): void {
  const target = state.players[targetId]
  const source = state.players[sourceId]
  // 仁王盾：黑色殺無效
  const shaCard = state.discard.find((c) => c.uid === cardUid) ?? { uid: cardUid, defId: '' }
  const armor = target.equips.armor
  if (armor && getCardDef(armor.defId).kind === 'renwang') {
    const shaDefId = shaCard.defId || findRecentShaDef(state)
    if (shaDefId && isBlackCard({ uid: cardUid, defId: shaDefId })) {
      log(state, `${target.name} 的【仁王盾】抵消了黑色【殺】。`)
      state.pending = undefined
      resumeAfterResponse(state)
      return
    }
  }
  const needTwo = getGeneral(source.generalId).skills.includes('wushuang')
  const shanCards = responseCards(target, 'shan')
  state.pending = { type: 'sha', sourceId, targetId, cardUid }
  if (shanCards.length === 0) {
    finishShaHit(state, needTwo ? 1 : 1)
    return
  }
  state.prompt = {
    kind: 'respond_shan',
    message: `${target.name} 請打出【閃】${needTwo ? '（無雙：需兩次，簡化為一張）' : ''}`,
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
  const card = removeHand(p, uid)
  if (!card) return
  discardCard(state, card)
  const kind = state.prompt.kind

  if (kind === 'respond_shan' && state.pending?.type === 'sha') {
    const def = getCardDef(card.defId)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [state.pending.sourceId],
      note: '抵消',
    })
    log(state, `${p.name} 打出【閃】，抵消了殺。`)
    // 張角雷擊簡化
    if (getGeneral(p.generalId).skills.includes('leiji')) {
      const foes = enemiesOf(state, playerId)
      if (foes.length) {
        const t = foes[0]
        dealDamage(state, t, 1, playerId)
        log(state, `${p.name} 發動雷擊！`)
      }
    }
    state.pending = undefined
    resumeAfterResponse(state)
    return
  }

  if (kind === 'respond_sha') {
    const def = getCardDef(card.defId)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [],
      note: '響應',
    })
    log(state, `${p.name} 打出【殺】。`)
    // used by nanman / juedou chain — simplified: success, continue
    state.pending = undefined
    resumeAfterResponse(state)
  }
}

export function passResponse(state: GameSnapshot, playerId: number): void {
  if (state.prompt.actorId !== playerId) return
  if (state.prompt.kind === 'respond_shan' && state.pending?.type === 'sha') {
    log(state, `${state.players[playerId].name} 放棄出閃。`)
    finishShaHit(state, 1)
    return
  }
  if (state.prompt.kind === 'respond_sha') {
    log(state, `${state.players[playerId].name} 放棄出殺，受到傷害。`)
    // AOE damage handled in queue — for simplicity damage self from AOE marker
    const src = state.currentPlayer
    dealDamage(state, playerId, 1, src)
    resumeAfterResponse(state)
  }
}

function finishShaHit(state: GameSnapshot, dmg: number): void {
  const pending = state.pending
  if (!pending || pending.type !== 'sha') return
  const source = state.players[pending.sourceId]
  let damage = dmg
  if (getGeneral(source.generalId).skills.includes('luoyi')) damage++
  dealDamage(state, pending.targetId, damage, pending.sourceId)
  state.pending = undefined
  resumeAfterResponse(state)
}

function resumeAfterResponse(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  // If AOE queue exists continue — stored on state via (state as any)
  const queue = (state as GameSnapshot & { _aoe?: { sourceId: number; targets: number[]; need: 'sha' | 'shan'; name: string } })._aoe
  if (queue && queue.targets.length) {
    const next = queue.targets.shift()!
    askAOEResponse(state, queue.sourceId, next, queue.need, queue.name)
    return
  }
  if (queue) {
    delete (state as GameSnapshot & { _aoe?: unknown })._aoe
  }
  if (state.phase === 'play') setPlayPrompt(state)
}

function resolveAOE(
  state: GameSnapshot,
  sourceId: number,
  targets: number[],
  need: 'sha' | 'shan',
  name: string,
): void {
  ;(state as GameSnapshot & { _aoe?: unknown })._aoe = { sourceId, targets: [...targets], need, name }
  resumeAfterResponse(state)
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
  if (cards.length === 0) {
    dealDamage(state, targetId, 1, sourceId)
    log(state, `${target.name} 無法響應【${name}】，受到 1 點傷害。`)
    resumeAfterResponse(state)
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

function resolveJuedou(state: GameSnapshot, a: number, b: number): void {
  // Simplified: each needs sha alternately; AI/human — deal damage to one who can't
  const pb = state.players[b]
  const cards = responseCards(pb, 'sha')
  if (cards.length === 0) {
    dealDamage(state, b, 1, a)
  } else {
    // auto consume one sha for target, then ask source — simplify: both lose 1 sha if able else damage
    const c = removeHand(pb, cards[0].uid)!
    discardCard(state, c)
    const pa = state.players[a]
    const cardsA = responseCards(pa, 'sha')
    if (cardsA.length === 0) {
      dealDamage(state, a, 1, b)
    } else {
      const c2 = removeHand(pa, cardsA[0].uid)!
      discardCard(state, c2)
      dealDamage(state, b, 1, a)
    }
  }
  checkVictory(state)
  if (!state.winnerIds) setPlayPrompt(state)
}

function dismantle(state: GameSnapshot, targetId: number): void {
  const t = state.players[targetId]
  if (t.hand.length) {
    const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0]
    discardCard(state, c)
    log(state, `${t.name} 被拆掉一張手牌。`)
    return
  }
  for (const slot of equipSlots()) {
    const e = t.equips[slot]
    if (e) {
      delete t.equips[slot]
      discardCard(state, e)
      log(state, `${t.name} 被拆掉【${getCardDef(e.defId).name}】。`)
      if (getGeneral(t.generalId).skills.includes('xiaoji')) {
        draw(state, targetId, 2)
      }
      return
    }
  }
}

function steal(state: GameSnapshot, fromId: number, targetId: number): void {
  const t = state.players[targetId]
  const thief = state.players[fromId]
  if (t.hand.length) {
    const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0]
    thief.hand.push(c)
    log(state, `${thief.name} 獲得了 ${t.name} 的一張手牌。`)
    return
  }
  for (const slot of equipSlots()) {
    const e = t.equips[slot]
    if (e) {
      delete t.equips[slot]
      thief.hand.push(e)
      log(state, `${thief.name} 獲得了【${getCardDef(e.defId).name}】。`)
      return
    }
  }
}

function dealDamage(state: GameSnapshot, targetId: number, amount: number, sourceId: number | null): void {
  const t = state.players[targetId]
  if (!t.alive) return
  t.hp -= amount
  pushDamageFx(state, targetId, amount)
  log(state, `${t.name} 受到 ${amount} 點傷害（體力 ${Math.max(t.hp, 0)}）。`)

  // 奸雄 / 反饋 / 剛烈 simplified
  if (sourceId !== null && t.hp >= 0) {
    const skills = getGeneral(t.generalId).skills
    if (skills.includes('jianxiong')) {
      draw(state, targetId, 1)
      log(state, `${t.name} 發動奸雄，摸一張牌。`)
    }
    if (skills.includes('fankui') || skills.includes('guicai')) {
      draw(state, targetId, 1)
    }
    if (skills.includes('ganglie') && Math.random() < 0.5) {
      dealDamage(state, sourceId, 1, targetId)
      log(state, `${t.name} 發動剛烈！`)
      return
    }
  }

  if (t.hp <= 0) {
    trySave(state, targetId)
  }
  checkVictory(state)
}

function trySave(state: GameSnapshot, targetId: number): void {
  const t = state.players[targetId]
  // Self tao first (auto for dying)
  while (t.hp <= 0) {
    const tao = responseCards(t, 'tao')
    if (!tao.length) break
    const c = removeHand(t, tao[0].uid)!
    discardCard(state, c)
    t.hp += 1
    log(state, `${t.name} 使用【桃】求救，體力回覆至 ${t.hp}。`)
  }
  if (t.hp <= 0) {
    t.alive = false
    t.hand.forEach((c) => discardCard(state, c))
    t.hand = []
    for (const slot of equipSlots()) {
      const e = t.equips[slot]
      if (e) {
        discardCard(state, e)
        delete t.equips[slot]
      }
    }
    log(state, `${t.name}（${getGeneral(t.generalId).name}）陣亡。`)
  }
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
  const c = removeHand(p, uid)
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
  if (state.prompt.kind !== 'choose_target' || state.prompt.actorId !== playerId) return
  setPlayPrompt(state)
}

export function legalTargetsForPrompt(state: GameSnapshot): number[] {
  return state.prompt.targetIds ?? []
}

export function getAttackRange(p: PlayerState): number {
  return attackRangeOf(p)
}
