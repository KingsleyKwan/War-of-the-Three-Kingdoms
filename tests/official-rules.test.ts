import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CARD_DEFS } from '../src/data/cards'
import { getGeneral } from '../src/data/generals'
import {
  beginTurn,
  extraOf,
  finalizeDeath,
  resolveChoice,
} from '../src/engine/game'
import { playerSkills } from '../src/engine/helpers'
import { commitReplace, identityKillReward, startDelayedJudges } from '../src/engine/official'
import { cardOf, duel, forcePlay, logged, table } from './harness'

describe('official identity', () => {
  it('gives the lord +1 max HP in identity5', () => {
    const state = table(
      ['caocao', 'zhangfei', 'ganning', 'zhouyu', 'huatuo'],
      ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    )
    const lord = state.players[0]
    assert.equal(lord.maxHp, getGeneral('caocao').maxHp + 1)
    assert.equal(lord.hp, lord.maxHp)
  })

  it('only grants 主公技 while identity is lord', () => {
    const duelState = forcePlay(duel('caocao', 'zhangfei'))
    assert.ok(!playerSkills(duelState.players[0]).includes('hujia'))
    const idState = table(
      ['caocao', 'zhangfei', 'ganning', 'zhouyu', 'huatuo'],
      ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    )
    assert.ok(playerSkills(idState.players[0]).includes('hujia'))
    assert.ok(playerSkills(idState.players[0]).includes('jianxiong'))
  })

  it('rewards killing a rebel with 3 cards', () => {
    const state = table(
      ['caocao', 'zhangfei', 'ganning'],
      ['lord', 'loyal', 'rebel'],
    )
    forcePlay(state, 0)
    const killer = state.players[0]
    const before = killer.hand.length
    state.players[2].hp = 0
    identityKillReward(state, state.players[2], killer)
    assert.equal(killer.hand.length, before + 3)
    assert.ok(logged(state, '擊殺反賊'))
  })

  it('makes the lord discard all cards after killing a loyal', () => {
    const state = table(
      ['caocao', 'zhangfei', 'ganning'],
      ['lord', 'loyal', 'rebel'],
    )
    forcePlay(state, 0)
    const lord = state.players[0]
    lord.hand = [cardOf('sha'), cardOf('shan')]
    lord.equips.weapon = cardOf('qinggang')
    state.players[1].hp = 0
    identityKillReward(state, state.players[1], lord)
    assert.equal(lord.hand.length, 0)
    assert.equal(lord.equips.weapon, undefined)
    assert.ok(logged(state, '擊殺忠臣'))
  })
})

describe('official 翻面', () => {
  it('skips the facedown seat’s next turn and flips them back', () => {
    const state = forcePlay(duel('caocao', 'zhangfei'))
    state.players[0].facedown = true
    state.currentPlayer = 0
    beginTurn(state)
    assert.equal(state.players[0].facedown, false)
    assert.ok(logged(state, '翻回正面'))
  })

  it('flips 曹仁 after 據守', () => {
    const state = forcePlay(duel('caoren', 'caocao'))
    const before = state.players[0].hand.length
    state.prompt = {
      kind: 'choice',
      message: '【據守】',
      actorId: 0,
      choiceKey: 'jushou',
      choices: [
        { id: 'yes', label: '發動據守' },
        { id: 'no', label: '不發動' },
      ],
    }
    resolveChoice(state, 0, 'yes')
    assert.equal(state.players[0].facedown, true)
    assert.ok(state.players[0].hand.length >= before + 3)
    assert.ok(logged(state, '據守'))
  })
})

describe('official delayed judges', () => {
  it('resolves the judge zone LIFO (last placed first)', () => {
    const state = forcePlay(duel('caocao', 'zhangfei'))
    const lebu = cardOf('lebu')
    const shandian = cardOf('shandian')
    state.players[0].judges = [lebu, shandian]
    startDelayedJudges(state, 0)
    assert.equal(extraOf(state)._judgeQueue?.[0]?.uid, shandian.uid)
    assert.equal(extraOf(state)._judgeQueue?.[1]?.uid, lebu.uid)
  })
})

describe('official 鬼道', () => {
  it('obtains the original judgment card when replacing', () => {
    const state = forcePlay(duel('zhangjiao', 'caocao'))
    const original = cardOf('sha', 'heart')
    const black = cardOf('sha', 'spade')
    state.players[0].hand = [black]
    const result = commitReplace(state, state.players[0], 'guidao', black, original)
    assert.equal(result.uid, black.uid)
    assert.ok(state.players[0].hand.some((c) => c.uid === original.uid))
    assert.ok(!state.players[0].hand.some((c) => c.uid === black.uid))
    assert.ok(logged(state, '獲得原判定牌'))
  })
})

describe('official 閃電', () => {
  it('lives in the standard pack as ♠A and ♥Q', () => {
    const bolts = CARD_DEFS.filter((c) => c.kind === 'shandian')
    assert.equal(bolts.length, 2)
    assert.ok(bolts.every((c) => c.pack === 'standard'))
    const ranks = bolts.map((c) => c.rank).sort((a, b) => (a ?? 0) - (b ?? 0))
    assert.deepEqual(ranks, [1, 12])
  })
})

describe('official 裸衣', () => {
  it('asks to draw one fewer at the draw phase', () => {
    const state = duel('xuchu', 'caocao')
    assert.equal(state.prompt.choiceKey, 'luoyi')
    const before = state.players[0].hand.length
    resolveChoice(state, 0, 'yes')
    assert.equal(state.players[0].luoyiActive, true)
    assert.equal(state.players[0].hand.length, before + 1)
  })
})

describe('official death', () => {
  it('finalizes identity reward after dying is declined', () => {
    const state = table(
      ['caocao', 'zhangfei', 'ganning'],
      ['lord', 'loyal', 'rebel'],
    )
    forcePlay(state, 0)
    const before = state.players[0].hand.length
    state.players[2].hp = 0
    finalizeDeath(state, 2, 0)
    assert.equal(state.players[2].alive, false)
    assert.equal(state.players[0].hand.length, before + 3)
  })
})
