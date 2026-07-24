import { buildDeck, getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type {
  CardInstance,
  EquipSlot,
  GameSnapshot,
  MatchConfig,
  PlayerState,
  PromptState,
  Suit,
} from './types'
import {
  attackRangeOf,
  canReach,
  cardKind,
  checkVictory,
  enemiesOf,
  equipSlots,
  findCard,
  handLimit,
  isBlackCard,
  isRedCard,
  removeHand as removeHandCard,
  shuffle,
} from './helpers'
import {
  armorKind,
  baguaJudgeSucceeds,
  countDiscardable,
  drawJudgeCard,
  horseLabel,
  ignoresArmor,
  oppositeGender,
  targetHorses,
  weaponKind,
} from './weapons'

let uidSeq = 1
let fxSeq = 1
function nextUid(): string {
  return `c${uidSeq++}`
}

function nextFxSeq(): number {
  return fxSeq++
}

function setPlayFx(
  state: GameSnapshot,
  opts: {
    cardName: string
    suit?: Suit
    rank?: number
    sourceId: number
    targetIds: number[]
    note?: string
  },
): void {
  state.fx.play = {
    ...opts,
    seq: nextFxSeq(),
  }
  state.fx.damages = []
}

function pushDamageFx(state: GameSnapshot, playerId: number, amount: number): void {
  state.fx.damages = [
    ...state.fx.damages.filter((d) => d.playerId !== playerId),
    { playerId, amount, seq: nextFxSeq() },
  ]
}

/** Remove center played-card (and finished damage pops) after the effect resolves */
export function clearPlayFx(state: GameSnapshot): void {
  state.fx.play = null
  state.fx.damages = []
}

export function createMatch(config: MatchConfig): GameSnapshot {
  uidSeq = 1
  const defs = buildDeck(config.packs)
  const deck: CardInstance[] = shuffle(defs.map((d) => ({ uid: nextUid(), defId: d.id })))

  const defer = !!config.deferGeneralPick
  const players: PlayerState[] = config.players.map((p, i) => {
    if (defer || !p.generalId) {
      return {
        id: i,
        name: p.name,
        isHuman: p.isHuman,
        generalId: '',
        identity: p.identity,
        hp: 0,
        maxHp: 0,
        hand: [],
        equips: {},
        alive: true,
        shaUsedThisTurn: false,
      }
    }
    const g = getGeneral(p.generalId)
    return {
      id: i,
      name: p.name,
      isHuman: p.isHuman,
      generalId: p.generalId,
      identity: p.identity,
      hp: g.maxHp,
      maxHp: g.maxHp,
      hand: [],
      equips: {},
      alive: true,
      shaUsedThisTurn: false,
    }
  })

  // Lord +1 HP in identity (only when generals already known)
  if (!defer && (config.mode === 'identity5' || config.mode === 'identity8')) {
    const lord = players.find((p) => p.identity === 'lord')
    if (lord) {
      lord.maxHp += 1
      lord.hp += 1
    }
  }

  const human = players.find((p) => p.isHuman) ?? players[0]
  const state: GameSnapshot = {
    config,
    players,
    deck,
    discard: [],
    currentPlayer:
      config.mode === 'identity5' || config.mode === 'identity8'
        ? (players.find((p) => p.identity === 'lord')?.id ?? 0)
        : 0,
    phase: 'prepare',
    matchPhase: defer ? 'pick_general' : 'playing',
    round: 1,
    prompt: idlePrompt(),
    log: [],
    winnerIds: null,
    resultMessage: null,
    fx: { play: null, damages: [] },
  }

  if (defer) {
    const offered = config.offeredGenerals ?? []
    state.prompt = {
      kind: 'choose_general',
      message: '請選擇你的武將',
      actorId: human.id,
      generalIds: offered,
    }
    log(state, '座位與身份已確定。請選擇武將。')
    return state
  }

  // Initial deal: 4 each
  for (const pl of players) {
    draw(state, pl.id, 4)
  }
  log(state, '發牌完成，戰斗開始。')
  beginTurn(state)
  return state
}

/** After human picks a general: assign AI generals, deal, start */
export function confirmGeneralPick(state: GameSnapshot, generalId: string): void {
  if (state.matchPhase !== 'pick_general' || state.prompt.kind !== 'choose_general') return
  const offered = state.prompt.generalIds ?? []
  if (offered.length && !offered.includes(generalId)) return

  const human = state.players.find((p) => p.isHuman)
  if (!human) return

  applyGeneral(human, generalId)
  log(state, `你選擇了武將【${getGeneral(generalId).name}】。`)

  const used = new Set<string>([generalId])
  const pool = listPickPool().filter((id) => !used.has(id))
  const shuffled = shuffle(pool)

  for (const p of state.players) {
    if (p.isHuman) continue
    const gid = shuffled.pop()
    if (!gid) break
    applyGeneral(p, gid)
    used.add(gid)
    log(state, `${p.name} 亮出武將【${getGeneral(gid).name}】。`)
  }

  if (state.config.mode === 'identity5' || state.config.mode === 'identity8') {
    const lord = state.players.find((p) => p.identity === 'lord')
    if (lord) {
      lord.maxHp += 1
      lord.hp = lord.maxHp
    }
    state.currentPlayer = lord?.id ?? 0
  }

  state.matchPhase = 'playing'
  for (const pl of state.players) {
    draw(state, pl.id, 4)
  }
  log(state, '發牌完成，戰斗開始。')
  beginTurn(state)
}

function applyGeneral(p: PlayerState, generalId: string): void {
  const g = getGeneral(generalId)
  p.generalId = generalId
  p.maxHp = g.maxHp
  p.hp = g.maxHp
}

function listPickPool(): string[] {
  return [
    'caocao',
    'liubei',
    'sunquan',
    'guanyu',
    'zhangfei',
    'zhouyu',
    'ganning',
    'zhaoyun',
    'simayi',
    'zhenji',
    'diaochan',
    'huatuo',
    'machao',
    'lvmeng',
    'xiahoudun',
    'zhangliao',
    'huanggai',
    'luxun',
    'daqiao',
    'sunshangxiang',
    'guojia',
    'xuchu',
    'zhugeliang',
    'huangyueying',
    'lvbu',
  ]
}

function idlePrompt(): PromptState {
  return { kind: 'idle', message: '', actorId: null }
}

function log(state: GameSnapshot, text: string): void {
  state.log.push({ text, t: Date.now() })
  if (state.log.length > 80) state.log.shift()
}

function draw(state: GameSnapshot, playerId: number, n: number): void {
  const p = state.players[playerId]
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break
      state.deck = shuffle(state.discard)
      state.discard = []
      log(state, '牌堆耗盡，重洗棄牌堆。')
    }
    const c = state.deck.pop()
    if (c) p.hand.push(c)
  }
}

