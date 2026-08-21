import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getLegalTargets,
  getPlayKindOptions,
  playableCards,
  selectCard,
} from '../src/engine/game'
import { listSkillActions } from '../src/engine/skills'
import { cardOf, duel, forcePlay, table } from './harness'

describe('kongcheng', () => {
  it('blocks 殺 and 決鬥 while 諸葛亮 has no hand', () => {
    const state = forcePlay(duel('zhangfei', 'zhugeliang'), 0)
    state.players[1].hand = []
    assert.ok(!getLegalTargets(state, 0, 'sha').includes(1))
    assert.ok(!getLegalTargets(state, 0, 'juedou').includes(1))
  })

  it('allows 殺 once 諸葛亮 has a card', () => {
    const state = forcePlay(duel('zhangfei', 'zhugeliang'), 0)
    state.players[1].hand = [cardOf('shan')]
    assert.ok(getLegalTargets(state, 0, 'sha').includes(1))
  })
})

describe('qianxun', () => {
  it('blocks 順手牽羊 and 樂不思蜀', () => {
    const state = forcePlay(duel('ganning', 'luxun'))
    assert.ok(!getLegalTargets(state, 0, 'shunshou').includes(1))
    assert.ok(!getLegalTargets(state, 0, 'lebu').includes(1))
  })

  it('does not block 過河拆橋', () => {
    const state = forcePlay(duel('ganning', 'luxun'))
    assert.ok(getLegalTargets(state, 0, 'guohe').includes(1))
  })
})

describe('weimu', () => {
  it('rejects a black 過河拆橋 aimed at 賈詡', () => {
    const state = forcePlay(duel('ganning', 'jiaxu'))
    const black = cardOf('guohe', 'spade')
    state.players[0].hand = [black]
    state.prompt.cardUids = [black.uid]
    selectCard(state, 0, black.uid, 'guohe')
    assert.equal(state.players[0].hand.some((c) => c.uid === black.uid), true)
    assert.notEqual(state.prompt.kind, 'choose_target')
  })

  it('allows a red 過河拆橋 aimed at 賈詡', () => {
    const state = forcePlay(duel('ganning', 'jiaxu'))
    const red = cardOf('guohe', 'heart')
    state.players[0].hand = [red]
    state.prompt.cardUids = [red.uid]
    selectCard(state, 0, red.uid, 'guohe')
    assert.equal(state.prompt.kind, 'choose_target')
    assert.ok(state.prompt.targetIds?.includes(1))
  })
})

describe('qicai', () => {
  it('lets 黃月英 順手牽羊 a seat at distance 2', () => {
    const state = table(
      ['huangyueying', 'caocao', 'zhangfei', 'zhouyu', 'huatuo'],
      ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    )
    forcePlay(state, 0)
    state.players[2].hand = [cardOf('shan')]
    assert.ok(getLegalTargets(state, 0, 'shunshou').includes(2))
  })

  it('does not let a normal seat 順手牽羊 distance 2', () => {
    const state = table(
      ['liubei', 'caocao', 'zhangfei', 'zhouyu', 'huatuo'],
      ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    )
    forcePlay(state, 0)
    state.players[2].hand = [cardOf('shan')]
    assert.ok(!getLegalTargets(state, 0, 'shunshou').includes(2))
  })
})

describe('conversion skills', () => {
  it('武聖: red non-殺 can be played as 殺', () => {
    const state = forcePlay(duel('guanyu', 'caocao'))
    const peach = cardOf('tao', 'heart')
    assert.ok(getPlayKindOptions(state.players[0], peach).includes('sha'))
  })

  it('武聖: black cards stay as-is', () => {
    const state = forcePlay(duel('guanyu', 'caocao'))
    const sha = cardOf('sha', 'spade')
    assert.deepEqual(getPlayKindOptions(state.players[0], sha), ['sha'])
  })

  it('龍膽: 殺↔閃', () => {
    const state = forcePlay(duel('zhaoyun', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('sha')).includes('shan'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('shan')).includes('sha'))
  })

  it('傾國: black cards can be 閃', () => {
    const state = forcePlay(duel('zhenji', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('sha', 'club')).includes('shan'))
  })

  it('奇襲: black cards can be 過河拆橋', () => {
    const state = forcePlay(duel('ganning', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('sha', 'spade')).includes('guohe'))
  })

  it('國色: diamond cards can be 樂不思蜀', () => {
    const state = forcePlay(duel('daqiao', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('shan', 'diamond')).includes('lebu'))
  })

  it('連環: clubs can be 鐵索連環', () => {
    const state = forcePlay(duel('pangtong', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('sha', 'club')).includes('tiesuo'))
  })

  it('火計: red cards can be 火攻', () => {
    const state = forcePlay(duel('wolong', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('shan', 'heart')).includes('huogong'))
  })

  it('斷糧: black basic/equip can be 兵糧寸斷', () => {
    const state = forcePlay(duel('xuhuang', 'caocao'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('sha', 'spade')).includes('bingliang'))
    assert.ok(getPlayKindOptions(state.players[0], cardOf('zhuge', 'diamond')).includes('bingliang') === false)
    assert.ok(getPlayKindOptions(state.players[0], cardOf('qinggang')).includes('bingliang'))
  })
})

describe('jijiu', () => {
  it('does not convert red cards to 桃 during 華佗 own play phase', () => {
    const state = forcePlay(duel('huatuo', 'zhangfei'))
    const redShan = cardOf('shan', 'heart')
    assert.ok(!getPlayKindOptions(state.players[0], redShan).includes('tao'))
  })
})

describe('jiu once per turn', () => {
  it('first 酒 activates; a second is not playable', () => {
    const state = forcePlay(duel('zhangfei', 'caocao'))
    const a = cardOf('jiu')
    const b = cardOf('jiu')
    state.players[0].hand = [a, b]
    state.prompt.cardUids = [a.uid, b.uid]
    selectCard(state, 0, a.uid)
    assert.equal(state.players[0].jiuActive, true)
    assert.equal(state.players[0].jiuUsedThisTurn, true)
    assert.ok(!playableCards(state, 0).some((c) => c.uid === b.uid))
  })
})

describe('listSkillActions gating', () => {
  it('hides buttons outside the play-phase card prompt', () => {
    const state = duel('huanggai', 'caocao')
    state.phase = 'draw'
    assert.deepEqual(listSkillActions(state, 0), [])
  })

  it('hides buttons for a non-current seat', () => {
    const state = forcePlay(duel('huanggai', 'caocao'), 0)
    assert.deepEqual(listSkillActions(state, 1), [])
  })
})
