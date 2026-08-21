import { CARD_DEFS } from '../src/data/cards'
import { getGeneral } from '../src/data/generals'
import {
  activateSkill,
  createMatch,
  resolveChoice,
  selectCard,
} from '../src/engine/game'
import type {
  CardInstance,
  GameSnapshot,
  Identity,
  MatchConfig,
  PackId,
  Suit,
} from '../src/engine/types'

const ALL_PACKS: PackId[] = [
  'standard',
  'ex',
  'wind',
  'fire',
  'forest',
  'mountain',
  'yijiang',
]

let uidSeq = 0

export function nextUid(prefix = 't'): string {
  uidSeq += 1
  return `${prefix}${uidSeq}`
}

export function cardOf(kind: string, suit?: Suit, slot?: string): CardInstance {
  const def = CARD_DEFS.find(
    (c) =>
      c.kind === kind &&
      (suit ? c.suit === suit : true) &&
      (slot ? c.slot === slot : true),
  )
  if (!def) throw new Error(`no card kind=${kind} suit=${suit ?? '*'} slot=${slot ?? '*'}`)
  return { uid: nextUid(kind), defId: def.id }
}

export function duel(a: string, b: string, extra?: Partial<MatchConfig>): GameSnapshot {
  return createMatch({
    mode: 'duel',
    packs: ALL_PACKS,
    humanSeat: 0,
    players: [
      { name: getGeneral(a).name, isHuman: true, generalId: a, identity: 'none' },
      { name: getGeneral(b).name, isHuman: false, generalId: b, identity: 'none' },
    ],
    ...extra,
  })
}

export function table(ids: string[], identities?: Identity[]): GameSnapshot {
  const seats = identities ?? ids.map((_, i) => (i === 0 ? 'lord' : 'rebel') as Identity)
  return createMatch({
    mode: ids.length === 2 ? 'duel' : 'identity5',
    packs: ALL_PACKS,
    humanSeat: 0,
    players: ids.map((g, i) => ({
      name: getGeneral(g).name,
      isHuman: i === 0,
      generalId: g,
      identity: ids.length === 2 ? 'none' : seats[i] ?? 'rebel',
      side: undefined,
    })),
  })
}

export function storyTable(
  seats: Array<{ generalId: string; side: 'ally' | 'enemy'; name?: string }>,
): GameSnapshot {
  return createMatch({
    mode: 'duel',
    packs: ALL_PACKS,
    humanSeat: 0,
    players: seats.map((s, i) => ({
      name: s.name ?? getGeneral(s.generalId).name,
      isHuman: i === 0,
      generalId: s.generalId,
      identity: 'none',
      side: s.side,
    })),
  })
}

/** Put a seat into a clean play-phase prompt regardless of prepare/draw skills. */
export function forcePlay(state: GameSnapshot, playerId = 0): GameSnapshot {
  const p = state.players[playerId]
  state.phase = 'play'
  state.currentPlayer = playerId
  state.matchPhase = 'playing'
  state.winnerIds = null
  state.resultMessage = null
  state.prompt = {
    kind: 'choose_card',
    message: `${p.name} 的出牌階段`,
    actorId: playerId,
    cardUids: p.hand.map((c) => c.uid),
  }
  return state
}

export function logged(state: GameSnapshot, snippet: string): boolean {
  return state.log.some((l) => l.text.includes(snippet))
}

export function pickSkillCards(
  state: GameSnapshot,
  playerId: number,
  skillId: string,
  uids: string[],
): void {
  activateSkill(state, playerId, skillId)
  for (const uid of uids) selectCard(state, playerId, uid)
  resolveChoice(state, playerId, 'confirm')
}
