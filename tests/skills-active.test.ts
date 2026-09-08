import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  activateSkill,
  extraOf,
  playableCards,
  resolveChoice,
  selectCard,
} from '../src/engine/game'
import { listSkillActions } from '../src/engine/skills'
import { cardOf, duel, forcePlay, logged, pickSkillCards, storyTable } from './harness'

function actionIds(state: ReturnType<typeof forcePlay>, playerId = 0): string[] {
  return listSkillActions(state, playerId).map((a) => a.id)
}

describe('kurou', () => {
  it('lists 苦肉 while 黃蓋 has hp, then loses 1 and draws 2', () => {
    const state = forcePlay(duel('huanggai', 'caocao'))
    const p = state.players[0]
    p.hand = []
    const hp = p.hp
    assert.ok(actionIds(state).includes('kurou'))
    activateSkill(state, 0, 'kurou')
    assert.equal(p.hp, hp - 1)
    assert.equal(p.hand.length, 2)
    assert.ok(logged(state, '苦肉'))
  })

  it('does not list 苦肉 at 0 hp', () => {
    const state = forcePlay(duel('huanggai', 'caocao'))
    state.players[0].hp = 0
    assert.ok(!actionIds(state).includes('kurou'))
  })
})

describe('zhiheng', () => {
  it('discards selected cards and draws the same number once', () => {
    const state = forcePlay(duel('sunquan', 'caocao'))
    const p = state.players[0]
    const a = cardOf('sha')
    const b = cardOf('shan')
    const keep = cardOf('tao')
    p.hand = [a, b, keep]
    forcePlay(state, 0)
    assert.ok(actionIds(state).includes('zhiheng'))
    pickSkillCards(state, 0, 'zhiheng', [a.uid, b.uid])
    assert.equal(p.zhihengUsed, true)
    assert.equal(p.hand.length, 3)
    assert.ok(p.hand.some((c) => c.uid === keep.uid))
    assert.ok(logged(state, '制衡'))
    assert.ok(!actionIds(state).includes('zhiheng'))
  })
})

describe('rende', () => {
  it('gives cards and heals after the second card while wounded', () => {
    const state = forcePlay(duel('liubei', 'caocao'))
    const p = state.players[0]
    p.hp = p.maxHp - 1
    const a = cardOf('sha')
    const b = cardOf('shan')
    p.hand = [a, b]
    forcePlay(state, 0)
    pickSkillCards(state, 0, 'rende', [a.uid, b.uid])
    assert.equal(state.prompt.choiceKey, 'rende_target')
    resolveChoice(state, 0, '1')
    assert.equal(p.hand.length, 0)
    assert.equal(state.players[1].hand.some((c) => c.uid === a.uid), true)
    assert.equal(p.hp, p.maxHp)
    assert.ok(logged(state, '仁德'))
  })
})

describe('luoyi', () => {
  it('asks at the draw phase to draw one fewer and flags the turn', () => {
    const state = duel('xuchu', 'caocao')
    const p = state.players[0]
    // Opening turn should stop at the 裸衣 prompt
    assert.equal(state.prompt.choiceKey, 'luoyi')
    const before = p.hand.length
    resolveChoice(state, 0, 'yes')
    assert.equal(p.luoyiActive, true)
    assert.ok(logged(state, '裸衣'))
    assert.equal(p.hand.length, before + 1)
    assert.equal(state.phase, 'play')
  })
})

describe('qingnang', () => {
  it('discards one card to heal a wounded seat', () => {
    const state = forcePlay(duel('huatuo', 'caocao'))
    const pay = cardOf('sha')
    state.players[0].hand = [pay]
    state.players[1].hp = 3
    forcePlay(state, 0)
    pickSkillCards(state, 0, 'qingnang', [pay.uid])
    assert.equal(state.prompt.choiceKey, 'qingnang_target')
    resolveChoice(state, 0, '1')
    assert.equal(state.players[1].hp, 4)
    assert.equal(state.players[0].qingnangUsed, true)
    assert.ok(logged(state, '青囊'))
  })
})