function discardCard(state: GameSnapshot, card: CardInstance): void {
  state.discard.push(card)
}

/** Remove from hand and trigger 連營 if it was the last card */
function takeHand(state: GameSnapshot, playerId: number, uid: string): CardInstance | null {
  const p = state.players[playerId]
  const before = p.hand.length
  const card = removeHandCard(p, uid)
  if (card && before === 1 && p.generalId && getGeneral(p.generalId).skills.includes('lianying')) {
    draw(state, playerId, 1)
    log(state, `${p.name} 發動連營，摸一張牌。`)
  }
  return card
}

function beginTurn(state: GameSnapshot): void {
  if (state.winnerIds) return
  const p = state.players[state.currentPlayer]
  if (!p.alive) {
    advanceTurn(state)
    return
  }
  p.shaUsedThisTurn = false
  p.luoyiActive = false
  p.zhihengUsed = false
  p.rendeCount = 0

  // 洛神：準備階段判定黑色則獲得判定牌，可重複直到紅色
  const skills = getGeneral(p.generalId).skills
  if (skills.includes('luoshen')) {
    for (let i = 0; i < 8; i++) {
      const judged = drawJudgeCard(state, shuffle)
      if (!judged) break
      const def = getCardDef(judged.defId)
      const black = def.suit === 'spade' || def.suit === 'club'
      log(
        state,
        `${p.name} 洛神判定：${def.name}${black ? '（黑色，獲得）' : '（紅色，結束）'}`,
      )
      if (black) {
        p.hand.push(judged)
      } else {
        discardCard(state, judged)
        if (skills.includes('tiandu')) {
          p.hand.push(judged)
          state.discard.pop()
          log(state, `${p.name} 發動天妒，獲得判定牌。`)
        }
        break
      }
    }
  }

  state.phase = 'draw'
  let drawN = 2
  if (skills.includes('yingzi')) drawN++

  // 突襲：可少摸並拿別人手牌（簡化：若有敵人有手牌，少摸1並隨機得1張）
  if (skills.includes('tuxi')) {
    const victims = state.players.filter((o) => o.alive && o.id !== p.id && o.hand.length > 0)
    if (victims.length) {
      drawN = Math.max(0, drawN - 1)
      const v = victims[Math.floor(Math.random() * victims.length)]
      const c = v.hand.splice(Math.floor(Math.random() * v.hand.length), 1)[0]
      p.hand.push(c)
      log(state, `${p.name} 發動突襲，獲得 ${v.name} 一張手牌。`)
      if (getGeneral(v.generalId).skills.includes('lianying') && v.hand.length === 0) {
        draw(state, v.id, 1)
        log(state, `${v.name} 發動連營，摸一張牌。`)
      }
    }
  }

  draw(state, p.id, drawN)
  log(state, `${p.name} 摸了 ${drawN} 張牌。`)
  state.phase = 'play'
  setPlayPrompt(state)
}

function setPlayPrompt(state: GameSnapshot): void {
  const p = state.players[state.currentPlayer]
  state.prompt = {
    kind: 'choose_card',
    message: `${p.name} 的出牌階段`,
    actorId: p.id,
    cardUids: playableCards(state, p.id).map((c) => c.uid),
  }
}

export function playableCards(state: GameSnapshot, playerId: number): CardInstance[] {
  const p = state.players[playerId]
  if (!p.alive || state.phase !== 'play' || state.currentPlayer !== playerId) return []
  return p.hand.filter((c) => canPlayCard(state, playerId, c.uid))
}

function canPlayCard(state: GameSnapshot, playerId: number, uid: string): boolean {
  const p = state.players[playerId]
  const card = findCard(p, uid)
  if (!card) return false
  const def = getCardDef(card.defId)
  const kind = cardKind(card)
  const playAs = getPlayKindOptions(p, card)

  if (def.type === 'equip') return true

  // 裸衣：不能用錦囊
  if (p.luoyiActive && def.type === 'trick') return false

  const tryKinds = playAs.length ? playAs : [kind]
  for (const k of tryKinds) {
    if (k === 'sha') {
      if (p.shaUsedThisTurn && !getGeneral(p.generalId).skills.includes('paoxiao') && !hasZhuge(p)) {
        continue
      }
      if (enemiesOf(state, playerId).some((t) => canReach(state, playerId, t))) return true
      continue
    }
    if (k === 'tao') {
      if (p.hp < p.maxHp) return true
      continue
    }
    if (k === 'shan' || k === 'wuxie') continue
    if (k === 'wuzhong' || k === 'taoyuan' || k === 'wugu' || k === 'nanman' || k === 'wanjian') return true
    if (k === 'guohe' || k === 'shunshou' || k === 'juedou' || k === 'huogong') {
      if (state.players.some((t) => t.alive && t.id !== playerId)) return true
    }
  }
  return false
}

function hasZhuge(p: PlayerState): boolean {
  const w = p.equips.weapon
  return !!w && getCardDef(w.defId).kind === 'zhuge'
}

