import { getGeneral } from '../data/generals'
import type { GameSnapshot, Identity } from '../engine/types'
import { cardKind } from '../engine/helpers'

export type IdentityGuess = Identity | 'unknown'

export interface BeliefEntry {
  guess: IdentityGuess
  /** Short reason shown in debug */
  note: string
}

export interface SeatMind {
  /** Beliefs about other seats (not self) */
  beliefs: Record<number, BeliefEntry>
  /** Latest decision rationale */
  thought: string
}

export type AiMindMap = Record<number, SeatMind>

const ID_LABEL: Record<IdentityGuess, string> = {
  lord: '主公',
  loyal: '忠臣',
  rebel: '反賊',
  spy: '內奸',
  none: '無',
  unknown: '未知',
}

export function identityGuessLabel(g: IdentityGuess): string {
  return ID_LABEL[g] ?? g
}

/** What this viewer can actually see (rules fog). */
export function knownIdentity(
  state: GameSnapshot,
  viewerId: number,
  targetId: number,
): IdentityGuess {
  const target = state.players[targetId]
  if (!target) return 'unknown'
  if (target.identity === 'none') return 'none'
  if (viewerId === targetId) return target.identity
  if (target.identity === 'lord') return 'lord'
  if (!target.alive) return target.identity
  return 'unknown'
}

export function initAiMind(state: GameSnapshot): void {
  const minds: AiMindMap = {}
  for (const p of state.players) {
    const beliefs: Record<number, BeliefEntry> = {}
    for (const o of state.players) {
      if (o.id === p.id) continue
      const known = knownIdentity(state, p.id, o.id)
      beliefs[o.id] = {
        guess: known,
        note: known === 'unknown' ? '身份未亮，依行為推測' : '已知',
      }
    }
    minds[p.id] = { beliefs, thought: '' }
  }
  state.aiMind = minds as GameSnapshot['aiMind']
}

export function ensureAiMind(state: GameSnapshot): AiMindMap {
  if (!state.aiMind) initAiMind(state)
  return state.aiMind as AiMindMap
}

/** Update beliefs after public events (attack on lord, death reveal, etc.). */
export function observePublicEvent(
  state: GameSnapshot,
  event:
    | { type: 'attack'; sourceId: number; targetId: number; kind: string }
    | { type: 'death'; playerId: number },
): void {
  const minds = ensureAiMind(state)
  if (event.type === 'death') {
    const dead = state.players[event.playerId]
    for (const mind of Object.values(minds)) {
      if (!mind.beliefs[event.playerId]) continue
      mind.beliefs[event.playerId] = {
        guess: dead.identity === 'none' ? 'none' : dead.identity,
        note: '死亡亮出身份',
      }
    }
    return
  }

  const { sourceId, targetId, kind } = event
  const target = state.players[targetId]
  if (!target) return
  const targetIsLord = target.identity === 'lord'

  for (const [viewerStr, mind] of Object.entries(minds)) {
    const viewerId = Number(viewerStr)
    if (viewerId === sourceId) continue
    const about = mind.beliefs[sourceId]
    if (!about || knownIdentity(state, viewerId, sourceId) !== 'unknown') continue

    if (targetIsLord && (kind === 'sha' || kind === 'juedou' || kind === 'huogong')) {
      // Attacking lord → lean rebel (or spy)
      about.guess = about.guess === 'loyal' ? 'spy' : 'rebel'
      about.note = `對主公使用【${kind === 'sha' ? '殺' : kind}】，偏向反賊/內奸`
    } else if (
      knownIdentity(state, viewerId, targetId) === 'rebel' &&
      (kind === 'sha' || kind === 'juedou')
    ) {
      if (about.guess === 'unknown' || about.guess === 'rebel') {
        about.guess = 'loyal'
        about.note = '攻擊疑似反賊，偏向忠臣'
      }
    }
  }
}

