import type { CardDef, PackId } from '../engine/types'

/** Minimal standard + selected 軍爭 cards for MVP */
export const CARD_DEFS: CardDef[] = [
  ...dup('sha', '殺', 'basic', 'standard', 30),
  ...dup('shan', '閃', 'basic', 'standard', 15),
  ...dup('tao', '桃', 'basic', 'standard', 8),

  ...dup('wuzhong', '無中生有', 'trick', 'standard', 4),
  ...dup('guohe', '過河拆橋', 'trick', 'standard', 6),
  ...dup('shunshou', '順手牽羊', 'trick', 'standard', 5),
  ...dup('jiedao', '借刀殺人', 'trick', 'standard', 2),
  ...dup('wuxie', '無懈可擊', 'trick', 'standard', 4),
  ...dup('nanman', '南蠻入侵', 'trick', 'standard', 3),
  ...dup('wanjian', '萬箭齊發', 'trick', 'standard', 1),
  ...dup('juedou', '決鬥', 'trick', 'standard', 3),
  ...dup('taoyuan', '桃園結義', 'trick', 'standard', 1),
  ...dup('wugu', '五穀豐登', 'trick', 'standard', 1),

  ...eq('zhuge', '諸葛連弩', 'weapon', 'standard', 1, 1),
  ...eq('cixiong', '雌雄雙股劍', 'weapon', 'standard', 2, 1),
  ...eq('qinggang', '青釭劍', 'weapon', 'standard', 2, 1),
  ...eq('qinglong', '青龍偃月刀', 'weapon', 'standard', 3, 1),
  ...eq('zhangba', '丈八蛇矛', 'weapon', 'standard', 3, 1),
  ...eq('guanshi', '貫石斧', 'weapon', 'standard', 3, 1),
  ...eq('fangtian', '方天畫戟', 'weapon', 'standard', 4, 1),
  ...eq('qilingong', '麒麟弓', 'weapon', 'standard', 5, 1),
  ...eq('bagua', '八卦陣', 'armor', 'standard', undefined, 2),
  ...eq('renwang', '仁王盾', 'armor', 'standard', undefined, 1),
  ...eq('chitu', '赤兔', 'horseMinus', 'standard', undefined, 1),
  ...eq('dayuan', '大宛', 'horseMinus', 'standard', undefined, 1),
  ...eq('zixing', '紫騂', 'horseMinus', 'standard', undefined, 1),
  ...eq('dilu', '的盧', 'horsePlus', 'standard', undefined, 1),
  ...eq('jueying', '絕影', 'horsePlus', 'standard', undefined, 1),
  ...eq('zhuahuang', '爪黃飛電', 'horsePlus', 'standard', undefined, 1),

  ...dup('huogong', '火攻', 'trick', 'ex', 3),
  ...dup('tiesuo', '鐵索連環', 'trick', 'ex', 3),
  ...dup('bingliang', '兵糧寸斷', 'trick', 'ex', 2),
  ...dup('lebu', '樂不思蜀', 'trick', 'ex', 3),
  ...eq('hanbing', '寒冰劍', 'weapon', 'ex', 2, 1),
  ...eq('guding', '古錠刀', 'weapon', 'ex', 2, 1),
  ...eq('tengjia', '藤甲', 'armor', 'ex', undefined, 2),
  ...eq('baiyin', '白銀獅子', 'armor', 'ex', undefined, 1),
  ...eq('hualiu', '驊騮', 'horsePlus', 'ex', undefined, 1),
]

function dup(
  kind: string,
  name: string,
  type: CardDef['type'],
  pack: PackId,
  count: number,
): CardDef[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${pack}_${kind}_${i}`,
    name,
    type,
    pack,
    kind,
  }))
}

function eq(
  kind: string,
  name: string,
  slot: NonNullable<CardDef['slot']>,
  pack: PackId,
  attackRange: number | undefined,
  count: number,
): CardDef[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${pack}_${kind}_${i}`,
    name,
    type: 'equip' as const,
    pack,
    kind,
    slot,
    attackRange,
  }))
}

const byId = new Map(CARD_DEFS.map((c) => [c.id, c]))

export function getCardDef(id: string): CardDef {
  const d = byId.get(id)
  if (!d) throw new Error(`Unknown card ${id}`)
  return d
}

export function buildDeck(packs: PackId[]): CardDef[] {
  const set = new Set(packs)
  return CARD_DEFS.filter((c) => set.has(c.pack))
}