export function getPlayKindOptions(p: PlayerState, card: CardInstance): string[] {
  const kind = cardKind(card)
  const skills = getGeneral(p.generalId).skills
  const opts = [kind]
  if (skills.includes('wusheng') && isRedCard(card) && kind !== 'sha') opts.push('sha')
  if (skills.includes('longdan')) {
    if (kind === 'sha') opts.push('shan')
    if (kind === 'shan') opts.push('sha')
  }
  if (skills.includes('qixi') && isBlackCard(card)) opts.push('guohe')
  if (skills.includes('jijiu') && isRedCard(card)) opts.push('tao')
  if (skills.includes('qingguo') && isBlackCard(card)) opts.push('shan')
  return [...new Set(opts)]
}

/** Player / AI action entry points */
export function selectCard(state: GameSnapshot, playerId: number, uid: string, asKind?: string): void {
  if (state.winnerIds) return
  const prompt = state.prompt
  if (prompt.actorId !== playerId) return

  if (prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha') {
    handleResponse(state, playerId, uid)
    return
  }
  if (prompt.kind === 'discard') {
    handleDiscardPick(state, playerId, uid)
    return
  }
  if (prompt.kind === 'skill_cards') {
    handleSkillCardPick(state, playerId, uid)
    return
  }
  if (prompt.kind !== 'choose_card') return

  const p = state.players[playerId]
  const card = findCard(p, uid)
  if (!card) return
  const kind = asKind && getPlayKindOptions(p, card).includes(asKind) ? asKind : cardKind(card)
  const def = getCardDef(card.defId)

  if (def.type === 'equip') {
    playEquip(state, playerId, card)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
      note: '裝備',
    })
    setPlayPrompt(state)
    return
  }

  if (kind === 'tao') {
    if (p.hp >= p.maxHp) return
    takeHand(state, playerId, uid)
    discardCard(state, card)
    p.hp = Math.min(p.maxHp, p.hp + 1)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【桃】，體力回覆至 ${p.hp}。`)
    setPlayPrompt(state)
    return
  }

  if (kind === 'wuzhong') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    draw(state, playerId, 2)
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [playerId],
    })
    log(state, `${p.name} 使用【無中生有】，摸兩張牌。`)
    afterTrick(state, p)
    setPlayPrompt(state)
    return
  }

  if (kind === 'taoyuan') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    const healed = state.players.filter((pl) => pl.alive && pl.hp < pl.maxHp).map((pl) => pl.id)
    for (const pl of state.players) {
      if (pl.alive && pl.hp < pl.maxHp) pl.hp++
    }
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: healed.length ? healed : [playerId],
    })
    log(state, `${p.name} 使用【桃園結義】。`)
    afterTrick(state, p)
    setPlayPrompt(state)
    return
  }

  if (kind === 'nanman' || kind === 'wanjian') {
    takeHand(state, playerId, uid)
    discardCard(state, card)
    const others = state.players.filter((t) => {
      if (!t.alive || t.id === playerId) return false
      // 藤甲：南蠻／萬箭無效
      if (armorKind(t) === 'tengjia') {
        log(state, `${t.name} 的【藤甲】使【${def.name}】無效。`)
        return false
      }
      return true
    })
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: others.map((t) => t.id),
    })
    log(state, `${p.name} 使用【${def.name}】。`)
    afterTrick(state, p)
    resolveAOE(state, playerId, others.map((t) => t.id), kind === 'nanman' ? 'sha' : 'shan', def.name)
    return
  }

  // Needs target
  const targets = legalTargets(state, playerId, kind)
  if (targets.length === 0) return

  const fangtian =
    kind === 'sha' && weaponKind(p) === 'fangtian' && p.hand.length === 1
  const maxTargets = fangtian ? Math.min(3, targets.length) : 1
  state.prompt = {
    kind: 'choose_target',
    message:
      maxTargets > 1
        ? `【方天畫戟】選擇 1～${maxTargets} 名目標（點選目標後確認）`
        : `選擇【${getCardDef(card.defId).name}】的目標`,
    actorId: playerId,
    targetIds: targets,
    minTargets: 1,
    maxTargets,
    cardUids: [uid],
    respondKinds: [kind],
    selectedTargetIds: [],
  }
}

function afterTrick(state: GameSnapshot, p: PlayerState): void {
  if (getGeneral(p.generalId).skills.includes('jizhi')) {
    draw(state, p.id, 1)
    log(state, `${p.name} 發動集智，摸一張牌。`)
  }
}

function legalTargets(state: GameSnapshot, playerId: number, kind: string): number[] {
  if (kind === 'sha') {
    return enemiesOf(state, playerId).filter((t) => {
      const target = state.players[t]
      // 空城
      if (getGeneral(target.generalId).skills.includes('kongcheng') && target.hand.length === 0) {
        return false
      }
      return canReach(state, playerId, t)
    })
  }
  if (kind === 'guohe' || kind === 'shunshou' || kind === 'juedou' || kind === 'huogong') {
    return state.players.filter((t) => t.alive && t.id !== playerId).map((t) => t.id)
  }
  return []
}

export function selectTarget(state: GameSnapshot, playerId: number, targetId: number): void {
  if (state.prompt.kind !== 'choose_target' || state.prompt.actorId !== playerId) return
  if (!state.prompt.targetIds?.includes(targetId)) return
  const uid = state.prompt.cardUids?.[0]
  const kind = state.prompt.respondKinds?.[0]
  if (!uid || !kind) return

  const maxTargets = state.prompt.maxTargets ?? 1
  const selected = [...(state.prompt.selectedTargetIds ?? [])]
  if (!selected.includes(targetId)) selected.push(targetId)

  if (maxTargets > 1 && selected.length < maxTargets && selected.length >= 1) {
    const remaining = (state.prompt.targetIds ?? []).filter((id) => !selected.includes(id))
    state.prompt = {
      kind: 'choice',
      message: `已選 ${selected.map((id) => state.players[id].name).join('、')}。可再選或確認。`,
      actorId: playerId,
      choiceKey: 'fangtian_confirm',
      cardUids: [uid],
      respondKinds: [kind],
      targetIds: remaining,
      selectedTargetIds: selected,
      choices: [
        ...remaining.map((tid) => ({
          id: `add:${tid}`,
          label: `再指定 ${state.players[tid].name}`,
        })),
        { id: 'confirm', label: '確認出殺' },
      ],
    }
    return
  }

  const targets = selected.length ? selected : [targetId]
  finishTargetedCard(state, playerId, uid, kind, targets)
}

function finishTargetedCard(
  state: GameSnapshot,
  playerId: number,
  uid: string,
  kind: string,
  targetIds: number[],
): void {
  const p = state.players[playerId]
  const card = takeHand(state, playerId, uid)
  if (!card) return
  discardCard(state, card)
  const def = getCardDef(card.defId)

  if (kind === 'sha') {
    p.shaUsedThisTurn = true
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds,
    })
    log(
      state,
      `${p.name} 對 ${targetIds.map((id) => state.players[id].name).join('、')} 使用【殺】。`,
    )

    const startShaVs = (tid: number, extras: number[]) => {
      const target = state.players[tid]
      if (getGeneral(target.generalId).skills.includes('liuli') && target.hand.length > 0) {
        const redirect = legalTargets(state, playerId, 'sha').filter(
          (x) => x !== tid && x !== playerId && canReach(state, tid, x),
        )
        if (redirect.length) {
          state.pending = {
            type: 'sha',
            sourceId: playerId,
            targetId: tid,
            cardUid: card.uid,
            damageCard: card,
            extraTargets: extras,
          }
          state.prompt = {
            kind: 'choice',
            message: `【流離】：是否棄一張牌將殺轉移？`,
            actorId: tid,
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
      if (weaponKind(p) === 'cixiong' && oppositeGender(p, state.players[tid])) {
        state.pending = {
          type: 'sha',
          sourceId: playerId,
          targetId: tid,
          cardUid: card.uid,
          damageCard: card,
          extraTargets: extras,
        }
        state.prompt = {
          kind: 'choice',
          message: `【雌雄雙股劍】：${state.players[tid].name} 請選擇`,
          actorId: tid,
          choiceKey: 'cixiong',
          choices: [
            { id: 'discard', label: '棄一張手牌' },
            { id: 'draw', label: '令對方摸一張牌' },
          ],
        }
        return
      }
      state.pending = {
        type: 'sha',
        sourceId: playerId,
        targetId: tid,
        cardUid: card.uid,
        damageCard: card,
        extraTargets: extras,
      }
      askShan(state, playerId, tid, card.uid)
    }

    const [first, ...rest] = targetIds
    startShaVs(first, rest)
    return
  }

  const targetId = targetIds[0]
  if (targetId === undefined) {
    setPlayPrompt(state)
    return
  }

  if (kind === 'juedou') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【決鬥】。`)
    afterTrick(state, p)
    resolveJuedou(state, playerId, targetId)
    return
  }

  if (kind === 'guohe') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【過河拆橋】。`)
    afterTrick(state, p)
    dismantle(state, targetId)
    setPlayPrompt(state)
    return
  }

  if (kind === 'shunshou') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【順手牽羊】。`)
    afterTrick(state, p)
    steal(state, playerId, targetId)
    setPlayPrompt(state)
    return
  }

  if (kind === 'huogong') {
    setPlayFx(state, {
      cardName: def.name,
      suit: def.suit,
      rank: def.rank,
      sourceId: playerId,
      targetIds: [targetId],
    })
    log(state, `${p.name} 對 ${state.players[targetId].name} 使用【火攻】。`)
    afterTrick(state, p)
    dealDamage(state, targetId, 1, playerId, 'fire')
    setPlayPrompt(state)
    return
  }

  setPlayFx(state, {
    cardName: def.name,
    suit: def.suit,
    rank: def.rank,
    sourceId: playerId,
    targetIds: [targetId],
  })
  log(state, `${p.name} 使用【${def.name}】。`)
  setPlayPrompt(state)
}

