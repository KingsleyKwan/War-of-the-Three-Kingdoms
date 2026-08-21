/**
 * Headless skill + AI match review.
 * Runs scenario checks, then 10 all-AI matches reviewing damage skills each action.
 *
 * Usage: npx --yes tsx scripts/skill-match-review.ts
 */
import { stepAiSimple } from '../src/ai/simple'
import { CARD_DEFS } from '../src/data/cards'
import { GENERALS, getGeneral } from '../src/data/generals'
import {
  createMatch,
  debugDealDamage,
  getLegalTargets,
  getPlayKindOptions,
  playableCards,
  resolveChoice,
  selectCard,
} from '../src/engine/game'
import { SKILL_CATALOG } from '../src/engine/skillCatalog'
import type { CardInstance, GameSnapshot, MatchConfig } from '../src/engine/types'

const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => {
    mem.set(k, String(v))
  },
  removeItem: (k) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage

mem.set(
  'wtk_settings_v1',
  JSON.stringify({
    thinkDelayMs: 0,
    showPortraits: false,
    forceSelectGeneral: false,
    aiApiToken: '',
    showAiDebug: false,
  }),
)

type Issue = { level: 'fail' | 'warn'; msg: string }

function duelConfig(a: string, b: string): MatchConfig {
  return {
    mode: 'duel',
    packs: ['standard', 'ex'],
    humanSeat: 0,
    players: [
      { name: getGeneral(a).name, isHuman: false, generalId: a, identity: 'none' },
      { name: getGeneral(b).name, isHuman: false, generalId: b, identity: 'none' },
    ],
  }
}

function runAiMatch(state: GameSnapshot, maxSteps = 2500): { steps: number; issues: Issue[] } {
  const issues: Issue[] = []
  let steps = 0
  let stall = 0
  let lastSig = ''

  while (!state.winnerIds && steps < maxSteps) {
    const actorId = state.prompt.actorId
    if (actorId === null || state.prompt.kind === 'idle' || state.prompt.kind === 'game_over') {
      break
    }
    const sig = [
      state.prompt.kind,
      state.prompt.actorId,
      state.prompt.choiceKey ?? '',
      state.prompt.message ?? '',
      (state.prompt.cardUids ?? []).join(','),
      (state.prompt.selectedCardUids ?? []).join(','),
      (state.prompt.targetIds ?? []).join(','),
      state.log.length,
    ].join('|')
    if (sig === lastSig) {
      stall++
      if (stall > 40) {
        issues.push({
          level: 'warn',
          msg: `AI stall at ${state.prompt.kind}/${state.prompt.choiceKey ?? '-'} actor=${actorId} msg=${state.prompt.message}`,
        })
        break
      }
    } else {
      stall = 0
      lastSig = sig
    }

    const beforeLog = state.log.length
    const actor = state.players[actorId]
    const gen = actor.generalId ? getGeneral(actor.generalId) : null

    try {
      stepAiSimple(state, actorId)
    } catch (e) {
      issues.push({
        level: 'fail',
        msg: `step crashed seat=${actorId} (${gen?.name ?? '?'}): ${String(e)}`,
      })
      break
    }
    steps++

    const newLogs = state.log.slice(beforeLog)
    for (const entry of newLogs) {
      const dmg = entry.text.match(/^(.+?) 受到 (\d+) 點/)
      if (!dmg) continue
      const name = dmg[1]
      const amount = Number(dmg[2])
      const victim = state.players.find((p) => p.name === name)
      if (!victim?.generalId) continue
      const skills = getGeneral(victim.generalId).skills
      if (skills.includes('yiji')) {
        const nearby = state.log.slice(beforeLog, beforeLog + 16)
        const ok = nearby.some((l) => l.text.includes('遺計') && l.text.includes(name))
        if (!ok) {
          issues.push({
            level: 'fail',
            msg: `遺計 missing after ${name} took ${amount} dmg (round ${state.round})`,
          })
        }
      }
      if (skills.includes('jianxiong')) {
        const nearby = state.log.slice(beforeLog, beforeLog + 16)
        const died = nearby.some((l) => l.text.includes(name) && l.text.includes('陣亡'))
        const awaiting =
          state.prompt.kind === 'choice' &&
          state.prompt.choiceKey === 'jianxiong' &&
          state.prompt.actorId === victim.id
        if (!died && !awaiting && !nearby.some((l) => l.text.includes('奸雄'))) {
          issues.push({
            level: 'fail',
            msg: `奸雄 missing after ${name} damage (round ${state.round})`,
          })
        }
      }
      if (skills.includes('ganglie')) {
        const nearby = state.log.slice(beforeLog, beforeLog + 16)
        const died = nearby.some((l) => l.text.includes(name) && l.text.includes('陣亡'))
        if (!died && !nearby.some((l) => l.text.includes('剛烈'))) {
          issues.push({
            level: 'warn',
            msg: `剛烈 not seen after ${name} damage (round ${state.round})`,
          })
        }
      }
    }

    for (const p of state.players) {
      if (p.hp < -20 || p.hand.length > 80) {
        issues.push({
          level: 'fail',
          msg: `insane state ${p.name} hp=${p.hp} hand=${p.hand.length}`,
        })
      }
    }
  }

  if (!state.winnerIds && steps >= maxSteps) {
    issues.push({ level: 'warn', msg: `match hit step cap ${maxSteps}` })
  }
  return { steps, issues }
}

