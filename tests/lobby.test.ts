import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canStart,
  createLocalRoom,
  fillEmptyWithAi,
  humanCount,
  setSeatType,
} from '../src/multiplayer/lobby'
import { firstJoinableSeat } from '../src/multiplayer/types'

describe('lobby room', () => {
  it('opens an 8-seat host room', () => {
    const room = createLocalRoom('host', '主公', 8, 'ABCD')
    assert.equal(room.maxPlayers, 8)
    assert.equal(room.seats.length, 8)
    assert.equal(room.seats[0]?.type, 'human')
    assert.equal(room.seats[0]?.name, '主公')
    assert.equal(room.seats[1]?.type, 'empty')
    assert.equal(humanCount(room.seats), 1)
    assert.equal(canStart(room, true), true)
    assert.equal(canStart(room, false), false)
  })

  it('lets the host mark empty seats as AI and clear them', () => {
    let room = createLocalRoom('host', '主公', 8)
    room = setSeatType(room, 3, 'ai')
    assert.equal(room.seats[3]?.type, 'ai')
    assert.ok(room.seats[3]?.name.includes('電腦'))
    room = setSeatType(room, 3, 'empty')
    assert.equal(room.seats[3]?.type, 'empty')
    assert.equal(room.seats[3]?.name, '')
  })

  it('does not convert a human seat to AI', () => {
    const room = setSeatType(createLocalRoom('host', '主公', 8), 0, 'ai')
    assert.equal(room.seats[0]?.type, 'human')
  })

  it('fills remaining empty seats with computers at start', () => {
    const filled = fillEmptyWithAi(createLocalRoom('host', '主公', 8))
    assert.equal(filled.seats.filter((s) => s.type === 'ai').length, 7)
    assert.equal(filled.seats.filter((s) => s.type === 'human').length, 1)
  })

  it('lets a late joiner take an AI seat if no empty remains', () => {
    const filled = fillEmptyWithAi(createLocalRoom('host', '主公', 8))
    const seat = firstJoinableSeat(filled.seats)
    assert.ok(seat)
    assert.equal(seat?.type, 'ai')
  })
})
