import { getGeneral } from '../data/generals'
import {
  colorizeSeatNamesInText,
  seatColor,
  seatRefHtml,
  type NamedSeat,
} from '../data/seatColors'
import type { GameSnapshot, Identity } from '../engine/types'
import { cardKind } from '../engine/helpers'

export type IdentityGuess = Identity | 'unknown'

export interface BeliefEntry {
  guess: IdentityGuess
  /** Identities this seat is believed NOT to be */
  excluded: IdentityGuess[]
  /** Short latest reason */
  note: string
  /** Recent evidence lines (newest last) */
  evidence: string[]
  /** 0–1 */
  confidence: number
}

export interface SeatMind {
  beliefs: Record<number, BeliefEntry>
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

const EVIDENCE_CAP = 6

export function identityGuessLabel(g: IdentityGuess): string {
  return ID_LABEL[g] ?? g
}

/** Expected identity counts for the mode (excluding none). */
export function identityRoster(mode: GameSnapshot['config']['mode']): Identity[] {
  if (mode === 'identity8') {
    return ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'rebel', 'spy']
  }
  if (mode === 'identity5') {
    return ['lord', 'loyal', 'rebel', 'rebel', 'spy']
  }
  return []
}

function emptyBelief(guess: IdentityGuess, note: string): BeliefEntry {
  return {
    guess,
    excluded: [],
    note,
    evidence: guess === 'unknown' ? [] : [note],
    confidence: guess === 'unknown' ? 0.15 : 1,
  }
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
      beliefs[o.id] = emptyBelief(
        known,
        known === 'unknown' ? '身份未亮，依行為與人數推測' : known === 'lord' ? '主公公開' : '已知',
      )
    }
    minds[p.id] = { beliefs, thought: '' }
  }
  state.aiMind = minds as GameSnapshot['aiMind']
  reconcileComposition(state)
}

export function ensureAiMind(state: GameSnapshot): AiMindMap {
  if (!state.aiMind) initAiMind(state)
  const minds = state.aiMind as AiMindMap
  // Normalize older snapshots missing excluded/evidence
  for (const mind of Object.values(minds)) {
    for (const b of Object.values(mind.beliefs)) {
      if (!b.excluded) b.excluded = []
      if (!b.evidence) b.evidence = b.note ? [b.note] : []
      if (typeof b.confidence !== 'number') b.confidence = b.guess === 'unknown' ? 0.2 : 0.7
    }
  }
  return minds
}

function pushEvidence(b: BeliefEntry, line: string): void {
  b.evidence.push(line)
  if (b.evidence.length > EVIDENCE_CAP) b.evidence.shift()
  b.note = line
}

function excludeIdentity(b: BeliefEntry, id: IdentityGuess, reason: string): void {
  if (id === 'unknown' || id === 'none' || id === 'lord') return
  if (!b.excluded.includes(id)) b.excluded.push(id)
  if (b.guess === id) {
    b.guess = 'unknown'
    b.confidence = Math.min(b.confidence, 0.35)
  }
  pushEvidence(b, reason)
}

function leanIdentity(
  b: BeliefEntry,
  id: IdentityGuess,
  reason: string,
  strength = 0.25,
): void {
  if (id === 'unknown' || id === 'none') return
  if (b.excluded.includes(id)) {
    // Contradicts exclusion → often 內奸伪装
    if (id === 'rebel' || id === 'loyal') {
      b.guess = 'spy'
      b.confidence = Math.min(0.85, b.confidence + strength)
      pushEvidence(b, `${reason}（與先前排除矛盾，疑似內奸伪装）`)
      return
    }
    pushEvidence(b, `${reason}（但已排除此身份，存疑）`)
    return
  }
  if (b.guess === 'unknown' || b.guess === id) {
    b.guess = id
    b.confidence = Math.min(0.95, (b.guess === id ? b.confidence : 0.2) + strength)
  } else if (b.guess !== id) {
    // Mixed signals → spy
    b.guess = 'spy'
    b.confidence = Math.min(0.8, b.confidence + strength * 0.8)
    pushEvidence(b, `${reason}（行為與先前推測不一致，偏向內奸）`)
    return
  }
  pushEvidence(b, reason)
}

/** Lord generals that are dangerous to attack even as loyal (e.g. 雷擊). */
function lordIsDangerous(state: GameSnapshot): boolean {
  const lord = state.players.find((p) => p.identity === 'lord')
  if (!lord?.generalId) return false
  const skills = getGeneral(lord.generalId).skills
  return skills.includes('leiji') || skills.includes('fankui') || skills.includes('ganglie')
}

