/**
 * Official-rule systems: 翻面, extra turns, identity rewards,
 * judgment replacement (鬼才／鬼道), 固政 tracking, 化身 pile, 主公技 helpers.
 */
import { getCardDef } from '../data/cards'
import { getGeneral, listGeneralsForPick } from '../data/generals'
import type { CardInstance, GameSnapshot, PlayerState, Suit } from './types'
import {
  cardKind,
  effectiveSuit,
  equipSlots,
  isBlackCard,
  isBlackFor,
  playerSkills,
  shuffle,
  trueSameSide,
} from './helpers'
import { drawJudgeCard } from './weapons'
import { discardCard, draw, log, takeHand, turnSkipOf, skillLabel } from './core'

export type ExtraState = GameSnapshot & {
  _extraTurns?: number[]
  _discardPhaseCards?: CardInstance[]
  _judgeQueue?: CardInstance[]
  _judgeReplace?: {
    judged: CardInstance
    prefer?: JudgePrefer
    cursor: number
    asked: number
    actorId: number
    ownerId: number
    skill: 'guicai' | 'guidao'
    eligible: string[]
  }
  _judgeResume?: JudgeResume
  _huashenPile?: string[]
  _shensuMore?: boolean
  _taoyuanQueue?: { sourceId: number; targets: number[] }
  _qiaobianPhase?: 'judge' | 'draw' | 'play' | 'discard'
  _pendingDelayedCard?: CardInstance
  _continueDelayed?: boolean
  _lastJudged?: CardInstance
  _guzhengRest?: { actorId: number; ownerId: number; uid: string }
  _hujia?: { cursor: number; sourceId: number; targetId: number; cardUid: string }
  _jijiang?: { sourceId: number; targetId: number; cursor: number }
  _fangquanLegacyTarget?: number
}

export type JudgePrefer = 'red' | 'black' | 'heart' | 'club' | 'nonheart'

export type JudgeResume =
  | { kind: 'delayed'; ownerId: number; jCard: CardInstance }
  | { kind: 'luoshen'; ownerId: number; step: number }
  | { kind: 'tieqi'; sourceId: number; targetId: number; cardUid: string }
  | { kind: 'bagua'; sourceId: number; targetId: number; cardUid: string }
  | { kind: 'ganglie'; targetId: number; sourceId: number }
  | { kind: 'leiji'; actorId: number; tid: number }
  | { kind: 'tuntian'; ownerId: number }
  | { kind: 'shuangxiong'; ownerId: number }

export function extraOf(state: GameSnapshot): ExtraState {
  return state as ExtraState
}

export function kingdomOf(p: PlayerState): string | null {
  if (!p.generalId) return null
  try {
    return getGeneral(p.generalId).kingdom
  } catch {
    return null
  }
}

export function enqueueExtraTurn(state: GameSnapshot, seatId: number): void {
  const e = extraOf(state)
  e._extraTurns = [...(e._extraTurns ?? []), seatId]
}

export function popExtraTurn(state: GameSnapshot): number | undefined {
  const e = extraOf(state)
  if (!e._extraTurns?.length) return undefined
  return e._extraTurns.shift()
}

export function trackDiscard(state: GameSnapshot, card: CardInstance): void {
  const e = extraOf(state)
  if (state.phase !== 'discard') return
  e._discardPhaseCards = [...(e._discardPhaseCards ?? []), card]
}

export function takeDiscardPhaseCards(state: GameSnapshot): CardInstance[] {
  const e = extraOf(state)
  const cards = e._discardPhaseCards ?? []
  e._discardPhaseCards = []
  return cards
}

export function seedHuashenPile(state: GameSnapshot): void {
  const used = new Set(state.players.map((p) => p.generalId).filter(Boolean))
  extraOf(state)._huashenPile = shuffle(
    listGeneralsForPick(state.config.packs).map((g) => g.id).filter((id) => !used.has(id)),
  )
}

export function applyHuashen(state: GameSnapshot, p: PlayerState): void {
  const e = extraOf(state)
  const pile = e._huashenPile ?? []
  if (!pile.length) {
    p.extraSkills = p.extraSkills?.length ? p.extraSkills : []
    return
  }
  const gid = pile.splice(Math.floor(Math.random() * pile.length), 1)[0]
  if (!gid) return
  p.huashenGeneralId = gid
  try {
    const g = getGeneral(gid)
    p.extraSkills = [...g.skills]
    log(state, `${p.name} 發動化身，化為【${g.name}】（${g.skills.map(skillLabel).join('、') || '無技能'}）。`)
  } catch {
    p.extraSkills = []
  }
}

/** 判定區：後放置的先判定（官方 LIFO）。 */
export function startDelayedJudges(state: GameSnapshot, ownerId: number): void {
  const p = state.players[ownerId]
  extraOf(state)._judgeQueue = [...(p.judges ?? [])].reverse()
}