function playEquip(state: GameSnapshot, playerId: number, card: CardInstance): void {
  const p = state.players[playerId]
  const def = getCardDef(card.defId)
  if (!def.slot) return
  takeHand(state, playerId, card.uid)
  const old = p.equips[def.slot]
  if (old) {
    leaveEquipArea(state, playerId, def.slot, old)
  }
  p.equips[def.slot] = card
  log(state, `${p.name} 裝備【${def.name}】。`)
}

/** Remove an equip and resolve 白銀獅子 / 梟姬 */
function leaveEquipArea(
  state: GameSnapshot,
  playerId: number,
  slot: EquipSlot,
  card: CardInstance,
): void {
  const p = state.players[playerId]
  delete p.equips[slot]
  const kind = getCardDef(card.defId).kind
  discardCard(state, card)
  if (kind === 'baiyin') {
    p.hp = Math.min(p.maxHp, p.hp + 1)
    log(state, `${p.name} 失去【白銀獅子】，回覆1點體力（${p.hp}）。`)
  }
  if (p.alive && getGeneral(p.generalId).skills.includes('xiaoji')) {
    draw(state, playerId, 2)
    log(state, `${p.name} 發動梟姬，摸兩張牌。`)
  }
}

function askShan(state: GameSnapshot, sourceId: number, targetId: number, cardUid: string): void {
  const target = state.players[targetId]
  const source = state.players[sourceId]
  const prev = state.pending?.type === 'sha' ? state.pending : undefined
  const shaCard =
    prev?.damageCard ??
    state.discard.find((c) => c.uid === cardUid) ??
    { uid: cardUid, defId: '' }
  const shaDefId = shaCard.defId || findRecentShaDef(state)
  const ignoreArm = ignoresArmor(source)

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
  }

  // 鐵騎：殺的目標判定，紅色則其不能出閃
  let skipShan = false
  if (getGeneral(source.generalId).skills.includes('tieqi')) {
    const judged = drawJudgeCard(state, shuffle)
    if (judged) {
      discardCard(state, judged)
      const jdef = getCardDef(judged.defId)
      const red = jdef.suit === 'heart' || jdef.suit === 'diamond'
      log(state, `${source.name} 鐵騎判定：${jdef.name}${red ? '（紅，目標不能出閃）' : '（黑）'}`)
      if (red) skipShan = true
    }
  }
  if (skipShan) {
    state.pending.skipShan = true
    finishShaHit(state, 1)
    return
  }

  // 八卦陣：可判定當閃（青釭劍無視）
  if (!ignoreArm && armorKind(target) === 'bagua') {
    const judged = drawJudgeCard(state, shuffle)
    if (judged) {
      discardCard(state, judged)
      const ok = baguaJudgeSucceeds(judged)
      const jdef = getCardDef(judged.defId)
      log(
        state,
        `${target.name} 發動【八卦陣】判定為${jdef.name}（${jdef.suit === 'heart' || jdef.suit === 'diamond' ? '紅' : '黑'}）${ok ? '，視為打出閃' : '，判定失敗'}。`,
      )
      if (getGeneral(target.generalId).skills.includes('tiandu')) {
        target.hand.push(judged)
        state.discard.pop()
        log(state, `${target.name} 發動天妒，獲得判定牌。`)
      }
      if (ok) {
        onShaDodged(state, sourceId, targetId)
        return
      }
    }
  }

  const wushuang = getGeneral(source.generalId).skills.includes('wushuang')
  const shanNeeded = wushuang ? 2 : 1
  state.pending.shanNeeded = shanNeeded
  const shanCards = responseCards(target, 'shan')
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

