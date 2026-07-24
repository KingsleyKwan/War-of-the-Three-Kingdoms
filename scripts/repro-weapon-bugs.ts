/**
 * Repro: 貫石斧 zone_pick stick + 丈八蛇矛 extra 殺.
 * Run: npx tsx scripts/repro-weapon-bugs.ts
 */
import { createMatch, resolveChoice } from '../src/engine/game'
import { listSkillActions } from '../src/engine/skills'
import { CARD_DEFS } from '../src/data/cards'
import type { CardInstance, GameSnapshot } from '../src/engine/types'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

function defByKind(kind: string): string {
  const d = CARD_DEFS.find((c) => c.kind === kind)
  if (!d) throw new Error(`no card kind ${kind}`)
  return d.id
}

function makeDuel(): GameSnapshot {
  const state = createMatch({
    mode: 'duel',
    packs: ['standard'],
    players: [
      { name: 'P0', isHuman: true, generalId: 'liubei', identity: 'none' },
      { name: 'P1', isHuman: false, generalId: 'caocao', identity: 'none' },
    ],
  })
  state.phase = 'play'
  state.currentPlayer = 0
  state.matchPhase = 'playing'
  return state
}

function testGuanshiClearsPrompt(): void {
  const state = makeDuel()
  const p0 = state.players[0]
  const p1 = state.players[1]
  const shaId = defByKind('sha')
  const sha: CardInstance = { uid: 'sha1', defId: shaId }
  p0.equips.weapon = { uid: 'w1', defId: defByKind('guanshi') }
  p0.hand = [
    { uid: 'h1', defId: defByKind('tao') },
    { uid: 'h2', defId: defByKind('wuzhong') },
    { uid: 'h3', defId: defByKind('shan') },
  ]
  p1.hp = 4

  state.pending = {
    type: 'sha',
    sourceId: 0,
    targetId: 1,
    cardUid: sha.uid,
    damageCard: sha,
  }
  state.prompt = {
    kind: 'choice',
    message: 'guanshi?',
    actorId: 0,
    choiceKey: 'guanshi',
    targetIds: [1],
    choices: [
      { id: 'yes', label: 'yes' },
      { id: 'no', label: 'no' },
    ],
  }

  resolveChoice(state, 0, 'yes')
  assert(state.prompt.choiceKey === 'zone_pick', `expected zone_pick, got ${state.prompt.choiceKey}`)

  const ids = (state.prompt.choices ?? []).filter((c) => c.id !== 'confirm').map((c) => c.id)
  resolveChoice(state, 0, ids[0])
  resolveChoice(state, 0, ids[1])
  resolveChoice(state, 0, 'confirm')

  assert(
    state.prompt.choiceKey !== 'zone_pick',
    `BUG: still zone_pick after guanshi (${JSON.stringify(state.prompt)})`,
  )
  assert(p1.hp === 3, `expected damage, hp=${p1.hp}`)
  console.log('OK: guanshi → prompt', state.prompt.kind, 'hp', p1.hp)
}

function testZhangbaOncePerTurn(): void {
  const state = makeDuel()
  const p0 = state.players[0]
  p0.equips.weapon = { uid: 'zb', defId: defByKind('zhangba') }
  p0.hand = [
    { uid: 'a', defId: defByKind('wuzhong') },
    { uid: 'b', defId: defByKind('tao') },
    { uid: 'c', defId: defByKind('shan') },
    { uid: 'd', defId: defByKind('guohe') },
  ]
  state.prompt = {
    kind: 'choose_card',
    message: 'play',
    actorId: 0,
    cardUids: p0.hand.map((c) => c.uid),
  }

  p0.shaUsedThisTurn = false
  assert(
    listSkillActions(state, 0).some((s) => s.id === 'zhangba'),
    'zhangba should be available before sha',
  )

  p0.shaUsedThisTurn = true
  assert(
    !listSkillActions(state, 0).some((s) => s.id === 'zhangba'),
    'BUG: zhangba still offered after sha used',
  )
  console.log('OK: zhangba hidden after shaUsedThisTurn')
}

testGuanshiClearsPrompt()
testZhangbaOncePerTurn()
console.log('All weapon bug repros passed.')
