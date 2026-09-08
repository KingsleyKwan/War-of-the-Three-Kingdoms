/**
 * 殺 / 閃 response, hit, dodge, weapon follow-ups.
 */
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type { CardInstance, GameSnapshot, PlayerState } from './types'
import {
  attackRangeOf, canReach, cardKind, checkVictory, enemiesOf, equipSlots,
  findCard, isBlackCard, isBlackFor, isRedFor, playerSkills, shuffle,
} from './helpers'
import {
  armorKind, countDiscardable, drawJudgeCard, ignoresArmor, mayUseSha,
  horseLabel, oppositeGender, targetHorses, weaponKind,
} from './weapons'
import {
  log, draw, discardCard, takeHand, turnSkipOf, setPlayFx, pushDamageFx, skillLabel,
} from './core'
import {
  setPlayPrompt, applyJudgeReplaceSync, getPlayKindOptions,
  resumeAfterResponse, continueAoe, getAoeQueue, getJuedou, onJuedouShaPlayed,
  finishJuedouLose, legalTargets, leaveEquipArea, dealDamage, trySave,
  getDying, isAwaitingZonePick, startDyingIfPending, kingdomOf,
} from './game'
import { tryJudgeReplace } from './official'
import { applyBaguaResult, applyTieqiResult } from './judges'

