/**
 * resolveChoice — the prompt/choice dispatcher.
 * Circular import with game.ts is intentional (function-level only).
 */
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type { CardInstance, GameSnapshot, PlayerState } from './types'
import {
  attackRangeOf,
  canReach,
  cardKind,
  checkVictory,
  enemiesOf,
  equipSlots,
  effectiveSuit,
  findCard,
  getDistance,
  isBlackFor,
  isRedFor,
  playerSkills,
  shuffle,
  withinDistanceOne,
} from './helpers'
import {
  armorKind,
  countDiscardable,
  drawJudgeCard,
  ignoresArmor,
  mayUseSha,
  oppositeGender,
  weaponKind,
} from './weapons'
import { observePublicEvent } from '../ai/mind'
import {
  log,
  draw,
  discardCard,
  takeHand,
  turnSkipOf,
  setPlayFx,
  pushDamageFx,
  skillLabel,
} from './core'
import {
  extraOf,
  enqueueExtraTurn,
  peachHealAmount,
  trimBuquOnHeal,
  kingdomOf,
  tryJudgeReplace,
} from './official'
import { resumeAfterJudgeReplace, applyTieqiResult, applyBaguaResult, applyShuangxiong, finishLeiji, continueAfterLeiji } from './judges'
import {
  setPlayPrompt,
  continueBeginTurn,
  finishGuanxing,
  runPrepareSkills,
  applyJudgeReplaceSync,
  stealToNi,
  xiansiCandidates,
  beginTurn,
  askShan,
  finishShaHit,
  applyShaDamage,
  continueShaQueue,
  onShaDodged,
  responseCards,
  pindian,
  handleResponse,
  afterTrick,
  beginWuxieWindow,
  continueWuxieAsk,
  getWuxie,
  clearWuxie,
  resolvePendingTrick,
  legalTargets,
  getWugu,
  clearWugu,
  continueWugu,
  startWugu,
  askWuguPickUi,
  resumeAfterResponse,
  continueAoe,
  resolveAOE,
  askAOEResponse,
  resolveJuedou,
  getJuedou,
  askJuedouSha,
  onJuedouShaPlayed,
  finishJuedouLose,
  startHuogong,
  beginZonePick,
  handleZonePickClick,
  continueLuanwu,
  getAoeQueue,
  applyZoneCardIds,
  isAwaitingZonePick,
  listZoneOptions,
  buildZonePickChoices,
  dealDamage,
  trySave,
  beginDying,
  continueDyingAsk,
  getDying,
  resumeAfterDamageFlow,
  startDyingIfPending,
  suitShort,
  rankShort,
  clearDying,
  getPendingDying,
  finishRende,
  finishZhangba,
  handleSkillCardPick,
  confirmSkillCards,
  finishTargetedCard,
  leaveEquipArea,
  notifyMovedEquips,
  selectCard,
  selectTarget,
  finishEndPhase,
  advanceTurn,
  handleDiscardPick,
  playableCards,
  getPlayKindOptions,
  playEquip,
  askDismantle,
  runEndPhaseSkills,
  applyGuzheng,
  takeDeathLoot,
  finalizeDeath,
} from './game'