function findRecentShaDef(state: GameSnapshot): string | null {
  for (let i = state.discard.length - 1; i >= 0; i--) {
    if (getCardDef(state.discard[i].defId).kind === 'sha') return state.discard[i].defId
  }
  return null
}

function responseCards(p: PlayerState, need: 'shan' | 'sha' | 'tao'): CardInstance[] {
  const skills = getGeneral(p.generalId).skills
  return p.hand.filter((c) => {
    const opts = [cardKind(c)]
    if (skills.includes('longdan')) {
      if (cardKind(c) === 'sha') opts.push('shan')
      if (cardKind(c) === 'shan') opts.push('sha')
    }
    if (skills.includes('qingguo') && isBlackCard(c)) opts.push('shan')
    if (skills.includes('wusheng') && isRedCard(c)) opts.push('sha')
    if (skills.includes('jijiu') && isRedCard(c)) opts.push('tao')
    return opts.includes(need)
  })
}

function handleResponse(state: GameSnapshot, playerId: number, uid: string): void {
  const p = state.players[playerId]
  const card = takeHand(state, playerId, uid)
  if (!card) return
  discardCard(state, card)
  const kind = state.prompt.kind
  const def = getCardDef(card.defId)

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
      if (getGeneral(p.generalId).skills.includes('leiji')) {
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
          message: '發動【雷擊】：選擇造成1點雷電傷害的目標（或不發動）',
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
    dealDamage(state, playerId, 1, src)
    resumeAfterResponse(state)
    return
  }
  if (state.prompt.kind === 'respond_sha') {
    const aoe = getAoeQueue(state)
    const src = aoe?.sourceId ?? state.currentPlayer
    log(state, `${state.players[playerId].name} 放棄出殺，受到傷害。`)
    dealDamage(state, playerId, 1, src)
    resumeAfterResponse(state)
  }
}

