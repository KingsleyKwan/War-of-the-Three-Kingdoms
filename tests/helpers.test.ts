import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canReach,
  effectiveSuit,
  enemiesOf,
  getDistance,
  isRedFor,
  playerSkills,
  seatDistance,
} from '../src/engine/helpers'
import { mayUseSha } from '../src/engine/weapons'
import { cardOf, duel, forcePlay, storyTable, table } from './harness'

describe('playerSkills', () => {
  it('returns general skills and extraSkills', () => {
    const state = duel('liubei', 'caocao')
    const p = state.players[0]
    assert.deepEqual(playerSkills(p), ['rende'])
    p.extraSkills = ['paoxiao']
    assert.deepEqual(playerSkills(p).sort(), ['paoxiao', 'rende'])
  })

  it('returns nothing when skills are disabled', () => {
    const state = duel('guanyu', 'caocao')
    state.players[0].skillsDisabled = true
    assert.deepEqual(playerSkills(state.players[0]), [])
  })
})

describe('distance and mashu', () => {
  it('treats a 1v1 seat as distance 1', () => {
    const state = duel('liubei', 'caocao')
    assert.equal(getDistance(state, 0, 1), 1)
    assert.equal(canReach(state, 0, 1), true)
  })

  it('shortens a 5-seat gap with 馬術', () => {
    const state = table(
      ['machao', 'caocao', 'zhangfei', 'zhouyu', 'huatuo'],
      ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    )
    assert.equal(seatDistance(0, 2, 5, state.players.map((p) => p.alive)), 2)
    assert.equal(getDistance(state, 0, 2), 1, 'mashu should cut 2 → 1')
    assert.equal(canReach(state, 0, 2), true)
  })

  it('does not shorten the same gap without 馬術', () => {
    const state = table(
      ['liubei', 'caocao', 'zhangfei', 'zhouyu', 'huatuo'],
      ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    )
    assert.equal(getDistance(state, 0, 2), 2)
    assert.equal(canReach(state, 0, 2), false)
  })
})

describe('hongyan', () => {
  it('reads 黑桃 as 紅桃 for 小喬', () => {
    const state = duel('xiaoqiao', 'caocao')
    const spade = cardOf('sha', 'spade')
    assert.equal(effectiveSuit(spade, state.players[0]), 'heart')
    assert.equal(isRedFor(state.players[0], spade), true)
    assert.equal(effectiveSuit(spade, state.players[1]), 'spade')
  })
})

describe('enemiesOf', () => {
  it('in a duel is everyone else alive', () => {
    const state = duel('dianwei', 'zhangfei')
    assert.deepEqual(enemiesOf(state, 0), [1])
  })

  it('story sides only target the other team', () => {
    const state = storyTable([
      { generalId: 'dianwei', side: 'ally' },
      { generalId: 'caocao', side: 'ally' },
      { generalId: 'zhangfei', side: 'enemy' },
    ])
    assert.deepEqual(enemiesOf(state, 0).sort(), [2])
    assert.ok(!enemiesOf(state, 0).includes(1))
  })
})

describe('mayUseSha / 咆哮', () => {
  it('blocks a second 殺 without 咆哮 or 諸葛連弩', () => {
    const state = forcePlay(duel('liubei', 'caocao'))
    state.players[0].shaUsedThisTurn = true
    assert.equal(mayUseSha(state.players[0]), false)
  })

  it('allows extra 殺 with 咆哮', () => {
    const state = forcePlay(duel('zhangfei', 'caocao'))
    state.players[0].shaUsedThisTurn = true
    assert.equal(mayUseSha(state.players[0]), true)
  })

  it('allows extra 殺 with 諸葛連弩', () => {
    const state = forcePlay(duel('liubei', 'caocao'))
    state.players[0].shaUsedThisTurn = true
    state.players[0].equips.weapon = cardOf('zhuge')
    assert.equal(mayUseSha(state.players[0]), true)
  })

  it('forbids 殺 after losing 天義', () => {
    const state = forcePlay(duel('taishici', 'caocao'))
    state.players[0].tianyiLose = true
    assert.equal(mayUseSha(state.players[0]), false)
  })
})
