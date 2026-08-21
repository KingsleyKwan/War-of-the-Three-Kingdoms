import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GENERALS } from '../src/data/generals'
import { SKILL_CATALOG } from '../src/engine/skillCatalog'

describe('skill catalog', () => {
  it('has unique skill ids', () => {
    const ids = SKILL_CATALOG.map((s) => s.id)
    assert.equal(ids.length, new Set(ids).size)
  })

  it('lists every general-owned skill', () => {
    const catalog = new Set(SKILL_CATALOG.map((s) => s.id))
    const missing: string[] = []
    for (const g of GENERALS) {
      for (const skill of g.skills) {
        if (!catalog.has(skill)) missing.push(`${g.id}:${skill}`)
      }
    }
    assert.deepEqual(missing, [])
  })

  it('points owners at generals who have the skill (or 急襲 via 鑿險)', () => {
    const byId = new Map(GENERALS.map((g) => [g.id, g]))
    for (const spec of SKILL_CATALOG) {
      assert.ok(spec.owners.length > 0, `${spec.id} has no owners`)
      for (const owner of spec.owners) {
        const g = byId.get(owner)
        assert.ok(g, `${spec.id} owner ${owner} is unknown`)
        if (spec.id === 'jixi') {
          assert.ok(g.skills.includes('zaoxian'), `${owner} should own 鑿險 for 急襲`)
          continue
        }
        assert.ok(
          g.skills.includes(spec.id),
          `${spec.id} not on ${owner} (has ${g.skills.join(',')})`,
        )
      }
    }
  })

  it('marks implemented skills as ok', () => {
    const bad = SKILL_CATALOG.filter((s) => s.status !== 'ok').map((s) => `${s.id}:${s.status}`)
    assert.deepEqual(bad, [])
  })
})