export function nextDelayedTrick(state: GameSnapshot): CardInstance | undefined {
  const q = extraOf(state)._judgeQueue
  if (!q?.length) return undefined
  return q.shift()
}

export function suitMatchesPrefer(suit: Suit | undefined, prefer?: JudgePrefer): boolean {
  if (!prefer || !suit) return false
  const red = suit === 'heart' || suit === 'diamond'
  if (prefer === 'red') return red
  if (prefer === 'black') return !red
  if (prefer === 'heart') return suit === 'heart'
  if (prefer === 'club') return suit === 'club'
  if (prefer === 'nonheart') return suit !== 'heart'
  return false
}

function eligibleReplaceCards(
  pl: PlayerState,
  skill: 'guicai' | 'guidao',
): CardInstance[] {
  return pl.hand.filter((c) => {
    if (skill === 'guidao') return isBlackFor(pl, c) || isBlackCard(c)
    return true
  })
}

function aiWantsReplace(
  state: GameSnapshot,
  pl: PlayerState,
  judged: CardInstance,
  prefer: JudgePrefer | undefined,
  ownerId: number,
): CardInstance | null {
  const skill: 'guicai' | 'guidao' = playerSkills(pl).includes('guidao') ? 'guidao' : 'guicai'
  const cards = eligibleReplaceCards(pl, skill)
  if (!cards.length) return null
  const curSuit = effectiveSuit(judged, state.players[ownerId])
  if (prefer && suitMatchesPrefer(curSuit, prefer)) return null
  if (prefer) {
    const hit = cards.find((c) => suitMatchesPrefer(effectiveSuit(c, pl), prefer))
    return hit ?? null
  }
  // 閃電：無 prefer。自己／友軍要判沒中；敵軍要判中（黑桃2–9）。
  const owner = state.players[ownerId]
  const rank = getCardDef(judged.defId).rank ?? 0
  const wouldHit = curSuit === 'spade' && rank >= 2 && rank <= 9
  const ally = owner.id === pl.id || trueSameSide(pl.identity, owner.identity) || owner.side === pl.side
  const wantHit = !ally
  if (wantHit === wouldHit) return null
  const pick = cards.find((c) => {
    const s = effectiveSuit(c, pl)
    const r = getCardDef(c.defId).rank ?? 0
    const hit = s === 'spade' && r >= 2 && r <= 9
    return hit === wantHit
  })
  return pick ?? (wantHit ? null : cards.find((c) => effectiveSuit(c, pl) !== 'spade') ?? null)
}

/**
 * Try 鬼才／鬼道. Returns the (possibly replaced) judgment card, or null if a
 * human prompt is pending (caller must return).
 */
export function tryJudgeReplace(
  state: GameSnapshot,
  judged: CardInstance,
  prefer: JudgePrefer | undefined,
  ownerId: number,
  resume: JudgeResume,
  startFrom = 0,
): CardInstance | null {
  const e = extraOf(state)
  e._judgeResume = resume
  e._lastJudged = judged
  const n = state.players.length
  for (let i = startFrom; i < n; i++) {
    const seat = (state.currentPlayer + i) % n
    const pl = state.players[seat]
    if (!pl.alive) continue
    const hasGuicai = playerSkills(pl).includes('guicai')
    const hasGuidao = playerSkills(pl).includes('guidao')
    if (!hasGuicai && !hasGuidao) continue
    const skill: 'guicai' | 'guidao' = hasGuidao ? 'guidao' : 'guicai'
    const eligible = eligibleReplaceCards(pl, skill)
    if (!eligible.length) continue
    if (pl.isHuman) {
      const jname = getCardDef(judged.defId).name
      e._judgeReplace = {
        judged,
        prefer,
        cursor: i,
        asked: i,
        actorId: pl.id,
        ownerId,
        skill,
        eligible: eligible.map((c) => c.uid),
      }
      state.prompt = {
        kind: 'choice',
        message:
          skill === 'guidao'
            ? `【鬼道】判定牌為【${jname}】。用黑色手牌替換並獲得原判定牌？`
            : `【鬼才】判定牌為【${jname}】。用手牌替換？`,
        actorId: pl.id,
        choiceKey: 'judge_replace',
        cardUids: eligible.map((c) => c.uid),
        choices: [
          ...eligible.map((c) => {
            const d = getCardDef(c.defId)
            return { id: c.uid, label: `替換為【${d.name}】` }
          }),
          { id: 'skip', label: '不替換' },
        ],
      }
      return null
    }
    const aiPick = aiWantsReplace(state, pl, judged, prefer, ownerId)
    if (aiPick) {
      judged = commitReplace(state, pl, skill, aiPick, judged)
      e._lastJudged = judged
    }
  }
  e._judgeReplace = undefined
  return judged
}