/** Remaining identity slots after known lord + dead reveals. */
export function remainingIdentityPool(state: GameSnapshot): Identity[] {
  const roster = identityRoster(state.config.mode)
  if (!roster.length) return []
  const left = [...roster]
  const lordIdx = left.indexOf('lord')
  if (lordIdx >= 0) left.splice(lordIdx, 1)
  for (const p of state.players) {
    if (p.alive || p.identity === 'none' || p.identity === 'lord') continue
    const i = left.indexOf(p.identity)
    if (i >= 0) left.splice(i, 1)
  }
  return left
}

function reconcileComposition(state: GameSnapshot): void {
  if (state.config.mode === 'duel' || state.config.victory) return
  const pool = remainingIdentityPool(state)
  const poolLabel = pool.length
    ? `剩餘未亮身份池：${[...new Set(pool)].map(identityGuessLabel).join('、')}（共 ${pool.length}）`
    : ''

  const minds = ensureAiMind(state)
  const livingUnknown = state.players.filter(
    (p) => p.alive && p.identity !== 'lord' && p.identity !== 'none',
  )

  for (const [viewerStr, mind] of Object.entries(minds)) {
    const viewerId = Number(viewerStr)
    for (const o of livingUnknown) {
      if (o.id === viewerId) continue
      const known = knownIdentity(state, viewerId, o.id)
      if (known !== 'unknown') continue
      const b = mind.beliefs[o.id]
      if (!b) continue

      // Exclude identities already fully revealed among the dead / impossible by count
      const need: Identity[] = ['loyal', 'rebel', 'spy']
      for (const id of need) {
        const stillInPool = pool.includes(id)
        if (!stillInPool && !b.excluded.includes(id)) {
          excludeIdentity(b, id, `人數上已無「${identityGuessLabel(id)}」名額`)
        }
      }

      if (poolLabel && !b.evidence.includes(poolLabel)) {
        pushEvidence(b, poolLabel)
      }

      // If only one unknown living seat (from viewer's fog) and pool size 1 → deduce
      const fogUnknown = state.players.filter(
        (p) =>
          p.alive &&
          p.id !== viewerId &&
          knownIdentity(state, viewerId, p.id) === 'unknown',
      )
      if (fogUnknown.length === 1 && fogUnknown[0].id === o.id && pool.length === 1) {
        leanIdentity(b, pool[0], `由剩餘人數鎖定為${identityGuessLabel(pool[0])}`, 0.9)
        b.confidence = 0.95
      }
    }
  }
}

export type PublicMindEvent =
  | { type: 'attack'; sourceId: number; targetId: number; kind: string }
  | { type: 'death'; playerId: number }
  | { type: 'aoe'; sourceId: number; kind: string }
  | { type: 'damage'; sourceId: number | null; targetId: number; amount: number }
  | { type: 'heal'; sourceId: number; targetId: number; kind: string }
  | { type: 'defend_lord'; sourceId: number; via: string }

/** Update beliefs after public events. */
export function observePublicEvent(state: GameSnapshot, event: PublicMindEvent): void {
  if (state.config.mode === 'duel' || state.config.victory) return
  const minds = ensureAiMind(state)

  if (event.type === 'death') {
    const dead = state.players[event.playerId]
    for (const mind of Object.values(minds)) {
      if (!mind.beliefs[event.playerId]) continue
      mind.beliefs[event.playerId] = emptyBelief(
        dead.identity === 'none' ? 'none' : dead.identity,
        '死亡亮出身份',
      )
      mind.beliefs[event.playerId].confidence = 1
    }
    reconcileComposition(state)
    return
  }

  if (event.type === 'attack') {
    observeAttack(state, minds, event.sourceId, event.targetId, event.kind)
    return
  }

  if (event.type === 'aoe') {
    observeAoe(state, minds, event.sourceId, event.kind)
    return
  }

  if (event.type === 'damage') {
    if (event.sourceId === null) return
    const target = state.players[event.targetId]
    if (target?.identity === 'lord') {
      observeAttack(state, minds, event.sourceId, event.targetId, '傷害')
    }
    return
  }

  if (event.type === 'heal') {
    observeHeal(state, minds, event.sourceId, event.targetId, event.kind)
    return
  }

  if (event.type === 'defend_lord') {
    observeDefendLord(state, minds, event.sourceId, event.via)
  }
}

