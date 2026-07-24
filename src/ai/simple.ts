import {
  endPlayPhase,
  getPlayKindOptions,
  passResponse,
  playableCards,
  selectCard,
  selectTarget,
} from '../engine/game'
import { cardKind } from '../engine/helpers'
import type { GameSnapshot } from '../engine/types'
import { getCardDef } from '../data/cards'
import { loadSettings } from '../persist/settings'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Drive AI until human input is required or game over, with think delay */
export async function runAiUntilHuman(
  state: GameSnapshot,
  onTick?: () => void,
): Promise<void> {
  const delay = loadSettings().thinkDelayMs
  let guard = 0
  while (!state.winnerIds && guard++ < 200) {
    const actorId = state.prompt.actorId
    if (actorId === null || state.prompt.kind === 'idle' || state.prompt.kind === 'game_over') {
      break
    }
    const actor = state.players[actorId]
    if (actor.isHuman) break
    onTick?.()
    if (delay > 0) await sleep(delay)
    if (state.winnerIds) break
    const again = state.prompt.actorId
    if (again === null) break
    if (state.players[again]?.isHuman) break
    stepAi(state, again)
    onTick?.()
  }
}

function stepAi(state: GameSnapshot, playerId: number): void {
  const prompt = state.prompt
  if (prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha') {
    const uids = prompt.cardUids ?? []
    if (uids.length) selectCard(state, playerId, uids[0])
    else passResponse(state, playerId)
    return
  }

  if (prompt.kind === 'discard') {
    const uids = [...(prompt.cardUids ?? [])]
    uids.sort((a, b) => scoreDiscard(state, playerId, a) - scoreDiscard(state, playerId, b))
    if (uids[0]) selectCard(state, playerId, uids[0])
    return
  }

  if (prompt.kind === 'choose_target') {
    const targets = prompt.targetIds ?? []
    const kind = prompt.respondKinds?.[0]
    let best = targets[0]
    if (kind === 'sha' || kind === 'juedou' || kind === 'huogong') {
      best = targets.slice().sort((a, b) => state.players[a].hp - state.players[b].hp)[0]
    }
    if (best !== undefined) selectTarget(state, playerId, best)
    return
  }

  if (prompt.kind === 'choose_card') {
    const cards = playableCards(state, playerId)
    const scored = cards
      .map((c) => ({ c, s: scorePlay(state, playerId, c.uid) }))
      .sort((a, b) => b.s - a.s)

    if (!scored.length || scored[0].s < 0) {
      endPlayPhase(state, playerId)
      return
    }

    const card = scored[0].c
    const p = state.players[playerId]
    const opts = getPlayKindOptions(p, card)
    const prefer =
      opts.find((k) => k === 'sha') && scorePlay(state, playerId, card.uid, 'sha') >= scored[0].s
        ? 'sha'
        : opts[0]
    selectCard(state, playerId, card.uid, prefer)

    // Target choice is same "move" — no extra delay here; next loop iteration delays
    if (state.prompt.kind === 'choose_target' && state.prompt.actorId === playerId) {
      stepAi(state, playerId)
    }
    return
  }

  endPlayPhase(state, playerId)
}

function scoreDiscard(state: GameSnapshot, playerId: number, uid: string): number {
  const p = state.players[playerId]
  const card = p.hand.find((c) => c.uid === uid)
  if (!card) return 0
  const kind = cardKind(card)
  if (kind === 'shan') return 1
  if (kind === 'sha') return 3
  if (kind === 'tao') return 10
  if (getCardDef(card.defId).type === 'equip') return 8
  return 2
}

function scorePlay(state: GameSnapshot, playerId: number, uid: string, asKind?: string): number {
  const p = state.players[playerId]
  const card = p.hand.find((c) => c.uid === uid)
  if (!card) return -1
  const def = getCardDef(card.defId)
  const kind = asKind ?? cardKind(card)
  if (def.type === 'equip') return 20
  if (kind === 'tao' && p.hp < p.maxHp) return 18
  if (kind === 'wuzhong') return 16
  if (kind === 'sha') return 14
  if (kind === 'juedou') return 12
  if (kind === 'guohe' || kind === 'shunshou') return 11
  if (kind === 'nanman' || kind === 'wanjian') return 10
  if (kind === 'huogong') return 9
  if (kind === 'taoyuan') return 8
  return 1
}
