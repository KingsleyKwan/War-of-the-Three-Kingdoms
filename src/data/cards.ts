import type { CardDef, PackId, Suit } from '../engine/types'

type Spec = {
  kind: string
  name: string
  type: CardDef['type']
  pack: PackId
  suit: Suit
  rank: number
  slot?: CardDef['slot']
  attackRange?: number
  damageNature?: 'normal' | 'fire' | 'thunder'
}

/** Cards with explicit 花色 / 點數 for skill conditions */
const SPECS: Spec[] = [
  // —— 殺（多為黑色）——
  ...spread('sha', '殺', 'basic', 'standard', [
    ['spade', 2], ['spade', 3], ['spade', 4], ['spade', 5], ['spade', 6], ['spade', 7],
    ['spade', 8], ['spade', 9], ['spade', 10],
    ['club', 2], ['club', 3], ['club', 4], ['club', 5], ['club', 6], ['club', 7],
    ['club', 8], ['club', 9], ['club', 10], ['club', 11],
    ['heart', 10], ['heart', 11], ['heart', 12],
    ['diamond', 6], ['diamond', 7], ['diamond', 8], ['diamond', 9], ['diamond', 10],
    ['diamond', 13],
  ]),
  // —— 閃（紅色）——
  ...spread('shan', '閃', 'basic', 'standard', [
    ['heart', 2], ['heart', 13],
    ['diamond', 2], ['diamond', 3], ['diamond', 4], ['diamond', 5], ['diamond', 6],
    ['diamond', 7], ['diamond', 8], ['diamond', 9], ['diamond', 10], ['diamond', 11],
    ['diamond', 11], ['heart', 8], ['heart', 9], ['heart', 11],
  ]),
  // —— 桃（紅桃）——
  ...spread('tao', '桃', 'basic', 'standard', [
    ['heart', 3], ['heart', 4], ['heart', 6], ['heart', 7], ['heart', 8],
    ['heart', 9], ['heart', 12], ['diamond', 12],
  ]),
  // —— 錦囊 ——
  ...spread('wuzhong', '無中生有', 'trick', 'standard', [
    ['heart', 7], ['heart', 8], ['heart', 9], ['heart', 11],
  ]),
  ...spread('guohe', '過河拆橋', 'trick', 'standard', [
    ['spade', 3], ['spade', 4], ['spade', 12],
    ['club', 3], ['club', 4], ['heart', 12],
  ]),
  ...spread('shunshou', '順手牽羊', 'trick', 'standard', [
    ['spade', 3], ['spade', 4], ['spade', 11], ['diamond', 3], ['diamond', 4],
  ]),
  ...spread('jiedao', '借刀殺人', 'trick', 'standard', [['club', 12], ['club', 13]]),
  ...spread('wuxie', '無懈可擊', 'trick', 'standard', [
    ['spade', 11], ['club', 12], ['club', 13], ['diamond', 12],
  ]),
  ...spread('nanman', '南蠻入侵', 'trick', 'standard', [
    ['spade', 7], ['spade', 13], ['club', 7],
  ]),
  ...spread('wanjian', '萬箭齊發', 'trick', 'standard', [['heart', 1]]),
  ...spread('juedou', '決鬥', 'trick', 'standard', [
    ['spade', 1], ['club', 1], ['diamond', 1],
  ]),
  ...spread('taoyuan', '桃園結義', 'trick', 'standard', [['heart', 1]]),
  ...spread('wugu', '五穀豐登', 'trick', 'standard', [['heart', 3]]),
  // —— 裝備 ——
  eq('zhuge', '諸葛連弩', 'weapon', 'standard', 'diamond', 1, 1),
  eq('cixiong', '雌雄雙股劍', 'weapon', 'standard', 'spade', 2, 2),
  eq('qinggang', '青釭劍', 'weapon', 'standard', 'spade', 6, 2),
  eq('qinglong', '青龍偃月刀', 'weapon', 'standard', 'spade', 5, 3),
  eq('zhangba', '丈八蛇矛', 'weapon', 'standard', 'spade', 12, 3),
  eq('guanshi', '貫石斧', 'weapon', 'standard', 'diamond', 5, 3),
  eq('fangtian', '方天畫戟', 'weapon', 'standard', 'diamond', 12, 4),
  eq('qilingong', '麒麟弓', 'weapon', 'standard', 'heart', 5, 5),
  eq('bagua', '八卦陣', 'armor', 'standard', 'spade', 2),
  eq('bagua', '八卦陣', 'armor', 'standard', 'club', 2),
  eq('renwang', '仁王盾', 'armor', 'standard', 'club', 2),
  eq('chitu', '赤兔', 'horseMinus', 'standard', 'heart', 5),
  eq('dayuan', '大宛', 'horseMinus', 'standard', 'spade', 13),
  eq('zixing', '紫騂', 'horseMinus', 'standard', 'diamond', 13),
  eq('dilu', '的盧', 'horsePlus', 'standard', 'club', 5),
  eq('jueying', '絕影', 'horsePlus', 'standard', 'spade', 5),
  eq('zhuahuang', '爪黃飛電', 'horsePlus', 'standard', 'heart', 13),
  // —— 軍爭 ——
  ...spread('huogong', '火攻', 'trick', 'ex', [
    ['heart', 2], ['heart', 3], ['diamond', 12],
  ]),
  ...spread('tiesuo', '鐵索連環', 'trick', 'ex', [
    ['spade', 11], ['spade', 12], ['club', 10],
  ]),
  // 火殺（軍爭；赤壁等關卡主題）
  ...spreadNature('sha', '火殺', 'basic', 'ex', 'fire', [
    ['heart', 4], ['heart', 7], ['heart', 10],
    ['diamond', 4], ['diamond', 5],
  ]),
  ...spreadNature('sha', '雷殺', 'basic', 'ex', 'thunder', [
    ['spade', 4], ['spade', 5], ['spade', 6], ['spade', 7], ['spade', 8],
    ['club', 5], ['club', 6], ['club', 7], ['club', 8],
  ]),
  ...spread('bingliang', '兵糧寸斷', 'trick', 'ex', [
    ['spade', 10], ['club', 4],
  ]),
  ...spread('lebu', '樂不思蜀', 'trick', 'ex', [
    ['spade', 6], ['club', 6], ['heart', 6],
  ]),
  eq('hanbing', '寒冰劍', 'weapon', 'ex', 'spade', 2, 2),
  eq('guding', '古錠刀', 'weapon', 'ex', 'spade', 1, 2),
  eq('tengjia', '藤甲', 'armor', 'ex', 'spade', 2),
  eq('tengjia', '藤甲', 'armor', 'ex', 'club', 2),
  eq('baiyin', '白銀獅子', 'armor', 'ex', 'club', 1),
  eq('hualiu', '驊騮', 'horsePlus', 'ex', 'diamond', 13),
]