function scenarioYiji(): Issue[] {
  const issues: Issue[] = []
  const state = createMatch(duelConfig('guojia', 'caocao'))
  const gj = state.players[0]
  // Ensure enough cards for multi-draw
  state.deck.push(...state.discard.splice(0))
  const handBefore = gj.hand.length
  debugDealDamage(state, 0, 1, 1)
  if (!state.log.some((l) => l.text.includes('遺計') && l.text.includes('摸 2'))) {
    issues.push({ level: 'fail', msg: 'yiji scenario: expected log 遺計摸 2' })
  }
  if (gj.alive && gj.hand.length < handBefore + 2) {
    issues.push({
      level: 'fail',
      msg: `yiji 1-dmg: hand ${handBefore}→${gj.hand.length}, expected +2`,
    })
  }
  if (gj.alive) {
    const before2 = state.log.length
    debugDealDamage(state, 0, 2, 1)
    const yiji2 = state.log.slice(before2).some((l) => l.text.includes('遺計') && l.text.includes('摸 4'))
    if (!yiji2) {
      issues.push({ level: 'fail', msg: 'yiji 2-dmg: expected log 遺計摸 4' })
    }
  }
  return issues
}

function scenarioJianxiong(): Issue[] {
  const issues: Issue[] = []
  const state = createMatch(duelConfig('caocao', 'zhangfei'))
  const cc = state.players[0]
  const dmgCard = state.deck.pop()
  if (!dmgCard) {
    issues.push({ level: 'fail', msg: 'jianxiong scenario: no deck card for damage source' })
    return issues
  }
  state.discard.push(dmgCard)
  const handBefore = cc.hand.length
  debugDealDamage(state, 0, 1, 1, 'normal', dmgCard)
  if (!cc.alive) return issues
  if (state.prompt.kind !== 'choice' || state.prompt.choiceKey !== 'jianxiong') {
    issues.push({ level: 'fail', msg: 'jianxiong scenario: expected take/skip choice prompt' })
    return issues
  }
  resolveChoice(state, 0, 'take')
  if (!state.log.some((l) => l.text.includes('奸雄') && l.text.includes('獲得'))) {
    issues.push({ level: 'fail', msg: 'jianxiong scenario: no 奸雄 obtain log after take' })
  }
  if (cc.hand.length < handBefore + 1) {
    issues.push({
      level: 'fail',
      msg: `jianxiong scenario: hand did not increase (${handBefore}→${cc.hand.length})`,
    })
  }
  if (state.discard.some((c) => c.uid === dmgCard.uid)) {
    issues.push({ level: 'fail', msg: 'jianxiong scenario: damage card still in discard after take' })
  }

  // Second hit with no recoverable card: no prompt
  const hand2 = cc.hand.length
  debugDealDamage(state, 0, 1, 1)
  if (state.prompt.choiceKey === 'jianxiong') {
    issues.push({ level: 'fail', msg: 'jianxiong scenario: should not prompt when no damage card' })
  }
  if (cc.hand.length !== hand2) {
    issues.push({
      level: 'fail',
      msg: `jianxiong scenario: hand changed without card (${hand2}→${cc.hand.length})`,
    })
  }
  return issues
}

