import {
  activateSkill,
  endPlayPhase,
  getPlayKindOptions,
  passResponse,
  playableCards,
  resolveChoice,
  selectCard,
  selectTarget,
  clearPlayFx,
} from '../engine/game'
import { listSkillActions } from '../engine/skills'
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
    // Hold so play card / damage FX stay visible before next action
    if (delay > 0 && !state.winnerIds) {
      const next = state.prompt.actorId
      if (next !== null && !state.players[next]?.isHuman) {
        await sleep(Math.min(delay, 900))
        onTick?.()
      } else if (state.fx.play || state.fx.damages.length) {
        await sleep(Math.min(Math.max(delay, 600), 1000))
        // Effect finished (back to human play) — remove played card
        if (state.prompt.kind === 'choose_card' || state.prompt.kind === 'discard') {
          clearPlayFx(state)
        }
        onTick?.()
      }
    }
  }
}

function stepAi(state: GameSnapshot, playerId: number): void {
  const prompt = state.prompt
  if (prompt.kind === 'choice') {
    const id = pickChoice(state, playerId)
    if (id) resolveChoice(state, playerId, id)
    return
  }
  if (prompt.kind === 'skill_cards') {
    const need = prompt.minTargets ?? 1
    const uids = [...(prompt.cardUids ?? [])]
    const selected = prompt.selectedCardUids ?? []
    if (selected.length < need && uids.length) {
      const next = uids.find((u) => !selected.includes(u))
      if (next) {
        selectCard(state, playerId, next)
        if ((state.prompt.selectedCardUids?.length ?? 0) >= need) {
          resolveChoice(state, playerId, 'confirm')
        }
        return
      }
    }
    resolveChoice(state, playerId, 'confirm')
    return
  }
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
    const skills = listSkillActions(state, playerId)
    const p = state.players[playerId]
    if (skills.some((s) => s.id === 'zhiheng') && p.hand.length >= 4) {
      activateSkill(state, playerId, 'zhiheng')
      return
    }
    if (skills.some((s) => s.id === 'kurou') && p.hand.length <= 1 && p.hp > 1) {
      activateSkill(state, playerId, 'kurou')
      return
    }
    if (skills.some((s) => s.id === 'luoyi') && p.hand.some((c) => cardKind(c) === 'sha')) {
      activateSkill(state, playerId, 'luoyi')
      return
    }
    if (skills.some((s) => s.id === 'zhangba') && !p.hand.some((c) => cardKind(c) === 'sha')) {
      activateSkill(state, playerId, 'zhangba')
      return
    }

    const cards = playableCards(state, playerId)
    const scored = cards
      .map((c) => ({ c, s: scorePlay(state, playerId, c.uid) }))
      .sort((a, b) => b.s - a.s)

    if (!scored.length || scored[0].s < 0) {
      endPlayPhase(state, playerId)
      return
    }

    const card = scored[0].c
    const opts = getPlayKindOptions(p, card)
    const prefer =
      opts.find((k) => k === 'sha') && scorePlay(state, playerId, card.uid, 'sha') >= scored[0].s
        ? 'sha'
        : opts[0]
    selectCard(state, playerId, card.uid, prefer)

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

function pickChoice(state: GameSnapshot, playerId: number): string | null {
  const choices = state.prompt.choices ?? []
  if (!choices.length) return null
  const key = state.prompt.choiceKey
  const ids = choices.map((c) => c.id)

  if (key === 'qilingong') {
    return ids.find((id) => id === 'horsePlus') ?? ids.find((id) => id === 'horseMinus') ?? 'skip'
  }
  if (key === 'hanbing') {
    const tid = state.prompt.targetIds?.[0] ?? state.pending?.targetId
    const t = tid !== undefined ? state.players[tid] : null
    if (
      t &&
      (t.hand.length > 0 ||
        t.equips.weapon ||
        t.equips.armor ||
        t.equips.horseMinus ||
        t.equips.horsePlus)
    ) {
      return 'yes'
    }
    return 'no'
  }
  if (key === 'qinglong') return ids.includes('yes') ? 'yes' : 'no'
  if (key === 'guanshi') return ids.includes('yes') ? 'yes' : 'no'
  if (key === 'cixiong') {
    const p = state.players[playerId]
    return p.hand.length > 2 ? 'discard' : 'draw'
  }
  if (key === 'fangtian_confirm') return 'confirm'
  if (key === 'liuli') return 'skip'
  if (key === 'leiji') {
    const hit = ids.find((id) => id !== 'skip')
    return hit ?? 'skip'
  }
  if (key === 'rende_target' || key === 'zhangba_target') {
    return ids[0] ?? null
  }
  return choices[0].id
}