export function askShan(state: GameSnapshot, sourceId: number, targetId: number, cardUid: string): void {
  const target = state.players[targetId]
  const source = state.players[sourceId]
  const prev = state.pending?.type === 'sha' ? state.pending : undefined
  const shaCard =
    prev?.damageCard ??
    state.discard.find((c) => c.uid === cardUid) ??
    { uid: cardUid, defId: '' }
  const shaDefId = shaCard.defId || findRecentShaDef(state)
  const ignoreArm = ignoresArmor(source)

  const xiansiBypass = (state as GameSnapshot & { _xiansiBypass?: number })._xiansiBypass
  if (
    xiansiBypass !== targetId &&
    playerSkills(target).includes('xiansi') &&
    (target.niCards?.length ?? 0) >= 2
  ) {
    state.pending = {
      type: 'sha',
      sourceId,
      targetId,
      cardUid,
      damageCard: prev?.damageCard ?? (shaCard.defId ? shaCard : undefined),
      extraTargets: prev?.extraTargets,
    }
    state.prompt = {
      kind: 'choice',
      message: '【陷嗣】是否棄置兩張「逆」，令此【殺】無效？',
      actorId: targetId,
      choiceKey: 'xiansi_cancel',
      choices: [
        { id: 'yes', label: '棄兩張「逆」抵消' },
        { id: 'no', label: '不發動' },
      ],
    }
    return
  }
  delete (state as GameSnapshot & { _xiansiBypass?: number })._xiansiBypass

  if (playerSkills(target).includes('xiangle') && !prev?.xianglePaid && !(state.pending?.type === 'sha' && state.pending.xianglePaid)) {
    const basics = source.hand.filter((c) => getCardDef(c.defId).type === 'basic')
    if (!basics.length) {
      log(state, `${target.name} 的【享樂】令此【殺】無效。`)
      continueShaQueue(state, sourceId, cardUid, prev?.extraTargets ?? [], prev?.damageCard)
      return
    }
    state.pending = {
      type: 'sha',
      sourceId,
      targetId,
      cardUid,
      damageCard: prev?.damageCard ?? (shaCard.defId ? shaCard : undefined),
      extraTargets: prev?.extraTargets,
      xianglePaid: false,
    }
    state.prompt = {
      kind: 'choice',
      message: `【享樂】${source.name} 須棄一張基本牌，否則此【殺】無效`,
      actorId: sourceId,
      choiceKey: 'xiangle_pay',
      cardUids: basics.map((c) => c.uid),
      choices: [
        ...basics.map((c) => ({
          id: c.uid,
          label: `棄【${getCardDef(c.defId).name}】`,
        })),
        { id: 'cancel', label: '不棄，殺無效' },
      ],
    }
    return
  }

  // 仁王盾：黑色殺無效（青釭劍無視防具）
  if (!ignoreArm && armorKind(target) === 'renwang') {
    if (shaDefId && isBlackCard({ uid: cardUid, defId: shaDefId })) {
      log(state, `${target.name} 的【仁王盾】抵消了黑色【殺】。`)
      continueShaQueue(state, sourceId, cardUid, prev?.extraTargets ?? [], prev?.damageCard)
      return
    }
  }

  state.pending = {
    type: 'sha',
    sourceId,
    targetId,
    cardUid,
    damageCard: prev?.damageCard ?? (shaCard.defId ? shaCard : undefined),
    extraTargets: prev?.extraTargets,
    xianglePaid: prev?.xianglePaid || (state.pending?.type === 'sha' ? state.pending.xianglePaid : false),
    tieqiAsked: prev?.tieqiAsked || (state.pending?.type === 'sha' ? state.pending.tieqiAsked : false),
    baguaAsked: prev?.baguaAsked || (state.pending?.type === 'sha' ? state.pending.baguaAsked : false),
    hujiaAsked: prev?.hujiaAsked || (state.pending?.type === 'sha' ? state.pending.hujiaAsked : false),
    skipShan: prev?.skipShan || (state.pending?.type === 'sha' ? state.pending.skipShan : false),
  }

  // 鐵騎：可判定，紅色則其不能出閃
  let skipShan = !!state.pending.skipShan
  if (playerSkills(source).includes('tieqi') && !state.pending.tieqiAsked) {
    state.pending.tieqiAsked = true
    if (source.isHuman) {
      state.prompt = {
        kind: 'choice',
        message: '【鐵騎】是否判定？紅色則目標不能出【閃】',
        actorId: sourceId,
        choiceKey: 'tieqi_ask',
        choices: [
          { id: 'yes', label: '發動鐵騎' },
          { id: 'no', label: '不發動' },
        ],
      }
      return
    }
    let judged = drawJudgeCard(state, shuffle)
    const replaced = tryJudgeReplace(state, judged!, 'red', sourceId, {
      kind: 'tieqi',
      sourceId,
      targetId,
      cardUid,
    })
    if (!replaced) return
    applyTieqiResult(state, replaced, sourceId, targetId, cardUid)
    return
  }
  // 烈弓：目標手牌數≥來源則不能出閃
  if (
    !skipShan &&
    playerSkills(source).includes('liegong') &&
    (target.hand.length >= source.hand.length || target.hp <= attackRangeOf(source))
  ) {
    skipShan = true
    log(state, `${source.name} 發動烈弓，${target.name} 不能出【閃】。`)
  }
  if (skipShan) {
    state.pending.skipShan = true
    finishShaHit(state, 1)
    return
  }

  // 八卦陣：可判定當閃（青釭劍無視）
  if (
    !state.pending.baguaAsked &&
    !ignoreArm &&
    (armorKind(target) === 'bagua' ||
      (!target.equips.armor && playerSkills(target).includes('bazhen')))
  ) {
    state.pending.baguaAsked = true
    if (target.isHuman) {
      state.prompt = {
        kind: 'choice',
        message: '【八卦陣】是否判定？紅色視為打出【閃】',
        actorId: targetId,
        choiceKey: 'bagua_ask',
        choices: [
          { id: 'yes', label: '發動八卦陣' },
          { id: 'no', label: '不出判定，打出閃或承受' },
        ],
      }
      return
    }
    let judged = drawJudgeCard(state, shuffle)
    const replaced = tryJudgeReplace(state, judged!, 'red', targetId, {
      kind: 'bagua',
      sourceId,
      targetId,
      cardUid,
    })
    if (!replaced) return
    applyBaguaResult(state, replaced, sourceId, targetId, cardUid)
    return
  }

  const wushuang = playerSkills(source).includes('wushuang')
  const shanNeeded = state.pending.shanNeeded ?? (wushuang ? 2 : 1)
  state.pending.shanNeeded = shanNeeded
  const shanCards = responseCards(target, 'shan')
  const weiAllies = state.players.filter(
    (x) =>
      x.alive &&
      x.id !== targetId &&
      kingdomOf(x) === 'wei',
  )
  if (
    playerSkills(target).includes('hujia') &&
    !state.pending.hujiaAsked &&
    weiAllies.length
  ) {
    state.pending.hujiaAsked = true
    state.prompt = {
      kind: 'choice',
      message: '【護駕】是否令其他魏勢力角色替你打出【閃】？',
      actorId: targetId,
      choiceKey: 'hujia_ask',
      cardUids: shanCards.map((c) => c.uid),
      choices: [
        ...(shanCards.length ? [{ id: 'self', label: '自己打出【閃】' }] : []),
        { id: 'hujia', label: '發動護駕' },
        { id: 'pass', label: '不抵消' },
      ],
    }
    return
  }
  if (shanCards.length === 0) {
    finishShaHit(state, 1)
    return
  }
  state.prompt = {
    kind: 'respond_shan',
    message: `${target.name} 請打出【閃】${wushuang ? `（無雙：需 ${shanNeeded} 張）` : ''}`,
    actorId: targetId,
    cardUids: shanCards.map((c) => c.uid),
    respondKinds: ['shan'],
  }
}