export function setSeatThought(state: GameSnapshot, playerId: number, thought: string): void {
  const minds = ensureAiMind(state)
  if (!minds[playerId]) return
  minds[playerId].thought = thought
}

export function applyBeliefUpdates(
  state: GameSnapshot,
  playerId: number,
  updates: Record<string, { guess?: IdentityGuess; note?: string }>,
): void {
  const minds = ensureAiMind(state)
  const mind = minds[playerId]
  if (!mind) return
  for (const [idStr, u] of Object.entries(updates)) {
    const id = Number(idStr)
    if (!mind.beliefs[id]) continue
    if (knownIdentity(state, playerId, id) !== 'unknown') continue
    if (u.guess) mind.beliefs[id].guess = u.guess
    if (u.note) mind.beliefs[id].note = u.note
  }
}

/** Same-side check using believed identities (spy trusts no one). */
export function believedSameSide(a: IdentityGuess, b: IdentityGuess): boolean {
  if (a === 'unknown' || b === 'unknown' || a === 'none' || b === 'none') return false
  if (a === 'spy' || b === 'spy') return false
  const lordSide = new Set(['lord', 'loyal'])
  if (lordSide.has(a) && lordSide.has(b)) return true
  if (a === 'rebel' && b === 'rebel') return true
  return false
}

export function believedHostile(state: GameSnapshot, viewerId: number, targetId: number): boolean {
  if (viewerId === targetId) return false
  const minds = ensureAiMind(state)
  const me = state.players[viewerId]
  if (state.config.mode === 'duel' || state.config.victory) return true

  const myId = me.identity
  const known = knownIdentity(state, viewerId, targetId)
  const guess =
    known !== 'unknown' ? known : minds[viewerId]?.beliefs[targetId]?.guess ?? 'unknown'

  if (guess === 'unknown') {
    // Unknown: treat as potential foe unless we are loyal and they never hit lord
    return true
  }
  return !believedSameSide(myId, guess)
}

/**
 * Prefer not to attack 張角-style 雷擊 holders if they likely still hold 閃
 * (hand cards remain), and never attack believed teammates.
 */
export function scoreAttackTarget(
  state: GameSnapshot,
  attackerId: number,
  targetId: number,
): number {
  const t = state.players[targetId]
  if (!t?.alive) return -999
  let score = 20 - t.hp * 3

  if (!believedHostile(state, attackerId, targetId)) {
    return -200
  }

  const skills = t.generalId ? getGeneral(t.generalId).skills : []
  if (skills.includes('leiji')) {
    // 雷擊：被殺出閃後可雷傷。有手牌時危險；無手牌較難觸發，仍勿當隊友打他。
    if (t.hand.length > 0) score -= 8
    else score -= 1
  }
  if (skills.includes('fankui') || skills.includes('ganglie') || skills.includes('jianxiong')) {
    score -= 2
  }
  if (skills.includes('kongcheng') && t.hand.length === 0) score -= 50

  return score
}

export function formatMindDebug(state: GameSnapshot): string {
  const minds = ensureAiMind(state)
  const lines: string[] = []
  for (const p of state.players) {
    if (p.isHuman || !p.alive) continue
    const mind = minds[p.id]
    if (!mind) continue
    const selfId = identityGuessLabel(p.identity)
    lines.push(`【${p.name}】自知身份：${selfId}`)
    for (const o of state.players) {
      if (o.id === p.id) continue
      const b = mind.beliefs[o.id]
      if (!b) continue
      lines.push(
        `  → ${o.name}：${identityGuessLabel(b.guess)}${b.note ? `（${b.note}）` : ''}`,
      )
    }
    if (mind.thought) lines.push(`  想法：${mind.thought}`)
  }
  return lines.join('\n')
}

export function handSummaryForPrompt(state: GameSnapshot, playerId: number): string {
  const p = state.players[playerId]
  return p.hand
    .map((c) => {
      const k = cardKind(c)
      return `${c.uid}:${k}`
    })
    .join(', ')
}
