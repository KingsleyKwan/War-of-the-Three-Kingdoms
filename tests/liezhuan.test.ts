import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { listGeneralsForPick, getGeneral } from '../src/data/generals'
import { LIEZHUAN_CAMPAIGNS, getLiezhuanByGeneral } from '../src/data/liezhuan'
import { CAMPAIGN_CITIES } from '../src/data/campaigns/map'
import { chibiDataUri } from '../src/data/chibi'
import {
  CHIBI_SKIN,
  getEquippedSkin,
  hasSkin,
  loadMeta,
  resetMetaCache,
  setEquippedSkin,
  unlockSkin,
} from '../src/persist/progress'

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('liezhuan coverage', () => {
  it('gives every pickable general at least one stage', () => {
    const missing: string[] = []
    for (const g of listGeneralsForPick()) {
      const lz = getLiezhuanByGeneral(g.id)
      if (!lz || lz.stages.length < 1) missing.push(g.id)
    }
    assert.deepEqual(missing, [])
  })

  it('mixes single-stage and multi-stage biographies', () => {
    const counts = LIEZHUAN_CAMPAIGNS.map((c) => c.stages.length)
    assert.ok(counts.some((n) => n === 1))
    assert.ok(counts.some((n) => n >= 3))
  })

  it('uses real cities and generals', () => {
    for (const c of LIEZHUAN_CAMPAIGNS) {
      for (const s of c.stages) {
        assert.ok(CAMPAIGN_CITIES[s.battlefieldCityId], s.battlefieldCityId)
        getGeneral(s.playerGeneralId)
        for (const e of s.enemies) getGeneral(e.generalId)
        for (const a of s.allies) getGeneral(a.generalId)
        for (const id of s.allyChoices ?? []) getGeneral(id)
        if (s.victory.targetGeneralId) getGeneral(s.victory.targetGeneralId)
      }
    }
  })
})

describe('skins default locked', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMetaCache()
  })

  it('starts with no skin equipped', () => {
    for (const g of listGeneralsForPick()) {
      assert.equal(hasSkin(g.id), false)
      assert.equal(getEquippedSkin(g.id), null)
    }
  })

  it('unlocking chibi auto-equips Q-version', () => {
    const g = listGeneralsForPick()[0]
    const first = unlockSkin(g.id, CHIBI_SKIN)
    assert.equal(first, true)
    assert.equal(hasSkin(g.id), true)
    assert.equal(getEquippedSkin(g.id), 'chibi')
    setEquippedSkin(g.id, null)
    assert.equal(getEquippedSkin(g.id), null)
    assert.equal(hasSkin(g.id), true)
    const uri = chibiDataUri(g)
    assert.match(uri, /^data:image\/svg\+xml/)
    assert.ok(loadMeta().unlockedSkins[g.id]?.includes('chibi'))
  })
})