export function findRecentShaDef(state: GameSnapshot): string | null {
  for (let i = state.discard.length - 1; i >= 0; i--) {
    if (getCardDef(state.discard[i].defId).kind === 'sha') return state.discard[i].defId
  }
  return null
}

export function responseCards(p: PlayerState, need: 'shan' | 'sha' | 'tao'): CardInstance[] {
  const skills = playerSkills(p)
  return p.hand.filter((c) => {
    const opts = [cardKind(c)]
    if (skills.includes('longdan')) {
      if (cardKind(c) === 'sha') opts.push('shan')
      if (cardKind(c) === 'shan') opts.push('sha')
    }
    if (skills.includes('qingguo') && isBlackFor(p, c)) opts.push('shan')
    if (skills.includes('wusheng') && isRedFor(p, c)) opts.push('sha')
    if (skills.includes('jijiu') && isRedFor(p, c)) opts.push('tao')
    if (skills.includes('guhuo') && !p.guhuoUsed) {
      opts.push('sha', 'shan', 'tao')
    }
    return opts.includes(need)
  })
}

export function handleResponse(state: GameSnapshot, playerId: number, uid: string): void {
  const p = state.players[playerId]
  const card = takeHand(state, playerId, uid)
  if (!card) return
  discardCard(state, card)
  const kind = state.prompt.kind
  const def = getCardDef(card.defId)
  const natural = cardKind(card)
  if (
    playerSkills(p).includes('guhuo') &&
    !p.guhuoUsed &&
    ((kind === 'respond_shan' &&
      natural !== 'shan' &&
      !(playerSkills(p).includes('longdan') && natural === 'sha') &&
      !(playerSkills(p).includes('qingguo') && isBlackFor(p, card))) ||
      (kind === 'respond_sha' &&
        natural !== 'sha' &&
        !(playerSkills(p).includes('longdan') && natural === 'shan') &&
        !(playerSkills(p).includes('wusheng') && isRedFor(p, card))))
  ) {
    p.guhuoUsed = true
    log(state, `${p.name} 發動蠱惑，將【${def.name}】當【${kind === 'respond_shan' ? '閃' : '殺'}】。`)
  }

  if (kind === 'respond_shan') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: state.pending?.type === 'sha' ? [state.pending.sourceId] : [],
      note: '閃',
    })
    if (state.pending?.type === 'sha') {
      const sourceId = state.pending.sourceId
      const targetId = state.pending.targetId
      const needed = state.pending.shanNeeded ?? 1
      const left = needed - 1
      log(state, `${p.name} 打出【閃】${needed > 1 ? `（無雙還需 ${left} 張）` : '，抵消了殺'}。`)
      if (left > 0) {
        state.pending.shanNeeded = left
        const shanCards = responseCards(p, 'shan')
        if (!shanCards.length) {
          finishShaHit(state, 1)
          return
        }
        state.prompt = {
          kind: 'respond_shan',
          message: `${p.name} 請再打出【閃】（無雙還需 ${left}）`,
          actorId: playerId,
          cardUids: shanCards.map((c) => c.uid),
          respondKinds: ['shan'],
        }
        return
      }
      if (playerSkills(p).includes('leiji')) {
        const foes = enemiesOf(state, playerId)
        ;(state as GameSnapshot & { _shaDodged?: { sourceId: number; targetId: number } })._shaDodged =
          { sourceId, targetId }
        // Preserve queue for after dodge chain
        const extras = state.pending.extraTargets
        const dmgCard = state.pending.damageCard
        const cuid = state.pending.cardUid
        ;(state as GameSnapshot & {
          _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
        })._shaQueue = {
          sourceId,
          cardUid: cuid,
          extras: extras ?? [],
          damageCard: dmgCard,
        }
        state.pending = undefined
        state.prompt = {
          kind: 'choice',
          message: '發動【雷擊】：選擇造成2點雷電傷害的目標（或不發動）',
          actorId: playerId,
          choiceKey: 'leiji',
          choices: [
            ...foes.map((fid) => ({
              id: String(fid),
              label: state.players[fid].name,
            })),
            { id: 'skip', label: '不發動' },
          ],
        }
        return
      }
      onShaDodged(state, sourceId, targetId)
      return
    }
    // AOE（萬箭齊發等）成功打出閃
    log(state, `${p.name} 打出【閃】，響應成功。`)
    resumeAfterResponse(state)
    return
  }

  if (kind === 'respond_sha') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [],
      note: '響應',
    })
    log(state, `${p.name} 打出【殺】。`)
    if (state.currentPlayer === playerId) p.shaPlayedThisTurn = true
    if (getJuedou(state)) {
      onJuedouShaPlayed(state)
      return
    }
    state.pending = undefined
    resumeAfterResponse(state)
  }
}