function spread(
  kind: string,
  name: string,
  type: CardDef['type'],
  pack: PackId,
  list: Array<[Suit, number]>,
): Spec[] {
  return list.map(([suit, rank]) => ({ kind, name, type, pack, suit, rank }))
}

function spreadNature(
  kind: string,
  name: string,
  type: CardDef['type'],
  pack: PackId,
  damageNature: 'fire' | 'thunder',
  list: Array<[Suit, number]>,
): Spec[] {
  return list.map(([suit, rank]) => ({ kind, name, type, pack, suit, rank, damageNature }))
}

function eq(
  kind: string,
  name: string,
  slot: NonNullable<CardDef['slot']>,
  pack: PackId,
  suit: Suit,
  rank: number,
  attackRange?: number,
): Spec {
  return { kind, name, type: 'equip', pack, suit, rank, slot, attackRange }
}

export const CARD_DEFS: CardDef[] = SPECS.map((s, i) => ({
  id: `${s.pack}_${s.kind}_${s.suit}_${s.rank}_${i}`,
  name: s.name,
  type: s.type,
  pack: s.pack,
  kind: s.kind,
  suit: s.suit,
  rank: s.rank,
  slot: s.slot,
  attackRange: s.attackRange,
  damageNature: s.damageNature,
}))

const byId = new Map(CARD_DEFS.map((c) => [c.id, c]))

export function getCardDef(id: string): CardDef {
  const d = byId.get(id)
  if (!d) throw new Error(`Unknown card ${id}`)
  return d
}

export function buildDeck(
  packs: PackId[],
  opts?: { requiredKinds?: string[]; excludeKinds?: string[] },
): CardDef[] {
  const set = new Set(packs)
  const excluded = new Set(opts?.excludeKinds ?? [])
  const matchesKey = (c: CardDef, key: string) => c.kind === key || c.name === key
  const deck = CARD_DEFS.filter(
    (c) => set.has(c.pack) && ![...excluded].some((k) => matchesKey(c, k)),
  )

  const required = opts?.requiredKinds ?? []
  if (!required.length) return deck

  const out = [...deck]
  const has = (key: string) => out.some((c) => matchesKey(c, key))
  for (const key of required) {
    if (excluded.has(key)) continue
    if (has(key)) continue
    for (const c of CARD_DEFS) {
      if (!matchesKey(c, key)) continue
      if (out.some((d) => d.id === c.id)) continue
      out.push(c)
    }
  }
  return out
}
