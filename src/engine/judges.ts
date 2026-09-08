/**
 * Official judgment flow: delayed tricks (LIFO), 洛神, 鬼才／鬼道 resume,
 * optional 鐵騎／八卦 follow-through.
 */
import { getCardDef } from '../data/cards'
import type { CardInstance, GameSnapshot, PlayerState } from './types'
import { effectiveSuit, isRedFor, playerSkills } from './helpers'
import { drawJudgeCard } from './weapons'
import { discardCard, log, turnSkipOf } from './core'
import { shuffle } from './helpers'
import { finishGanglie } from './damage'
import {
  extraOf,
  maybeTiandu,
  nextDelayedTrick,
  resumeJudgeReplace,
  startDelayedJudges,
  tryJudgeReplace,
  finishTuntian,
  drainTuntian,
} from './official'
import {
  askShan,
  continueBeginTurn,
  continueShaQueue,
  dealDamage,
  finishShaHit,
  onShaDodged,
  resumeAfterDamageFlow,
  resumeAfterResponse,
  setPlayPrompt,
  runEndPhaseSkills,
} from './game'

export function runNextDelayedJudge(state: GameSnapshot): boolean {
  const p = state.players[state.currentPlayer]
  if (!p?.alive) return false
  const jCard = nextDelayedTrick(state)
  if (!jCard) return false
  p.judges = (p.judges ?? []).filter((c) => c.uid !== jCard.uid)
  extraOf(state)._pendingDelayedCard = jCard
  extraOf(state)._continueDelayed = true
  const judged = drawJudgeCard(state, shuffle)
  if (!judged) {
    discardCard(state, jCard)
    return runNextDelayedJudge(state)
  }
  const kind = getCardDef(jCard.defId).kind
  const prefer = kind === 'lebu' ? 'heart' : kind === 'bingliang' ? 'club' : undefined
  const replaced = tryJudgeReplace(state, judged, prefer, p.id, {
    kind: 'delayed',
    ownerId: p.id,
    jCard,
  })
  if (!replaced) return true
  return finishDelayedJudge(state, p, jCard, replaced)
}

export function finishDelayedJudge(
  state: GameSnapshot,
  p: PlayerState,
  jCard: CardInstance,
  judged: CardInstance,
): boolean {
  const def = getCardDef(jCard.defId)
  const kind = def.kind
  const jdef = getCardDef(judged.defId)
  const suit = effectiveSuit(judged, p)
  const rank = jdef.rank ?? 0
  log(state, `${p.name} 判定【${def.name}】：${jdef.name}（${suit ?? '?'}${rank}）`)
  maybeTiandu(state, p, judged, false)
  const taken =
    playerSkills(p).includes('tiandu') && state.players[p.id].hand.some((c) => c.uid === judged.uid)
  if (!taken) discardCard(state, judged)

  if (kind === 'lebu') {
    if (suit !== 'heart') {
      turnSkipOf(state).skipPlay = true
      log(state, `【樂不思蜀】生效，${p.name} 跳過出牌階段。`)
    } else {
      log(state, `【樂不思蜀】判定為紅桃，失效。`)
    }
    discardCard(state, jCard)
  } else if (kind === 'bingliang') {
    if (suit !== 'club') {
      turnSkipOf(state).skipDraw = true
      log(state, `【兵糧寸斷】生效，${p.name} 跳過摸牌階段。`)
    } else {
      log(state, `【兵糧寸斷】判定為梅花，失效。`)
    }
    discardCard(state, jCard)
  } else if (kind === 'shandian') {
    const hit = suit === 'spade' && rank >= 2 && rank <= 9
    if (hit) {
      log(state, `【閃電】擊中${p.name}，造成 3 點雷電傷害。`)
      discardCard(state, jCard)
      const blocked = dealDamage(state, p.id, 3, null, 'thunder', jCard)
      if (blocked) return true
    } else {
      log(state, `【閃電】未擊中，移至下家判定區。`)
      const n = state.players.length
      let nid = p.id
      let placed = false
      for (let i = 0; i < n; i++) {
        nid = (nid + 1) % n
        const nxt = state.players[nid]
        if (!nxt.alive) continue
        const has = (nxt.judges ?? []).some((j) => getCardDef(j.defId).kind === 'shandian')
        if (!has) {
          nxt.judges = [...(nxt.judges ?? []), jCard]
          placed = true
          log(state, `【閃電】移至 ${nxt.name} 的判定區。`)
          break
        }
      }
      if (!placed) discardCard(state, jCard)
    }
  } else {
    discardCard(state, jCard)
  }
  extraOf(state)._pendingDelayedCard = undefined
  return runNextDelayedJudge(state)
}

