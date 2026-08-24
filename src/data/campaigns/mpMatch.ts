import type { Identity, MatchConfig, PackId } from '../../engine/types'
import { listGeneralsForPick } from '../generals'
import { normalizePacks } from '../packs'

/** Multiplayer: build identity match from lobby seats (human / ai). */
export function buildMultiplayerMatch(opts: {
  mode: 'identity5' | 'identity8'
  packs: PackId[]
  seats: Array<{ name: string; isHuman: boolean }>
  forceSelectGeneral?: boolean
}): MatchConfig {
  const packs = normalizePacks(opts.packs)
  const allIds = listGeneralsForPick(packs).map((g) => g.id)
  const offeredGenerals = opts.forceSelectGeneral
    ? allIds
    : [...allIds].sort(() => Math.random() - 0.5).slice(0, 3)

  const identities: Identity[] =
    opts.mode === 'identity8'
      ? ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'rebel', 'spy']
      : ['lord', 'loyal', 'rebel', 'rebel', 'spy']

  if (opts.seats.length !== identities.length) {
    throw new Error(`seat count ${opts.seats.length} != mode ${opts.mode}`)
  }

  const shuffled = [...identities].sort(() => Math.random() - 0.5)
  const humanSeat = opts.seats.findIndex((s) => s.isHuman)
  const players: MatchConfig['players'] = opts.seats.map((s, i) => ({
    name: s.name || (s.isHuman ? '玩家' : `電腦${i + 1}`),
    isHuman: s.isHuman,
    generalId: '',
    identity: shuffled[i]!,
  }))

  return {
    mode: opts.mode,
    packs,
    humanSeat: humanSeat >= 0 ? humanSeat : 0,
    players,
    deferGeneralPick: true,
    offeredGenerals,
  }
}
