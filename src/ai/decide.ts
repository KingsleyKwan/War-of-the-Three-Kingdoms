import {
  activateSkill,
  endPlayPhase,
  passResponse,
  resolveChoice,
  selectCard,
  selectTarget,
} from '../engine/game'
import type { GameSnapshot } from '../engine/types'
import { loadSettings } from '../persist/settings'
import { requestLlmDecision, type LlmDecision } from './llm'
import { setSeatThought } from './mind'
import { stepAiSimple } from './simple'

/** One AI action: LLM if token set, else heuristic. */
export async function stepAiSmart(state: GameSnapshot, playerId: number): Promise<void> {
  const token = loadSettings().aiApiToken.trim()
  if (!token) {
    stepAiSimple(state, playerId)
    return
  }
  const decision = await requestLlmDecision(state, playerId)
  if (!decision || !applyLlmDecision(state, playerId, decision)) {
    stepAiSimple(state, playerId)
  }
}

function applyLlmDecision(
  state: GameSnapshot,
  playerId: number,
  d: LlmDecision,
): boolean {
  const prompt = state.prompt
  try {
    switch (d.action) {
      case 'end_play':
        if (prompt.kind === 'choose_card') {
          endPlayPhase(state, playerId)
          return true
        }
        return false
      case 'play_card':
      case 'respond_card':
      case 'pick_card': {
        const uid = d.cardUid
        if (!uid || !prompt.cardUids?.includes(uid)) return false
        selectCard(state, playerId, uid)
        return true
      }
      case 'pass':
        if (prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha') {
          passResponse(state, playerId)
          return true
        }
        return false
      case 'select_target': {
        const tid = d.targetId
        if (tid === undefined || !prompt.targetIds?.includes(tid)) return false
        selectTarget(state, playerId, tid)
        return true
      }
      case 'choice':
      case 'confirm': {
        const id = d.action === 'confirm' ? 'confirm' : d.choiceId
        if (!id) return false
        if (prompt.kind !== 'choice' && prompt.kind !== 'skill_cards') return false
        resolveChoice(state, playerId, id)
        return true
      }
      case 'skill': {
        if (prompt.kind !== 'choose_card' || !d.skillId) return false
        activateSkill(state, playerId, d.skillId)
        return true
      }
      default:
        setSeatThought(state, playerId, `無法解析行動 ${String(d.action)}，改用內建 AI`)
        return false
    }
  } catch {
    return false
  }
}