function finishShaHit(state: GameSnapshot, dmg: number): void {
  const pending = state.pending
  if (!pending || pending.type !== 'sha') return
  const source = state.players[pending.sourceId]
  const target = state.players[pending.targetId]
  let damage = dmg
  if (source.luoyiActive) damage++
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

function applyShaDamage(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  damage: number,
): void {
  const pending = state.pending
  const extras = pending?.type === 'sha' ? pending.extraTargets ?? [] : []
  const cardUid = pending?.type === 'sha' ? pending.cardUid : ''
  const damageCard = pending?.type === 'sha' ? pending.damageCard : undefined
  dealDamage(state, targetId, damage, sourceId, 'normal', damageCard)
  delete (state as GameSnapshot & { _shaDamage?: number })._shaDamage
  if (state.winnerIds) {
    state.pending = undefined
    resumeAfterResponse(state)
    return
  }
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

function continueShaQueue(
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
      if (getGeneral(target.generalId).skills.includes('liuli') && target.hand.length > 0) {
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
function onShaDodged(state: GameSnapshot, sourceId: number, targetId: number): void {
  const source = state.players[sourceId]
  const wk = weaponKind(source)
  const pending = state.pending
  const extras = pending?.type === 'sha' ? pending.extraTargets ?? [] : []
  const cardUid = pending?.type === 'sha' ? pending.cardUid : ''
  const damageCard = pending?.type === 'sha' ? pending.damageCard : undefined

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
            { id: 'confirm', label: '確認出殺' },
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
    const actor = state.players[playerId]
    if (!actor.hand.length || Number.isNaN(newTarget)) {
      askShan(state, state.pending.sourceId, state.pending.targetId, state.pending.cardUid)
      return
    }
    // Discard one hand card then redirect
    const c = actor.hand[Math.floor(Math.random() * actor.hand.length)]
    takeHand(state, playerId, c.uid)
    discardCard(state, c)
    log(state, `${actor.name} 發動【流離】，將殺轉移給 ${state.players[newTarget].name}。`)
    state.pending.targetId = newTarget
    askShan(state, state.pending.sourceId, newTarget, state.pending.cardUid)
    return
  }

  if (key === 'leiji') {
    const dodged = (state as GameSnapshot & { _shaDodged?: { sourceId: number; targetId: number } })
      ._shaDodged
    if (choiceId !== 'skip') {
      const tid = Number(choiceId)
      if (!Number.isNaN(tid) && state.players[tid]?.alive) {
        // Classic: judge — black = 2 thunder damage. Simplified: 1 thunder always after judge black
        const judged = drawJudgeCard(state, shuffle)
        if (judged) {
          discardCard(state, judged)
          const jdef = getCardDef(judged.defId)
          const black = jdef.suit === 'spade' || jdef.suit === 'club'
          log(state, `${state.players[playerId].name} 雷擊判定：${jdef.name}${black ? '（黑，造成雷傷）' : '（紅，無效）'}`)
          if (getGeneral(state.players[playerId].generalId).skills.includes('tiandu')) {
            state.players[playerId].hand.push(judged)
            state.discard.pop()
            log(state, `${state.players[playerId].name} 發動天妒，獲得判定牌。`)
          }
          if (black) dealDamage(state, tid, 2, playerId, 'thunder')
        }
      }
    }
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
    } else {
      const q = (state as GameSnapshot & {
        _shaQueue?: { sourceId: number; cardUid: string; extras: number[]; damageCard?: CardInstance }
      })._shaQueue
      if (q) continueShaQueue(state, q.sourceId, q.cardUid, q.extras, q.damageCard)
      else resumeAfterResponse(state)
    }
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
      } else {
        const c = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0]
        discardCard(state, c)
        log(state, `${target.name} 棄置一張手牌。`)
        if (getGeneral(target.generalId).skills.includes('lianying') && target.hand.length === 0) {
          draw(state, tid, 1)
          log(state, `${target.name} 發動連營，摸一張牌。`)
        }
      }
    } else {
      draw(state, sourceId, 1)
      log(state, `${state.players[sourceId].name} 因【雌雄雙股劍】摸一張牌。`)
    }
    askShan(state, sourceId, tid, state.pending.cardUid)
    return
  }

  if (key === 'hanbing' && state.pending?.type === 'sha') {
    const sourceId = state.pending.sourceId
    const tid = state.pending.targetId
    const damage = (state as GameSnapshot & { _shaDamage?: number })._shaDamage ?? 1
    if (choiceId === 'yes') {
      discardFromTarget(state, tid, 2)
      log(state, `${state.players[sourceId].name} 發動【寒冰劍】，改為棄置對方的牌。`)
      const extras = state.pending.extraTargets ?? []
      const cardUid = state.pending.cardUid
      const damageCard = state.pending.damageCard
      continueShaQueue(state, sourceId, cardUid, extras, damageCard)
    } else {
      applyShaDamage(state, sourceId, tid, damage)
    }
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
      const source = state.players[playerId]
      discardFromSelf(state, playerId, 2)
      log(state, `${source.name} 發動【貫石斧】，棄兩張牌令殺生效。`)
      finishShaHit(state, 1)
      return
    }
    const extras = state.pending.extraTargets ?? []
    const cardUid = state.pending.cardUid
    const damageCard = state.pending.damageCard
    continueShaQueue(state, state.pending.sourceId, cardUid, extras, damageCard)
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
}

function discardFromTarget(state: GameSnapshot, targetId: number, n: number): void {
  const t = state.players[targetId]
  for (let i = 0; i < n; i++) {
    if (t.hand.length) {
      const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0]
      discardCard(state, c)
      if (getGeneral(t.generalId).skills.includes('lianying') && t.hand.length === 0) {
        draw(state, targetId, 1)
        log(state, `${t.name} 發動連營，摸一張牌。`)
      }
      continue
    }
    let removed = false
    for (const slot of equipSlots()) {
      const e = t.equips[slot]
      if (e) {
        leaveEquipArea(state, targetId, slot, e)
        removed = true
        break
      }
    }
    if (!removed) break
  }
}

function discardFromSelf(state: GameSnapshot, playerId: number, n: number): void {
  const p = state.players[playerId]
  for (let i = 0; i < n; i++) {
    if (p.hand.length) {
      const c = takeHand(state, playerId, p.hand[p.hand.length - 1].uid)
      if (c) discardCard(state, c)
      continue
    }
    const order: EquipSlot[] = ['horseMinus', 'horsePlus', 'armor', 'weapon']
    let removed = false
    for (const slot of order) {
      const e = p.equips[slot]
      if (e) {
        leaveEquipArea(state, playerId, slot, e)
        removed = true
        break
      }
    }
    if (!removed) break
  }
}

function resumeAfterResponse(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  const queue = getAoeQueue(state)
  if (queue && queue.targets.length) {
    const next = queue.targets.shift()!
    askAOEResponse(state, queue.sourceId, next, queue.need, queue.name)
    return
  }
  if (queue) {
    clearAoeQueue(state)
  }
  if (state.phase === 'play') setPlayPrompt(state)
}

type AoeQueue = {
  sourceId: number
  targets: number[]
  need: 'sha' | 'shan'
  name: string
}

function getAoeQueue(state: GameSnapshot): AoeQueue | undefined {
  return (state as GameSnapshot & { _aoe?: AoeQueue })._aoe
}

function clearAoeQueue(state: GameSnapshot): void {
  delete (state as GameSnapshot & { _aoe?: AoeQueue })._aoe
}

function resolveAOE(
  state: GameSnapshot,
  sourceId: number,
  targets: number[],
  need: 'sha' | 'shan',
  name: string,
): void {
  ;(state as GameSnapshot & { _aoe?: AoeQueue })._aoe = {
    sourceId,
    targets: [...targets],
    need,
    name,
  }
  resumeAfterResponse(state)
}

function askAOEResponse(
  state: GameSnapshot,
  sourceId: number,
  targetId: number,
  need: 'sha' | 'shan',
  name: string,
): void {
  const target = state.players[targetId]
  const cards = responseCards(target, need)
  if (cards.length === 0) {
    dealDamage(state, targetId, 1, sourceId)
    log(state, `${target.name} 無法響應【${name}】，受到 1 點傷害。`)
    resumeAfterResponse(state)
    return
  }
  state.prompt = {
    kind: need === 'shan' ? 'respond_shan' : 'respond_sha',
    message: `${target.name} 請打出【${need === 'shan' ? '閃' : '殺'}】響應【${name}】`,
    actorId: targetId,
    cardUids: cards.map((c) => c.uid),
    respondKinds: [need],
  }
}

