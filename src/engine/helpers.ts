import type { CardInstance, EquipSlot, GameSnapshot, PlayerState, Suit } from './types'
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'

export function shuffle<T>(arr: T[], rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function seatDistance(from: number, to: number, n: number, alive: boolean[]): number {
  if (from === to) return 0
  let cw = 0
  let i = from
  while (i !== to) {
    i = (i + 1) % n
    if (alive[i] || i === to) cw++
    if (cw > n) break
  }
  let ccw = 0
  i = from
  while (i !== to) {
    i = (i - 1 + n) % n
    if (alive[i] || i === to) ccw++
    if (ccw > n) break
  }
  return Math.min(cw, ccw)
}

export function attackRangeOf(p: PlayerState): number {
  const w = p.equips.weapon
  if (!w) return 1
  return getCardDef(w.defId).attackRange ?? 1
}

export function distanceMod(p: PlayerState): { minus: number; plus: number } {
  let minus = 0
  let plus = 0
  // −1 坐騎（如赤兔）：你與其他角色的距離 −1
  if (p.equips.horseMinus) minus++
  // +1 坐騎（如的盧）：其他角色與你的距離 +1
  if (p.equips.horsePlus) plus++
  if (playerSkills(p).includes('mashu')) minus++
  minus += Math.min(3, p.tianCount ?? 0)
  return { minus, plus }
}

export function playerSkills(p: PlayerState): string[] {
  if (!p.generalId || p.skillsDisabled) return []
  try {
    return [...new Set([...getGeneral(p.generalId).skills, ...(p.extraSkills ?? [])])]
  } catch {
    return []
  }
}

/**
 * Effective distance from A to B, including −1/+1 horses and 馬術.
 * Used by 殺 reach, 順手牽羊, 兵糧寸斷, etc.
 */
export function getDistance(state: GameSnapshot, fromId: number, toId: number): number {
  const alive = state.players.map((p) => p.alive)
  const n = state.players.length
  const from = state.players[fromId]
  const to = state.players[toId]
  if (!from.alive || !to.alive) return 99
  if (fromId === toId) return 0
  const base = seatDistance(fromId, toId, n, alive)
  const fm = distanceMod(from)
  const tm = distanceMod(to)
  return Math.max(1, base - fm.minus + tm.plus)
}

export function canReach(state: GameSnapshot, fromId: number, toId: number): boolean {
  const from = state.players[fromId]
  const to = state.players[toId]
  if (!from.alive || !to.alive) return false
  return getDistance(state, fromId, toId) <= attackRangeOf(from)
}

/** Distance ≤ 1 (順手牽羊、兵糧寸斷); 奇才 ignores for tricks. */
export function withinDistanceOne(
  state: GameSnapshot,
  fromId: number,
  toId: number,
  ignoreDist: boolean,
): boolean {
  if (ignoreDist) return true
  return getDistance(state, fromId, toId) <= 1
}

export function handLimit(p: PlayerState): number {
  return Math.max(0, p.hp)
}

export function findCard(p: PlayerState, uid: string): CardInstance | undefined {
  return p.hand.find((c) => c.uid === uid)
}

export function removeHand(p: PlayerState, uid: string): CardInstance | null {
  const i = p.hand.findIndex((c) => c.uid === uid)
  if (i < 0) return null
  return p.hand.splice(i, 1)[0]
}

export function equipSlots(): EquipSlot[] {
  return ['weapon', 'armor', 'horseMinus', 'horsePlus']
}

export function cardKind(card: CardInstance): string {
  return getCardDef(card.defId).kind
}

export function isRedCard(card: CardInstance): boolean {
  const suit = getCardDef(card.defId).suit
  return suit === 'heart' || suit === 'diamond'
}

export function effectiveSuit(card: CardInstance, owner?: PlayerState): Suit | undefined {
  const suit = getCardDef(card.defId).suit
  return owner && playerSkills(owner).includes('hongyan') && suit === 'spade' ? 'heart' : suit
}

export function isRedFor(owner: PlayerState, card: CardInstance): boolean {
  const suit = effectiveSuit(card, owner)
  return suit === 'heart' || suit === 'diamond'
}

export function isBlackFor(owner: PlayerState, card: CardInstance): boolean {
  const suit = effectiveSuit(card, owner)
  return suit === 'spade' || suit === 'club'
}

export function isBlackCard(card: CardInstance): boolean {
  const suit = getCardDef(card.defId).suit
  return suit === 'spade' || suit === 'club'
}

export function effectiveKind(player: PlayerState, card: CardInstance): string {
  const kind = cardKind(card)
  const skills = playerSkills(player)
  if (skills.includes('wusheng') && isRedFor(player, card) && kind !== 'sha') {
    // optional convert — handled at play time via playAs
  }
  if (skills.includes('longdan')) {
    if (kind === 'sha') return 'sha' // can also be shan when responding
    if (kind === 'shan') return 'shan'
  }
  if (skills.includes('qingguo') && isBlackFor(player, card) && kind !== 'shan') {
    // black as shan when responding
  }
  if (skills.includes('jijiu') && isRedFor(player, card)) {
    // red as tao when saving
  }
  return kind
}

export function enemiesOf(state: GameSnapshot, playerId: number): number[] {
  const me = state.players[playerId]
  // Story teams: only the opposing side
  if (me.side) {
    return state.players
      .filter((p) => p.alive && p.id !== playerId && p.side && p.side !== me.side)
      .map((p) => p.id)
  }
  if (state.config.mode === 'duel') {
    return state.players
      .filter((p) => p.alive && p.id !== playerId)
      .map((p) => p.id)
  }
  // Identity: any other living seat can be targeted; AI uses beliefs to choose.
  return state.players.filter((p) => p.alive && p.id !== playerId).map((p) => p.id)
}

/** True same-side check (victory / reveal). */
export function trueSameSide(
  a: PlayerState['identity'],
  b: PlayerState['identity'],
): boolean {
  if (a === 'spy' || b === 'spy') return false
  const lordSide = new Set(['lord', 'loyal'])
  if (lordSide.has(a) && lordSide.has(b)) return true
  if (a === 'rebel' && b === 'rebel') return true
  return false
}

export function checkVictory(state: GameSnapshot): void {
  if (state.winnerIds) return
  const alive = state.players.filter((p) => p.alive)
  const rule = state.config.victory

  if (rule?.type === 'eliminate_enemies' || rule?.type === 'eliminate_all_others') {
    const human = state.players.find((p) => p.isHuman)
    if (!human) return
    const foes = state.players.filter((p) => {
      if (!p.alive || p.id === human.id) return false
      if (human.side) return p.side === 'enemy'
      return !p.isHuman
    })
    if (foes.length === 0) {
      state.winnerIds = [human.id]
      state.resultMessage = '勝利！敌军已全灭。'
      state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
      return
    }
    if (!human.alive) {
      state.winnerIds = foes.map((p) => p.id)
      state.resultMessage = '敗戰……主公已陣亡。'
      state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
    }
    return
  }

  if (rule?.type === 'kill_target' && rule.targetGeneralId) {
    const target = state.players.find((p) => p.generalId === rule.targetGeneralId)
    const human = state.players.find((p) => p.isHuman)
    if (target && !target.alive && human?.alive) {
      state.winnerIds = [human.id]
      state.resultMessage = `勝利！已擊殺 ${getGeneral(rule.targetGeneralId).name}。`
      state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
      return
    }
    if (human && !human.alive) {
      state.winnerIds = state.players.filter((p) => p.alive).map((p) => p.id)
      state.resultMessage = '敗戰……'
      state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
    }
    return
  }

  if (state.config.mode === 'duel') {
    if (alive.length === 1) {
      state.winnerIds = [alive[0].id]
      state.resultMessage = `${alive[0].name} 獲勝！`
      state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
    }
    return
  }

  // identity 5
  const lord = state.players.find((p) => p.identity === 'lord')
  const rebels = state.players.filter((p) => p.identity === 'rebel' && p.alive)
  const spy = state.players.find((p) => p.identity === 'spy')
  if (lord && !lord.alive) {
    if (alive.length === 1 && spy?.alive) {
      state.winnerIds = [spy.id]
      state.resultMessage = '內奸獲勝！'
    } else {
      state.winnerIds = state.players.filter((p) => p.identity === 'rebel').map((p) => p.id)
      state.resultMessage = '反賊獲勝！'
    }
    state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
    return
  }
  if (lord?.alive && rebels.length === 0 && !(spy?.alive)) {
    state.winnerIds = state.players
      .filter((p) => p.identity === 'lord' || p.identity === 'loyal')
      .map((p) => p.id)
    state.resultMessage = '主公陣營獲勝！'
    state.prompt = { kind: 'game_over', message: state.resultMessage, actorId: null }
  }
}
