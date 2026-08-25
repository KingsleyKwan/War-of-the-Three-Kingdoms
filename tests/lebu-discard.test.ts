import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { continueBeginTurn, handleDiscardPick } from '../src/engine/game'
import { cardOf, duel, logged } from './harness'
import type { GameSnapshot } from '../src/engine/types'

/** Force turn-skip flags used by continueBeginTurn (樂不思蜀 / 據守 path). */
function setTurnSkip(
  state: GameSnapshot,
  flags: { skipDraw?: boolean; skipPlay?: boolean; skipJudge?: boolean },
): void {
  ;(state as GameSnapshot & {
    _turnSkip?: { skipDraw: boolean; skipPlay: boolean; skipJudge?: boolean }
  })._turnSkip = {
    skipDraw: !!flags.skipDraw,
    skipPlay: !!flags.skipPlay,
    skipJudge: flags.skipJudge ?? true,
  }
}

describe('樂不思蜀 skip play still discards', () => {
  it('enters discard when hand exceeds HP after skipping play', () => {
    // 關羽：無克己／閉月等干擾棄牌
    const state = duel('guanyu', 'caocao')
    const p = state.players[0]
    p.hp = 2
    p.maxHp = 4
    p.hand = [
      cardOf('shan'),
      cardOf('shan'),
      cardOf('tao'),
      cardOf('sha'),
      cardOf('wuzhong'),
    ]
    assert.equal(p.hand.length, 5)
    // 跳過判定與摸牌，直接模擬樂不思蜀生效後的路徑
    setTurnSkip(state, { skipDraw: true, skipPlay: true, skipJudge: true })
    state.currentPlayer = 0
    state.phase = 'draw'
    state.prompt = { kind: 'idle', message: '', actorId: null }
    continueBeginTurn(state)

    assert.ok(logged(state, '跳過出牌階段'), 'should log skip play')
    assert.equal(state.phase, 'discard', 'must enter discard phase')
    assert.equal(state.prompt.kind, 'discard')
    assert.equal(state.prompt.actorId, 0)
    assert.equal(state.prompt.discardCount, 3) // 5 hand - 2 hp
  })

  it('advances turn when hand within limit after skip play', () => {
    const state = duel('guanyu', 'caocao')
    const p = state.players[0]
    p.hp = 4
    p.maxHp = 4
    p.hand = [cardOf('shan'), cardOf('tao')]
    setTurnSkip(state, { skipDraw: true, skipPlay: true, skipJudge: true })
    state.currentPlayer = 0
    state.phase = 'draw'
    state.prompt = { kind: 'idle', message: '', actorId: null }
    continueBeginTurn(state)

    assert.ok(logged(state, '跳過出牌階段'))
    // Within limit → turn advances to opponent
    assert.notEqual(state.currentPlayer, 0)
    assert.notEqual(state.prompt.kind, 'discard')
  })

  it('can complete discard after 樂不思蜀', () => {
    const state = duel('guanyu', 'caocao')
    const p = state.players[0]
    p.hp = 2
    p.maxHp = 4
    const cards = [cardOf('shan'), cardOf('shan'), cardOf('tao'), cardOf('sha')]
    p.hand = cards
    setTurnSkip(state, { skipDraw: true, skipPlay: true, skipJudge: true })
    state.currentPlayer = 0
    state.phase = 'draw'
    state.prompt = { kind: 'idle', message: '', actorId: null }
    continueBeginTurn(state)
    assert.equal(state.prompt.kind, 'discard')
    assert.equal(state.prompt.discardCount, 2)
    // Discard twice
    handleDiscardPick(state, 0, cards[0].uid)
    assert.equal(state.prompt.kind, 'discard')
    handleDiscardPick(state, 0, cards[1].uid)
    // After discard complete, turn should advance
    assert.notEqual(state.currentPlayer, 0)
  })
})