export function passResponse(state: GameSnapshot, playerId: number): void {
  if (state.prompt.actorId !== playerId) return
  if (state.prompt.kind === 'respond_shan') {
    if (state.pending?.type === 'sha') {
      log(state, `${state.players[playerId].name} 放棄出閃。`)
      finishShaHit(state, 1)
      return
    }
    // AOE：未出閃受傷
    const aoe = getAoeQueue(state)
    const src = aoe?.sourceId ?? state.currentPlayer
    log(state, `${state.players[playerId].name} 放棄出閃，受到傷害。`)
    dealDamage(state, playerId, 1, src, 'normal', aoe?.card)
    if (!isAwaitingZonePick(state)) resumeAfterResponse(state)
    return
  }
  if (state.prompt.kind === 'respond_sha') {
    if (getJuedou(state)) {
      log(state, `${state.players[playerId].name} 放棄出殺，決鬥失敗。`)
      finishJuedouLose(state, playerId)
      return
    }
    const aoe = getAoeQueue(state)
    const huoshou = state.players.find((p) => p.alive && playerSkills(p).includes('huoshou'))
    const src = aoe?.kind === 'nanman' && huoshou ? huoshou.id : (aoe?.sourceId ?? state.currentPlayer)
    log(state, `${state.players[playerId].name} 放棄出殺，受到傷害。`)
    dealDamage(state, playerId, 1, src, 'normal', aoe?.card)
    if (!isAwaitingZonePick(state)) resumeAfterResponse(state)
  }
}

export function finishShaHit(state: GameSnapshot, dmg: number): void {
  const pending = state.pending
  if (!pending || pending.type !== 'sha') return
  const source = state.players[pending.sourceId]
  const target = state.players[pending.targetId]
  let damage = dmg
  if (source.luoyiActive) damage++
  if (source.jiuActive) {
    damage++
    source.jiuActive = false
    log(state, `${source.name} 的【酒】使【殺】傷害+1。`)
  }
  // 古錠刀：目標無手牌時傷害+1
  if (weaponKind(source) === 'guding' && target.hand.length === 0) {
    damage++
    log(state, `${source.name} 的【古錠刀】生效，傷害+1。`)
  }

  // 寒冰劍：可改為棄置目標兩張牌（不造成傷害）
  if (weaponKind(source) === 'hanbing' && countDiscardable(target) > 0) {
    state.prompt = {
      kind: 'choice',
      message: `是否發動【寒冰劍】：棄置 ${target.name} 的牌來代替造成傷害？`,
      actorId: source.id,
      choiceKey: 'hanbing',
      choices: [
        { id: 'yes', label: '發動（棄其牌）' },
        { id: 'no', label: '照常造成傷害' },
      ],
    }
    ;(state as GameSnapshot & { _shaDamage?: number })._shaDamage = damage
    return
  }

  applyShaDamage(state, pending.sourceId, pending.targetId, damage)
}

