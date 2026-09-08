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
  _guanxing?: CardInstance[]
  _yiji?: { actorId: number; remaining: number; cards: CardInstance[] }
  _haoshiUids?: string[]
  _huashenPick?: string
  _huashenWhen?: 'prep' | 'end'
  _tuntianQueue?: { ownerId: number; judged: CardInstance }[]
  _tuntianResume?: 'play' | 'begin' | 'damage' | 'response' | 'end'
  _playAsKind?: string
  _guhuo?: {
    actorId: number
    uid: string
    asKind: string
    cursor: number
    asked: number
  }
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
  dealHuashenCards(state, p, 1)
}

export const HUASHEN_BANNED = new Set([
  'hujia',
  'jijiang',
  'jiuyuan',
  'huangtian',
  'luanwu',
  'niepan',
  'zaoxian',
  'zhiji',
  'hunzi',
])

export function dealHuashenCards(state: GameSnapshot, p: PlayerState, n: number): void {
  const e = extraOf(state)
  const pile = e._huashenPile ?? []
  const got: string[] = []
  for (let i = 0; i < n; i++) {
    const gid = pile.shift()
    if (!gid) break
    got.push(gid)
  }
  if (!got.length) return
  p.huashenCards = [...(p.huashenCards ?? []), ...got]
  const names = got.map((id) => {
    try {
      return getGeneral(id).name
    } catch {
      return id
    }
  })
  log(state, `${p.name} 獲得化身：${names.map((n) => `【${n}】`).join('、')}。`)
}

export function dealStartingHuashen(state: GameSnapshot): void {
  seedHuashenPile(state)
  for (const p of state.players) {
    if (!p.alive || !p.generalId) continue
    if (playerSkills(p).includes('huashen')) dealHuashenCards(state, p, 2)
  }
}

export function huashenSkillIds(gid: string): string[] {
  try {
    return getGeneral(gid).skills.filter((id) => !HUASHEN_BANNED.has(id))
  } catch {
    return []
  }
}

/** true = human prompt pending */
export function askHuashen(
  state: GameSnapshot,
  p: PlayerState,
  when: 'prep' | 'end',
): boolean {
  const cards = p.huashenCards ?? []
  if (!cards.length) return false
  const turn = turnSkipOf(state)
  if (when === 'prep') {
    if (turn.huashenPrepAsked) return false
    turn.huashenPrepAsked = true
  } else {
    if (turn.huashenEndAsked) return false
    turn.huashenEndAsked = true
  }
  extraOf(state)._huashenWhen = when
  const options = cards.filter((id) => huashenSkillIds(id).length > 0)
  if (!options.length) return false
  if (p.isHuman) {
    state.prompt = {
      kind: 'choice',
      message: '【化身】選擇一張化身並聲明其中一個技能（非主公技／覺醒／限定）',
      actorId: p.id,
      choiceKey: 'huashen_general',
      choices: [
        ...options.map((id) => {
          let name = id
          try {
            name = getGeneral(id).name
          } catch {
            /* ignore */
          }
          return { id, label: `【${name}】` }
        }),
        { id: 'skip', label: '維持目前化身' },
      ],
    }
    return true
  }
  applyChosenHuashen(state, p, options[0]!, huashenSkillIds(options[0]!)[0]!)
  return false
}

export function applyChosenHuashen(
  state: GameSnapshot,
  p: PlayerState,
  gid: string,
  skillId: string,
): void {
  p.huashenGeneralId = gid
  p.extraSkills = [skillId]
  let gname = gid
  try {
    gname = getGeneral(gid).name
  } catch {
    /* ignore */
  }
  log(state, `${p.name} 發動化身，化為【${gname}】並獲得【${skillLabel(skillId)}】。`)
}

