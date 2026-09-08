/**
 * Damage, dying, save, death.
 */
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type { CardInstance, GameSnapshot, PlayerState } from './types'
import {
  attackRangeOf, canReach, cardKind, checkVictory, enemiesOf, equipSlots,
  effectiveSuit, findCard, getDistance, isRedCard, isRedFor, playerSkills, shuffle,
} from './helpers'
import { armorKind, countDiscardable, drawJudgeCard, ignoresArmor, weaponKind } from './weapons'
import { observePublicEvent } from '../ai/mind'
import {
  log, draw, discardCard, takeHand, turnSkipOf, setPlayFx, pushDamageFx, skillLabel,
  HUASHEN_POOL, pickHuashenSkill,
} from './core'
import {
  setPlayPrompt, resumeAfterResponse, continueAoe, getAoeQueue,
  leaveEquipArea, applyJudgeReplaceSync, responseCards, isAwaitingZonePick,
  beginZonePick, legalTargets, resumeAfterDamageFlow,
  applyHuashen, identityKillReward, tryJudgeReplace,
} from './game'
import { maybeTiandu } from './official'

export function dealDamage(
  state: GameSnapshot,
  targetId: number,
  amount: number,
  sourceId: number | null,
  nature: 'normal' | 'fire' | 'thunder' = 'normal',
  damageCard?: CardInstance,
): boolean {
  const t = state.players[targetId]
  if (!t.alive) return false
  const bypass = (state as GameSnapshot & { _tianxiangBypass?: number })._tianxiangBypass
  if (bypass !== targetId && playerSkills(t).includes('tianxiang')) {
    const heart = t.hand.find((c) => effectiveSuit(c, t) === 'heart')
    const others = state.players.filter((p) => p.alive && p.id !== targetId)
    if (heart && others.length) {
      ;(state as GameSnapshot & {
        _tianxiang?: {
          targetId: number
          amount: number
          sourceId: number | null
          nature: 'normal' | 'fire' | 'thunder'
          damageCard?: CardInstance
          heartUid: string
        }
      })._tianxiang = { targetId, amount, sourceId, nature, damageCard, heartUid: heart.uid }
      state.prompt = {
        kind: 'choice',
        message: '【天香】棄一張紅桃手牌，將傷害轉移給另一名角色？',
        actorId: targetId,
        choiceKey: 'tianxiang',
        choices: [
          ...others.map((p) => ({ id: String(p.id), label: `轉移給 ${p.name}` })),
          { id: 'skip', label: '不發動' },
        ],
      }
      return true
    }
  }
  delete (state as GameSnapshot & { _tianxiangBypass?: number })._tianxiangBypass
  const source = sourceId !== null ? state.players[sourceId] : null
  const ignoreArm = source ? ignoresArmor(source) : false

  // 白銀獅子：傷害至多為1
  if (!ignoreArm && armorKind(t) === 'baiyin' && amount > 1) {
    log(state, `${t.name} 的【白銀獅子】將傷害降至1點。`)
    amount = 1
  }
  // 藤甲：火焰傷害+1
  if (!ignoreArm && armorKind(t) === 'tengjia' && nature === 'fire') {
    amount++
    log(state, `${t.name} 的【藤甲】使火焰傷害+1。`)
  }

  t.hp -= amount
  pushDamageFx(state, targetId, amount)
  const natureLabel = nature === 'fire' ? '火焰' : nature === 'thunder' ? '雷電' : ''
  log(state, `${t.name} 受到 ${amount} 點${natureLabel}傷害（體力 ${Math.max(t.hp, 0)}）。`)

  if ((nature === 'fire' || nature === 'thunder') && t.chained) {
    t.chained = false
    const chained = state.players.filter((p) => p.alive && p.id !== targetId && p.chained)
    for (const other of chained) {
      other.chained = false
      log(state, `鐵索連環傳導至 ${other.name}。`)
      dealDamage(state, other.id, amount, sourceId, nature, damageCard)
    }
  }

  if (sourceId !== null && amount > 0) {
    observePublicEvent(state, {
      type: 'damage',
      sourceId,
      targetId,
      amount,
    })
  }

  // After-damage skills that still apply while dying (e.g. 遺計 can draw 桃 before save)
  if (t.generalId) {
    const afterSkills = playerSkills(t)
    // 遺計：每受到1點傷害後摸兩張牌
    if (afterSkills.includes('yiji') && amount > 0) {
      const n = amount * 2
      draw(state, targetId, n)
      log(state, `${t.name} 發動遺計，摸 ${n} 張牌。`)
    }
    if (afterSkills.includes('fangzhu') && amount > 0) {
      const others = state.players.filter((p) => p.alive && p.id !== targetId)
      if (others.length) {
        const lost = Math.max(1, t.maxHp - Math.max(t.hp, 0))
        ;(state as GameSnapshot & {
          _fangzhu?: { actorId: number; lost: number }
        })._fangzhu = { actorId: targetId, lost }
      }
    }
    if (afterSkills.includes('xinsheng') && amount > 0) {
      applyHuashen(state, t)
    }
  }

  // 狂骨：來源對距離1目標造成傷害後回1體力
  if (source && sourceId !== null && amount > 0 && source.generalId) {
    if (playerSkills(source).includes('kuanggu')) {
      if (getDistance(state, sourceId, targetId) <= 1 && source.hp < source.maxHp) {
        source.hp += 1
        log(state, `${source.name} 發動狂骨，回復1點體力。`)
      }
    }
  }

  if (amount > 0 && damageCard && cardKind(damageCard) === 'sha') {
    const caiwenji = state.players.find(
      (p) => p.alive && p.hand.length > 0 && playerSkills(p).includes('beige'),
    )
    if (caiwenji) {
      ;(state as GameSnapshot & {
        _beige?: { actorId: number; sourceId: number | null; targetId: number }
      })._beige = { actorId: caiwenji.id, sourceId, targetId }
    }
  }

  if (t.hp <= 0) {
    ;(state as GameSnapshot & {
      _pendingDying?: { targetId: number; killerId: number | null }
    })._pendingDying = { targetId, killerId: sourceId }
  }

  if (
    amount > 0 &&
    sourceId !== null &&
    source?.alive &&
    playerSkills(t).includes('enyuan')
  ) {
    ;(state as GameSnapshot & {
      _enyuan?: { victimId: number; sourceId: number }
    })._enyuan = { victimId: targetId, sourceId }
    state.prompt = {
      kind: 'choice',
      message: '【恩怨】交給法正一張手牌，否則失去1點體力',
      actorId: sourceId,
      choiceKey: 'enyuan',
      choices: [
        ...source.hand.map((card) => ({
          id: card.uid,
          label: `交出【${getCardDef(card.defId).name}】`,
        })),
        { id: 'lose_hp', label: '失去1點體力' },
      ],
    }
    return true
  }

  if (t.alive) {
    const skills = playerSkills(t)
    // 節命：令一名角色摸已損失體力數（至少1）
    if (skills.includes('jieming') && amount > 0) {
      const alive = state.players.filter((x) => x.alive)
      state.prompt = {
        kind: 'choice',
        message: `【節命】${t.name}：選擇一名角色摸牌`,
        actorId: targetId,
        choiceKey: 'jieming',
        choices: alive.map((x) => {
          const n = Math.max(1, x.maxHp - Math.max(x.hp, 0))
          return { id: String(x.id), label: `${x.name}（摸${n}）` }
        }),
      }
      return true
    }
    // 奸雄：可選擇獲得造成傷害的牌（可拒絕）
    if (skills.includes('jianxiong') && sourceId !== null) {
      const canTake =
        !!damageCard && state.discard.some((c) => c.uid === damageCard.uid)
      if (canTake && damageCard) {
        const cname = getCardDef(damageCard.defId).name
        state.prompt = {
          kind: 'choice',
          message: `【奸雄】是否獲得造成傷害的【${cname}】？`,
          actorId: targetId,
          choiceKey: 'jianxiong',
          cardUids: [damageCard.uid],
          choices: [
            { id: 'take', label: `獲得【${cname}】` },
            { id: 'skip', label: '不發動' },
          ],
        }
        return true
      }
    }
    // 反饋：選擇獲得傷害來源一張牌
    if (skills.includes('fankui') && sourceId !== null && source && countDiscardable(source) > 0) {
      beginZonePick(state, {
        actorId: targetId,
        ownerId: sourceId,
        count: 1,
        skillId: 'fankui',
        mode: 'steal',
        message: `【反饋】選擇獲得 ${source.name} 的一張牌`,
      })
      return true
    }
    // 剛烈：判定，非紅桃則來源棄兩張或受1傷（鬼才／鬼道可替換）
    if (skills.includes('ganglie') && sourceId !== null && source) {
      const judged = drawJudgeCard(state, shuffle)
      if (judged) {
        const replaced = tryJudgeReplace(state, judged, 'nonheart', targetId, {
          kind: 'ganglie',
          targetId,
          sourceId,
        })
        if (!replaced) return true
        return finishGanglie(state, targetId, sourceId, replaced)
      }
    }
  }

  // 耀武：受到紅色【殺】傷害時，來源回1或摸1（華雄瀕死/陣亡仍觸發）
  if (
    amount > 0 &&
    source &&
    sourceId !== null &&
    damageCard &&
    t.generalId &&
    playerSkills(t).includes('yaowu') &&
    cardKind(damageCard) === 'sha' &&
    isRedCard(damageCard)
  ) {
    log(state, `${t.name} 的【耀武】發動。`)
    state.prompt = {
      kind: 'choice',
      message: `【耀武】${source.name}：因擊中 ${t.name}，請選擇`,
      actorId: sourceId,
      choiceKey: 'yaowu',
      choices: [
        { id: 'recover', label: '回覆1點體力' },
        { id: 'draw', label: '摸一張牌' },
      ],
    }
    return true
  }

  const fangzhu = (state as GameSnapshot & { _fangzhu?: { actorId: number; lost: number } })._fangzhu
  if (fangzhu) {
    const others = state.players.filter((p) => p.alive && p.id !== fangzhu.actorId)
    if (others.length) {
      state.prompt = {
        kind: 'choice',
        message: `【放逐】選擇一名角色摸 ${fangzhu.lost} 張並將其武將牌翻面`,
        actorId: fangzhu.actorId,
        choiceKey: 'fangzhu_target',
        choices: others.map((p) => ({ id: String(p.id), label: p.name })),
      }
      return true
    }
    delete (state as GameSnapshot & { _fangzhu?: unknown })._fangzhu
  }

  const beige = (state as GameSnapshot & {
    _beige?: { actorId: number; sourceId: number | null; targetId: number }
  })._beige
  if (beige) {
    delete (state as GameSnapshot & { _beige?: unknown })._beige
    const actor = state.players[beige.actorId]
    if (actor?.alive && actor.hand.length) {
      state.prompt = {
        kind: 'choice',
        message: `【悲歌】是否棄一張牌判定，改變此次【殺】的後果？`,
        actorId: actor.id,
        choiceKey: 'beige',
        choices: [
          { id: 'yes', label: '發動悲歌' },
          { id: 'skip', label: '不發動' },
        ],
      }
      return true
    }
  }

  if (startDyingIfPending(state)) return true

  checkVictory(state)
  return false
}