function scenarioQianxun(): Issue[] {
  const issues: Issue[] = []
  const state = createMatch(duelConfig('ganning', 'luxun'))
  const shunTargets = getLegalTargets(state, 0, 'shunshou')
  if (shunTargets.includes(1)) {
    issues.push({ level: 'fail', msg: 'qianxun: 陸遜 must not be a 順手牽羊 target' })
  }
  return issues
}

function plantKind(state: GameSnapshot, playerId: number, kind: string): CardInstance | null {
  const def = CARD_DEFS.find((c) => c.kind === kind)
  if (!def) return null
  const card: CardInstance = { uid: `plant-${kind}-${playerId}-${state.players[playerId].hand.length}`, defId: def.id }
  state.players[playerId].hand.push(card)
  return card
}

function scenarioKongcheng(): Issue[] {
  const issues: Issue[] = []
  const state = createMatch(duelConfig('zhugeliang', 'zhangfei'))
  state.players[0].hand = []
  if (getLegalTargets(state, 1, 'juedou').includes(0)) {
    issues.push({ level: 'fail', msg: 'kongcheng: empty-hand 諸葛亮 must not be a 決鬥 target' })
  }
  if (getLegalTargets(state, 1, 'sha').includes(0)) {
    issues.push({ level: 'fail', msg: 'kongcheng: empty-hand 諸葛亮 must not be a 殺 target' })
  }
  return issues
}

function scenarioJijiuNotInPlay(): Issue[] {
  const issues: Issue[] = []
  const state = createMatch(duelConfig('huatuo', 'zhangfei'))
  const redShan = CARD_DEFS.find(
    (c) => c.kind === 'shan' && (c.suit === 'heart' || c.suit === 'diamond'),
  )
  if (!redShan) {
    issues.push({ level: 'fail', msg: 'jijiu scenario: no red 閃 def' })
    return issues
  }
  const card: CardInstance = { uid: 'jijiu-red-shan', defId: redShan.id }
  state.players[0].hand.push(card)
  const opts = getPlayKindOptions(state.players[0], card)
  if (opts.includes('tao')) {
    issues.push({ level: 'fail', msg: 'jijiu: 急救 must not convert red cards to 桃 in own play phase' })
  }
  return issues
}

function scenarioJiuOnce(): Issue[] {
  const issues: Issue[] = []
  const state = createMatch(duelConfig('zhangfei', 'caocao'))
  const p = state.players[0]
  const a = plantKind(state, 0, 'jiu')
  const b = plantKind(state, 0, 'jiu')
  if (!a || !b) {
    issues.push({ level: 'fail', msg: 'jiu scenario: missing 酒 card def' })
    return issues
  }
  if (state.prompt.kind !== 'choose_card' || state.prompt.actorId !== 0) {
    issues.push({ level: 'fail', msg: `jiu scenario: expected play prompt, got ${state.prompt.kind}` })
    return issues
  }
  selectCard(state, 0, a.uid)
  if (!p.jiuActive || !p.jiuUsedThisTurn) {
    issues.push({ level: 'fail', msg: 'jiu scenario: first 酒 did not activate' })
  }
  if (playableCards(state, 0).some((c) => c.uid === b.uid)) {
    issues.push({ level: 'fail', msg: 'jiu scenario: second 酒 should not be playable this turn' })
  }
  return issues
}