export function startLuoshen(state: GameSnapshot): boolean {
  const p = state.players[state.currentPlayer]
  const judged = drawJudgeCard(state, shuffle)
  if (!judged) return false
  const replaced = tryJudgeReplace(state, judged, 'black', p.id, {
    kind: 'luoshen',
    ownerId: p.id,
    step: 0,
  })
  if (!replaced) return true
  return applyLuoshen(state, p, replaced)
}

export function applyLuoshen(state: GameSnapshot, p: PlayerState, judged: CardInstance): boolean {
  const jdef = getCardDef(judged.defId)
  const black = effectiveSuit(judged, p) === 'spade' || effectiveSuit(judged, p) === 'club'
  log(
    state,
    `${p.name} 洛神判定：${jdef.name}${black ? '（黑，獲得並可再判定）' : '（紅，停止）'}`,
  )
  if (black) {
    p.hand.push(judged)
    log(state, `${p.name} 發動洛神，獲得【${jdef.name}】。`)
    return startLuoshen(state)
  }
  maybeTiandu(state, p, judged, false)
  const taken = playerSkills(p).includes('tiandu') && p.hand.some((c) => c.uid === judged.uid)
  if (!taken) discardCard(state, judged)
  return false
}

export function resumeAfterJudgeReplace(
  state: GameSnapshot,
  _playerId: number,
  choiceId: string,
): void {
  const resume = extraOf(state)._judgeResume
  const judged = resumeJudgeReplace(state, choiceId)
  if (!judged) return
  extraOf(state)._judgeResume = undefined
  if (!resume) return
  if (resume.kind === 'delayed') {
    const owner = state.players[resume.ownerId]
    const pending = extraOf(state)._pendingDelayedCard ?? resume.jCard
    const waiting = finishDelayedJudge(state, owner, pending, judged)
    extraOf(state)._pendingDelayedCard = undefined
    extraOf(state)._continueDelayed = false
    if (waiting) return
    continueBeginTurn(state)
    return
  }
  if (resume.kind === 'luoshen') {
    const owner = state.players[resume.ownerId]
    if (applyLuoshen(state, owner, judged)) return
    continueBeginTurn(state)
    return
  }
  if (resume.kind === 'tieqi') {
    applyTieqiResult(state, judged, resume.sourceId, resume.targetId, resume.cardUid)
    return
  }
  if (resume.kind === 'bagua') {
    applyBaguaResult(state, judged, resume.sourceId, resume.targetId, resume.cardUid)
    return
  }
  if (resume.kind === 'ganglie') {
    const blocked = finishGanglie(state, resume.targetId, resume.sourceId, judged)
    if (blocked) return
    resumeAfterDamageFlow(state)
    return
  }
  if (resume.kind === 'leiji') {
    const blocked = finishLeiji(state, resume.actorId, resume.tid, judged)
    if (blocked) return
    continueAfterLeiji(state)
    return
  }
  if (resume.kind === 'shuangxiong') {
    applyShuangxiong(state, resume.ownerId, judged)
    continueBeginTurn(state)
    return
  }
  if (resume.kind === 'tuntian') {
    const q = extraOf(state)._tuntianQueue
    if (q?.length) q.shift()
    finishTuntian(state, resume.ownerId, judged)
    if (drainTuntian(state)) return
    const tag = extraOf(state)._tuntianResume
    extraOf(state)._tuntianResume = undefined
    if (tag === 'play') setPlayPrompt(state)
    else if (tag === 'begin') continueBeginTurn(state)
    else if (tag === 'damage') resumeAfterDamageFlow(state)
    else if (tag === 'response') resumeAfterResponse(state)
    else if (tag === 'end') runEndPhaseSkills(state, state.currentPlayer)
    else if (state.phase === 'play') setPlayPrompt(state)
    else if (state.phase === 'end') runEndPhaseSkills(state, state.currentPlayer)
    else continueBeginTurn(state)
  }
}

