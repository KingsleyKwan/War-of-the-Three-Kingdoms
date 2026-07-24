import {
  activateSkill,
  cancelTarget,
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
import { stepAiSmart } from './decide'
import { believedHostile, scoreAttackTarget, setSeatThought } from './mind'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Drive AI until human input is required, game over, or shouldStop. */
export async function runAiUntilHuman(
  state: GameSnapshot,
  onTick?: () => void,
  shouldStop?: () => boolean,
): Promise<void> {
  const delay = loadSettings().thinkDelayMs
  let guard = 0
  while (!state.winnerIds && guard++ < 200) {
    if (shouldStop?.()) break
    const actorId = state.prompt.actorId
    if (actorId === null || state.prompt.kind === 'idle' || state.prompt.kind === 'game_over') {
      break
    }
    const actor = state.players[actorId]
    if (actor.isHuman) break
    onTick?.()
    if (delay > 0) await sleep(delay)
    if (shouldStop?.()) break
    if (state.winnerIds) break
    const again = state.prompt.actorId
    if (again === null) break
    if (state.players[again]?.isHuman) break
    await stepAiSmart(state, again)
    onTick?.()
    // Hold so play card / damage FX stay visible before next action
    if (delay > 0 && !state.winnerIds) {
      if (shouldStop?.()) break
      const next = state.prompt.actorId
      if (next !== null && !state.players[next]?.isHuman) {
        await sleep(Math.min(delay, 900))
        onTick?.()
      } else if (state.fx.play || state.fx.damages.length) {
        await sleep(Math.min(Math.max(delay, 600), 1000))
        if (state.prompt.kind === 'choose_card' || state.prompt.kind === 'discard') {
          clearPlayFx(state)
        }
        onTick?.()
      }
    }
  }
}

/** Heuristic AI (default when no API token). */
export function stepAiSimple(state: GameSnapshot, playerId: number): void {
  const prompt = state.prompt
  if (prompt.kind === 'choice') {
    const id = pickChoice(state, playerId)
    if (id) {
      setSeatThought(state, playerId, `選擇：${id}`)
      resolveChoice(state, playerId, id)
    } else {
      const fallback = prompt.choices?.[0]?.id
      if (fallback) {
        setSeatThought(state, playerId, `選擇後備：${fallback}`)
        resolveChoice(state, playerId, fallback)
      }
    }
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
    if (uids.length) {
      setSeatThought(state, playerId, prompt.kind === 'respond_shan' ? '打出閃' : '打出殺')
      selectCard(state, playerId, uids[0])
    } else {
      setSeatThought(state, playerId, '無法響應，放棄')
      passResponse(state, playerId)
    }
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
    if (!targets.length) {
      setSeatThought(state, playerId, '無合法目標，取消')
      cancelTarget(state, playerId)
      return
    }
    const kind = prompt.respondKinds?.[0]
    let best = targets[0]
    if (kind === 'sha' || kind === 'juedou' || kind === 'huogong') {
      best = targets
        .slice()
        .sort(
          (a, b) =>
            scoreAttackTarget(state, playerId, b) - scoreAttackTarget(state, playerId, a),
        )[0]
      const top = best !== undefined ? scoreAttackTarget(state, playerId, best) : -999
      if (top < 0) {
        // All believed allies / terrible — still must pick if forced; prefer least-bad
        setSeatThought(state, playerId, '目標皆非理想（可能是隊友或張角雷擊），選傷害最低風險者')
      } else {
        setSeatThought(
          state,
          playerId,
          `攻擊 ${state.players[best].name}（敵意評估 ${top}）`,
        )
      }
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
      setSeatThought(state, playerId, '結束出牌')
      endPlayPhase(state, playerId)
      return
    }

    const card = scored[0].c
    const opts = getPlayKindOptions(p, card)
    const prefer =
      opts.find((k) => k === 'sha') && scorePlay(state, playerId, card.uid, 'sha') >= scored[0].s
        ? 'sha'
        : opts[0]
    setSeatThought(state, playerId, `打出 ${getCardDef(card.defId).name}`)
    const kindBefore = state.prompt.kind
    const logBefore = state.log.length
    selectCard(state, playerId, card.uid, prefer)

    if (state.prompt.kind === 'choose_target' && state.prompt.actorId === playerId) {
      stepAiSimple(state, playerId)
      return
    }
    // Card play did nothing (no legal follow-up) — end the phase to avoid soft-locks
    if (state.prompt.kind === kindBefore && state.log.length === logBefore) {
      setSeatThought(state, playerId, '出牌無效，結束出牌')
      endPlayPhase(state, playerId)
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
  if (kind === 'wugu') return 15
  if (kind === 'sha') {
    return 14
  }
  if (kind === 'juedou') return 12
  if (kind === 'guohe' || kind === 'shunshou') return 11
  if (kind === 'nanman' || kind === 'wanjian') return 10
  if (kind === 'jiedao') return 10
  if (kind === 'lebu' || kind === 'bingliang') return 9
  if (kind === 'huogong') return 9
  if (kind === 'taoyuan') return 8
  if (kind === 'tiesuo') return 6
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
    // Prefer thunder a believed hostile
    const hostiles = ids.filter((id) => {
      if (id === 'skip') return false
      const tid = Number(id)
      return scoreAttackTarget(state, playerId, tid) > 0
    })
    return hostiles[0] ?? 'skip'
  }
  if (key === 'guohe') {
    const equip =
      ids.find((id) => id.startsWith('equip:weapon')) ??
      ids.find((id) => id.startsWith('equip:armor')) ??
      ids.find((id) => id.startsWith('equip:'))
    return equip ?? ids.find((id) => id.startsWith('hand:')) ?? choices[0].id
  }
  if (key === 'zone_pick') {
    const selected = state.prompt.selectedCardUids ?? []
    const need = state.prompt.minTargets ?? 1
    if (selected.length >= need) return 'confirm'
    const remaining = ids.filter((id) => id !== 'confirm' && !selected.includes(id))
    if (!remaining.length) return ids.includes('confirm') ? 'confirm' : choices[0]?.id ?? null
    const equip =
      remaining.find((id) => id.startsWith('equip:weapon')) ??
      remaining.find((id) => id.startsWith('equip:armor')) ??
      remaining.find((id) => id.startsWith('equip:'))
    return equip ?? remaining.find((id) => id.startsWith('hand:')) ?? remaining[0] ?? 'confirm'
  }
  if (key === 'ganglie') return ids.includes('discard') ? 'discard' : 'damage'
  if (key === 'jianxiong') return ids.includes('take') ? 'take' : 'skip'
  if (key === 'rende_target' || key === 'zhangba_target') {
    return ids[0] ?? null
  }
  if (key === 'wuxie') {
    const w = (state as GameSnapshot & {
      _wuxie?: {
        trick: {
          type: string
          targetId?: number
          targets?: number[]
          sourceId: number
          pickerId?: number
        }
        nullified: boolean
      }
    })._wuxie
    if (!w || !ids.includes('use')) return ids.includes('skip') ? 'skip' : ids[0] ?? null
    const trick = w.trick

    // 五穀豐登：無懈某一名角色的選牌
    if (trick.type === 'wugu_pick' && trick.pickerId !== undefined) {
      const denyEnemy = believedHostile(state, playerId, trick.pickerId)
      if (denyEnemy && !w.nullified) return 'use'
      if (!denyEnemy && w.nullified) return 'use' // restore ally pick
      return 'skip'
    }

    const hitsMe =
      (trick.type === 'aoe' && (trick.targets ?? []).includes(playerId)) ||
      (typeof trick.targetId === 'number' && trick.targetId === playerId)
    const fromEnemy = believedHostile(state, playerId, trick.sourceId)
    if (hitsMe && fromEnemy && !w.nullified) return 'use'
    if (!hitsMe && fromEnemy && trick.type === 'aoe' && !w.nullified) {
      return 'skip'
    }
    return 'skip'
  }
  if (key === 'wugu') {
    return ids[0] ?? null
  }
  if (key === 'jiedao') {
    if (ids.includes('sha')) {
      const killId = state.prompt.targetIds?.[0]
      if (killId !== undefined && scoreAttackTarget(state, playerId, killId) > 0) {
        return 'sha'
      }
    }
    return ids.includes('give') ? 'give' : ids[0] ?? null
  }
  return choices[0].id
}