function printCatalogSummary(): void {
  const ok = SKILL_CATALOG.filter((s) => s.status === 'ok').length
  const partial = SKILL_CATALOG.filter((s) => s.status === 'partial').length
  const missing = SKILL_CATALOG.filter((s) => s.status === 'missing')
  console.log(`\n== Skill catalog ==`)
  console.log(`ok=${ok} partial=${partial} missing=${missing.length}`)
  for (const s of missing) {
    console.log(`  [missing] ${s.name}(${s.id}) — ${s.trigger}: ${s.behaviour}`)
  }
  for (const s of SKILL_CATALOG.filter((x) => x.status === 'partial')) {
    console.log(`  [partial] ${s.name}(${s.id}) — ${s.behaviour}`)
  }
}

function main(): void {
  console.log('== Skill scenario checks ==')
  const scenarioIssues: Issue[] = [
    ...scenarioYiji(),
    ...scenarioJianxiong(),
    ...scenarioQianxun(),
    ...scenarioKongcheng(),
    ...scenarioJijiuNotInPlay(),
    ...scenarioJiuOnce(),
  ]
  for (const i of scenarioIssues) {
    console.log(`${i.level.toUpperCase()}: ${i.msg}`)
  }
  if (!scenarioIssues.some((i) => i.level === 'fail')) {
    console.log('Scenarios: PASS')
  }

  printCatalogSummary()

  const pickable = GENERALS.filter(
    (g) => !['soldier', 'huaxiong', 'zhangxiu', 'yuanshao'].includes(g.id),
  )

  console.log('\n== 10 AI matches ==')
  let failCount = 0
  let warnCount = 0
  for (let m = 1; m <= 10; m++) {
    const a = pickable[Math.floor(Math.random() * pickable.length)]
    let b = pickable[Math.floor(Math.random() * pickable.length)]
    while (b.id === a.id) b = pickable[Math.floor(Math.random() * pickable.length)]
    const left = m <= 4 ? getGeneral('guojia') : a
    const right = b
    const state = createMatch(duelConfig(left.id, right.id))
    const { steps, issues } = runAiMatch(state)
    const fails = issues.filter((i) => i.level === 'fail')
    const warns = issues.filter((i) => i.level === 'warn')
    failCount += fails.length
    warnCount += warns.length
    const winner =
      state.winnerIds?.map((id) => state.players[id].name).join(',') ?? 'none'
    console.log(
      `Match ${m}: ${left.name} vs ${right.name} | steps=${steps} round=${state.round} winner=${winner} | fails=${fails.length} warns=${warns.length}`,
    )
    const skillish = state.log.filter((l) =>
      /遺計|奸雄|剛烈|反饋|洛神|突襲|鐵騎|雷擊|連營|梟姬|閉月|克己|集智|流離|裸衣|制衡|苦肉|仁德|天妒/.test(
        l.text,
      ),
    )
    for (const s of skillish.slice(-8)) {
      console.log(`    · ${s.text}`)
    }
    for (const f of fails.slice(0, 5)) {
      console.log(`    FAIL: ${f.msg}`)
    }
    for (const w of warns.slice(0, 3)) {
      console.log(`    WARN: ${w.msg}`)
    }
  }

  console.log(`\n== Summary ==`)
  console.log(`scenario fails: ${scenarioIssues.filter((i) => i.level === 'fail').length}`)
  console.log(`match fails: ${failCount}, match warns: ${warnCount}`)
  const hardFail = scenarioIssues.some((i) => i.level === 'fail') || failCount > 0
  if (hardFail) {
    console.error('RESULT: FAILED')
    process.exit(1)
  }
  console.log('RESULT: PASSED')
}

main()