/** 剛烈判定結算（鬼才／鬼道替換後）。 */
export function finishGanglie(
  state: GameSnapshot,
  targetId: number,
  sourceId: number,
  judged: CardInstance,
): boolean {
  const t = state.players[targetId]
  const source = state.players[sourceId]
  discardCard(state, judged)
  const jdef = getCardDef(judged.defId)
  const heart = effectiveSuit(judged, t) === 'heart'
  log(state, `${t.name} 剛烈判定：${jdef.name}${heart ? '（紅桃，無效）' : '（非紅桃）'}`)
  maybeTiandu(state, t, judged, false)
  if (heart || !source?.alive) return false
  if (countDiscardable(source) >= 2) {
    state.prompt = {
      kind: 'choice',
      message: `【剛烈】${source.name} 請選擇：棄兩張牌或受到1點傷害`,
      actorId: sourceId,
      choiceKey: 'ganglie',
      targetIds: [sourceId],
      choices: [
        { id: 'discard', label: '棄兩張牌' },
        { id: 'damage', label: '受到1點傷害' },
      ],
    }
    return true
  }
  const nested = dealDamage(state, sourceId, 1, targetId)
  log(state, `${t.name} 剛烈對 ${source.name} 造成傷害！`)
  return nested
}

/** Exposed for skill regression tests */
export function debugDealDamage(
  state: GameSnapshot,
  targetId: number,
  amount: number,
  sourceId: number | null,
  nature: 'normal' | 'fire' | 'thunder' = 'normal',
  damageCard?: CardInstance,
): boolean {
  return dealDamage(state, targetId, amount, sourceId, nature, damageCard)
}

