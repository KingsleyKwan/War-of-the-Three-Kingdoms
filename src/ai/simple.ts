import {
  activateSkill,
  cancelTarget,
  endPlayPhase,
  getLegalTargets,
  getPlayKindOptions,
  passResponse,
  playableCards,
  resolveChoice,
  selectCard,
  selectTarget,
  clearPlayFx,
} from '../engine/game'
import { listSkillActions } from '../engine/skills'
import { cardKind, equipSlots } from '../engine/helpers'
import type { CardInstance, GameSnapshot, PlayerState } from '../engine/types'
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
      let next: string | undefined
      if (prompt.skillId === 'luoyi') {
        const picks = pickLuoyiDiscardUids(state, playerId, need)
        next = picks.find((u) => !selected.includes(u) && uids.includes(u))
      }
      if (!next) {
        // Prefer discarding low-value cards
        const ranked = uids
          .filter((u) => !selected.includes(u))
          .sort(
            (a, b) =>
              scoreDiscard(state, playerId, a) - scoreDiscard(state, playerId, b),
          )
        next = ranked[0]
      }
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
        setSeatThought(state, playerId, '目標皆非理想（可能是隊友或張角雷擊），選傷害最低風險者')
      } else {
        setSeatThought(
          state,
          playerId,
          `攻擊 ${state.players[best].name}（敵意評估 ${top}）`,
        )
      }
    } else if (
      kind === 'guohe' ||
      kind === 'shunshou' ||
      kind === 'lebu' ||
      kind === 'bingliang'
    ) {
      const mode =
        kind === 'guohe' ? 'discard' : kind === 'shunshou' ? 'steal' : 'delay'
      best = targets
        .slice()
        .sort(
          (a, b) =>
            scoreTrickTarget(state, playerId, b, mode) -
            scoreTrickTarget(state, playerId, a, mode),
        )[0]
      const top = best !== undefined ? scoreTrickTarget(state, playerId, best, mode) : -999
      if (top < 0) {
        setSeatThought(state, playerId, '無合適拆牌／延時目標（避免傷隊友），取消')
        cancelTarget(state, playerId)
        endPlayPhase(state, playerId)
        return
      }
      setSeatThought(
        state,
        playerId,
        `指定 ${state.players[best].name}（${mode === 'discard' ? '拆牌' : mode === 'steal' ? '偷牌' : '延時'} ${top}）`,
      )
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
    if (skills.some((s) => s.id === 'luoyi') && shouldActivateLuoyi(state, playerId)) {
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

function hasEquip(p: PlayerState): boolean {
  return equipSlots().some((s) => !!p.equips[s])
}

function hasJudgeLock(p: PlayerState): boolean {
  return (p.judges ?? []).some((j) => {
    const k = getCardDef(j.defId).kind
    return k === 'lebu' || k === 'bingliang'
  })
}

/** Pick which zone card to discard/steal: allies → locks; enemies → equip/hand (not locks). */
function pickZoneCard(
  state: GameSnapshot,
  actorId: number,
  ids: string[],
): string | null {
  const ownerId = state.prompt.pickOwnerId ?? state.prompt.targetIds?.[0]
  const hostile =
    ownerId === undefined ? true : believedHostile(state, actorId, ownerId)

  if (!hostile) {
    return (
      ids.find((id) => id.startsWith('judge:')) ??
      null
    )
  }

  const nonJudge = ids.filter((id) => !id.startsWith('judge:'))
  const pool = nonJudge.length ? nonJudge : ids
  return (
    pool.find((id) => id.startsWith('equip:weapon')) ??
    pool.find((id) => id.startsWith('equip:armor')) ??
    pool.find((id) => id.startsWith('equip:')) ??
    pool.find((id) => id.startsWith('hand:')) ??
    pool[0] ??
    null
  )
}

/**
 * Score 過河/順手/樂/兵 targets:
 * - Enemies: dismantle hand/equip (not their locks)
 * - Allies: only good for discarding their 樂/兵
 */
function scoreTrickTarget(
  state: GameSnapshot,
  actorId: number,
  targetId: number,
  mode: 'discard' | 'steal' | 'delay',
): number {
  const t = state.players[targetId]
  if (!t?.alive) return -999
  const hostile = believedHostile(state, actorId, targetId)
  const lock = hasJudgeLock(t)
  const stuff = t.hand.length > 0 || hasEquip(t)

  if (mode === 'delay') {
    if (!hostile) return -200
    return 25 + (4 - t.hp) * 2
  }

  if (!hostile) {
    // Help ally by removing 樂不思蜀 / 兵糧
    if (mode === 'discard' && lock) return 55
    return -200
  }

  // Enemy: do not remove their locks (that helps them)
  if (!stuff && lock) return -40
  let score = 20 + t.hand.length * 3
  if (t.equips.weapon) score += 10
  if (t.equips.armor) score += 12
  if (t.equips.horseMinus || t.equips.horsePlus) score += 6
  if (mode === 'steal') score += 2
  return score
}

function scoreDiscard(state: GameSnapshot, playerId: number, uid: string): number {
  const p = state.players[playerId]
  const card = p.hand.find((c) => c.uid === uid)
  if (!card) return 0
  const kind = cardKind(card)
  const def = getCardDef(card.defId)
  // Higher = keep (discard lowest first)
  if (kind === 'tao') return 20
  if (kind === 'wuxie') return 14
  if (kind === 'shan') return 8
  if (kind === 'sha') return 10
  if (def.type === 'equip') {
    // Spare gear is okay to discard if slot already filled
    if (def.slot && p.equips[def.slot]) return 4
    return 12
  }
  if (def.type === 'trick') return 6
  return 3
}

/** 裸衣 only when we can still 殺 a foe after discarding 2 cards. */
function shouldActivateLuoyi(state: GameSnapshot, playerId: number): boolean {
  const p = state.players[playerId]
  if (p.luoyiActive || p.hand.length < 3) return false
  const shaCards = p.hand.filter((c) => cardKind(c) === 'sha')
  if (!shaCards.length) return false
  // Must keep ≥1 殺 after discarding 2
  const nonSha = p.hand.filter((c) => cardKind(c) !== 'sha')
  const spareSha = Math.max(0, shaCards.length - 1)
  if (nonSha.length + spareSha < 2) return false
  const foes = getLegalTargets(state, playerId, 'sha').filter(
    (tid) => scoreAttackTarget(state, playerId, tid) > 0,
  )
  return foes.length > 0
}

function pickLuoyiDiscardUids(
  state: GameSnapshot,
  playerId: number,
  need: number,
): string[] {
  const p = state.players[playerId]
  const shaUids = p.hand.filter((c) => cardKind(c) === 'sha').map((c) => c.uid)
  const keepSha = shaUids[0]
  const ranked = p.hand
    .filter((c) => c.uid !== keepSha)
    .sort(
      (a, b) =>
        scoreDiscard(state, playerId, a.uid) - scoreDiscard(state, playerId, b.uid),
    )
  return ranked.slice(0, need).map((c) => c.uid)
}

function equipPlayScore(state: GameSnapshot, playerId: number, card: CardInstance): number {
  const p = state.players[playerId]
  const def = getCardDef(card.defId)
  const slot = def.slot
  if (!slot) return -1
  const cur = p.equips[slot]
  if (!cur) {
    // Empty slot: useful, but below attacking / healing
    return 11
  }
  // Already equipped — prefer holding spare (weapon/armor/horse) unless clear upgrade
  const curDef = getCardDef(cur.defId)
  if (slot === 'weapon') {
    const curR = curDef.attackRange ?? 1
    const newR = def.attackRange ?? 1
    // 諸葛連弩 is a real upgrade when we want multi-kill; range+ only if +2 or more
    if (def.kind === 'zhuge' && curDef.kind !== 'zhuge') return 9
    if (newR >= curR + 2) return 7
    return -4
  }
  // Armor / horse: don't swap same slot just to play a card
  if (def.kind === curDef.kind) return -6
  // Different armor: mild preference only for 仁王盾 over 八卦 if we often see black sha — keep simple
  if (slot === 'armor' && def.kind === 'renwang' && curDef.kind === 'bagua') return 5
  return -5
}

function scorePlay(state: GameSnapshot, playerId: number, uid: string, asKind?: string): number {
  const p = state.players[playerId]
  const card = p.hand.find((c) => c.uid === uid)
  if (!card) return -1
  const def = getCardDef(card.defId)
  const kind = asKind ?? cardKind(card)
  if (def.type === 'equip') return equipPlayScore(state, playerId, card)
  if (kind === 'tao' && p.hp < p.maxHp) return 18
  if (kind === 'wuzhong') return 16
  if (kind === 'wugu') return 15
  if (kind === 'sha') {
    const foes = getLegalTargets(state, playerId, 'sha').filter(
      (tid) => scoreAttackTarget(state, playerId, tid) > 0,
    )
    if (!foes.length) return -2
    return 14
  }
  if (kind === 'juedou') return 12
  if (kind === 'guohe' || kind === 'shunshou') {
    const mode = kind === 'guohe' ? 'discard' : 'steal'
    const targets = getLegalTargets(state, playerId, kind)
    const best = Math.max(
      -999,
      ...targets.map((tid) => scoreTrickTarget(state, playerId, tid, mode)),
    )
    if (best < 0) return -5
    return 11 + Math.min(8, Math.floor(best / 10))
  }
  if (kind === 'nanman' || kind === 'wanjian') return 10
  if (kind === 'jiedao') return 10
  if (kind === 'lebu' || kind === 'bingliang') {
    const targets = getLegalTargets(state, playerId, kind)
    const best = Math.max(
      -999,
      ...targets.map((tid) => scoreTrickTarget(state, playerId, tid, 'delay')),
    )
    if (best < 0) return -5
    return 9
  }
  if (kind === 'huogong') return 9
  if (kind === 'taoyuan') return 8
  if (kind === 'tiesuo') return 6
  // Hold 閃 / 無懈 / spare gear — not playable as active usually
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
    return pickZoneCard(state, playerId, ids) ?? choices[0].id
  }
  if (key === 'zone_pick') {
    const selected = state.prompt.selectedCardUids ?? []
    const need = state.prompt.minTargets ?? 1
    if (selected.length >= need) return 'confirm'
    const remaining = ids.filter((id) => id !== 'confirm' && !selected.includes(id))
    if (!remaining.length) return ids.includes('confirm') ? 'confirm' : choices[0]?.id ?? null
    return pickZoneCard(state, playerId, remaining) ?? remaining[0] ?? 'confirm'
  }
  if (key === 'ganglie') return ids.includes('discard') ? 'discard' : 'damage'
  if (key === 'jianxiong') return ids.includes('take') ? 'take' : 'skip'
  if (key === 'dying_save') {
    const targetId = state.prompt.targetIds?.[0]
    if (targetId === undefined) return 'skip'
    // Save self always; save allies / lord; never save enemies
    if (targetId === playerId) {
      return ids.find((id) => id !== 'skip') ?? 'skip'
    }
    if (!believedHostile(state, playerId, targetId)) {
      return ids.find((id) => id !== 'skip') ?? 'skip'
    }
    // Identity: loyal saves lord
    const me = state.players[playerId]
    const victim = state.players[targetId]
    if (me.identity === 'loyal' && victim.identity === 'lord') {
      return ids.find((id) => id !== 'skip') ?? 'skip'
    }
    if (me.identity === 'lord' && victim.identity === 'loyal') {
      return ids.find((id) => id !== 'skip') ?? 'skip'
    }
    return 'skip'
  }
  if (key === 'yaowu') {
    const p = state.players[playerId]
    if (p.hp < p.maxHp && ids.includes('recover')) return 'recover'
    return ids.includes('draw') ? 'draw' : ids[0] ?? null
  }
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

    // 南蠻／萬箭：無懈對某一名角色的效果
    if (trick.type === 'aoe_target' && trick.targetId !== undefined) {
      const hitEnemy = believedHostile(state, playerId, trick.targetId)
      // Protect self / ally from AOE
      if (!hitEnemy && !w.nullified) return 'use'
      // If someone nullified an enemy's hit, restore the AOE on them
      if (hitEnemy && w.nullified) return 'use'
      return 'skip'
    }

    const hitsMe =
      typeof trick.targetId === 'number' && trick.targetId === playerId
    const fromEnemy = believedHostile(state, playerId, trick.sourceId)
    if (hitsMe && fromEnemy && !w.nullified) return 'use'
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
