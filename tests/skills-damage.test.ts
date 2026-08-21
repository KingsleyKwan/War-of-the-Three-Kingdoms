import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { debugDealDamage, resolveChoice } from '../src/engine/game'
import { playerSkills } from '../src/engine/helpers'
import { cardOf, duel, forcePlay, logged } from './harness'

describe('yiji', () => {
  it('draws two cards per point of damage', () => {
    const state = forcePlay(duel('guojia', 'caocao'))
    state.deck.push(...state.discard.splice(0))
    const gj = state.players[0]
    const before = gj.hand.length
    debugDealDamage(state, 0, 1, 1)
    assert.ok(logged(state, '遺計'))
    assert.ok(gj.hand.length >= before + 2)
    if (gj.alive) {
      const before2 = gj.hand.length
      debugDealDamage(state, 0, 2, 1)
      assert.ok(state.log.some((l) => l.text.includes('遺計') && l.text.includes('摸 4')))
      assert.ok(gj.hand.length >= before2 + 4)
    }
  })
})

describe('jianxiong', () => {
  it('offers the damaging card and can take it', () => {
    const state = forcePlay(duel('caocao', 'zhangfei'))
    const cc = state.players[0]
    const dmgCard = cardOf('sha', 'spade')
    state.discard.push(dmgCard)
    const before = cc.hand.length
    debugDealDamage(state, 0, 1, 1, 'normal', dmgCard)
    assert.equal(state.prompt.choiceKey, 'jianxiong')
    resolveChoice(state, 0, 'take')
    assert.ok(logged(state, '奸雄'))
    assert.ok(cc.hand.length >= before + 1)
    assert.ok(!state.discard.some((c) => c.uid === dmgCard.uid))
  })

  it('does not prompt when there is no recoverable card', () => {
    const state = forcePlay(duel('caocao', 'zhangfei'))
    const before = state.players[0].hand.length
    debugDealDamage(state, 0, 1, 1)
    assert.notEqual(state.prompt.choiceKey, 'jianxiong')
    assert.equal(state.players[0].hand.length, before)
  })
})

describe('fankui', () => {
  it('auto-takes the only card from the damage source', () => {
    const state = forcePlay(duel('simayi', 'caocao'))
    const only = cardOf('sha')
    state.players[1].hand = [only]
    state.players[1].equips = {}
    debugDealDamage(state, 0, 1, 1)
    assert.ok(state.players[0].hand.some((c) => c.uid === only.uid))
    assert.ok(!state.players[1].hand.some((c) => c.uid === only.uid))
  })

  it('starts a zone pick when the source has several cards', () => {
    const state = forcePlay(duel('simayi', 'caocao'))
    state.players[1].hand = [cardOf('sha'), cardOf('shan'), cardOf('tao')]
    state.players[1].equips = {}
    debugDealDamage(state, 0, 1, 1)
    assert.equal(state.prompt.choiceKey, 'zone_pick')
    assert.equal(state.prompt.skillId, 'fankui')
    assert.equal(state.prompt.actorId, 0)
    assert.ok(state.prompt.message.includes('反饋'))
  })
})

describe('ganglie', () => {
  it('judges after taking damage', () => {
    const state = forcePlay(duel('xiahoudun', 'caocao'))
    debugDealDamage(state, 0, 1, 1)
    assert.ok(logged(state, '剛烈'))
  })
})

describe('jieming', () => {
  it('asks who should draw after 荀彧 is hurt', () => {
    const state = forcePlay(duel('xunyu', 'caocao'))
    debugDealDamage(state, 0, 1, 1)
    assert.equal(state.prompt.choiceKey, 'jieming')
    assert.equal(state.prompt.actorId, 0)
  })
})

describe('fangzhu', () => {
  it('asks 曹丕 to exile someone after damage', () => {
    const state = forcePlay(duel('caopi', 'zhangfei'))
    debugDealDamage(state, 0, 1, 1)
    assert.equal(state.prompt.choiceKey, 'fangzhu_target')
  })
})

describe('enyuan', () => {
  it('forces the source to give a card or lose hp', () => {
    const state = forcePlay(duel('fazheng', 'caocao'))
    state.players[1].hand = [cardOf('sha')]
    debugDealDamage(state, 0, 1, 1)
    assert.equal(state.prompt.choiceKey, 'enyuan')
    assert.equal(state.prompt.actorId, 1)
  })
})

