/**
 * Serializable player actions for multiplayer.
 * Host applies these via applyPlayerAction; non-host clients only send them.
 */

import {
  activateSkill,
  cancelTarget,
  confirmGeneralPick,
  endPlayPhase,
  passResponse,
  resolveChoice,
  selectCard,
  selectTarget,
} from '../engine/game'
import type { GameSnapshot } from '../engine/types'

export type PlayerAction =
  | { type: 'select_card'; uid: string }
  | { type: 'select_target'; seatId: number }
  | { type: 'end_play' }
  | { type: 'pass_response' }
  | { type: 'cancel_target' }
  | { type: 'choice'; choiceId: string }
  | { type: 'skill'; skillId: string }
  | { type: 'pick_general'; generalId: string }

/** Apply a remote/local action on the authoritative game state (host only). */
export function applyPlayerAction(
  g: GameSnapshot,
  seatId: number,
  action: PlayerAction,
): void {
  switch (action.type) {
    case 'select_card':
      selectCard(g, seatId, action.uid)
      break
    case 'select_target':
      selectTarget(g, seatId, action.seatId)
      break
    case 'end_play':
      endPlayPhase(g, seatId)
      break
    case 'pass_response':
      passResponse(g, seatId)
      break
    case 'cancel_target':
      cancelTarget(g, seatId)
      break
    case 'choice':
      resolveChoice(g, seatId, action.choiceId)
      break
    case 'skill':
      activateSkill(g, seatId, action.skillId)
      break
    case 'pick_general':
      confirmGeneralPick(g, action.generalId, seatId)
      break
    default:
      break
  }
}

export function parsePlayerAction(raw: unknown): PlayerAction | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.type !== 'string') return null
  switch (a.type) {
    case 'select_card':
      return typeof a.uid === 'string' ? { type: 'select_card', uid: a.uid } : null
    case 'select_target':
      return typeof a.seatId === 'number' ? { type: 'select_target', seatId: a.seatId } : null
    case 'end_play':
      return { type: 'end_play' }
    case 'pass_response':
      return { type: 'pass_response' }
    case 'cancel_target':
      return { type: 'cancel_target' }
    case 'choice':
      return typeof a.choiceId === 'string' ? { type: 'choice', choiceId: a.choiceId } : null
    case 'skill':
      return typeof a.skillId === 'string' ? { type: 'skill', skillId: a.skillId } : null
    case 'pick_general':
      return typeof a.generalId === 'string' ? { type: 'pick_general', generalId: a.generalId } : null
    default:
      return null
  }
}