export function trySave(state: GameSnapshot, targetId: number, killerId: number | null = null): void {
  ;(state as GameSnapshot & {
    _pendingDying?: { targetId: number; killerId: number | null }
  })._pendingDying = { targetId, killerId }
  startDyingIfPending(state)
}

export type DyingState = {
  targetId: number
  killerId: number | null
  /** Next seat to consider */
  cursor: number
  /** Seat where this ask round started */
  startSeat: number
  /** Seats examined in the current ask round */
  checked: number
  /** Someone used 桃 this round */
  savedThisRound: boolean
  buyiAsked?: number[]
}

export function getDying(state: GameSnapshot): DyingState | undefined {
  return (state as GameSnapshot & { _dying?: DyingState })._dying
}

export function clearDying(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _dying?: DyingState })._dying
}

export function getPendingDying(
  state: GameSnapshot,
): { targetId: number; killerId: number | null } | undefined {
  return (state as GameSnapshot & {
    _pendingDying?: { targetId: number; killerId: number | null }
  })._pendingDying
}

export function clearPendingDying(state: GameSnapshot): void {
  delete (state as GameSnapshot & {
    _pendingDying?: { targetId: number; killerId: number | null }
  })._pendingDying
}

/** Cards that can save in dying: 【桃】、急救、或自己的【酒】. */
export function saveCardsFor(state: GameSnapshot, p: PlayerState, dyingId: number): CardInstance[] {
  const cards = responseCards(p, 'tao').filter((c) => {
    if (cardKind(c) === 'tao') return true
    const viaGuhuo = playerSkills(p).includes('guhuo') && !p.guhuoUsed
    const viaJijiu =
      playerSkills(p).includes('jijiu') && isRedFor(p, c) && state.currentPlayer !== p.id
    return viaGuhuo || viaJijiu
  })
  if (p.id === dyingId) {
    for (const c of p.hand) {
      if (cardKind(c) === 'jiu' && !cards.some((x) => x.uid === c.uid)) cards.push(c)
    }
  }
  return cards
}

