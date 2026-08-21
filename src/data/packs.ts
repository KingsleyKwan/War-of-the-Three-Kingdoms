import type { PackId } from '../engine/types'

export interface PackDef {
  id: PackId
  name: string
  /** Short description for settings / intel */
  hint: string
  /** Standard is always on for rules completeness */
  alwaysOn?: boolean
  /** Cards from this pack enter the deck when enabled */
  hasCards?: boolean
  /** Generals from this pack appear in free-play pick when enabled */
  hasGenerals?: boolean
}

/** All packs shipped in this build */
export const PACK_DEFS: PackDef[] = [
  {
    id: 'standard',
    name: '標準包',
    hint: '基礎牌組與經典武將',
    alwaysOn: true,
    hasCards: true,
    hasGenerals: true,
  },
  {
    id: 'ex',
    name: '軍爭',
    hint: '火攻、鐵索連環、火殺、雷殺、酒、閃電、藤甲、朱雀羽扇等',
    hasCards: true,
    hasGenerals: false,
  },
  {
    id: 'wind',
    name: '風',
    hint: '夏侯淵、黃忠、魏延、周泰等武將',
    hasCards: false,
    hasGenerals: true,
  },
  {
    id: 'fire',
    name: '火',
    hint: '典韋、荀彧、龐統、太史慈等武將',
    hasCards: false,
    hasGenerals: true,
  },
  {
    id: 'forest',
    name: '林',
    hint: '徐晃、孫堅、魯肅、賈詡、孟獲等武將',
    hasCards: false,
    hasGenerals: true,
  },
  {
    id: 'mountain',
    name: '山',
    hint: '張郃、姜維、劉禪、孫策等武將',
    hasCards: false,
    hasGenerals: true,
  },
  {
    id: 'yijiang',
    name: '一將成名',
    hint: '法正、徐盛等一將武將',
    hasCards: false,
    hasGenerals: true,
  },
]

export const ALL_PACK_IDS: PackId[] = PACK_DEFS.map((p) => p.id)

/** Packs that contribute cards to the match deck */
export const CARD_PACK_IDS: PackId[] = PACK_DEFS.filter((p) => p.hasCards).map((p) => p.id)

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

/** Deck builder only needs packs that actually have cards */
export function cardPacksOnly(packs: PackId[]): PackId[] {
  const set = new Set(packs)
  return CARD_PACK_IDS.filter((id) => set.has(id) || id === 'standard')
}