/** Resume after a human 鬼才／鬼道 prompt. Null = another prompt pending. */
export function resumeJudgeReplace(state: GameSnapshot, choiceId: string): CardInstance | null {
  const e = extraOf(state)
  const r = e._judgeReplace
  const resume = e._judgeResume
  if (!r || !resume) return e._lastJudged ?? null
  let judged = r.judged
  const pl = state.players[r.actorId]
  if (choiceId !== 'skip' && r.eligible.includes(choiceId) && pl) {
    const card = pl.hand.find((c) => c.uid === choiceId)
    if (card) judged = commitReplace(state, pl, r.skill, card, judged)
  }
  e._judgeReplace = undefined
  const ownerId =
    resume.kind === 'delayed' ||
    resume.kind === 'luoshen' ||
    resume.kind === 'tuntian' ||
    resume.kind === 'shuangxiong'
      ? resume.ownerId
      : resume.kind === 'tieqi' || resume.kind === 'bagua'
        ? resume.targetId
        : resume.kind === 'ganglie'
          ? resume.targetId
          : resume.kind === 'leiji'
            ? resume.actorId
            : r.ownerId
  return tryJudgeReplace(state, judged, r.prefer, ownerId, resume, r.cursor + 1)
}

export function trimBuquOnHeal(state: GameSnapshot, p: PlayerState, healed: number): void {
  if (!p.buquCards?.length || healed <= 0) return
  const n = Math.min(healed, p.buquCards.length)
  for (let i = 0; i < n; i++) {
    const c = p.buquCards.shift()
    if (c) discardCard(state, c)
  }
  log(state, `${p.name} 因體力回覆，將 ${n} 張「創」置入棄牌堆。`)
}

export function commitReplace(
  state: GameSnapshot,
  pl: PlayerState,
  skill: 'guicai' | 'guidao',
  card: CardInstance,
  judged: CardInstance,
): CardInstance {
  const taken = takeHand(state, pl.id, card.uid)
  if (!taken) return judged
  const skillName = skill === 'guidao' ? '鬼道' : '鬼才'
  log(
    state,
    `${pl.name} 發動${skillName}，用【${getCardDef(taken.defId).name}】替換判定牌【${getCardDef(judged.defId).name}】。`,
  )
  if (skill === 'guidao') {
    pl.hand.push(judged)
    log(state, `${pl.name} 獲得原判定牌【${getCardDef(judged.defId).name}】。`)
  } else {
    discardCard(state, judged)
  }
  return taken
}

export function identityKillReward(
  state: GameSnapshot,
  victim: PlayerState,
  killer: PlayerState | null,
): void {
  if (state.config.mode !== 'identity5' && state.config.mode !== 'identity8') return
  if (!killer?.alive) return
  if (victim.identity === 'rebel') {
    draw(state, killer.id, 3)
    log(state, `${killer.name} 擊殺反賊，摸三張牌。`)
    return
  }
  if (victim.identity === 'loyal' && killer.identity === 'lord') {
    killer.hand.forEach((c) => discardCard(state, c))
    killer.hand = []
    for (const slot of equipSlots()) {
      const e = killer.equips[slot]
      if (!e) continue
      const kind = getCardDef(e.defId).kind
      discardCard(state, e)
      delete killer.equips[slot]
      if (kind === 'baiyin') {
        killer.hp = Math.min(killer.maxHp, killer.hp + 1)
        log(state, `${killer.name} 失去【白銀獅子】，回覆1點體力。`)
      }
    }
    log(state, `${killer.name} 擊殺忠臣，棄置所有手牌與裝備。`)
  }
}

export function peachHealAmount(
  state: GameSnapshot,
  saver: PlayerState,
  dying: PlayerState,
  asJiu: boolean,
): number {
  if (asJiu) return 1
  if (
    playerSkills(dying).includes('jiuyuan') &&
    kingdomOf(saver) === 'wu' &&
    saver.id !== dying.id
  ) {
    log(state, `${dying.name} 的主公技【救援】令此【桃】額外回覆1點體力。`)
    return 2
  }
  return 1
}

export function drawJudgeOrNull(state: GameSnapshot): CardInstance | null {
  return drawJudgeCard(state, shuffle)
}

export function maybeTiandu(
  state: GameSnapshot,
  owner: PlayerState,
  judged: CardInstance,
  alreadyTaken: boolean,
): void {
  if (alreadyTaken) return
  if (!playerSkills(owner).includes('tiandu')) return
  const last = state.discard[state.discard.length - 1]
  if (last?.uid === judged.uid) state.discard.pop()
  owner.hand.push(judged)
  log(state, `${owner.name} 發動天妒，獲得判定牌。`)
}