/**
 * If someone is pending 瀕死 and not already in a save window, start asking for 桃.
 * @returns true if a dying window is now active
 */
export function startDyingIfPending(state: GameSnapshot): boolean {
  if (getDying(state)) return true
  const pd = getPendingDying(state)
  if (!pd) return false
  const t = state.players[pd.targetId]
  if (!t?.alive || t.hp > 0) {
    clearPendingDying(state)
    return false
  }
  clearPendingDying(state)
  beginDying(state, pd.targetId, pd.killerId)
  return true
}

export function beginDying(
  state: GameSnapshot,
  targetId: number,
  killerId: number | null,
): void {
  const t = state.players[targetId]
  const start = state.currentPlayer
  log(state, `${t.name} 進入瀕死狀態（體力 ${t.hp}）！請出【桃】急救。`)
  ;(state as GameSnapshot & { _dying?: DyingState })._dying = {
    targetId,
    killerId,
    cursor: start,
    startSeat: start,
    checked: 0,
    savedThisRound: false,
  }
  continueDyingAsk(state)
}

export function continueDyingAsk(state: GameSnapshot): void {
  const d = getDying(state)
  if (!d) return
  const t = state.players[d.targetId]
  if (!t || !t.alive) {
    clearDying(state)
    resumeAfterDamageFlow(state)
    return
  }
  if (t.hp > 0) {
    log(state, `${t.name} 脫離瀕死（體力 ${t.hp}）。`)
    clearDying(state)
    resumeAfterDamageFlow(state)
    return
  }

  const buyiHolder = state.players.find(
    (p) =>
      p.alive &&
      playerSkills(p).includes('buyi') &&
      !(d.buyiAsked ?? []).includes(p.id),
  )
  if (buyiHolder) {
    d.buyiAsked = [...(d.buyiAsked ?? []), buyiHolder.id]
    if (t.hand.length) {
      state.prompt = {
        kind: 'choice',
        message: `【補益】是否展示 ${t.name} 的一張手牌？`,
        actorId: buyiHolder.id,
        choiceKey: 'buyi',
        targetIds: [t.id],
        choices: [
          { id: 'yes', label: '發動補益' },
          { id: 'no', label: '不發動' },
        ],
      }
      return
    }
  }

  const n = state.players.length
  const wansha = playerSkills(state.players[state.currentPlayer]).includes('wansha')
  // Full round with no peach → death (after optional 不屈)
  while (d.checked < n) {
    const seat = d.cursor
    d.cursor = (d.cursor + 1) % n
    d.checked++
    const p = state.players[seat]
    if (!p.alive) continue
    if (wansha && seat !== state.currentPlayer) continue
    const cards = saveCardsFor(state, p, d.targetId)
    if (!cards.length) continue

    const need = 1 - t.hp
    const victimGen = t.generalId ? getGeneral(t.generalId).name : t.name
    state.prompt = {
      kind: 'choice',
      message: `【瀕死】${t.name}（${victimGen}）體力 ${t.hp}，尚需 ${need} 張【桃】。${p.name} 是否急救？`,
      actorId: seat,
      choiceKey: 'dying_save',
      cardUids: cards.map((c) => c.uid),
      targetIds: [d.targetId],
      choices: [
        ...cards.map((c) => {
          const def = getCardDef(c.defId)
          const asJiu = cardKind(c) === 'jiu'
          const asJijiu =
            !asJiu &&
            cardKind(c) !== 'tao' &&
            playerSkills(p).includes('jijiu') &&
            isRedFor(p, c) &&
            state.currentPlayer !== p.id
          const asGuhuo = !asJiu && cardKind(c) !== 'tao' && !asJijiu
          return {
            id: c.uid,
            label: asJiu
              ? `使用【酒】回覆自己`
              : asJijiu
                ? `急救：【${def.name}】當桃`
                : asGuhuo
                  ? `蠱惑：【${def.name}】當桃`
                  : `使用【${def.name}】`,
          }
        }),
        { id: 'skip', label: '不救' },
      ],
    }
    return
  }

  if (d.savedThisRound) {
    // Need more peaches — another ask round from current turn seat
    d.cursor = d.startSeat
    d.checked = 0
    d.savedThisRound = false
    continueDyingAsk(state)
    return
  }

  // Nobody saved this round
  tryBuquThenDeath(state, d.targetId, d.killerId)
}