describe('tianxiang', () => {
  it('offers to redirect damage when holding a heart', () => {
    const state = forcePlay(duel('xiaoqiao', 'caocao'))
    state.players[0].hand = [cardOf('shan', 'heart')]
    debugDealDamage(state, 0, 1, 1)
    assert.equal(state.prompt.choiceKey, 'tianxiang')
  })
})

describe('yaowu', () => {
  it('triggers on red 殺 damage', () => {
    const state = forcePlay(duel('huaxiong', 'zhangfei'))
    const redSha = cardOf('sha', 'heart')
    state.discard.push(redSha)
    debugDealDamage(state, 0, 1, 1, 'normal', redSha)
    assert.equal(state.prompt.choiceKey, 'yaowu')
    assert.ok(logged(state, '耀武'))
  })

  it('does not trigger on black 殺', () => {
    const state = forcePlay(duel('huaxiong', 'zhangfei'))
    const blackSha = cardOf('sha', 'spade')
    state.discard.push(blackSha)
    debugDealDamage(state, 0, 1, 1, 'normal', blackSha)
    assert.notEqual(state.prompt.choiceKey, 'yaowu')
  })
})

describe('kuanggu', () => {
  it('heals 魏延 after hurting someone at distance 1', () => {
    const state = forcePlay(duel('weiyan', 'caocao'))
    const wy = state.players[0]
    wy.hp = wy.maxHp - 1
    debugDealDamage(state, 1, 1, 0)
    assert.equal(wy.hp, wy.maxHp)
    assert.ok(logged(state, '狂骨'))
  })
})

describe('buqu', () => {
  it('returns 周泰 to 1 hp when dying with cards left to draw', () => {
    const state = forcePlay(duel('zhoutai', 'zhangfei'))
    const zt = state.players[0]
    zt.hp = 1
    debugDealDamage(state, 0, 1, 1)
    if (state.prompt.choiceKey === 'dying_save') {
      resolveChoice(state, state.prompt.actorId ?? 0, 'skip')
    }
    assert.equal(zt.alive, true)
    assert.equal(zt.hp, 1)
    assert.ok(logged(state, '不屈'))
  })
})

describe('niepan', () => {
  it('resets 龐統 once on death instead of dying', () => {
    const state = forcePlay(duel('pangtong', 'zhangfei'))
    const pt = state.players[0]
    pt.hp = 1
    pt.hand = [cardOf('sha'), cardOf('shan')]
    debugDealDamage(state, 0, 1, 1)
    if (state.prompt.choiceKey === 'dying_save') {
      resolveChoice(state, state.prompt.actorId ?? 0, 'skip')
    }
    assert.equal(pt.alive, true)
    assert.equal(pt.niepanUsed, true)
    assert.ok(pt.hp >= 1)
    assert.ok(logged(state, '涅槃'))
  })
})

describe('xingshang', () => {
  it('lets 曹丕 draw two when the other seat dies', () => {
    const state = forcePlay(duel('caopi', 'soldier'))
    const cp = state.players[0]
    const before = cp.hand.length
    state.players[1].hp = 1
    debugDealDamage(state, 1, 4, 0)
    drainDying(state)
    assert.equal(state.players[1].alive, false)
    assert.ok(cp.hand.length >= before + 2)
    assert.ok(logged(state, '行殤'))
  })
})

describe('duanchang', () => {
  it('strips the killer of skills when 蔡文姬 dies', () => {
    const state = forcePlay(duel('caiwenji', 'caocao'))
    state.players[0].hp = 1
    debugDealDamage(state, 0, 4, 1)
    drainDying(state)
    assert.equal(state.players[0].alive, false)
    assert.equal(state.players[1].skillsDisabled, true)
    assert.deepEqual(playerSkills(state.players[1]), [])
    assert.ok(logged(state, '斷腸'))
  })
})

function drainDying(state: ReturnType<typeof forcePlay>): void {
  for (let i = 0; i < 8; i++) {
    if (state.prompt.choiceKey !== 'dying_save' && state.prompt.choiceKey !== 'buyi') break
    const actor = state.prompt.actorId
    if (actor === null) break
    resolveChoice(state, actor, 'skip')
  }
}