function resolveJuedou(state: GameSnapshot, a: number, b: number): void {
  // Simplified: each needs sha alternately; AI/human — deal damage to one who can't
  const pb = state.players[b]
  const cards = responseCards(pb, 'sha')
  if (cards.length === 0) {
    dealDamage(state, b, 1, a)
  } else {
    // auto consume one sha for target, then ask source — simplify: both lose 1 sha if able else damage
    const c = takeHand(state, b, cards[0].uid)!
    discardCard(state, c)
    const pa = state.players[a]
    const cardsA = responseCards(pa, 'sha')
    if (cardsA.length === 0) {
      dealDamage(state, a, 1, b)
    } else {
      const c2 = takeHand(state, a, cardsA[0].uid)!
      discardCard(state, c2)
      dealDamage(state, b, 1, a)
    }
  }
  checkVictory(state)
  if (!state.winnerIds) setPlayPrompt(state)
}

function dismantle(state: GameSnapshot, targetId: number): void {
  const t = state.players[targetId]
  if (t.hand.length) {
    const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0]
    discardCard(state, c)
    log(state, `${t.name} 被拆掉一張手牌。`)
    return
  }
  for (const slot of equipSlots()) {
    const e = t.equips[slot]
    if (e) {
      delete t.equips[slot]
      discardCard(state, e)
      log(state, `${t.name} 被拆掉【${getCardDef(e.defId).name}】。`)
      if (getGeneral(t.generalId).skills.includes('xiaoji')) {
        draw(state, targetId, 2)
      }
      return
    }
  }
}

function steal(state: GameSnapshot, fromId: number, targetId: number): void {
  const t = state.players[targetId]
  const thief = state.players[fromId]
  if (t.hand.length) {
    const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0]
    thief.hand.push(c)
    log(state, `${thief.name} 獲得了 ${t.name} 的一張手牌。`)
    return
  }
  for (const slot of equipSlots()) {
    const e = t.equips[slot]
    if (e) {
      delete t.equips[slot]
      thief.hand.push(e)
      log(state, `${thief.name} 獲得了【${getCardDef(e.defId).name}】。`)
      return
    }
  }
}

function dealDamage(
  state: GameSnapshot,
  targetId: number,
  amount: number,
  sourceId: number | null,
  nature: 'normal' | 'fire' | 'thunder' = 'normal',
  damageCard?: CardInstance,
): void {
  const t = state.players[targetId]
  if (!t.alive) return
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

  if (sourceId !== null && t.alive) {
    const skills = getGeneral(t.generalId).skills
    // 奸雄：獲得造成傷害的牌，否則摸一張
    if (skills.includes('jianxiong')) {
      let got = false
      if (damageCard) {
        const idx = state.discard.findIndex((c) => c.uid === damageCard.uid)
        if (idx >= 0) {
          state.discard.splice(idx, 1)
          t.hand.push(damageCard)
          got = true
          log(state, `${t.name} 發動奸雄，獲得【${getCardDef(damageCard.defId).name}】。`)
        }
      }
      if (!got) {
        draw(state, targetId, 1)
        log(state, `${t.name} 發動奸雄，摸一張牌。`)
      }
    }
    // 反饋：獲得傷害來源一張牌
    if (skills.includes('fankui') && source) {
      if (source.hand.length) {
        const c = source.hand.splice(Math.floor(Math.random() * source.hand.length), 1)[0]
        t.hand.push(c)
        log(state, `${t.name} 發動反饋，獲得 ${source.name} 一張手牌。`)
        if (getGeneral(source.generalId).skills.includes('lianying') && source.hand.length === 0) {
          draw(state, sourceId, 1)
          log(state, `${source.name} 發動連營，摸一張牌。`)
        }
      } else {
        for (const slot of equipSlots()) {
          const e = source.equips[slot]
          if (e) {
            delete source.equips[slot]
            t.hand.push(e)
            log(state, `${t.name} 發動反饋，獲得【${getCardDef(e.defId).name}】。`)
            if (getCardDef(e.defId).kind === 'baiyin' && source.alive) {
              source.hp = Math.min(source.maxHp, source.hp + 1)
              log(state, `${source.name} 失去【白銀獅子】，回覆1點體力。`)
            }
            if (getGeneral(source.generalId).skills.includes('xiaoji')) {
              draw(state, sourceId, 2)
              log(state, `${source.name} 發動梟姬，摸兩張牌。`)
            }
            break
          }
        }
      }
    }
    // 剛烈：判定，非紅桃則來源棄兩張或受1傷
    if (skills.includes('ganglie') && source) {
      const judged = drawJudgeCard(state, shuffle)
      if (judged) {
        discardCard(state, judged)
        const jdef = getCardDef(judged.defId)
        const heart = jdef.suit === 'heart'
        log(state, `${t.name} 剛烈判定：${jdef.name}${heart ? '（紅桃，無效）' : '（非紅桃）'}`)
        if (getGeneral(t.generalId).skills.includes('tiandu')) {
          t.hand.push(judged)
          state.discard.pop()
          log(state, `${t.name} 發動天妒，獲得判定牌。`)
        }
        if (!heart) {
          if (countDiscardable(source) >= 2) {
            discardFromSelf(state, sourceId, 2)
            log(state, `${source.name} 因剛烈棄置兩張牌。`)
          } else {
            dealDamage(state, sourceId, 1, targetId)
            log(state, `${t.name} 剛烈對 ${source.name} 造成傷害！`)
            return
          }
        }
      }
    }
  }

  if (t.hp <= 0) {
    trySave(state, targetId)
  }
  checkVictory(state)
}