function observeAttack(
  state: GameSnapshot,
  minds: AiMindMap,
  sourceId: number,
  targetId: number,
  kind: string,
): void {
  const target = state.players[targetId]
  if (!target) return
  const kindLabel =
    kind === 'sha' ? '殺' : kind === 'juedou' ? '決鬥' : kind === 'huogong' ? '火攻' : kind
  const dangerous = lordIsDangerous(state)

  for (const [viewerStr, mind] of Object.entries(minds)) {
    const viewerId = Number(viewerStr)
    if (viewerId === sourceId) continue
    const about = mind.beliefs[sourceId]
    if (!about || knownIdentity(state, viewerId, sourceId) !== 'unknown') continue

    if (target.identity === 'lord') {
      if (dangerous) {
        leanIdentity(
          about,
          'rebel',
          `對危險主公（如雷擊）使用【${kindLabel}】，仍偏敵對，但忠臣也可能誤判風險`,
          0.12,
        )
        excludeIdentity(about, 'loyal', `主動攻擊主公，不太像忠臣（主公存活則忠臣方勝）`)
      } else {
        excludeIdentity(about, 'loyal', `攻擊主公，排除忠臣（忠臣需保主公至終局）`)
        leanIdentity(about, 'rebel', `對主公使用【${kindLabel}】，偏向反賊（內奸亦可能）`, 0.35)
      }
    } else {
      const targetKnown = knownIdentity(state, viewerId, targetId)
      const targetGuess = mind.beliefs[targetId]?.guess
      const treatAsRebel =
        targetKnown === 'rebel' ||
        (!target.alive && target.identity === 'rebel') ||
        targetGuess === 'rebel'

      if (treatAsRebel) {
        excludeIdentity(about, 'rebel', `攻擊反賊／疑似反賊，不太像反賊同伙`)
        leanIdentity(about, 'loyal', `攻擊反賊勢力，偏向忠臣（內奸也可能裝忠）`, 0.28)
      }

      if (targetKnown === 'loyal' || targetGuess === 'loyal') {
        excludeIdentity(about, 'loyal', `攻擊忠臣／疑似忠臣，不太像忠臣`)
        leanIdentity(about, 'rebel', `攻擊忠臣勢力，偏向反賊`, 0.28)
      }
    }
  }
  reconcileComposition(state)
}

function observeAoe(
  state: GameSnapshot,
  minds: AiMindMap,
  sourceId: number,
  kind: string,
): void {
  const label = kind === 'nanman' ? '南蠻入侵' : kind === 'wanjian' ? '萬箭齊發' : kind
  const lord = state.players.find((p) => p.identity === 'lord' && p.alive)
  if (!lord || lord.id === sourceId) return

  for (const [viewerStr, mind] of Object.entries(minds)) {
    const viewerId = Number(viewerStr)
    if (viewerId === sourceId) continue
    const about = mind.beliefs[sourceId]
    if (!about || knownIdentity(state, viewerId, sourceId) !== 'unknown') continue
    excludeIdentity(about, 'loyal', `打出【${label}】波及主公，忠臣極少如此`)
    leanIdentity(about, 'rebel', `群體傷害含主公，偏向反賊／內奸`, 0.3)
  }
  reconcileComposition(state)
}

function observeHeal(
  state: GameSnapshot,
  minds: AiMindMap,
  sourceId: number,
  targetId: number,
  kind: string,
): void {
  const target = state.players[targetId]
  if (!target) return
  const via = kind === 'taoyuan' ? '桃園結義' : kind

  for (const [viewerStr, mind] of Object.entries(minds)) {
    const viewerId = Number(viewerStr)
    if (viewerId === sourceId) continue
    const about = mind.beliefs[sourceId]
    if (!about || knownIdentity(state, viewerId, sourceId) !== 'unknown') continue

    if (target.identity === 'lord') {
      excludeIdentity(about, 'rebel', `用【${via}】救助主公，不像反賊（反賊要主公死）`)
      leanIdentity(about, 'loyal', `救助主公，偏向忠臣（內奸也可能裝忠）`, 0.32)
    }
  }
  reconcileComposition(state)
}

