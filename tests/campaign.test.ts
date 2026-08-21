import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CAMPAIGNS } from '../src/data/campaigns'
import { CAMPAIGN_CITIES } from '../src/data/campaigns/map'
import { getGeneral } from '../src/data/generals'
import { checkVictory } from '../src/engine/helpers'
import { storyTable } from './harness'

describe('campaign stages', () => {
  it('has unique ids, sequential indexes, valid generals and cities', () => {
    const ids = new Set<string>()
    for (const campaign of CAMPAIGNS) {
      assert.ok(campaign.stages.length >= 3, campaign.id)
      campaign.stages.forEach((s, i) => {
        assert.equal(s.index, i + 1, `${s.id} index`)
        assert.ok(!ids.has(s.id), `duplicate ${s.id}`)
        ids.add(s.id)
        assert.ok(CAMPAIGN_CITIES[s.battlefieldCityId], s.battlefieldCityId)
        for (const city of Object.keys(s.cityFactions)) {
          assert.ok(CAMPAIGN_CITIES[city], `${s.id} city ${city}`)
        }
        for (const m of s.movements) {
          assert.ok(CAMPAIGN_CITIES[m.fromCityId], m.fromCityId)
          assert.ok(CAMPAIGN_CITIES[m.toCityId], m.toCityId)
        }
        const generals = [
          s.playerGeneralId,
          ...s.allies.map((a) => a.generalId),
          ...(s.allyChoices ?? []),
          ...s.enemies.map((e) => e.generalId),
        ]
        for (const id of generals) {
          assert.doesNotThrow(() => getGeneral(id), `${s.id} unknown general ${id}`)
        }
        assert.ok(s.briefing.length > 40, `${s.id} briefing too short`)
        assert.ok(s.epilogueWin.length > 10)
        assert.ok(s.epilogueLose.length > 10)
      })
    }
    assert.ok(ids.size >= 20, `expected expanded story, got ${ids.size} stages`)
  })
})

describe('survive_rounds', () => {
  it('wins after the listed number of rounds', () => {
    const state = storyTable([
      { generalId: 'liubei', side: 'ally' },
      { generalId: 'zhaoyun', side: 'ally' },
      { generalId: 'zhangliao', side: 'enemy' },
    ])
    state.config.victory = { type: 'survive_rounds', rounds: 4 }
    state.round = 4
    checkVictory(state)
    assert.equal(state.winnerIds, null)
    state.round = 5
    checkVictory(state)
    assert.deepEqual(state.winnerIds, [0])
  })
})
