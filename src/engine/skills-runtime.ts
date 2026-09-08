/**
 * Active skill activation and multi-step skill card picks.
 */
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type { CardInstance, GameSnapshot, PlayerState } from './types'
import {
  attackRangeOf, canReach, cardKind, checkVictory, enemiesOf, equipSlots,
  findCard, getDistance, playerSkills, shuffle, withinDistanceOne,
} from './helpers'
import {
  armorKind, countDiscardable, mayUseSha, weaponKind,
} from './weapons'
import {
  log, draw, discardCard, takeHand, turnSkipOf, setPlayFx, pushDamageFx, skillLabel,
} from './core'
import {
  setPlayPrompt, legalTargets, askShan, pindian, dealDamage, trySave,
  getDying, isAwaitingZonePick, beginZonePick, continueLuanwu,
  finishTargetedCard, leaveEquipArea,
} from './game'

export function activateSkill(state: GameSnapshot, playerId: number, skillId: string): void {
  if (state.winnerIds) return
  if (state.prompt.kind !== 'choose_card' || state.prompt.actorId !== playerId) return
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return
  const p = state.players[playerId]

  if (skillId === 'ganlu') {
    if (p.ganluUsed) return
    const wounded = p.maxHp - p.hp
    const targets = state.players.filter((a) => {
      if (!a.alive) return false
      const ac = Object.values(a.equips).filter(Boolean).length
      return state.players.some((b) => {
        if (!b.alive || b.id === a.id) return false
        const bc = Object.values(b.equips).filter(Boolean).length
        return Math.abs(ac - bc) <= wounded
      })
    })
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【甘露】選擇第一名角色',
      actorId: playerId,
      choiceKey: 'ganlu_first',
      choices: targets.map((x) => ({ id: String(x.id), label: x.name })),
    }
    return
  }

  if (skillId === 'xiansi') {
    if ((p.niCards?.length ?? 0) < 2 || !mayUseSha(p)) return
    const targets = enemiesOf(state, playerId)
      .map((id) => state.players[id])
      .filter((t) => t && canReach(state, playerId, t.id))
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【陷嗣】選擇【殺】的目標',
      actorId: playerId,
      choiceKey: 'xiansi_target',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'kurou') {
    if (p.hp <= 0) return
    p.hp -= 1
    pushDamageFx(state, playerId, 1)
    log(state, `${p.name} 發動【苦肉】，失去1點體力。`)
    draw(state, playerId, 2)
    log(state, `${p.name} 摸兩張牌。`)
    if (p.hp <= 0) {
      trySave(state, playerId, playerId)
      if (getDying(state) || isAwaitingZonePick(state)) return
    }
    checkVictory(state)
    if (!state.winnerIds && p.alive) setPlayPrompt(state)
    return
  }

  if (skillId === 'zhiheng') {
    if (p.zhihengUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【制衡】選擇要棄置的手牌，然後確認',
      actorId: playerId,
      skillId: 'zhiheng',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: p.hand.length,
      choices: [{ id: 'confirm', label: '確認制衡' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'rende') {
    if (!p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【仁德】選擇要交出的手牌，然後確認',
      actorId: playerId,
      skillId: 'rende',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: p.hand.length,
      choices: [{ id: 'confirm', label: '選擇目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'qiangxi') {
    if (p.qiangxiUsed) return
    const range = attackRangeOf(p)
    const foes = enemiesOf(state, playerId)
      .map((id) => state.players[id])
      .filter((t) => t && getDistance(state, playerId, t.id) <= range)
    if (!foes.length) return
    const weaponChoices: { id: string; label: string }[] = []
    if (p.equips.weapon) {
      weaponChoices.push({
        id: `equip:weapon`,
        label: `棄置裝備【${getCardDef(p.equips.weapon.defId).name}】`,
      })
    }
    for (const c of p.hand) {
      if (getCardDef(c.defId).slot === 'weapon') {
        weaponChoices.push({
          id: `hand:${c.uid}`,
          label: `棄置手牌【${getCardDef(c.defId).name}】`,
        })
      }
    }
    state.prompt = {
      kind: 'choice',
      message: '【強襲】選擇代價',
      actorId: playerId,
      choiceKey: 'qiangxi_cost',
      targetIds: foes.map((t) => t.id),
      choices: [
        ...(p.hp > 0 ? [{ id: 'hp', label: '失去1點體力' }] : []),
        ...weaponChoices,
      ],
    }
    return
  }

  if (skillId === 'qingnang') {
    if (p.qingnangUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【青囊】選擇一張手牌棄置',
      actorId: playerId,
      skillId: 'qingnang',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '選擇回覆目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'jieyin') {
    if (p.jieyinUsed || p.hand.length < 2) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【結姻】選擇兩張手牌棄置',
      actorId: playerId,
      skillId: 'jieyin',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 2,
      maxTargets: 2,
      choices: [{ id: 'confirm', label: '選擇男性目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'lijian') {
    if (p.lijianUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【離間】選擇一張手牌棄置',
      actorId: playerId,
      skillId: 'lijian',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '選擇兩名男性' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'fanjian') {
    if (p.fanjianUsed || !p.hand.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【反間】選擇要交出的一張手牌',
      actorId: playerId,
      skillId: 'fanjian',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '選擇目標' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'guhuo' || skillId === 'zhijian') {
    if (skillId === 'guhuo' && (p.guhuoUsed || !p.hand.length)) return
    const cards =
      skillId === 'zhijian'
        ? p.hand.filter((c) => getCardDef(c.defId).type === 'equip')
        : p.hand
    if (!cards.length) return
    state.prompt = {
      kind: 'skill_cards',
      message: `【${skillId === 'guhuo' ? '蠱惑' : '直諫'}】選擇一張手牌`,
      actorId: playerId,
      skillId,
      cardUids: cards.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 1,
      maxTargets: 1,
      choices: [{ id: 'confirm', label: '確認' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'tianyi' || skillId === 'quhu' || skillId === 'zhiba') {
    const enemySet = new Set(enemiesOf(state, playerId))
    const targets = state.players.filter((t) => {
      if (!t.alive || t.id === playerId || !t.hand.length) return false
      if (!enemySet.has(t.id)) return false
      if (skillId === 'quhu') return t.hp > p.hp
      if (skillId === 'zhiba') return !(p.zhibaUsedOn ?? []).includes(t.id)
      return true
    })
    if (!p.hand.length || !targets.length) return
    state.prompt = {
      kind: 'choice',
      message: `【${skillId === 'tianyi' ? '天義' : skillId === 'quhu' ? '驅虎' : '制霸'}】選擇拼點目標`,
      actorId: playerId,
      choiceKey: `${skillId}_target`,
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'tiaoxin') {
    const targets = enemiesOf(state, playerId)
      .map((id) => state.players[id])
      .filter((t) => t && canReach(state, playerId, t.id))
    if (!targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【挑釁】選擇目標',
      actorId: playerId,
      choiceKey: 'tiaoxin_target',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'dimeng') {
    const targets = state.players.filter((t) => t.alive && t.id !== playerId)
    if (targets.length < 2) return
    state.prompt = {
      kind: 'choice',
      message: '【締盟】選擇第一名角色',
      actorId: playerId,
      choiceKey: 'dimeng_first',
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'luanwu') {
    if (p.luanwuUsed) return
    p.luanwuUsed = true
    log(state, `${p.name} 發動限定技【亂武】。`)
    const queue = state.players
      .filter((t) => t.alive && t.id !== playerId)
      .map((t) => t.id)
    ;(state as GameSnapshot & { _luanwu?: { sourceId: number; queue: number[] } })._luanwu = {
      sourceId: playerId,
      queue,
    }
    continueLuanwu(state)
    return
  }

  if (skillId === 'jijiang') {
    const foes = enemiesOf(state, playerId).filter((tid) => canReach(state, playerId, tid))
    if (!foes.length) return
    state.prompt = {
      kind: 'choice',
      message: '【激將】選擇【殺】的目標',
      actorId: playerId,
      choiceKey: 'jijiang_target',
      choices: foes.map((id) => ({ id: String(id), label: state.players[id].name })),
    }
    return
  }

  if (skillId === 'huangtian') {
    const zj = state.players.find((x) => x.alive && playerSkills(x).includes('huangtian'))
    const gift = p.hand.filter((c) => {
      const k = getCardDef(c.defId).kind
      return k === 'shan' || k === 'shandian'
    })
    if (!zj || !gift.length || p.huangtianUsed) return
    state.prompt = {
      kind: 'choice',
      message: `【黃天】交給 ${zj.name} 一張【閃】或【閃電】`,
      actorId: playerId,
      choiceKey: 'huangtian_give',
      cardUids: gift.map((c) => c.uid),
      choices: gift.map((c) => ({ id: c.uid, label: `交給【${getCardDef(c.defId).name}】` })),
    }
    return
  }

  if (skillId === 'jixi') {
    const targets = legalTargets(state, playerId, 'shunshou')
    const fields = (p.tianCount ?? 0) + (p.tianCards?.length ?? 0)
    if (!fields || !targets.length) return
    state.prompt = {
      kind: 'choice',
      message: '【急襲】選擇順手牽羊的目標',
      actorId: playerId,
      choiceKey: 'jixi_target',
      choices: targets.map((id) => ({ id: String(id), label: state.players[id].name })),
    }
    return
  }

  if (skillId === 'zhangba') {
    if (weaponKind(p) !== 'zhangba' || p.hand.length < 2 || !mayUseSha(p)) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【丈八蛇矛】選擇兩張手牌當【殺】使用',
      actorId: playerId,
      skillId: 'zhangba',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 2,
      maxTargets: 2,
      choices: [{ id: 'confirm', label: '選擇殺的目標' }],
      choiceKey: 'skill_confirm',
    }
  }
}

export function handleSkillCardPick(state: GameSnapshot, _playerId: number, uid: string): void {
  if (state.prompt.kind !== 'skill_cards') return
  const allowed = state.prompt.cardUids ?? []
  if (!allowed.includes(uid)) return
  const selected = [...(state.prompt.selectedCardUids ?? [])]
  const idx = selected.indexOf(uid)
  if (idx >= 0) selected.splice(idx, 1)
  else {
    const max = state.prompt.maxTargets ?? 99
    if (selected.length >= max) return
    selected.push(uid)
  }
  const min = state.prompt.minTargets ?? 1
  state.prompt = {
    ...state.prompt,
    selectedCardUids: selected,
    message: `${state.prompt.message.split('（')[0]}（已選 ${selected.length} 張${selected.length >= min ? '，可確認' : ''}）`,
  }
}

export function confirmSkillCards(state: GameSnapshot, playerId: number): void {
  const prompt = state.prompt
  if (prompt.kind !== 'skill_cards') return
  const skillId = prompt.skillId
  const selected = prompt.selectedCardUids ?? []
  const min = prompt.minTargets ?? 1
  if (!skillId || selected.length < min) return
  const p = state.players[playerId]

  if (skillId === 'guhuo') {
    state.prompt = {
      kind: 'choice',
      message: '【蠱惑】選擇此牌視為的牌名',
      actorId: playerId,
      choiceKey: 'guhuo_as',
      selectedCardUids: selected,
      choices: [
        { id: 'sha', label: '殺' },
        { id: 'shan', label: '閃' },
        { id: 'tao', label: '桃' },
        { id: 'wuzhong', label: '無中生有' },
      ],
    }
    return
  }

  if (skillId === 'zhijian') {
    const targets = state.players.filter((t) => t.alive && t.id !== playerId)
    state.prompt = {
      kind: 'choice',
      message: '【直諫】選擇獲得裝備的角色',
      actorId: playerId,
      choiceKey: 'zhijian_target',
      selectedCardUids: selected,
      choices: targets.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'zhiheng') {
    for (const uid of selected) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    draw(state, playerId, selected.length)
    p.zhihengUsed = true
    log(state, `${p.name} 發動【制衡】，棄 ${selected.length} 張並摸 ${selected.length} 張。`)
    setPlayPrompt(state)
    return
  }

  if (skillId === 'rende') {
    const others = state.players.filter((o) => o.alive && o.id !== playerId)
    if (!others.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【仁德】選擇交給牌的角色',
      actorId: playerId,
      choiceKey: 'rende_target',
      selectedCardUids: selected,
      choices: others.map((o) => ({ id: String(o.id), label: o.name })),
    }
    return
  }

  if (skillId === 'zhangba') {
    if (selected.length !== 2 || !mayUseSha(p)) {
      setPlayPrompt(state)
      return
    }
    const targets = legalTargets(state, playerId, 'sha')
    if (!targets.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【丈八蛇矛】選擇【殺】的目標',
      actorId: playerId,
      choiceKey: 'zhangba_target',
      selectedCardUids: selected,
      choices: targets.map((tid) => ({
        id: String(tid),
        label: state.players[tid].name,
      })),
    }
    return
  }

  if (skillId === 'qingnang') {
    const wounded = state.players.filter((t) => t.alive && t.hp < t.maxHp)
    if (!wounded.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【青囊】選擇回覆體力的角色',
      actorId: playerId,
      choiceKey: 'qingnang_target',
      selectedCardUids: selected,
      choices: wounded.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'jieyin') {
    const males = state.players.filter(
      (t) => t.alive && t.generalId && getGeneral(t.generalId).gender === 'male',
    )
    if (!males.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【結姻】選擇一名男性角色',
      actorId: playerId,
      choiceKey: 'jieyin_target',
      selectedCardUids: selected,
      choices: males.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'lijian') {
    const males = state.players.filter(
      (t) =>
        t.alive &&
        t.id !== playerId &&
        t.generalId &&
        getGeneral(t.generalId).gender === 'male',
    )
    if (males.length < 2) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【離間】選擇先出【殺】的男性（決鬥發起方）',
      actorId: playerId,
      choiceKey: 'lijian_first',
      selectedCardUids: selected,
      choices: males.map((t) => ({ id: String(t.id), label: t.name })),
    }
    return
  }

  if (skillId === 'fanjian') {
    const others = state.players.filter((t) => t.alive && t.id !== playerId)
    if (!others.length) {
      setPlayPrompt(state)
      return
    }
    state.prompt = {
      kind: 'choice',
      message: '【反間】選擇獲得此牌的角色',
      actorId: playerId,
      choiceKey: 'fanjian_target',
      selectedCardUids: selected,
      choices: others.map((t) => ({ id: String(t.id), label: t.name })),
    }
  }
}

export function finishRende(
  state: GameSnapshot,
  playerId: number,
  uids: string[],
  targetId: number,
): void {
  const p = state.players[playerId]
  const target = state.players[targetId]
  if (!target?.alive) {
    setPlayPrompt(state)
    return
  }
  let moved = 0
  for (const uid of uids) {
    const c = takeHand(state, playerId, uid)
    if (c) {
      target.hand.push(c)
      moved++
    }
  }
  p.rendeCount = (p.rendeCount ?? 0) + moved
  log(state, `${p.name} 發動【仁德】，將 ${moved} 張牌交給 ${target.name}。`)
  if (p.rendeCount >= 2 && p.hp < p.maxHp) {
    // Heal once when reaching 2+ this turn (simplified: heal 1 if count crossed 2)
    const prev = p.rendeCount - moved
    if (prev < 2) {
      p.hp++
      log(state, `${p.name} 因仁德回覆1點體力（${p.hp}）。`)
    }
  }
  setPlayPrompt(state)
}

export function finishZhangba(
  state: GameSnapshot,
  playerId: number,
  uids: string[],
  targetId: number,
): void {
  const p = state.players[playerId]
  if (uids.length !== 2 || !mayUseSha(p)) {
    setPlayPrompt(state)
    return
  }
  const cards: CardInstance[] = []
  for (const uid of uids) {
    const c = takeHand(state, playerId, uid)
    if (c) {
      discardCard(state, c)
      cards.push(c)
    }
  }
  if (cards.length < 2) {
    setPlayPrompt(state)
    return
  }
  p.shaUsedThisTurn = true
  const def = getCardDef(cards[0].defId)
  setPlayFx(state, {
    cardName: '殺',
    suit: def.suit,
    rank: def.rank,
    sourceId: playerId,
    targetIds: [targetId],
    note: '丈八',
  })
  log(state, `${p.name} 發動【丈八蛇矛】，將兩張牌當【殺】對 ${state.players[targetId].name} 使用。`)
  state.pending = {
    type: 'sha',
    sourceId: playerId,
    targetId,
    cardUid: cards[0].uid,
    damageCard: cards[0],
  }
  askShan(state, playerId, targetId, cards[0].uid)
}