function observeDefendLord(
  state: GameSnapshot,
  minds: AiMindMap,
  sourceId: number,
  via: string,
): void {
  for (const [viewerStr, mind] of Object.entries(minds)) {
    const viewerId = Number(viewerStr)
    if (viewerId === sourceId) continue
    const about = mind.beliefs[sourceId]
    if (!about || knownIdentity(state, viewerId, sourceId) !== 'unknown') continue
    excludeIdentity(about, 'rebel', `${via}，護衛主公，排除反賊`)
    leanIdentity(about, 'loyal', `${via}，偏向忠臣／可能內奸装忠`, 0.34)
  }
  reconcileComposition(state)
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
    if (u.note) {
      pushEvidence(mind.beliefs[id], u.note)
      mind.beliefs[id].confidence = Math.min(0.9, mind.beliefs[id].confidence + 0.2)
    }
  }
  reconcileComposition(state)
}

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
  const me = state.players[viewerId]
  const them = state.players[targetId]
  // Story teams override fog beliefs
  if (me.side && them.side) return me.side !== them.side

  const minds = ensureAiMind(state)
  if (state.config.mode === 'duel') return true

  const myId = me.identity
  const known = knownIdentity(state, viewerId, targetId)
  const b = minds[viewerId]?.beliefs[targetId]
  const guess = known !== 'unknown' ? known : b?.guess ?? 'unknown'

  if (guess === 'unknown') {
    if (myId === 'loyal' && b?.excluded.includes('loyal') === false && b?.excluded.includes('rebel')) {
      return false
    }
    return true
  }
  return !believedSameSide(myId, guess)
}

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
  const pool = remainingIdentityPool(state)
  if (pool.length) {
    lines.push(
      `身份池剩餘：${pool.map(identityGuessLabel).join('、')}（${pool.length}）`,
    )
  }
  for (const p of state.players) {
    if (!p.alive && p.identity === 'none') continue
    const mind = minds[p.id]
    if (!mind) continue
    lines.push(`【${p.name}】自知：${identityGuessLabel(p.identity)}`)
    for (const o of state.players) {
      if (o.id === p.id) continue
      const b = mind.beliefs[o.id]
      if (!b) continue
      const ex =
        b.excluded.length > 0
          ? `；排除 ${b.excluded.map(identityGuessLabel).join('、')}`
          : ''
      lines.push(
        `  → ${o.name}：${identityGuessLabel(b.guess)}${ex}${b.note ? `（${b.note}）` : ''}`,
      )
    }
    if (mind.thought) lines.push(`  想法：${mind.thought}`)
  }
  return lines.join('\n')
}

/** HTML block for seat ℹ modal: this seat's identity beliefs. */
export function formatSeatMindHtml(state: GameSnapshot, seatId: number): string {
  if (state.config.mode === 'duel' || state.config.victory) {
    return ''
  }
  const minds = ensureAiMind(state)
  const mind = minds[seatId]
  const seat = state.players[seatId]
  if (!mind || !seat) return ''

  const namedSeats: NamedSeat[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    generalName: p.generalId ? getGeneral(p.generalId).name : undefined,
  }))

  const tint = (raw: string) => colorizeSeatNamesInText(raw, namedSeats)

  const pool = remainingIdentityPool(state)
  const poolHtml = pool.length
    ? `<p class="mind-pool">剩餘身份池：${escapeHtml(
        [...pool].map(identityGuessLabel).join('、'),
      )}（${pool.length}）</p>`
    : ''

  const rows = state.players
    .filter((o) => o.id !== seatId)
    .map((o) => {
      const b = mind.beliefs[o.id]
      if (!b) return ''
      const known = knownIdentity(state, seatId, o.id)
      const guess = known !== 'unknown' ? known : b.guess
      const ex =
        b.excluded.length && known === 'unknown'
          ? `<div class="mind-exclude">應排除：${b.excluded
              .map(identityGuessLabel)
              .map(escapeHtml)
              .join('、')}</div>`
          : ''
      const ev =
        b.evidence.length && known === 'unknown'
          ? `<ul class="mind-evidence">${b.evidence
              .slice()
              .reverse()
              .map((e) => `<li>${tint(e)}</li>`)
              .join('')}</ul>`
          : ''
      const conf =
        known === 'unknown'
          ? `<span class="mind-conf">${Math.round(b.confidence * 100)}%</span>`
          : ''
      const dead = !o.alive ? '（已陣亡・身份已亮）' : ''
      const gen = o.generalId ? getGeneral(o.generalId).name : ''
      return `<div class="mind-row" style="--seat-c:${seatColor(o.id)}">
        <div class="mind-target">${seatRefHtml(o.name, o.id)}${
          gen ? ` <span class="mind-gen">${seatRefHtml(gen, o.id)}</span>` : ''
        }${dead} ${conf}</div>
        <div class="mind-guess">推測：${escapeHtml(identityGuessLabel(guess))}</div>
        ${ex}
        ${b.note && known === 'unknown' ? `<div class="mind-note">${tint(b.note)}</div>` : ''}
        ${ev}
      </div>`
    })
    .join('')

  const thought = mind.thought
    ? `<p class="mind-thought">當下想法：${tint(mind.thought)}</p>`
    : ''

  return `<section class="mind-panel">
    <h4>身份推測（${seatRefHtml(seat.name, seat.id)} 視角）</h4>
    <p class="muted">依公開行為與死亡亮將推斷；內奸可能伪装。同色姓名＝同一座位。點 ℹ 僅查看，不影響規則。</p>
    ${poolHtml}
    ${rows}
    ${thought}
  </section>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