export function applyShaDamage(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  damage: number,
): void {
  const pending = state.pending
  const extras = pending?.type === 'sha' ? pending.extraTargets ?? [] : []
  const cardUid = pending?.type === 'sha' ? pending.cardUid : ''
  const damageCard = pending?.type === 'sha' ? pending.damageCard : undefined
  const natureRaw =
    damageCard?.defId && getCardDef(damageCard.defId).damageNature
      ? getCardDef(damageCard.defId).damageNature!
      : 'normal'
  const nature =
    natureRaw === 'normal' && weaponKind(state.players[sourceId]) === 'zhuque' ? 'fire' : natureRaw
  if (nature === 'fire' && natureRaw !== 'fire') {
    log(state, `${state.players[sourceId].name} 的【朱雀羽扇】將【殺】視為火【殺】。`)
  }
  const hpBefore = state.players[targetId].hp
  const interrupted = dealDamage(state, targetId, damage, sourceId, nature, damageCard)
  if (interrupted && state.players[targetId].hp === hpBefore) return
  const pojunSource = state.players[sourceId]
  const pojunTarget = state.players[targetId]
  if (
    pojunSource.alive &&
    pojunTarget.alive &&
    playerSkills(pojunSource).includes('pojun')
  ) {
    const n = Math.min(5, Math.max(1, pojunTarget.hp), countDiscardable(pojunTarget))
    const taken: CardInstance[] = []
    for (let i = 0; i < n; i++) {
      if (pojunTarget.hand.length) {
        const c = pojunTarget.hand.shift()
        if (c) taken.push(c)
      } else {
        const slot = equipSlots().find((s) => pojunTarget.equips[s])
        if (!slot) break
        const card = pojunTarget.equips[slot]
        if (!card) break
        delete pojunTarget.equips[slot]
        if (getCardDef(card.defId).kind === 'baiyin') {
          pojunTarget.hp = Math.min(pojunTarget.maxHp, pojunTarget.hp + 1)
          log(state, `${pojunTarget.name} 失去【白銀獅子】，回覆1點體力。`)
        }
        if (playerSkills(pojunTarget).includes('xiaoji')) {
          draw(state, targetId, 2)
          log(state, `${pojunTarget.name} 發動梟姬，摸兩張牌。`)
        }
        taken.push(card)
      }
    }
    if (taken.length) {
      pojunTarget.pojunAside = [...(pojunTarget.pojunAside ?? []), ...taken]
      log(
        state,
        `${pojunSource.name} 發動【破軍】，將 ${pojunTarget.name} 的 ${taken.length} 張牌移出遊戲。`,
      )
    }
  }
  const lierenSource = state.players[sourceId]
  const lierenTarget = state.players[targetId]
  if (
    lierenSource.alive &&
    lierenTarget.alive &&
    playerSkills(lierenSource).includes('lieren') &&
    lierenSource.hand.length &&
    lierenTarget.hand.length
  ) {
    const mine = lierenSource.hand[Math.floor(Math.random() * lierenSource.hand.length)]
    const theirs = lierenTarget.hand[Math.floor(Math.random() * lierenTarget.hand.length)]
    const myRank = getCardDef(mine.defId).rank ?? 0
    const theirRank = getCardDef(theirs.defId).rank ?? 0
    if (myRank > theirRank) {
      const stolen = takeHand(state, targetId, theirs.uid)
      if (stolen) lierenSource.hand.push(stolen)
      log(state, `${lierenSource.name} 發動烈刃拼點勝利，獲得 ${lierenTarget.name} 一張手牌。`)
    } else {
      log(state, `${lierenSource.name} 發動烈刃拼點未勝。`)
    }
  }
  delete (state as GameSnapshot & { _shaDamage?: number })._shaDamage
  if (state.winnerIds) {
    state.pending = undefined
    resumeAfterResponse(state)
    return
  }
  if (isAwaitingZonePick(state)) return
  const source = state.players[sourceId]
  const target = state.players[targetId]
  if (weaponKind(source) === 'qilingong' && target.alive) {
    const horses = targetHorses(target)
    if (horses.length) {
      ;(state as GameSnapshot & {
        _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
      })._shaQueue = { sourceId, cardUid, extras, damageCard }
      state.pending = undefined
      state.prompt = {
        kind: 'choice',
        message: `是否發動【麒麟弓】棄置 ${target.name} 的坐騎？`,
        actorId: sourceId,
        choiceKey: 'qilingong',
        targetIds: [targetId],
        choices: [
          ...horses.map((slot) => ({
            id: slot,
            label: `棄置【${horseLabel(slot, target)}】`,
          })),
          { id: 'skip', label: '不發動' },
        ],
      }
      return
    }
  }
  continueShaQueue(state, sourceId, cardUid, extras, damageCard)
}

