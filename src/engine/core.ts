/**
 * Shared engine primitives (UID, FX, log, draw/discard, turn-skip flags).
 * No turn/skill flow — safe for any engine module to import.
 */
import type { CardInstance, GameSnapshot, PlayerState, Suit } from './types'
import { playerSkills, removeHand as removeHandCard, shuffle } from './helpers'
import { SKILL_CATALOG } from './skillCatalog'

let uidSeq = 1
let fxSeq = 1

export function nextUid(): string {
  return `c${uidSeq++}`
}

export function nextFxSeq(): number {
  return fxSeq++
}

export function resetUidSeq(): void {
  uidSeq = 1
}

export function setPlayFx(
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

export function pushDamageFx(state: GameSnapshot, playerId: number, amount: number): void {
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

export function idlePrompt(): import('./types').PromptState {
  return { kind: 'idle', message: '', actorId: null }
}

export function log(state: GameSnapshot, text: string): void {
  state.log.push({ text, t: Date.now() })
  if (state.log.length > 80) state.log.shift()
}

export function skillLabel(id: string): string {
  return SKILL_CATALOG.find((s) => s.id === id)?.name ?? id
}

export const HUASHEN_POOL = [
  'jianxiong', 'fankui', 'ganglie', 'wusheng', 'paoxiao', 'qixi',
  'yingzi', 'keji', 'jizhi', 'qingguo', 'longdan', 'mashu',
  'wushuang', 'kongcheng', 'qianxun', 'jijiu', 'biyue',
]

export function pickHuashenSkill(): string {
  return HUASHEN_POOL[Math.floor(Math.random() * HUASHEN_POOL.length)]
}

export type TurnSkip = {
  skipDraw: boolean
  skipPlay: boolean
  skipJudge?: boolean
  xuanhuoAsked?: boolean
  shensuAsked?: boolean
  shuangxiongAsked?: boolean
  tuxiAsked?: boolean
  zaiqiAsked?: boolean
  zaiqiOn?: boolean
  yinghunAsked?: boolean
  xiansiAsked?: boolean
  shensuVirtual?: boolean
}

export function turnSkipOf(state: GameSnapshot): TurnSkip {
  const extra = state as GameSnapshot & { _turnSkip?: TurnSkip }
  if (!extra._turnSkip) extra._turnSkip = { skipDraw: false, skipPlay: false }
  return extra._turnSkip
}

export function draw(state: GameSnapshot, playerId: number, n: number): void {
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

export function discardCard(state: GameSnapshot, card: CardInstance): void {
  state.discard.push(card)
}

/** Remove from hand and trigger 連營 if it was the last card */
export function takeHand(state: GameSnapshot, playerId: number, uid: string): CardInstance | null {
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