export function startYiji(state: GameSnapshot): boolean {
  const e = extraOf(state)
  const y = e._yiji
  if (!y || y.remaining <= 0) {
    e._yiji = undefined
    return false
  }
  const actor = state.players[y.actorId]
  if (!actor) {
    e._yiji = undefined
    return false
  }
  const cards: CardInstance[] = []
  for (let i = 0; i < 2; i++) {
    if (state.deck.length === 0 && state.discard.length) {
      state.deck = shuffle(state.discard)
      state.discard = []
    }
    const c = state.deck.pop()
    if (c) cards.push(c)
  }
  y.cards = cards
  y.remaining -= 1
  if (!cards.length) {
    if (y.remaining > 0) return startYiji(state)
    e._yiji = undefined
    return false
  }
  const names = cards.map((c) => getCardDef(c.defId).name).join('、')
  log(state, `${actor.name} 發動遺計，觀看牌堆頂：${names}。`)
  const alive = state.players.filter((x) => x.alive || x.id === actor.id)
  if (actor.isHuman) {
    state.prompt = {
      kind: 'choice',
      message: `【遺計】將【${names}】交給一名角色`,
      actorId: actor.id,
      choiceKey: 'yiji_give',
      choices: alive.map((x) => ({
        id: String(x.id),
        label: x.id === actor.id ? `${x.name}（自己）` : x.name,
      })),
    }
    return true
  }
  giveYiji(state, actor.id)
  if (y.remaining > 0) return startYiji(state)
  e._yiji = undefined
  return false
}

export function giveYiji(state: GameSnapshot, toId: number): void {
  const e = extraOf(state)
  const y = e._yiji
  if (!y) return
  const actor = state.players[y.actorId]
  const dest = state.players[toId] ?? actor
  if (!dest) return
  dest.hand.push(...y.cards)
  const names = y.cards.map((c) => getCardDef(c.defId).name).join('、')
  log(
    state,
    `${actor?.name ?? ''} 發動遺計，將【${names}】交給 ${dest.name}。`,
  )
  y.cards = []
}

export function leastHandSeats(state: GameSnapshot, exceptId: number): PlayerState[] {
  const others = state.players.filter((x) => x.alive && x.id !== exceptId)
  if (!others.length) return []
  const min = Math.min(...others.map((x) => x.hand.length))
  return others.filter((x) => x.hand.length === min)
}

/** true = waiting for human to pick cards */
export function startHaoshiGive(state: GameSnapshot, p: PlayerState): boolean {
  if (p.hand.length <= 5) return false
  const give = Math.floor(p.hand.length / 2)
  const seats = leastHandSeats(state, p.id)
  if (give <= 0 || !seats.length) return false
  if (!p.isHuman) {
    const uids = p.hand.slice(0, give).map((c) => c.uid)
    finishHaoshiGive(state, p, uids, seats[0]!.id)
    return false
  }
  extraOf(state)._haoshiUids = undefined
  state.prompt = {
    kind: 'skill_cards',
    message: `【好施】選擇 ${give} 張手牌交給手牌最少的角色`,
    actorId: p.id,
    skillId: 'haoshi',
    cardUids: p.hand.map((c) => c.uid),
    selectedCardUids: [],
    minTargets: give,
    maxTargets: give,
    choices: [{ id: 'confirm', label: `交出 ${give} 張` }],
    choiceKey: 'skill_confirm',
  }
  return true
}

export function finishHaoshiGive(
  state: GameSnapshot,
  p: PlayerState,
  uids: string[],
  toId: number,
): void {
  const dest = state.players[toId]
  if (!dest?.alive) return
  const moved: CardInstance[] = []
  for (const uid of uids) {
    const c = takeHand(state, p.id, uid)
    if (c) moved.push(c)
  }
  dest.hand.push(...moved)
  log(state, `${p.name} 發動好施，交給 ${dest.name} ${moved.length} 張牌。`)
}

export function enqueueTuntian(
  state: GameSnapshot,
  ownerId: number,
  judged: CardInstance,
): void {
  const e = extraOf(state)
  e._tuntianQueue = [...(e._tuntianQueue ?? []), { ownerId, judged }]
}