export function applyTieqiResult(
  state: GameSnapshot,
  judged: CardInstance,
  sourceId: number,
  targetId: number,
  cardUid: string,
): void {
  const source = state.players[sourceId]
  discardCard(state, judged)
  const jdef = getCardDef(judged.defId)
  const red = isRedFor(source, judged)
  log(state, `${source.name} 鐵騎判定：${jdef.name}${red ? '（紅，目標不能出閃）' : '（黑）'}`)
  maybeTiandu(state, source, judged, false)
  if (state.pending?.type === 'sha') state.pending.tieqiAsked = true
  if (red && state.pending?.type === 'sha') {
    state.pending.skipShan = true
    finishShaHit(state, 1)
    return
  }
  askShan(state, sourceId, targetId, cardUid)
}

export function applyBaguaResult(
  state: GameSnapshot,
  judged: CardInstance,
  sourceId: number,
  targetId: number,
  cardUid: string,
): void {
  const target = state.players[targetId]
  const source = state.players[sourceId]
  discardCard(state, judged)
  const ok = isRedFor(target, judged)
  const jdef = getCardDef(judged.defId)
  log(
    state,
    `${target.name} 發動【八卦陣】判定為${jdef.name}${ok ? '，視為打出閃' : '，判定失敗'}。`,
  )
  maybeTiandu(state, target, judged, false)
  if (state.pending?.type === 'sha') state.pending.baguaAsked = true
  if (ok) {
    const wushuang = playerSkills(source).includes('wushuang')
    if (wushuang && state.pending?.type === 'sha') {
      log(state, `${target.name} 八卦視為打出一張【閃】，無雙仍需再出一張。`)
      state.pending.shanNeeded = 1
      askShan(state, sourceId, targetId, cardUid)
      return
    }
    onShaDodged(state, sourceId, targetId)
    return
  }
  askShan(state, sourceId, targetId, cardUid)
}

export function ensureJudgeQueue(state: GameSnapshot, ownerId: number): void {
  const turn = turnSkipOf(state)
  if (!turn.judgesStarted) {
    turn.judgesStarted = true
    startDelayedJudges(state, ownerId)
  }
}

export function finishLeiji(
  state: GameSnapshot,
  actorId: number,
  tid: number,
  judged: CardInstance,
): boolean {
  const actor = state.players[actorId]
  discardCard(state, judged)
  const jdef = getCardDef(judged.defId)
  const suit = effectiveSuit(judged, actor)
  const black = suit === 'spade' || suit === 'club'
  log(state, `${actor.name} 雷擊判定：${jdef.name}${black ? '（黑，造成雷傷）' : '（紅，無效）'}`)
  maybeTiandu(state, actor, judged, false)
  if (black && state.players[tid]?.alive) {
    return dealDamage(state, tid, 2, actorId, 'thunder')
  }
  return false
}

export function applyShuangxiong(state: GameSnapshot, ownerId: number, judged: CardInstance): void {
  const p = state.players[ownerId]
  p.hand.push(judged)
  const red = isRedFor(p, judged)
  p.shuangxiongAs = red ? 'black' : 'red'
  log(state, `${p.name} 發動雙雄，獲得判定牌；本回合可將${red ? '黑' : '紅'}牌當【決鬥】。`)
}

export function continueAfterLeiji(state: GameSnapshot): void {
  const dodged = (state as GameSnapshot & { _shaDodged?: { sourceId: number; targetId: number } })
    ._shaDodged
  delete (state as GameSnapshot & { _shaDodged?: unknown })._shaDodged
  if (dodged) {
    const q = (state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue
    if (q) {
      state.pending = {
        type: 'sha',
        sourceId: dodged.sourceId,
        targetId: dodged.targetId,
        cardUid: q.cardUid,
        damageCard: q.damageCard,
        extraTargets: q.extras,
      }
    }
    onShaDodged(state, dodged.sourceId, dodged.targetId)
    return
  }
  const q = (state as GameSnapshot & {
    _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
  })._shaQueue
  if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
  else resumeAfterResponse(state)
}