function trySave(state: GameSnapshot, targetId: number): void {
  const t = state.players[targetId]
  // Self tao first (auto for dying)
  while (t.hp <= 0) {
    const tao = responseCards(t, 'tao')
    if (!tao.length) break
    const c = takeHand(state, targetId, tao[0].uid)!
    discardCard(state, c)
    t.hp += 1
    log(state, `${t.name} 使用【桃】求救，體力回覆至 ${t.hp}。`)
  }
  if (t.hp <= 0) {
    t.hand.forEach((c) => discardCard(state, c))
    t.hand = []
    for (const slot of equipSlots()) {
      const e = t.equips[slot]
      if (e) leaveEquipArea(state, targetId, slot, e)
    }
    if (t.hp > 0) {
      log(state, `${t.name} 因失去裝備回覆體力，脫離瀕死（體力 ${t.hp}）。`)
    } else {
      t.alive = false
      log(state, `${t.name}（${getGeneral(t.generalId).name}）陣亡。`)
    }
  }
}

export function activateSkill(state: GameSnapshot, playerId: number, skillId: string): void {
  if (state.winnerIds) return
  if (state.prompt.kind !== 'choose_card' || state.prompt.actorId !== playerId) return
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return
  const p = state.players[playerId]

  if (skillId === 'kurou') {
    if (p.hp <= 0) return
    p.hp -= 1
    pushDamageFx(state, playerId, 1)
    log(state, `${p.name} 發動【苦肉】，失去1點體力。`)
    draw(state, playerId, 2)
    log(state, `${p.name} 摸兩張牌。`)
    if (p.hp <= 0) trySave(state, playerId)
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

  if (skillId === 'luoyi') {
    if (p.luoyiActive || p.hand.length < 2) return
    state.prompt = {
      kind: 'skill_cards',
      message: '【裸衣】選擇兩張手牌棄置',
      actorId: playerId,
      skillId: 'luoyi',
      cardUids: p.hand.map((c) => c.uid),
      selectedCardUids: [],
      minTargets: 2,
      maxTargets: 2,
      choices: [{ id: 'confirm', label: '確認裸衣' }],
      choiceKey: 'skill_confirm',
    }
    return
  }

  if (skillId === 'zhangba') {
    if (weaponKind(p) !== 'zhangba' || p.hand.length < 2) return
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

function handleSkillCardPick(state: GameSnapshot, _playerId: number, uid: string): void {
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

function confirmSkillCards(state: GameSnapshot, playerId: number): void {
  const prompt = state.prompt
  if (prompt.kind !== 'skill_cards') return
  const skillId = prompt.skillId
  const selected = prompt.selectedCardUids ?? []
  const min = prompt.minTargets ?? 1
  if (!skillId || selected.length < min) return
  const p = state.players[playerId]

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

  if (skillId === 'luoyi') {
    if (selected.length !== 2) return
    for (const uid of selected) {
      const c = takeHand(state, playerId, uid)
      if (c) discardCard(state, c)
    }
    p.luoyiActive = true
    log(state, `${p.name} 發動【裸衣】：本回合殺傷害+1，不能使用錦囊。`)
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
    if (selected.length !== 2) return
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
  }
}

function finishRende(
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

function finishZhangba(
  state: GameSnapshot,
  playerId: number,
  uids: string[],
  targetId: number,
): void {
  const p = state.players[playerId]
  if (uids.length !== 2) {
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

export function endPlayPhase(state: GameSnapshot, playerId: number): void {
  if (state.currentPlayer !== playerId || state.phase !== 'play') return
  if (state.prompt.kind === 'respond_shan' || state.prompt.kind === 'respond_sha') return
  const p = state.players[playerId]
  const skills = getGeneral(p.generalId).skills

  // 閉月
  if (skills.includes('biyue')) {
    draw(state, playerId, 1)
    log(state, `${p.name} 發動閉月，摸一張牌。`)
  }

  // 克己：未出殺跳過棄牌
  if (skills.includes('keji') && !p.shaUsedThisTurn) {
    log(state, `${p.name} 發動克己，跳過棄牌階段。`)
    advanceTurn(state)
    return
  }

  const limit = handLimit(p)
  const extra = p.hand.length - limit
  if (extra > 0) {
    state.phase = 'discard'
    state.prompt = {
      kind: 'discard',
      message: `${p.name} 需棄 ${extra} 張牌`,
      actorId: playerId,
      cardUids: p.hand.map((c) => c.uid),
      discardCount: extra,
    }
    return
  }
  advanceTurn(state)
}

function handleDiscardPick(state: GameSnapshot, playerId: number, uid: string): void {
  const p = state.players[playerId]
  const need = state.prompt.discardCount ?? 0
  const c = takeHand(state, playerId, uid)
  if (!c) return
  discardCard(state, c)
  const left = need - 1
  if (left > 0) {
    state.prompt = {
      ...state.prompt,
      discardCount: left,
      message: `${p.name} 需棄 ${left} 張牌`,
      cardUids: p.hand.map((x) => x.uid),
    }
    return
  }
  advanceTurn(state)
}

function advanceTurn(state: GameSnapshot): void {
  checkVictory(state)
  if (state.winnerIds) return
  const n = state.players.length
  let next = state.currentPlayer
  for (let i = 0; i < n; i++) {
    next = (next + 1) % n
    if (state.players[next].alive) break
  }
  if (next <= state.currentPlayer) state.round++
  state.currentPlayer = next
  beginTurn(state)
}

export function cancelTarget(state: GameSnapshot, playerId: number): void {
  if (state.prompt.actorId !== playerId) return
  if (
    state.prompt.kind === 'choose_target' ||
    state.prompt.kind === 'skill_cards' ||
    (state.prompt.kind === 'choice' &&
      (state.prompt.choiceKey === 'fangtian_confirm' ||
        state.prompt.choiceKey === 'rende_target' ||
        state.prompt.choiceKey === 'zhangba_target'))
  ) {
    setPlayPrompt(state)
  }
}

export function legalTargetsForPrompt(state: GameSnapshot): number[] {
  return state.prompt.targetIds ?? []
}

export function getAttackRange(p: PlayerState): number {
  return attackRangeOf(p)
}