export function resolveChoice(state: GameSnapshot, playerId: number, choiceId: string): void {
  if (state.prompt.actorId !== playerId) return

  if (
    state.prompt.kind === 'skill_cards' &&
    (choiceId === 'confirm' || state.prompt.choiceKey === 'skill_confirm')
  ) {
    confirmSkillCards(state, playerId)
    return
  }

  if (state.prompt.kind !== 'choice') return
  const key = state.prompt.choiceKey
  const targetId = state.prompt.targetIds?.[0]

  if (key === 'judge_replace') {
    resumeAfterJudgeReplace(state, playerId, choiceId)
    return
  }

  if (key === 'luoyi') {
    const turn = turnSkipOf(state)
    if (choiceId === 'yes') {
      turn.luoyiOn = true
      log(state, `${state.players[playerId].name} 發動裸衣，少摸一張牌。`)
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'haoshi') {
    const turn = turnSkipOf(state)
    if (choiceId === 'yes') {
      turn.haoshiOn = true
      log(state, `${state.players[playerId].name} 發動好施，額外摸兩張牌。`)
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'qiaobian_phase') {
    const phase = extraOf(state)._qiaobianPhase
    extraOf(state)._qiaobianPhase = undefined
    const turn = turnSkipOf(state)
    const p = state.players[playerId]
    if (choiceId !== 'skip') {
      const card = takeHand(state, playerId, choiceId)
      if (card) discardCard(state, card)
      log(state, `${p.name} 發動巧變，跳過${phase === 'judge' ? '判定' : phase === 'draw' ? '摸牌' : phase === 'play' ? '出牌' : '棄牌'}階段。`)
      if (phase === 'judge') turn.skipJudge = true
      if (phase === 'draw') {
        turn.skipDraw = true
        const victims = state.players.filter((o) => o.alive && o.id !== p.id && o.hand.length > 0)
        if (victims.length) {
          state.prompt = {
            kind: 'choice',
            message: '【巧變】獲得一至兩名其他角色各一張手牌',
            actorId: playerId,
            choiceKey: 'tuxi_target',
            selectedTargetIds: [],
            choices: [
              ...victims.map((x) => ({ id: String(x.id), label: x.name })),
              { id: 'skip', label: '不獲得' },
            ],
          }
          return
        }
      }
      if (phase === 'play') {
        turn.skipPlay = true
        log(state, `${p.name} 跳過出牌階段。`)
        finishEndPhase(state, playerId)
        return
      }
      if (phase === 'discard') {
        runEndPhaseSkills(state, playerId)
        return
      }
    }
    if (phase === 'discard') {
      finishEndPhase(state, playerId)
      return
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'fangquan_skip') {
    const p = state.players[playerId]
    if (choiceId === 'yes') {
      p.fangquanPending = true
      p.fangquanUsed = true
      log(state, `${p.name} 發動放權，跳過出牌階段。`)
      finishEndPhase(state, playerId)
    } else {
      state.phase = 'play'
      setPlayPrompt(state)
    }
    return
  }

  if (key === 'fangquan_give') {
    const p = state.players[playerId]
    p.fangquanPending = false
    const [uid, tidStr] = choiceId.split(':')
    const tid = Number(tidStr)
    const card = uid ? takeHand(state, playerId, uid) : null
    const other = state.players[tid]
    if (card && other?.alive) {
      other.hand.push(card)
      enqueueExtraTurn(state, other.id)
      log(state, `${p.name} 發動放權，將【${getCardDef(card.defId).name}】交給 ${other.name}，其獲得一個額外回合。`)
    }
    extraOf(state)._discardPhaseCards = []
    advanceTurn(state)
    return
  }

  if (key === 'guzheng_return') {
    const ownerId = state.currentPlayer
    if (choiceId === 'skip') {
      extraOf(state)._discardPhaseCards = []
      runEndPhaseSkills(state, ownerId)
      return
    }
    extraOf(state)._guzhengRest = { actorId: playerId, ownerId, uid: choiceId }
    state.prompt = {
      kind: 'choice',
      message: '【固政】是否獲得其餘棄牌？',
      actorId: playerId,
      choiceKey: 'guzheng_rest',
      choices: [
        { id: 'yes', label: '獲得其餘' },
        { id: 'no', label: '只交還' },
      ],
    }
    return
  }

  if (key === 'guzheng_rest') {
    const g = extraOf(state)._guzhengRest
    extraOf(state)._guzhengRest = undefined
    if (g) applyGuzheng(state, g.actorId, g.ownerId, g.uid, choiceId === 'yes')
    runEndPhaseSkills(state, state.currentPlayer)
    return
  }

  if (key === 'xingshang') {
    const pend = (state as GameSnapshot & {
      _xingshangPending?: { targetId: number; killerId: number | null }
    })._xingshangPending
    const extra = state as GameSnapshot & { _xingshangDone?: number }
    if (!pend) return
    const victim = state.players[pend.targetId]
    const getter = state.players[playerId]
    if (choiceId === 'take' && victim && getter) takeDeathLoot(state, getter, victim)
    extra._xingshangDone = pend.targetId
    finalizeDeath(state, pend.targetId, pend.killerId)
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'xiangle_pay' && state.pending?.type === 'sha') {
    const pending = state.pending
    if (choiceId === 'cancel') {
      log(state, `${state.players[playerId].name} 不棄基本牌，【享樂】令此【殺】無效。`)
      continueShaQueue(state, pending.sourceId, pending.cardUid, pending.extraTargets ?? [], pending.damageCard)
      return
    }
    const paid = takeHand(state, playerId, choiceId)
    if (paid) discardCard(state, paid)
    pending.xianglePaid = true
    log(state, `${state.players[playerId].name} 為【享樂】棄置一張基本牌。`)
    askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
    return
  }

  if (key === 'tieqi_ask' && state.pending?.type === 'sha') {
    const pending = state.pending
    pending.tieqiAsked = true
    if (choiceId !== 'yes') {
      askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
      return
    }
    const judged = drawJudgeCard(state, shuffle)
    if (!judged) {
      askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
      return
    }
    const replaced = tryJudgeReplace(state, judged, 'red', pending.sourceId, {
      kind: 'tieqi',
      sourceId: pending.sourceId,
      targetId: pending.targetId,
      cardUid: pending.cardUid,
    })
    if (!replaced) return
    applyTieqiResult(state, replaced, pending.sourceId, pending.targetId, pending.cardUid)
    return
  }

  if (key === 'bagua_ask' && state.pending?.type === 'sha') {
    const pending = state.pending
    pending.baguaAsked = true
    if (choiceId !== 'yes') {
      askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
      return
    }
    const judged = drawJudgeCard(state, shuffle)
    if (!judged) {
      askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
      return
    }
    const replaced = tryJudgeReplace(state, judged, 'red', pending.targetId, {
      kind: 'bagua',
      sourceId: pending.sourceId,
      targetId: pending.targetId,
      cardUid: pending.cardUid,
    })
    if (!replaced) return
    applyBaguaResult(state, replaced, pending.sourceId, pending.targetId, pending.cardUid)
    return
  }

  if (key === 'hujia_ask' && state.pending?.type === 'sha') {
    const pending = state.pending
    if (choiceId === 'pass') {
      finishShaHit(state, 1)
      return
    }
    if (choiceId === 'self') {
      const shanCards = responseCards(state.players[playerId], 'shan')
      if (!shanCards.length) {
        finishShaHit(state, 1)
        return
      }
      state.prompt = {
        kind: 'respond_shan',
        message: `${state.players[playerId].name} 請打出【閃】`,
        actorId: playerId,
        cardUids: shanCards.map((c) => c.uid),
        respondKinds: ['shan'],
      }
      return
    }
    extraOf(state)._hujia = { cursor: 0, sourceId: pending.sourceId, targetId: pending.targetId, cardUid: pending.cardUid }
    askNextHujia(state)
    return
  }

  if (key === 'hujia_shan' && state.pending?.type === 'sha') {
    if (choiceId === 'skip') {
      askNextHujia(state)
      return
    }
    const card = takeHand(state, playerId, choiceId)
    if (card) {
      discardCard(state, card)
      log(state, `${state.players[playerId].name} 響應護駕，打出【閃】。`)
      extraOf(state)._hujia = undefined
      onShaDodged(state, state.pending.sourceId, state.pending.targetId)
    }
    return
  }

  if (key === 'xuanhuo') {
    const turn = (state as GameSnapshot & {
      _turnSkip?: { skipDraw: boolean; skipPlay: boolean }
    })._turnSkip
    if (choiceId !== 'yes' || !turn) {
      continueBeginTurn(state)
      return
    }
    turn.skipDraw = true
    const targets = state.players.filter((x) => x.alive && x.id !== playerId)
    state.prompt = {
      kind: 'choice',
      message: '【眩惑】選擇摸兩張牌的角色',
      actorId: playerId,
      choiceKey: 'xuanhuo_target',
      choices: targets.map((x) => ({ id: String(x.id), label: x.name })),
    }
    return
  }

  if (key === 'xuanhuo_target') {
    const tid = Number(choiceId)
    const target = state.players[tid]
    if (!target?.alive || tid === playerId) {
      continueBeginTurn(state)
      return
    }
    draw(state, tid, 2)
    log(state, `${state.players[playerId].name} 發動【眩惑】，令 ${target.name} 摸兩張牌。`)
    const count = Math.min(2, countDiscardable(target))
    if (count <= 0) {
      continueBeginTurn(state)
      return
    }
    ;(state as GameSnapshot & { _xuanhuo?: { actorId: number; targetId: number } })._xuanhuo = {
      actorId: playerId,
      targetId: tid,
    }
    beginZonePick(state, {
      actorId: playerId,
      ownerId: tid,
      count,
      skillId: 'xuanhuo',
      mode: 'steal',
      message: `【眩惑】選擇獲得 ${target.name} 的 ${count} 張牌`,
    })
    return
  }

  if (key === 'enyuan') {
    const pending = (state as GameSnapshot & {
      _enyuan?: { victimId: number; sourceId: number }
    })._enyuan
    delete (state as GameSnapshot & { _enyuan?: unknown })._enyuan
    if (!pending) {
      resumeAfterDamageFlow(state)
      return
    }
    const source = state.players[pending.sourceId]
    const victim = state.players[pending.victimId]
    const card = choiceId === 'lose_hp' ? null : takeHand(state, source.id, choiceId)
    if (card) {
      victim.hand.push(card)
      log(state, `${source.name} 因【恩怨】交給 ${victim.name} 一張手牌。`)
    } else {
      source.hp -= 1
      pushDamageFx(state, source.id, 1)
      log(state, `${source.name} 因【恩怨】失去1點體力（體力 ${Math.max(source.hp, 0)}）。`)
      if (source.hp <= 0) {
        const prior = getPendingDying(state)
        if (prior && prior.targetId !== source.id) {
          ;(state as GameSnapshot & {
            _enyuanDeferredDying?: { targetId: number; killerId: number | null }
          })._enyuanDeferredDying = prior
        }
        ;(state as GameSnapshot & {
          _pendingDying?: { targetId: number; killerId: number | null }
        })._pendingDying = { targetId: source.id, killerId: pending.victimId }
      }
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'buyi') {
    const d = getDying(state)
    if (!d) {
      resumeAfterDamageFlow(state)
      return
    }
    const dying = state.players[d.targetId]
    const holder = state.players[playerId]
    if (choiceId === 'yes' && dying.hand.length) {
      const card = dying.hand[0]
      const def = getCardDef(card.defId)
      if (def.type !== 'basic') {
        dying.hand.shift()
        discardCard(state, card)
        dying.hp = Math.min(dying.maxHp, dying.hp + 1)
        log(state, `${holder.name} 發動【補益】，展示並棄置 ${dying.name} 的【${def.name}】，令其回覆1點體力。`)
      } else {
        log(state, `${holder.name} 發動【補益】，展示 ${dying.name} 的基本牌【${def.name}】，未能回覆體力。`)
      }
    }
    continueDyingAsk(state)
    return
  }

  if (key === 'xiansi_cancel' && state.pending?.type === 'sha') {
    const pending = state.pending
    const target = state.players[pending.targetId]
    if (choiceId === 'yes' && (target.niCards?.length ?? 0) >= 2) {
      const spent = target.niCards!.splice(0, 2)
      spent.forEach((card) => discardCard(state, card))
      log(state, `${target.name} 發動【陷嗣】，棄置兩張「逆」令【殺】無效。`)
      onShaDodged(state, pending.sourceId, pending.targetId)
      return
    }
    ;(state as GameSnapshot & { _xiansiBypass?: number })._xiansiBypass = pending.targetId
    askShan(state, pending.sourceId, pending.targetId, pending.cardUid)
    return
  }

  if (key === 'ganlu_first') {
    const first = Number(choiceId)
    const p = state.players[playerId]
    const wounded = p.maxHp - p.hp
    const firstPlayer = state.players[first]
    if (!firstPlayer?.alive) {
      setPlayPrompt(state)
      return
    }
    const firstCount = Object.values(firstPlayer.equips).filter(Boolean).length
    const targets = state.players.filter((x) => {
      if (!x.alive || x.id === first) return false
      const count = Object.values(x.equips).filter(Boolean).length
      return Math.abs(firstCount - count) <= wounded
    })
    if (!targets.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【甘露】選擇第二名角色',
      actorId: playerId,
      choiceKey: 'ganlu_second',
      selectedTargetIds: [first],
      choices: targets.map((x) => ({ id: String(x.id), label: x.name })),
    }
    return
  }

  if (key === 'ganlu_second') {
    const p = state.players[playerId]
    const a = state.players[state.prompt.selectedTargetIds?.[0] ?? -1]
    const b = state.players[Number(choiceId)]
    if (!a?.alive || !b?.alive || a.id === b.id) {
      setPlayPrompt(state)
      return
    }
    const ac = Object.values(a.equips).filter(Boolean).length
    const bc = Object.values(b.equips).filter(Boolean).length
    if (Math.abs(ac - bc) > p.maxHp - p.hp) {
      log(state, `${p.name} 無法發動【甘露】：裝備數差距過大。`)
      setPlayPrompt(state)
      return
    }
    const aOld = { ...a.equips }
    const bOld = { ...b.equips }
    ;[a.equips, b.equips] = [b.equips, a.equips]
    notifyMovedEquips(state, a, aOld)
    notifyMovedEquips(state, b, bOld)
    p.ganluUsed = true
    log(state, `${p.name} 發動【甘露】，交換 ${a.name} 與 ${b.name} 的裝備區。`)
    setPlayPrompt(state)
    return
  }

  if (key === 'xiansi_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    if (!state.players[tid]?.alive || !canReach(state, playerId, tid) || (p.niCards?.length ?? 0) < 2) {
      setPlayPrompt(state)
      return
    }
    const spent = p.niCards!.splice(0, 2)
    spent.forEach((card) => discardCard(state, card))
    p.shaUsedThisTurn = true
    const virtualUid = `xiansi-${playerId}-${Date.now()}`
    log(state, `${p.name} 發動【陷嗣】，棄置兩張「逆」，視為對 ${state.players[tid].name} 使用【殺】。`)
    state.pending = { type: 'sha', sourceId: playerId, targetId: tid, cardUid: virtualUid }
    askShan(state, playerId, tid, virtualUid)
    return
  }

  if (key === 'shensu') {
    const turn = turnSkipOf(state)
    const p = state.players[playerId]
    const both = choiceId === 'shensu_both'
    if (choiceId === 'shensu_skip' || both) {
      turn.skipDraw = true
      turn.skipJudge = true
      turn.shensuVirtual = true
      p.shensuNoDist = true
      log(state, `${p.name} 發動神速（選項一），跳過判定與摸牌。`)
    }
    if (choiceId === 'shensu_discard' || choiceId === 'shensu_equip' || both) {
      const slots = equipSlots().filter((s) => !!p.equips[s])
      const cards = [
        ...p.hand.map((c) => ({
          id: `hand:${c.uid}`,
          label: `棄手牌【${getCardDef(c.defId).name}】`,
        })),
        ...slots.map((s) => ({
          id: `equip:${s}`,
          label: `棄裝備【${getCardDef(p.equips[s]!.defId).name}】`,
        })),
      ]
      if (cards.length) {
        turn.shensuSkipPlay = true
        turn.shensuVirtual = true
        p.shensuNoDist = true
        if (both) extraOf(state)._shensuMore = true
        state.prompt = {
          kind: 'choice',
          message: both
            ? '【神速】棄一張牌（兩項都選：稍後再出第二張無距離【殺】）'
            : '【神速】棄一張牌並跳過出牌階段',
          actorId: playerId,
          choiceKey: 'shensu_discard_equip',
          choices: cards,
        }
        return
      }
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'shensu_discard_equip') {
    const p = state.players[playerId]
    if (choiceId.startsWith('hand:')) {
      const card = takeHand(state, playerId, choiceId.slice(5))
      if (card) {
        discardCard(state, card)
        log(state, `${p.name} 發動神速（選項二），棄置【${getCardDef(card.defId).name}】並跳過出牌。`)
      }
    } else {
      const slot = (choiceId.startsWith('equip:') ? choiceId.slice(6) : choiceId) as import('./types').EquipSlot
      const card = p.equips[slot]
      if (card) {
        delete p.equips[slot]
        discardCard(state, card)
        log(state, `${p.name} 發動神速（選項二），棄置【${getCardDef(card.defId).name}】並跳過出牌。`)
      }
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'shensu_sha') {
    if (choiceId === 'skip') {
      if (turnSkipOf(state).skipPlay) {
        log(state, `${state.players[playerId].name} 跳過出牌階段。`)
        finishEndPhase(state, playerId)
      } else {
        state.phase = 'play'
        setPlayPrompt(state)
      }
      return
    }
    const tid = Number(choiceId)
    if (!state.players[tid]?.alive) {
      state.phase = 'play'
      setPlayPrompt(state)
      return
    }
    const p = state.players[playerId]
    p.shaUsedThisTurn = true
    const virtualUid = `shensu-${playerId}`
    log(state, `${p.name} 發動神速，視為對 ${state.players[tid].name} 使用【殺】。`)
    state.pending = { type: 'sha', sourceId: playerId, targetId: tid, cardUid: virtualUid }
    askShan(state, playerId, tid, virtualUid)
    return
  }

  if (key === 'tuxi') {
    if (choiceId !== 'yes') {
      continueBeginTurn(state)
      return
    }
    const victims = state.players.filter((o) => o.alive && o.id !== playerId && o.hand.length > 0)
    state.prompt = {
      kind: 'choice',
      message: '【突襲】選擇第一名角色',
      actorId: playerId,
      choiceKey: 'tuxi_target',
      selectedTargetIds: [],
      choices: victims.map((v) => ({ id: String(v.id), label: v.name })),
    }
    return
  }

  if (key === 'tuxi_target' || key === 'tuxi_second') {
    const turn = turnSkipOf(state)
    const tid = Number(choiceId)
    const selected = [...(state.prompt.selectedTargetIds ?? [])]
    if (!Number.isNaN(tid) && state.players[tid]?.alive) {
      selected.push(tid)
      const v = state.players[tid]
      if (v.hand.length) {
        const c = v.hand.splice(Math.floor(Math.random() * v.hand.length), 1)[0]
        state.players[playerId].hand.push(c)
        log(state, `${state.players[playerId].name} 發動突襲，獲得 ${v.name} 一張手牌。`)
        if (playerSkills(v).includes('lianying') && v.hand.length === 0) {
          draw(state, v.id, 1)
          log(state, `${v.name} 發動連營，摸一張牌。`)
        }
      }
    }
    if (key === 'tuxi_target' && selected.length === 1) {
      const more = state.players.filter(
        (o) => o.alive && o.id !== playerId && o.hand.length > 0 && !selected.includes(o.id),
      )
      if (more.length) {
        state.prompt = {
          kind: 'choice',
          message: '【突襲】可再選擇一名角色，或結束',
          actorId: playerId,
          choiceKey: 'tuxi_second',
          selectedTargetIds: selected,
          choices: [
            ...more.map((v) => ({ id: String(v.id), label: v.name })),
            { id: 'done', label: '結束突襲' },
          ],
        }
        return
      }
    }
    turn.skipDraw = true
    continueBeginTurn(state)
    return
  }

  if (key === 'zaiqi') {
    const turn = turnSkipOf(state)
    if (choiceId === 'yes') {
      turn.zaiqiOn = true
      turn.skipDraw = false
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'yinghun_target') {
    const tid = Number(choiceId)
    const p = state.players[playerId]
    const lost = p.maxHp - p.hp
    state.prompt = {
      kind: 'choice',
      message: `【英魂】令 ${state.players[tid]?.name ?? ''}：`,
      actorId: playerId,
      choiceKey: 'yinghun_mode',
      selectedTargetIds: [tid],
      choices: [
        { id: 'drawx', label: `摸 ${lost} 張並棄 1 張` },
        { id: 'discardx', label: `摸 1 張並棄 ${lost} 張` },
      ],
    }
    return
  }

  if (key === 'yinghun_mode') {
    const tid = state.prompt.selectedTargetIds?.[0]
    const p = state.players[playerId]
    const target = tid !== undefined ? state.players[tid] : undefined
    const lost = Math.max(1, p.maxHp - p.hp)
    if (target?.alive) {
      if (choiceId === 'discardx') {
        draw(state, target.id, 1)
        const n = Math.min(lost, target.hand.length)
        for (let i = 0; i < n; i++) {
          const c = target.hand.shift()
          if (c) discardCard(state, c)
        }
        log(state, `${p.name} 發動英魂，令 ${target.name} 摸 1 張並棄 ${n} 張。`)
      } else {
        draw(state, target.id, lost)
        if (target.hand.length) {
          const c = target.hand.shift()
          if (c) discardCard(state, c)
        }
        log(state, `${p.name} 發動英魂，令 ${target.name} 摸 ${lost} 張並棄一張。`)
      }
    }
    runPrepareSkills(state)
    return
  }

  if (key === 'xiansi_prep') {
    const p = state.players[playerId]
    if (choiceId === 'skip') {
      runPrepareSkills(state)
      return
    }
    const tid = Number(choiceId)
    const victim = state.players[tid]
    if (victim?.alive) stealToNi(state, p, victim)
    const picked = [...(state.prompt.selectedTargetIds ?? []), tid]
    const more = xiansiCandidates(state, p).filter((x) => !picked.includes(x.id))
    if (picked.length < 2 && more.length) {
      state.prompt = {
        kind: 'choice',
        message: '【陷嗣】可再選擇一名角色，或結束',
        actorId: playerId,
        choiceKey: 'xiansi_prep',
        selectedTargetIds: picked,
        choices: [
          ...more.map((x) => ({ id: String(x.id), label: x.name })),
          { id: 'skip', label: '結束' },
        ],
      }
      return
    }
    runPrepareSkills(state)
    return
  }

  if (key === 'fangzhu_target') {
    const pending = (state as GameSnapshot & { _fangzhu?: { actorId: number; lost: number } })._fangzhu
    delete (state as GameSnapshot & { _fangzhu?: unknown })._fangzhu
    const tid = Number(choiceId)
    const other = state.players[tid]
    if (pending && other?.alive) {
      draw(state, other.id, pending.lost)
      other.facedown = true
      log(
        state,
        `${state.players[pending.actorId].name} 發動放逐，令 ${other.name} 摸 ${pending.lost} 張並將武將牌翻面。`,
      )
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'beige') {
    const pending = (state as GameSnapshot & {
      _beige?: { actorId: number; sourceId: number | null; targetId: number }
    })._beige
    if (choiceId === 'skip' || !pending) {
      delete (state as GameSnapshot & { _beige?: unknown })._beige
      resumeAfterDamageFlow(state)
      return
    }
    const actor = state.players[pending.actorId]
    if (!actor?.hand.length) {
      delete (state as GameSnapshot & { _beige?: unknown })._beige
      resumeAfterDamageFlow(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【悲歌】選擇棄置的手牌',
      actorId: actor.id,
      choiceKey: 'beige_card',
      choices: actor.hand.map((c) => ({
        id: c.uid,
        label: `棄置【${getCardDef(c.defId).name}】`,
      })),
    }
    return
  }

  if (key === 'beige_card') {
    const pending = (state as GameSnapshot & {
      _beige?: { actorId: number; sourceId: number | null; targetId: number }
    })._beige
    delete (state as GameSnapshot & { _beige?: unknown })._beige
    if (pending) {
      const actor = state.players[pending.actorId]
      const cost = takeHand(state, actor.id, choiceId)
      if (cost) discardCard(state, cost)
      const judged = drawJudgeCard(state, shuffle)
      if (judged) {
        discardCard(state, judged)
        const suit = effectiveSuit(judged, actor)
        log(state, `${actor.name} 發動悲歌，判定為${suitShort(suit ?? '')}。`)
        const source = pending.sourceId !== null ? state.players[pending.sourceId] : null
        const t = state.players[pending.targetId]
        if (suit === 'heart' && source) {
          for (let i = 0; i < 2; i++) {
            const card = source.hand.shift()
            if (card) discardCard(state, card)
          }
        } else if (suit === 'diamond' && source?.hand.length && t) {
          const card = source.hand.shift()
          if (card) t.hand.push(card)
        } else if (suit === 'club' && pending.sourceId !== null) {
          if (dealDamage(state, pending.sourceId, 1, actor.id)) return
        } else if (suit === 'spade' && t) {
          draw(state, pending.targetId, 2)
        }
      }
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'huogong_show') {
    const hg = (state as GameSnapshot & {
      _huogong?: { sourceId: number; targetId: number; card?: CardInstance; shownSuit?: string }
    })._huogong
    if (!hg) {
      setPlayPrompt(state)
      return
    }
    const shown = findCard(state.players[hg.targetId], choiceId)
    const suit = shown ? getCardDef(shown.defId).suit : undefined
    hg.shownSuit = suit
    log(
      state,
      `${state.players[hg.targetId].name} 展示【${shown ? getCardDef(shown.defId).name : '?'}】。`,
    )
    const src = state.players[hg.sourceId]
    const matches = src.hand.filter((c) => getCardDef(c.defId).suit === suit)
    if (!matches.length) {
      log(state, `${src.name} 沒有相同花色的手牌，【火攻】無效。`)
      delete (state as GameSnapshot & { _huogong?: unknown })._huogong
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: `【火攻】棄置一張${suit ?? ''}花色手牌以造成火焰傷害`,
      actorId: hg.sourceId,
      choiceKey: 'huogong_discard',
      choices: [
        ...matches.map((c) => ({ id: c.uid, label: `棄置【${getCardDef(c.defId).name}】` })),
        { id: 'skip', label: '不棄牌' },
      ],
    }
    return
  }

  if (key === 'huogong_discard') {
    const hg = (state as GameSnapshot & {
      _huogong?: { sourceId: number; targetId: number; card?: CardInstance }
    })._huogong
    delete (state as GameSnapshot & { _huogong?: unknown })._huogong
    if (!hg) {
      setPlayPrompt(state)
      return
    }
    if (choiceId === 'skip') {
      log(state, `${state.players[hg.sourceId].name} 不棄牌，【火攻】無效。`)
      setPlayPrompt(state)
      return
    }
    const paid = takeHand(state, hg.sourceId, choiceId)
    if (paid) discardCard(state, paid)
    if (dealDamage(state, hg.targetId, 1, hg.sourceId, 'fire', hg.card)) return
    if (!isAwaitingZonePick(state)) setPlayPrompt(state)
    return
  }

  if (key === 'luanwu_act') {
    const L = (state as GameSnapshot & { _luanwu?: { sourceId: number; queue: number[] } })._luanwu
    if (choiceId === 'lose' || choiceId.startsWith('lose')) {
      const t = state.players[playerId]
      t.hp -= 1
      pushDamageFx(state, playerId, 1)
      log(state, `${t.name} 因亂武失去1點體力。`)
      if (t.hp <= 0) {
        trySave(state, playerId, L?.sourceId ?? null)
        return
      }
      continueLuanwu(state)
      return
    }
    if (choiceId.startsWith('sha:')) {
      const tid = Number(choiceId.slice(4))
      const sha = responseCards(state.players[playerId], 'sha')[0]
      if (sha && state.players[tid]?.alive) {
        const card = takeHand(state, playerId, sha.uid)
        if (card) discardCard(state, card)
        state.players[playerId].shaUsedThisTurn = true
        log(state, `${state.players[playerId].name} 因亂武對 ${state.players[tid].name} 使用【殺】。`)
        state.pending = {
          type: 'sha',
          sourceId: playerId,
          targetId: tid,
          cardUid: sha.uid,
          damageCard: sha,
        }
        askShan(state, playerId, tid, sha.uid)
        return
      }
    }
    continueLuanwu(state)
    return
  }

  if (key === 'shuangxiong') {
    const p = state.players[playerId]
    const turn = turnSkipOf(state)
    if (choiceId === 'yes') {
      turn.skipDraw = true
      const judged = drawJudgeCard(state, shuffle)
      if (judged) {
        const replaced = tryJudgeReplace(state, judged, undefined, playerId, {
          kind: 'shuangxiong',
          ownerId: playerId,
        })
        if (!replaced) return
        applyShuangxiong(state, playerId, replaced)
      }
    }
    continueBeginTurn(state)
    return
  }

  if (key === 'tiesuo_mode') {
    const uid = state.prompt.cardUids?.[0]
    if (!uid) return
    if (choiceId === 'recast') {
      const p = state.players[playerId]
      const card = takeHand(state, playerId, uid)
      if (card) {
        discardCard(state, card)
        draw(state, playerId, 1)
        log(state, `${p.name} 重鑄【鐵索連環】，摸一張牌。`)
      }
      setPlayPrompt(state)
      return
    }
    const targets = state.players.filter((p) => p.alive).map((p) => p.id)
    state.prompt = {
      kind: 'choose_target',
      message: '【鐵索連環】選擇一至兩名目標（可選自己）',
      actorId: playerId,
      targetIds: targets,
      minTargets: 1,
      maxTargets: Math.min(2, targets.length),
      cardUids: [uid],
      respondKinds: ['tiesuo'],
      selectedTargetIds: [],
    }
    return
  }

  if (key === 'jushou') {
    const p = state.players[playerId]
    if (choiceId === 'yes') {
      draw(state, playerId, 3)
      p.facedown = true
      log(state, `${p.name} 發動據守，摸三張牌並將武將牌翻面。`)
    }
    runEndPhaseSkills(state, playerId)
    return
  }

  if (key === 'tianxiang') {
    const pending = (state as GameSnapshot & {
      _tianxiang?: {
        targetId: number
        amount: number
        sourceId: number | null
        nature: 'normal' | 'fire' | 'thunder'
        damageCard?: CardInstance
        heartUid: string
      }
    })._tianxiang
    delete (state as GameSnapshot & { _tianxiang?: unknown })._tianxiang
    if (!pending) return
    if (choiceId !== 'skip') {
      const card = takeHand(state, pending.targetId, pending.heartUid)
      if (card) discardCard(state, card)
      const to = Number(choiceId)
      if (card && state.players[to]?.alive) {
        log(state, `${state.players[pending.targetId].name} 發動天香，將傷害轉移給 ${state.players[to].name}。`)
        dealDamage(state, to, pending.amount, pending.sourceId, pending.nature, pending.damageCard)
        return
      }
    }
    ;(state as GameSnapshot & { _tianxiangBypass?: number })._tianxiangBypass = pending.targetId
    dealDamage(
      state,
      pending.targetId,
      pending.amount,
      pending.sourceId,
      pending.nature,
      pending.damageCard,
    )
    return
  }

  if (key === 'guhuo_as') {
    const p = state.players[playerId]
    const uid = state.prompt.selectedCardUids?.[0]
    const card = uid ? takeHand(state, playerId, uid) : null
    if (!card) {
      setPlayPrompt(state)
      return
    }
    discardCard(state, card)
    p.guhuoUsed = true
    log(state, `${p.name} 發動蠱惑，將一張牌當【${choiceId}】使用。`)
    if (choiceId === 'tao') p.hp = Math.min(p.maxHp, p.hp + 1)
    else if (choiceId === 'wuzhong') draw(state, playerId, 2)
    else if (choiceId === 'shan') {
      log(state, `${p.name} 於出牌階段不能當【閃】使用，蠱惑無效。`)
      p.guhuoUsed = false
      p.hand.push(card)
      const idx = state.discard.findIndex((c) => c.uid === card.uid)
      if (idx >= 0) state.discard.splice(idx, 1)
      setPlayPrompt(state)
      return
    }
    else if (choiceId === 'sha') {
      const targets = legalTargets(state, playerId, 'sha')
      if (targets.length) {
        state.prompt = {
          kind: 'choice',
          message: '【蠱惑】選擇殺的目標',
          actorId: playerId,
          choiceKey: 'guhuo_sha_target',
          selectedCardUids: [card.uid],
          choices: targets.map((id) => ({ id: String(id), label: state.players[id].name })),
        }
        return
      }
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'guhuo_sha_target') {
    const tid = Number(choiceId)
    const uid = state.prompt.selectedCardUids?.[0] ?? ''
    const p = state.players[playerId]
    p.shaUsedThisTurn = true
    state.pending = { type: 'sha', sourceId: playerId, targetId: tid, cardUid: uid }
    askShan(state, playerId, tid, uid)
    return
  }

  if (key === 'tianyi_target' || key === 'quhu_target' || key === 'zhiba_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const won = pindian(state, playerId, tid)
    if (key === 'tianyi_target') {
      p.tianyiUsed = true
      p.tianyiWin = won
      p.tianyiLose = !won
      if (won) p.shaUsedThisTurn = false
      log(state, `${p.name} 發動天義${won ? '勝利，本回合可不限距離使用殺' : '失敗，本回合不能使用殺'}。`)
    } else if (key === 'quhu_target') {
      p.quhuUsed = true
      if (won) {
        const victim = state.players.find(
          (x) => x.alive && x.id !== tid && canReach(state, tid, x.id),
        )
        dealDamage(state, victim?.id ?? tid, 1, tid)
      } else dealDamage(state, playerId, 1, tid)
      log(state, `${p.name} 發動驅虎${won ? '成功' : '失敗'}。`)
    } else {
      p.zhibaUsedOn = [...(p.zhibaUsedOn ?? []), tid]
      if (won) draw(state, playerId, 1)
      log(state, `${p.name} 發動制霸${won ? '勝利並摸一張牌' : '未勝'}。`)
    }
    if (!isAwaitingZonePick(state) && !getDying(state)) setPlayPrompt(state)
    return
  }

  if (key === 'tiaoxin_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const target = state.players[tid]
    p.tiaoxinUsed = true
    const sha = responseCards(target, 'sha')[0]
    if (sha && canReach(state, tid, playerId)) {
      const card = takeHand(state, tid, sha.uid)
      if (card) discardCard(state, card)
      state.pending = { type: 'sha', sourceId: tid, targetId: playerId, cardUid: sha.uid, damageCard: sha }
      log(state, `${target.name} 響應挑釁，對 ${p.name} 使用【殺】。`)
      askShan(state, tid, playerId, sha.uid)
      return
    }
    const card = target.hand.shift()
    if (card) discardCard(state, card)
    else {
      const slot = equipSlots().find((s) => target.equips[s])
      const equip = slot ? target.equips[slot] : undefined
      if (slot && equip) leaveEquipArea(state, tid, slot, equip)
    }
    log(state, `${target.name} 無法響應挑釁，棄置一張牌。`)
    setPlayPrompt(state)
    return
  }

  if (key === 'dimeng_first') {
    const first = Number(choiceId)
    const targets = state.players.filter((t) => t.alive && t.id !== playerId && t.id !== first)
    state.prompt = {
      kind: 'choice',
      message: '【締盟】選擇第二名角色',
      actorId: playerId,
      choiceKey: 'dimeng_second',
      selectedTargetIds: [first],
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (key === 'dimeng_second') {
    const p = state.players[playerId]
    const a = state.players[state.prompt.selectedTargetIds?.[0] ?? -1]
    const b = state.players[Number(choiceId)]
    if (!a || !b) return
    const cost = Math.abs(a.hand.length - b.hand.length)
    if (p.hand.length < cost) {
      log(state, `${p.name} 手牌不足，無法支付締盟代價。`)
    } else {
      for (let i = 0; i < cost; i++) {
        const card = p.hand.shift()
        if (card) discardCard(state, card)
      }
      ;[a.hand, b.hand] = [b.hand, a.hand]
      p.dimengUsed = true
      log(state, `${p.name} 發動締盟，交換 ${a.name} 與 ${b.name} 的手牌。`)
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'fangquan_target') {
    const p = state.players[playerId]
    const target = state.players[Number(choiceId)]
    if (target?.alive) {
      p.fangquanPending = true
      p.fangquanUsed = true
      log(state, `${p.name} 發動放權，跳過出牌階段。`)
      finishEndPhase(state, playerId)
      extraOf(state)._fangquanLegacyTarget = target.id
    } else {
      setPlayPrompt(state)
    }
    return
  }

  if (key === 'jijiang_target') {
    const tid = Number(choiceId)
    extraOf(state)._jijiang = { sourceId: playerId, targetId: tid, cursor: 0 }
    askNextJijiang(state)
    return
  }

  if (key === 'jijiang_sha') {
    const jj = extraOf(state)._jijiang
    if (choiceId === 'skip' || !jj) {
      askNextJijiang(state)
      return
    }
    const card = takeHand(state, playerId, choiceId)
    if (card) {
      discardCard(state, card)
      const src = state.players[jj.sourceId]
      src.shaUsedThisTurn = true
      log(state, `${state.players[playerId].name} 響應激將，打出【殺】。`)
      extraOf(state)._jijiang = undefined
      state.pending = { type: 'sha', sourceId: jj.sourceId, targetId: jj.targetId, cardUid: card.uid, damageCard: card }
      askShan(state, jj.sourceId, jj.targetId, card.uid)
    }
    return
  }

  if (key === 'huangtian_give') {
    const p = state.players[playerId]
    const zj = state.players.find((x) => x.alive && playerSkills(x).includes('huangtian'))
    const card = takeHand(state, playerId, choiceId)
    if (card && zj) {
      zj.hand.push(card)
      p.huangtianUsed = true
      log(state, `${p.name} 發動黃天，將【${getCardDef(card.defId).name}】交給 ${zj.name}。`)
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'jixi_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const spent = p.tianCards?.pop()
    if (spent) discardCard(state, spent)
    p.tianCount = Math.max(0, (p.tianCount ?? 0) - 1)
    if ((p.tianCards?.length ?? 0) > 0) p.tianCount = p.tianCards!.length
    log(state, `${p.name} 發動急襲，消耗一張「田」。`)
    beginZonePick(state, {
      actorId: playerId,
      ownerId: tid,
      count: 1,
      skillId: 'shunshou',
      mode: 'steal',
      message: `【急襲】選擇獲得 ${state.players[tid].name} 的一張牌`,
    })
    return
  }

  if (key === 'zhijian_target') {
    const p = state.players[playerId]
    const target = state.players[Number(choiceId)]
    const uid = state.prompt.selectedCardUids?.[0]
    const card = uid ? takeHand(state, playerId, uid) : null
    if (card && target) {
      const slot = getCardDef(card.defId).slot
      if (slot) {
        const old = target.equips[slot]
        if (old) leaveEquipArea(state, target.id, slot, old)
        target.equips[slot] = card
        draw(state, playerId, 1)
        log(state, `${p.name} 發動直諫，為 ${target.name} 裝備牌並摸一張。`)
      }
    }
    setPlayPrompt(state)
    return
  }

  if (key === 'guohe' && targetId !== undefined) {
    applyZoneCardIds(state, playerId, targetId, [choiceId], 'discard')
    setPlayPrompt(state)
    return
  }

  if (key === 'fangtian_confirm') {
    const uid = state.prompt.cardUids?.[0]
    const kind = state.prompt.respondKinds?.[0] ?? 'sha'
    const selected = [...(state.prompt.selectedTargetIds ?? [])]
    if (choiceId.startsWith('add:')) {
      const tid = Number(choiceId.slice(4))
      if (!selected.includes(tid)) selected.push(tid)
      const remaining = (state.prompt.targetIds ?? []).filter((id) => !selected.includes(id))
      const maxTargets = 3
      if (selected.length < maxTargets && remaining.length) {
        state.prompt = {
          kind: 'choice',
          message: `已選 ${selected.map((id) => state.players[id].name).join('、')}。可再選或確認。`,
          actorId: playerId,
          choiceKey: 'fangtian_confirm',
          cardUids: uid ? [uid] : undefined,
          respondKinds: [kind],
          targetIds: remaining,
          selectedTargetIds: selected,
          choices: [
            ...remaining.map((rid) => ({
              id: `add:${rid}`,
              label: `再指定 ${state.players[rid].name}`,
            })),
            { id: 'confirm', label: kind === 'tiesuo' ? '確認連環' : '確認出殺' },
          ],
        }
        return
      }
    }
    if (!uid || !selected.length) {
      setPlayPrompt(state)
      return
    }
    finishTargetedCard(state, playerId, uid, kind, selected)
    return
  }

  if (key === 'liuli' && state.pending?.type === 'sha') {
    if (choiceId === 'skip') {
      askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
      return
    }
    const newTarget = Number(choiceId)
    if (Number.isNaN(newTarget) || !state.players[newTarget]?.alive) {
      askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
      return
    }
    ;(state as GameSnapshot & { _liuliTo?: number })._liuliTo = newTarget
    beginZonePick(state, {
      actorId: playerId,
      ownerId: playerId,
      count: 1,
      skillId: 'liuli',
      mode: 'discard',
      message: '【流離】選擇一張牌棄置以轉移殺',
    })
    return
  }

  if (key === 'leiji') {
    if (choiceId !== 'skip') {
      const tid = Number(choiceId)
      if (!Number.isNaN(tid) && state.players[tid]?.alive) {
        const judged = drawJudgeCard(state, shuffle)
        if (judged) {
          const replaced = tryJudgeReplace(state, judged, 'black', playerId, {
            kind: 'leiji',
            actorId: playerId,
            tid,
          })
          if (!replaced) return
          if (finishLeiji(state, playerId, tid, replaced)) return
        }
      }
    }
    continueAfterLeiji(state)
    return
  }

  if (key === 'cixiong' && state.pending?.type === 'sha') {
    const sourceId = state.pending.sourceId
    const tid = state.pending.targetId
    const target = state.players[tid]
    if (choiceId === 'discard') {
      if (target.hand.length === 0) {
        draw(state, sourceId, 1)
        log(state, `${target.name} 無手牌可棄，${state.players[sourceId].name} 摸一張牌。`)
        askShan(state, sourceId, tid, state.pending.cardUid)
        return
      }
      beginZonePick(state, {
        actorId: tid,
        ownerId: tid,
        count: 1,
        skillId: 'cixiong',
        mode: 'discard',
        handOnly: true,
        message: `【雌雄雙股劍】選擇一張手牌棄置`,
      })
      return
    }
    draw(state, sourceId, 1)
    log(state, `${state.players[sourceId].name} 因【雌雄雙股劍】摸一張牌。`)
    askShan(state, sourceId, tid, state.pending.cardUid)
    return
  }

  if (key === 'hanbing' && state.pending?.type === 'sha') {
    const sourceId = state.pending.sourceId
    const tid = state.pending.targetId
    const damage = (state as GameSnapshot & { _shaDamage?: number })._shaDamage ?? 1
    if (choiceId === 'yes') {
      const n = Math.min(2, countDiscardable(state.players[tid]))
      if (n <= 0) {
        applyShaDamage(state, sourceId, tid, damage)
        return
      }
      beginZonePick(state, {
        actorId: sourceId,
        ownerId: tid,
        count: n,
        skillId: 'hanbing',
        mode: 'discard',
        message: `【寒冰劍】選擇棄置 ${state.players[tid].name} 的 ${n} 張牌`,
      })
      return
    }
    applyShaDamage(state, sourceId, tid, damage)
    return
  }

  if (key === 'qilingong' && targetId !== undefined) {
    const target = state.players[targetId]
    if (choiceId === 'horseMinus' || choiceId === 'horsePlus') {
      const slot = choiceId as 'horseMinus' | 'horsePlus'
      const eq = target.equips[slot]
      if (eq) {
        leaveEquipArea(state, targetId, slot, eq)
        log(state, `${state.players[playerId].name} 發動【麒麟弓】，棄置坐騎。`)
      }
    } else {
      log(state, `${state.players[playerId].name} 不發動【麒麟弓】。`)
    }
    const q = (state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue
    if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
    else resumeAfterResponse(state)
    return
  }

  if (key === 'qinglong' && targetId !== undefined) {
    if (choiceId === 'yes') {
      const uids = state.prompt.cardUids ?? []
      const source = state.players[playerId]
      const uid = uids.find((u) => findCard(source, u))
      if (uid) {
        const card = takeHand(state, source.id, uid)!
        discardCard(state, card)
        const def = getCardDef(card.defId)
        setPlayFx(state, {
          cardName: def.name,
          suit: def.suit,
          rank: def.rank,
          sourceId: playerId,
          targetIds: [targetId],
          note: '青龍',
        })
        log(state, `${source.name} 發動【青龍偃月刀】，再出【殺】。`)
        source.shaUsedThisTurn = true
        const q = (state as GameSnapshot & {
          _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
        })._shaQueue
        state.pending = {
          type: 'sha',
          sourceId: playerId,
          targetId,
          cardUid: card.uid,
          damageCard: card,
          extraTargets: q?.extras,
        }
        askShan(state, playerId, targetId, card.uid)
        return
      }
    }
    const q = (state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue
    if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
    else {
      state.pending = undefined
      resumeAfterResponse(state)
    }
    return
  }

  if (key === 'guanshi' && state.pending?.type === 'sha' && targetId !== undefined) {
    if (choiceId === 'yes') {
      beginZonePick(state, {
        actorId: playerId,
        ownerId: playerId,
        count: 2,
        skillId: 'guanshi',
        mode: 'discard',
        message: '【貫石斧】選擇兩張牌棄置，令此殺仍造成傷害',
      })
      return
    }
    const extras = state.pending.extraTargets ?? []
    const cardUid = state.pending.cardUid
    const damageCard = state.pending.damageCard
    continueShaQueue(state, state.pending.sourceId, cardUid, extras, damageCard)
    return
  }

  if (key === 'ganglie') {
    const sourceId = state.prompt.targetIds?.[0]
    if (sourceId === undefined) {
      resumeAfterDamageFlow(state)
      return
    }
    if (choiceId === 'damage') {
      dealDamage(state, sourceId, 1, playerId)
      if (!isAwaitingZonePick(state)) resumeAfterDamageFlow(state)
      return
    }
    if (choiceId === 'discard') {
      beginZonePick(state, {
        actorId: sourceId,
        ownerId: sourceId,
        count: 2,
        skillId: 'ganglie',
        mode: 'discard',
        message: '【剛烈】選擇兩張牌棄置',
      })
      return
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'zone_pick') {
    handleZonePickClick(state, playerId, choiceId)
    return
  }

  if (key === 'skill_confirm') {
    confirmSkillCards(state, playerId)
    return
  }

  if (key === 'rende_target') {
    const uids = state.prompt.selectedCardUids ?? []
    const tid = Number(choiceId)
    finishRende(state, playerId, uids, tid)
    return
  }

  if (key === 'zhangba_target') {
    const uids = state.prompt.selectedCardUids ?? []
    const tid = Number(choiceId)
    finishZhangba(state, playerId, uids, tid)
    return
  }

  if (key === 'wuxie') {
    const w = getWuxie(state)
    if (!w) {
      setPlayPrompt(state)
      return
    }
    if (choiceId === 'use') {
      const uid = state.prompt.cardUids?.[0]
      const p = state.players[playerId]
      const card = uid ? takeHand(state, playerId, uid) : null
      if (card) {
        discardCard(state, card)
        w.nullified = !w.nullified
        log(
          state,
          `${p.name} 使用【無懈可擊】${w.nullified ? '抵消' : '再次無懈，效果恢復'}錦囊。`,
        )
        // 無懈可擊 is a 錦囊; trigger 集智 (and any future after-trick skills)
        afterTrick(state, p)
        if (state.players.find((x) => x.identity === 'lord')?.id !== undefined) {
          const lord = state.players.find((x) => x.identity === 'lord')
          const trick = w.trick
          const protectsLord =
            (trick.type === 'aoe_target' && lord && trick.targetId === lord.id) ||
            (trick.type === 'juedou' && lord && trick.targetId === lord.id) ||
            (trick.type === 'guohe' && lord && trick.targetId === lord.id) ||
            (trick.type === 'huogong' && lord && trick.targetId === lord.id) ||
            (trick.type === 'delayed' && lord && trick.targetId === lord.id)
          if (protectsLord && w.nullified) {
            observePublicEvent(state, {
              type: 'defend_lord',
              sourceId: playerId,
              via: '使用【無懈可擊】守護主公相關效果',
            })
          }
        }
      }
    }
    continueWuxieAsk(state)
    return
  }

  if (key === 'wugu') {
    const w = getWugu(state)
    if (!w) {
      setPlayPrompt(state)
      return
    }
    const idx = w.pool.findIndex((c) => c.uid === choiceId)
    if (idx < 0) return
    const [got] = w.pool.splice(idx, 1)
    state.players[playerId].hand.push(got)
    log(
      state,
      `${state.players[playerId].name} 獲得【${getCardDef(got.defId).name}】。`,
    )
    w.index++
    continueWugu(state)
    return
  }

  if (key === 'jianxiong') {
    const p = state.players[playerId]
    const uid = state.prompt.cardUids?.[0]
    if (choiceId === 'take' && uid) {
      const idx = state.discard.findIndex((c) => c.uid === uid)
      if (idx >= 0) {
        const [got] = state.discard.splice(idx, 1)
        p.hand.push(got)
        log(state, `${p.name} 發動奸雄，獲得【${getCardDef(got.defId).name}】。`)
      } else {
        log(state, `${p.name} 發動奸雄，但該牌已不在棄牌堆。`)
      }
    } else {
      log(state, `${p.name} 不發動奸雄。`)
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'play_as') {
    const uid = state.prompt.cardUids?.[0]
    if (!uid) {
      setPlayPrompt(state)
      return
    }
    selectCard(state, playerId, uid, choiceId)
    return
  }

  if (key === 'guanxing') {
    const mode =
      choiceId === 'reverse' ? 'reverse' : choiceId === 'bottom' ? 'bottom' : 'keep'
    finishGuanxing(state, mode)
    return
  }

  if (key === 'qiangxi_cost') {
    const foes = state.prompt.targetIds ?? []
    ;(state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost = choiceId
    state.prompt = {
      kind: 'choice',
      message: '【強襲】選擇造成傷害的目標',
      actorId: playerId,
      choiceKey: 'qiangxi_target',
      choices: foes.map((tid) => ({
        id: String(tid),
        label: state.players[tid].name,
      })),
    }
    return
  }

  if (key === 'qiangxi_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const cost = (state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost
    delete (state as GameSnapshot & { _qiangxiCost?: string })._qiangxiCost
    if (!state.players[tid]?.alive) {
      setPlayPrompt(state)
      return
    }
    p.qiangxiUsed = true
    if (cost === 'hp') {
      p.hp -= 1
      pushDamageFx(state, playerId, 1)
      log(state, `${p.name} 發動【強襲】，失去1點體力。`)
      if (p.hp <= 0) {
        trySave(state, playerId, playerId)
      }
    } else if (cost?.startsWith('equip:')) {
      const w = p.equips.weapon
      if (w) {
        leaveEquipArea(state, playerId, 'weapon', w)
        log(state, `${p.name} 發動【強襲】，棄置武器【${getCardDef(w.defId).name}】。`)
      }
    } else if (cost?.startsWith('hand:')) {
      const uid = cost.slice(5)
      const c = takeHand(state, playerId, uid)
      if (c) {
        discardCard(state, c)
        log(state, `${p.name} 發動【強襲】，棄置【${getCardDef(c.defId).name}】。`)
      }
    }
    log(state, `${p.name} 對 ${state.players[tid].name} 造成1點傷害（強襲）。`)
    if (dealDamage(state, tid, 1, playerId)) return
    if (getDying(state) || isAwaitingZonePick(state)) return
    checkVictory(state)
    if (!state.winnerIds) setPlayPrompt(state)
    return
  }

  if (key === 'qingnang_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    for (const uid of uids) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    const t = state.players[tid]
    if (t?.alive && t.hp < t.maxHp) {
      t.hp += 1
      log(state, `${p.name} 發動【青囊】，${t.name} 回覆1點體力（${t.hp}）。`)
    }
    p.qingnangUsed = true
    setPlayPrompt(state)
    return
  }

  if (key === 'jieyin_target') {
    const p = state.players[playerId]
    const tid = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    for (const uid of uids) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    const t = state.players[tid]
    if (p.hp < p.maxHp) {
      p.hp += 1
      log(state, `${p.name} 因【結姻】回覆1點體力（${p.hp}）。`)
    }
    if (t?.alive && t.hp < t.maxHp) {
      t.hp += 1
      log(state, `${t.name} 因【結姻】回覆1點體力（${t.hp}）。`)
    }
    p.jieyinUsed = true
    setPlayPrompt(state)
    return
  }

  if (key === 'lijian_first') {
    const first = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    const males = state.players.filter(
      (t) =>
        t.alive &&
        t.id !== playerId &&
        t.id !== first &&
        t.generalId &&
        getGeneral(t.generalId).gender === 'male',
    )
    state.prompt = {
      kind: 'choice',
      message: '【離間】選擇決鬥的另一方',
      actorId: playerId,
      choiceKey: 'lijian_second',
      selectedCardUids: uids,
      selectedTargetIds: [first],
      choices: males.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (key === 'lijian_second') {
    const p = state.players[playerId]
    const first = state.prompt.selectedTargetIds?.[0]
    const second = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    for (const uid of uids) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    p.lijianUsed = true
    if (first === undefined || !state.players[first]?.alive || !state.players[second]?.alive) {
      setPlayPrompt(state)
      return
    }
    log(
      state,
      `${p.name} 發動【離間】，令 ${state.players[first].name} 與 ${state.players[second].name} 決鬥。`,
    )
    resolveJuedou(state, first, second)
    return
  }

  if (key === 'fanjian_target') {
    const tid = Number(choiceId)
    const uids = state.prompt.selectedCardUids ?? []
    state.prompt = {
      kind: 'choice',
      message: `【反間】${state.players[tid].name} 請猜花色`,
      actorId: tid,
      choiceKey: 'fanjian_suit',
      selectedCardUids: uids,
      selectedTargetIds: [playerId, tid],
      choices: [
        { id: 'spade', label: '黑桃' },
        { id: 'heart', label: '紅桃' },
        { id: 'club', label: '梅花' },
        { id: 'diamond', label: '方塊' },
      ],
    }
    return
  }

  if (key === 'fanjian_suit') {
    const sourceId = state.prompt.selectedTargetIds?.[0]
    const tid = state.prompt.selectedTargetIds?.[1]
    const uid = state.prompt.selectedCardUids?.[0]
    if (sourceId === undefined || tid === undefined || !uid) {
      setPlayPrompt(state)
      return
    }
    const source = state.players[sourceId]
    const target = state.players[tid]
    const card = takeHand(state, sourceId, uid)
    if (!card) {
      setPlayPrompt(state)
      return
    }
    const suit = getCardDef(card.defId).suit
    target.hand.push(card)
    source.fanjianUsed = true
    const guess = choiceId
    const ok = suit === guess
    log(
      state,
      `${target.name} 猜${({ spade: '黑桃', heart: '紅桃', club: '梅花', diamond: '方塊' } as Record<string, string>)[guess] ?? guess}，實為【${getCardDef(card.defId).name}】${ok ? '（猜對）' : '（猜錯）'}。`,
    )
    if (!ok) {
      if (dealDamage(state, tid, 1, sourceId)) return
      if (getDying(state) || isAwaitingZonePick(state)) return
    }
    checkVictory(state)
    if (!state.winnerIds) setPlayPrompt(state)
    return
  }

  if (key === 'jieming') {
    const tid = Number(choiceId)
    const t = state.players[tid]
    if (t?.alive) {
      const n = Math.max(1, t.maxHp - t.hp)
      draw(state, tid, n)
      log(state, `${state.players[playerId].name} 發動節命，令 ${t.name} 摸 ${n} 張牌。`)
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'yaowu') {
    const p = state.players[playerId]
    if (choiceId === 'recover') {
      if (p.hp < p.maxHp) {
        p.hp += 1
        log(state, `${p.name} 因【耀武】回覆1點體力（體力 ${p.hp}）。`)
      } else {
        draw(state, playerId, 1)
        log(state, `${p.name} 體力已滿，因【耀武】改為摸一張牌。`)
      }
    } else {
      draw(state, playerId, 1)
      log(state, `${p.name} 因【耀武】摸一張牌。`)
    }
    resumeAfterDamageFlow(state)
    return
  }

  if (key === 'dying_save') {
    const d = getDying(state)
    if (!d) {
      setPlayPrompt(state)
      return
    }
    const dying = state.players[d.targetId]
    const saver = state.players[playerId]
    if (choiceId === 'skip') {
      log(state, `${saver.name} 不出【桃】。`)
      continueDyingAsk(state)
      return
    }
    const uid = choiceId
    if (!(state.prompt.cardUids ?? []).includes(uid)) return
    const card = takeHand(state, playerId, uid)
    if (!card) return
    discardCard(state, card)
    const def = getCardDef(card.defId)
    const asJiu = cardKind(card) === 'jiu'
    const asJijiu =
      !asJiu &&
      cardKind(card) !== 'tao' &&
      playerSkills(saver).includes('jijiu') &&
      isRedFor(saver, card) &&
      state.currentPlayer !== saver.id
    const asGuhuo = !asJiu && cardKind(card) !== 'tao' && !asJijiu
    if (asGuhuo && playerSkills(saver).includes('guhuo')) saver.guhuoUsed = true
    const healed = peachHealAmount(state, saver, dying, asJiu)
    dying.hp += healed
    trimBuquOnHeal(state, dying, healed)
    d.savedThisRound = true
    log(
      state,
      asJiu
        ? `${saver.name} 使用【酒】，體力回覆至 ${dying.hp}。`
        : asJijiu
          ? `${saver.name} 發動急救，將【${def.name}】當【桃】使用，${dying.name} 體力回覆至 ${dying.hp}。`
          : asGuhuo
            ? `${saver.name} 發動蠱惑，將【${def.name}】當【桃】使用，${dying.name} 體力回覆至 ${dying.hp}。`
            : `${saver.name} 對 ${dying.name} 使用【桃】，體力回覆至 ${dying.hp}。`,
    )
    continueDyingAsk(state)
    return
  }

  if (key === 'jiedao') {
    const ids = state.prompt.selectedTargetIds ?? []
    const sourceId = ids[0]
    const holderId = ids[1]
    const killTargetId = ids[2]
    if (sourceId === undefined || holderId === undefined || killTargetId === undefined) {
      setPlayPrompt(state)
      return
    }
    const holder = state.players[holderId]
    if (choiceId === 'sha') {
      const uid = state.prompt.cardUids?.[0]
      if (uid) {
        const card = takeHand(state, holderId, uid)
        if (card) {
          discardCard(state, card)
          holder.shaUsedThisTurn = true
          log(
            state,
            `${holder.name} 因【借刀殺人】對 ${state.players[killTargetId].name} 使用【殺】。`,
          )
          observePublicEvent(state, {
            type: 'attack',
            sourceId: holderId,
            targetId: killTargetId,
            kind: 'sha',
          })
          state.pending = {
            type: 'sha',
            sourceId: holderId,
            targetId: killTargetId,
            cardUid: card.uid,
            damageCard: card,
          }
          askShan(state, holderId, killTargetId, card.uid)
          return
        }
      }
    }
    // Give weapon to 借刀 user
    const weapon = holder.equips.weapon
    if (weapon) {
      holder.equips.weapon = undefined
      state.players[sourceId].hand.push(weapon)
      log(
        state,
        `${holder.name} 交出【${getCardDef(weapon.defId).name}】給 ${state.players[sourceId].name}。`,
      )
      if (playerSkills(holder).includes('xiaoji')) {
        draw(state, holderId, 2)
        log(state, `${holder.name} 發動梟姬，摸兩張牌。`)
      }
    }
    setPlayPrompt(state)
    return
  }
}

function askNextHujia(state: GameSnapshot): void {
  const h = extraOf(state)._hujia
  if (!h || state.pending?.type !== 'sha') {
    extraOf(state)._hujia = undefined
    finishShaHit(state, 1)
    return
  }
  const n = state.players.length
  while (h.cursor < n) {
    const seat = (h.targetId + 1 + h.cursor) % n
    h.cursor++
    const pl = state.players[seat]
    if (!pl.alive || pl.id === h.targetId) continue
    if (kingdomOf(pl) !== 'wei') continue
    const cards = responseCards(pl, 'shan')
    if (!cards.length) continue
    state.prompt = {
      kind: 'choice',
      message: `【護駕】${state.players[h.targetId].name} 求【閃】，是否替其打出？`,
      actorId: pl.id,
      choiceKey: 'hujia_shan',
      cardUids: cards.map((c) => c.uid),
      choices: [
        ...cards.map((c) => ({ id: c.uid, label: `打出【${getCardDef(c.defId).name}】` })),
        { id: 'skip', label: '不響應' },
      ],
    }
    return
  }
  extraOf(state)._hujia = undefined
  finishShaHit(state, 1)
}

function askNextJijiang(state: GameSnapshot): void {
  const jj = extraOf(state)._jijiang
  if (!jj) {
    setPlayPrompt(state)
    return
  }
  const n = state.players.length
  while (jj.cursor < n) {
    const seat = (jj.sourceId + 1 + jj.cursor) % n
    jj.cursor++
    const pl = state.players[seat]
    if (!pl.alive || pl.id === jj.sourceId || !pl.generalId) continue
    try {
      const g = getGeneral(pl.generalId)
      if (g.kingdom !== 'shu' || g.gender !== 'male') continue
    } catch {
      continue
    }
    const cards = responseCards(pl, 'sha')
    if (!cards.length) continue
    state.prompt = {
      kind: 'choice',
      message: `【激將】${state.players[jj.sourceId].name} 求【殺】，是否替其打出？`,
      actorId: pl.id,
      choiceKey: 'jijiang_sha',
      cardUids: cards.map((c) => c.uid),
      choices: [
        ...cards.map((c) => ({ id: c.uid, label: `打出【${getCardDef(c.defId).name}】` })),
        { id: 'skip', label: '不響應' },
      ],
    }
    return
  }
  extraOf(state)._jijiang = undefined
  log(state, '無人響應激將。')
  setPlayPrompt(state)
}

