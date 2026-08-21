import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  endPlayPhase,
  playableCards,
  selectCard,
} from '../src/engine/game'
import { cardOf, duel, forcePlay, logged } from './harness'

describe('yingzi', () => {
  it('draws an extra card on 周瑜 turn start', () => {
    const yu = duel('zhouyu', 'caocao')
    const plain = duel('lvmeng', 'caocao')
    assert.ok(yu.players[0].hand.length > plain.players[0].hand.length)
  })
})

describe('lianying', () => {
  it('draws a card after 陸遜 plays his last card', () => {
    const state = forcePlay(duel('luxun', 'caocao'))
    const equip = cardOf('zhuge')
    state.players[0].hand = [equip]
    forcePlay(state, 0)
    selectCard(state, 0, equip.uid)
    assert.ok(logged(state, '連營'))
    assert.equal(state.players[0].hand.length, 1)
  })
})

describe('xiaoji', () => {
  it('draws two cards when 孫尚香 replaces an equip', () => {
    const state = forcePlay(duel('sunshangxiang', 'caocao'))
    state.players[0].equips.weapon = cardOf('qinggang')
    const replacement = cardOf('zhuge')
    state.players[0].hand = [replacement]
    forcePlay(state, 0)
    const before = state.players[0].hand.length
    selectCard(state, 0, replacement.uid)
    assert.ok(logged(state, '梟姬'))
    assert.ok(state.players[0].hand.length >= before - 1 + 2)
  })
})

describe('jizhi', () => {
  it('draws after 黃月英 uses a trick', () => {
    const state = forcePlay(duel('huangyueying', 'caocao'))
    const trick = cardOf('wuzhong')
    state.players[0].hand = [trick]
    forcePlay(state, 0)
    const before = state.players[0].hand.length
    selectCard(state, 0, trick.uid)
    assert.ok(logged(state, '集智'))
    assert.ok(state.players[0].hand.length >= before)
  })
})

describe('keji', () => {
  it('skips discard when 呂蒙 did not use 殺', () => {
    const state = forcePlay(duel('lvmeng', 'caocao'))
    const p = state.players[0]
    p.hand = [cardOf('shan'), cardOf('shan'), cardOf('shan'), cardOf('tao'), cardOf('wuzhong')]
    p.hp = 2
    p.shaUsedThisTurn = false
    p.shaPlayedThisTurn = false
    forcePlay(state, 0)
    endPlayPhase(state, 0)
    assert.ok(logged(state, '克己'))
    assert.notEqual(state.phase, 'discard')
  })

  it('does not skip discard after using 殺', () => {
    const state = forcePlay(duel('lvmeng', 'caocao'))
    const p = state.players[0]
    p.hand = [cardOf('shan'), cardOf('shan'), cardOf('shan'), cardOf('tao'), cardOf('wuzhong')]
    p.hp = 2
    p.shaUsedThisTurn = true
    forcePlay(state, 0)
    endPlayPhase(state, 0)
    assert.equal(state.phase, 'discard')
    assert.ok(!logged(state, '克己'))
  })
})

describe('biyue', () => {
  it('draws a card when 貂蟬 ends the play phase', () => {
    const state = forcePlay(duel('diaochan', 'caocao'))
    const p = state.players[0]
    p.hand = [cardOf('sha')]
    p.hp = 3
    forcePlay(state, 0)
    const before = p.hand.length
    endPlayPhase(state, 0)
    assert.ok(logged(state, '閉月'))
    assert.ok(p.hand.length >= before + 1 || state.currentPlayer !== 0)
  })
})

describe('paoxiao playability', () => {
  it('keeps a second 殺 playable', () => {
    const state = forcePlay(duel('zhangfei', 'caocao'))
    const sha = cardOf('sha', 'spade')
    state.players[0].hand = [sha]
    state.players[0].shaUsedThisTurn = true
    forcePlay(state, 0)
    assert.ok(playableCards(state, 0).some((c) => c.uid === sha.uid))
  })
})