export function continueShaQueue(
  state: GameSnapshot,
  sourceId: number,
  cardUid: string,
  extras: number[],
  damageCard?: CardInstance,
): void {
  state.pending = undefined
  delete (state as GameSnapshot & {
    _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
  })._shaQueue
  if (extras.length) {
    const [next, ...rest] = extras
    if (state.players[next]?.alive) {
      state.pending = {
        type: 'sha',
        sourceId,
        targetId: next,
        cardUid,
        damageCard,
        extraTargets: rest,
      }
      const p = state.players[sourceId]
      const target = state.players[next]
      if (playerSkills(target).includes('liuli') && countDiscardable(target) > 0) {
        const redirect = legalTargets(state, sourceId, 'sha').filter(
          (x) => x !== next && x !== sourceId && canReach(state, next, x),
        )
        if (redirect.length) {
          state.prompt = {
            kind: 'choice',
            message: `【流離】：是否棄一張牌將殺轉移？`,
            actorId: next,
            choiceKey: 'liuli',
            targetIds: redirect,
            choices: [
              ...redirect.map((rid) => ({
                id: String(rid),
                label: `轉移給 ${state.players[rid].name}`,
              })),
              { id: 'skip', label: '不發動' },
            ],
          }
          return
        }
      }
      if (weaponKind(p) === 'cixiong' && oppositeGender(p, target)) {
        state.prompt = {
          kind: 'choice',
          message: `【雌雄雙股劍】：${target.name} 請選擇`,
          actorId: next,
          choiceKey: 'cixiong',
          choices: [
            { id: 'discard', label: '棄一張手牌' },
            { id: 'draw', label: '令對方摸一張牌' },
          ],
        }
        return
      }
      askShan(state, sourceId, next, cardUid)
      return
    }
    continueShaQueue(state, sourceId, cardUid, rest, damageCard)
    return
  }
  resumeAfterResponse(state)
}

/** 殺被閃抵消後：青龍／貫石斧 */
export function onShaDodged(state: GameSnapshot, sourceId: number, targetId: number): void {
  const source = state.players[sourceId]
  const wk = weaponKind(source)
  const pending = state.pending
  const extras = pending?.type === 'sha' ? pending.extraTargets ?? [] : []
  const cardUid = pending?.type === 'sha' ? pending.cardUid : ''
  const damageCard = pending?.type === 'sha' ? pending.damageCard : undefined

  if (playerSkills(source).includes('mengjin') && countDiscardable(state.players[targetId]) > 0) {
    const target = state.players[targetId]
    if (target.hand.length) {
      const card = target.hand.shift()
      if (card) discardCard(state, card)
    } else {
      const slot = equipSlots().find((s) => target.equips[s])
      if (slot) {
        const card = target.equips[slot]
        if (card) leaveEquipArea(state, targetId, slot, card)
      }
    }
    log(state, `${source.name} 發動猛進，棄置 ${target.name} 一張牌。`)
  }

  if (wk === 'qinglong') {
    const shaCards = source.hand.filter((c) => {
      const opts = getPlayKindOptions(source, c)
      return opts.includes('sha')
    })
    if (shaCards.length && canReach(state, sourceId, targetId)) {
      ;(state as GameSnapshot & {
        _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
      })._shaQueue = { sourceId, cardUid, extras, damageCard }
      state.prompt = {
        kind: 'choice',
        message: `【青龍偃月刀】：是否再出一張【殺】攻擊 ${state.players[targetId].name}？`,
        actorId: sourceId,
        choiceKey: 'qinglong',
        targetIds: [targetId],
        cardUids: shaCards.map((c) => c.uid),
        choices: [
          { id: 'yes', label: '再出一張殺' },
          { id: 'no', label: '不發動' },
        ],
      }
      return
    }
  }

  if (wk === 'guanshi' && countDiscardable(source) >= 2) {
    ;(state as GameSnapshot & {
      _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
    })._shaQueue = { sourceId, cardUid, extras, damageCard }
    state.prompt = {
      kind: 'choice',
      message: `【貫石斧】：是否棄兩張牌令此【殺】仍造成傷害？`,
      actorId: sourceId,
      choiceKey: 'guanshi',
      targetIds: [targetId],
      choices: [
        { id: 'yes', label: '棄兩張牌並造成傷害' },
        { id: 'no', label: '不發動' },
      ],
    }
    return
  }

  continueShaQueue(state, sourceId, cardUid, extras, damageCard)
}

export function pindian(state: GameSnapshot, a: number, b: number): boolean {
  const pa = state.players[a]
  const pb = state.players[b]
  const ca = pa.hand[Math.floor(Math.random() * pa.hand.length)]
  const cb = pb.hand[Math.floor(Math.random() * pb.hand.length)]
  if (!ca || !cb) return false
  takeHand(state, a, ca.uid)
  takeHand(state, b, cb.uid)
  discardCard(state, ca)
  discardCard(state, cb)
  const ar = getCardDef(ca.defId).rank ?? 0
  const br = getCardDef(cb.defId).rank ?? 0
  log(state, `${pa.name} 與 ${pb.name} 拼點：${ar} 對 ${br}。`)
  return ar > br
}

