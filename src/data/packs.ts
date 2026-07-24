import type { PackId } from '../engine/types'

export interface PackDef {
  id: PackId
  name: string
  /** Short description for settings / intel */
  hint: string
  /** Standard is always on for rules completeness */
  alwaysOn?: boolean
}

/** All card/general packs shipped in this build */
export const PACK_DEFS: PackDef[] = [
  {
    id: 'standard',
    name: '標準包',
    hint: '基礎牌組與經典武將',
    alwaysOn: true,
  },
  {
    id: 'ex',
    name: '軍爭',
    hint: '火攻、鐵索連環、火殺、藤甲等',
  },
]

export const ALL_PACK_IDS: PackId[] = PACK_DEFS.map((p) => p.id)

export function packLabel(id: PackId): string {
  return PACK_DEFS.find((p) => p.id === id)?.name ?? id
}

export function formatPackList(packs: PackId[]): string {
  const ordered = ALL_PACK_IDS.filter((id) => packs.includes(id))
  return ordered.map(packLabel).join(' + ') || packLabel('standard')
}

/** Normalize: always include standard, drop unknowns, stable order */
export function normalizePacks(packs: PackId[]): PackId[] {
  const set = new Set<PackId>(packs)
  set.add('standard')
  return ALL_PACK_IDS.filter((id) => set.has(id))
}