describe('jieyin', () => {
  it('heals 孫尚香 and a male after discarding two cards', () => {
    const state = forcePlay(duel('sunshangxiang', 'caocao'))
    const p = state.players[0]
    p.hp = 2
    state.players[1].hp = 3
    const a = cardOf('sha')
    const b = cardOf('shan')
    p.hand = [a, b]
    forcePlay(state, 0)
    pickSkillCards(state, 0, 'jieyin', [a.uid, b.uid])
    resolveChoice(state, 0, '1')
    assert.equal(p.hp, 3)
    assert.equal(state.players[1].hp, 4)
    assert.equal(p.jieyinUsed, true)
  })
})

describe('qiaobian', () => {
  it('skips a phase after discarding a hand card', () => {
    const state = forcePlay(duel('zhanghe', 'caocao'))
    const pay = cardOf('sha')
    state.players[0].hand = [pay, cardOf('shan')]
    extraOf(state)._qiaobianPhase = 'discard'
    state.prompt = {
      kind: 'choice',
      message: '【巧變】棄一張手牌，跳過棄牌階段？',
      actorId: 0,
      choiceKey: 'qiaobian_phase',
      cardUids: state.players[0].hand.map((c) => c.uid),
      choices: [
        { id: pay.uid, label: '棄殺' },
        { id: 'skip', label: '不發動' },
      ],
    }
    resolveChoice(state, 0, pay.uid)
    assert.ok(!state.players[0].hand.some((c) => c.uid === pay.uid))
    assert.ok(logged(state, '巧變'))
  })
})

describe('qiangxi', () => {
  it('cannot target a story ally', () => {
    const state = storyTable([
      { generalId: 'dianwei', side: 'ally' },
      { generalId: 'caocao', side: 'ally' },
      { generalId: 'zhangfei', side: 'enemy' },
    ])
    forcePlay(state, 0)
    state.players[0].hp = 4
    activateSkill(state, 0, 'qiangxi')
    assert.equal(state.prompt.choiceKey, 'qiangxi_cost')
    assert.deepEqual(state.prompt.targetIds, [2])
    assert.ok(!state.prompt.targetIds?.includes(1))
  })

  it('pays 1 hp and deals 1 damage', () => {
    const state = forcePlay(duel('dianwei', 'zhangfei'))
    const attacker = state.players[0]
    const foe = state.players[1]
    const hpA = attacker.hp
    const hpB = foe.hp
    activateSkill(state, 0, 'qiangxi')
    resolveChoice(state, 0, 'hp')
    if (state.prompt.choiceKey === 'qiangxi_target') {
      resolveChoice(state, 0, '1')
    }
    assert.equal(attacker.hp, hpA - 1)
    assert.equal(foe.hp, hpB - 1)
    assert.equal(attacker.qiangxiUsed, true)
    assert.ok(logged(state, '強襲'))
  })
})

describe('luanwu', () => {
  it('lists the limited skill once and marks it used', () => {
    const state = forcePlay(duel('jiaxu', 'zhangfei'))
    assert.ok(actionIds(state).includes('luanwu'))
    activateSkill(state, 0, 'luanwu')
    assert.equal(state.players[0].luanwuUsed, true)
    assert.ok(logged(state, '亂武'))
  })
})

describe('jixi', () => {
  it('appears after 鑿險 grants 急襲 and there is a 田', () => {
    const state = forcePlay(duel('dengai', 'caocao'))
    state.players[0].extraSkills = ['jixi']
    state.players[0].tianCount = 1
    state.players[1].hand = [cardOf('shan')]
    forcePlay(state, 0)
    assert.ok(actionIds(state).includes('jixi'))
  })
})

describe('zhangba', () => {
  it('lists 丈八出殺 with the weapon and two cards', () => {
    const state = forcePlay(duel('liubei', 'caocao'))
    state.players[0].equips.weapon = cardOf('zhangba')
    state.players[0].hand = [cardOf('tao'), cardOf('shan')]
    forcePlay(state, 0)
    assert.ok(actionIds(state).includes('zhangba'))
  })
})

describe('fanjian', () => {
  it('opens a one-card give-and-guess flow', () => {
    const state = forcePlay(duel('zhouyu', 'caocao'))
    const pay = cardOf('sha', 'spade')
    state.players[0].hand = [pay]
    forcePlay(state, 0)
    pickSkillCards(state, 0, 'fanjian', [pay.uid])
    assert.equal(state.prompt.choiceKey, 'fanjian_target')
    resolveChoice(state, 0, '1')
    assert.equal(state.prompt.choiceKey, 'fanjian_suit')
    assert.equal(state.prompt.actorId, 1)
  })
})