/** true = 鬼才／鬼道 prompt pending */
export function drainTuntian(state: GameSnapshot): boolean {
  const e = extraOf(state)
  const q = e._tuntianQueue
  if (!q?.length) return false
  const item = q[0]!
  const replaced = tryJudgeReplace(state, item.judged, 'nonheart', item.ownerId, {
    kind: 'tuntian',
    ownerId: item.ownerId,
  })
  if (!replaced) return true
  q.shift()
  finishTuntian(state, item.ownerId, replaced)
  return drainTuntian(state)
}

export function finishTuntian(
  state: GameSnapshot,
  ownerId: number,
  judged: CardInstance,
): void {
  const p = state.players[ownerId]
  if (!p) {
    discardCard(state, judged)
    return
  }
  const suit = effectiveSuit(judged, p)
  if (suit !== 'heart') {
    p.tianCards = [...(p.tianCards ?? []), judged]
    p.tianCount = (p.tianCount ?? 0) + 1
    log(state, `${p.name} 發動屯田，判定非紅桃，獲得一張「田」（共 ${p.tianCount} 張）。`)
  } else {
    discardCard(state, judged)
    log(state, `${p.name} 發動屯田，判定為紅桃，未獲得田。`)
  }
}

export function finishGuanxingSplit(state: GameSnapshot, topUids: string[]): void {
  const peeked = extraOf(state)._guanxing ?? []
  extraOf(state)._guanxing = undefined
  const p = state.players[state.currentPlayer]
  const top = topUids
    .map((uid) => peeked.find((c) => c.uid === uid))
    .filter((c): c is CardInstance => !!c)
  const bottom = peeked.filter((c) => !topUids.includes(c.uid))
  for (let i = top.length - 1; i >= 0; i--) state.deck.push(top[i]!)
  state.deck = [...bottom, ...state.deck]
  log(
    state,
    `${p.name} 發動觀星，${top.length} 張置於牌堆頂、${bottom.length} 張置於牌堆底。`,
  )
}

export function maybeQueueTuntian(state: GameSnapshot, ownerId: number): void {
  if (state.currentPlayer === ownerId) return
  const p = state.players[ownerId]
  if (!p?.alive || !playerSkills(p).includes('tuntian')) return
  if (state.deck.length === 0 && state.discard.length) {
    state.deck = shuffle(state.discard)
    state.discard = []
  }
  const judged = state.deck.pop()
  if (!judged) return
  enqueueTuntian(state, ownerId, judged)
  log(state, `${p.name} 的【屯田】即將判定。`)
}

export const GUHUO_AS_CHOICES: { id: string; label: string }[] = [
  { id: 'sha', label: '殺' },
  { id: 'huosha', label: '火殺' },
  { id: 'leisha', label: '雷殺' },
  { id: 'shan', label: '閃' },
  { id: 'tao', label: '桃' },
  { id: 'jiu', label: '酒' },
  { id: 'wuzhong', label: '無中生有' },
  { id: 'guohe', label: '過河拆橋' },
  { id: 'shunshou', label: '順手牽羊' },
  { id: 'juedou', label: '決鬥' },
  { id: 'nanman', label: '南蠻入侵' },
  { id: 'wanjian', label: '萬箭齊發' },
  { id: 'taoyuan', label: '桃園結義' },
  { id: 'wugu', label: '五穀豐登' },
  { id: 'jiedao', label: '借刀殺人' },
  { id: 'huogong', label: '火攻' },
  { id: 'tiesuo', label: '鐵索連環' },
  { id: 'wuxie', label: '無懈可擊' },
]

export function guhuoKindMatches(actual: string, named: string): boolean {
  if (actual === named) return true
  if (named === 'sha' && (actual === 'huosha' || actual === 'leisha')) return true
  return false
}

export function jushouDrawCount(p: PlayerState): number {
  return Math.max(2, p.maxHp - p.hp + 2)
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