export function tryBuquThenDeath(
  state: GameSnapshot,
  targetId: number,
  killerId: number | null,
): void {
  const t = state.players[targetId]
  clearDying(state)
  if (!t || !t.alive || t.hp > 0) {
    resumeAfterDamageFlow(state)
    return
  }
  // 不屈（簡化）：瀕死摸一張，若仍有手牌則回至1體力
  if (playerSkills(t).includes('niepan') && !t.niepanUsed) {
    t.hand.forEach((c) => discardCard(state, c))
    t.hand = []
    for (const slot of equipSlots()) {
      const card = t.equips[slot]
      if (card) leaveEquipArea(state, targetId, slot, card)
    }
    for (const card of t.judges) discardCard(state, card)
    t.judges = []
    t.hp = Math.min(3, t.maxHp)
    t.chained = false
    t.niepanUsed = true
    draw(state, targetId, 3)
    log(state, `${t.name} 發動涅槃，棄置所有牌，回覆至 ${t.hp} 點體力並摸三張。`)
    resumeAfterDamageFlow(state)
    return
  }
  if (playerSkills(t).includes('buqu')) {
    const n = Math.max(1, 1 - t.hp)
    t.buquCards = t.buquCards ?? []
    let dup = false
    for (let i = 0; i < n; i++) {
      if (state.deck.length === 0 && state.discard.length) {
        state.deck = shuffle(state.discard)
        state.discard = []
      }
      const c = state.deck.pop()
      if (!c) break
      const rank = getCardDef(c.defId).rank
      if (t.buquCards.some((x) => getCardDef(x.defId).rank === rank)) dup = true
      t.buquCards.push(c)
      log(
        state,
        `${t.name} 發動不屈，將【${getCardDef(c.defId).name}】置為「創」（共 ${t.buquCards.length} 張）。`,
      )
    }
    if (!dup && t.buquCards.length) {
      t.hp = 0
      log(state, `${t.name} 的「創」點數均不同，不死亡（體力 0，手牌上限為創數）。`)
      resumeAfterDamageFlow(state)
      return
    }
    log(state, `${t.name} 的「創」出現相同點數，不屈失敗。`)
  }
  if (!finalizeDeath(state, targetId, killerId)) return
  resumeAfterDamageFlow(state)
}

export function finalizeDeath(
  state: GameSnapshot,
  targetId: number,
  killerId: number | null,
): boolean {
  const t = state.players[targetId]
  if (!t || !t.alive) return true
  if (t.hp > 0) return true

  const xing = state.players.find(
    (p) => p.alive && p.id !== targetId && playerSkills(p).includes('xingshang'),
  )
  const extra = state as GameSnapshot & {
    _xingshangDone?: number
    _xingshangPending?: { targetId: number; killerId: number | null }
  }
  const loot: CardInstance[] = [
    ...t.hand,
    ...equipSlots()
      .map((s) => t.equips[s])
      .filter((c): c is CardInstance => !!c),
    ...(t.judges ?? []),
    ...(t.niCards ?? []),
    ...(t.buquCards ?? []),
    ...(t.tianCards ?? []),
  ]
  if (xing && loot.length && extra._xingshangDone !== targetId) {
    if (xing.isHuman) {
      extra._xingshangPending = { targetId, killerId }
      state.prompt = {
        kind: 'choice',
        message: `【行殤】是否獲得 ${t.name} 的所有牌（${loot.length} 張）？`,
        actorId: xing.id,
        choiceKey: 'xingshang',
        choices: [
          { id: 'take', label: '獲得其所有牌' },
          { id: 'skip', label: '不發動' },
        ],
      }
      return false
    }
    takeDeathLoot(state, xing, t)
    extra._xingshangDone = targetId
  }
  delete extra._xingshangPending

  t.hand.forEach((c) => discardCard(state, c))
  t.hand = []
  t.niCards?.forEach((c) => discardCard(state, c))
  t.niCards = []
  t.buquCards?.forEach((c) => discardCard(state, c))
  t.buquCards = []
  t.tianCards?.forEach((c) => discardCard(state, c))
  t.tianCards = []
  for (const slot of equipSlots()) {
    const e = t.equips[slot]
    if (e) leaveEquipArea(state, targetId, slot, e)
  }
  if (t.judges?.length) {
    for (const j of t.judges) discardCard(state, j)
    t.judges = []
  }
  if (t.hp > 0) {
    log(state, `${t.name} 因失去裝備回覆體力，脫離瀕死（體力 ${t.hp}）。`)
    return true
  }
  t.alive = false
  const seatLabel = (p: PlayerState) => {
    if (p.isHuman) return p.generalId ? getGeneral(p.generalId).name : p.name
    const generic = !p.name || p.name === '友軍' || p.name === '敵軍' || p.name.startsWith('電腦')
    if (!generic) return p.name
    return p.generalId ? getGeneral(p.generalId).name : p.name
  }
  const victimName = seatLabel(t)
  const killer =
    killerId !== null && state.players[killerId] ? state.players[killerId] : null
  const killerName = killer ? seatLabel(killer) : null
  if (killer && playerSkills(t).includes('duanchang')) {
    killer.skillsDisabled = true
    killer.extraSkills = []
    log(state, `${t.name} 發動斷腸，${killer.name} 失去所有武將技能。`)
  }
  state.killLog.push({
    victimId: targetId,
    victimName,
    killerId: killer?.id ?? null,
    killerName,
  })
  observePublicEvent(state, { type: 'death', playerId: targetId })
  if (killerName) {
    log(state, `${victimName} 陣亡，為 ${killerName} 所殺。`)
  } else {
    log(state, `${victimName} 陣亡。`)
  }
  identityKillReward(state, t, killer)
  return true
}

export function takeDeathLoot(state: GameSnapshot, getter: PlayerState, victim: PlayerState): void {
  const move = (c: CardInstance) => {
    getter.hand.push(c)
  }
  for (const c of victim.hand) move(c)
  victim.hand = []
  for (const slot of equipSlots()) {
    const e = victim.equips[slot]
    if (!e) continue
    delete victim.equips[slot]
    if (getCardDef(e.defId).kind === 'baiyin' && victim.alive) {
      victim.hp = Math.min(victim.maxHp, victim.hp + 1)
    }
    move(e)
  }
  for (const c of victim.judges ?? []) move(c)
  victim.judges = []
  for (const c of victim.niCards ?? []) move(c)
  victim.niCards = []
  for (const c of victim.buquCards ?? []) move(c)
  victim.buquCards = []
  for (const c of victim.tianCards ?? []) move(c)
  victim.tianCards = []
  log(state, `${getter.name} 發動行殤，獲得 ${victim.name} 的所有牌。`)
}

