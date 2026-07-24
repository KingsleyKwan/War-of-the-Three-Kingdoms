/** Card / skill / equip help text for in-match detail panels */
export const CARD_HELP: Record<string, string> = {
  sha: '【殺】出牌階段對攻擊範圍內一名角色使用。目標可打出【閃】抵消；否則受到1點傷害。每階段限一張（諸葛連弩／咆哮除外）。',
  shan: '【閃】成為【殺】的目標時打出，抵消之。',
  tao: '【桃】出牌階段令自己回1體力；或在角色瀕死時使用令其回1體力。',
  wuzhong: '【無中生有】摸兩張牌。',
  guohe: '【過河拆橋】棄置目標區域內一張牌。',
  shunshou: '【順手牽羊】獲得目標區域內一張牌（距離限制簡化為任意存活角色）。',
  jiedao: '【借刀殺人】（本版本暫未實裝完整效果）。',
  wuxie: '【無懈可擊】抵消錦囊效果（本版本簡化）。',
  nanman: '【南蠻入侵】除你以外的角色需打出【殺】，否則受1點傷害。',
  wanjian: '【萬箭齊發】除你以外的角色需打出【閃】，否則受1點傷害。',
  juedou: '【決鬥】與目標輪流打出【殺】，先無法打出者受傷。',
  taoyuan: '【桃園結義】所有角色各回1體力。',
  wugu: '【五穀豐登】（本版本簡化為摸牌效果未完整）。',
  huogong: '【火攻】對目標造成1點火焰傷害（本版本簡化）。',
  tiesuo: '【鐵索連環】（本版本暫作普通錦囊占位）。',
  bingliang: '【兵糧寸斷】延時錦囊（本版本占位）。',
  lebu: '【樂不思蜀】延時錦囊（本版本占位）。',
  zhuge: '【諸葛連弩】武器・攻擊範圍1。出牌階段可使用任意張【殺】。',
  cixiong: '【雌雄雙股劍】武器・範圍2。',
  qinggang: '【青釭劍】武器・範圍2。無視防具（簡化）。',
  qinglong: '【青龍偃月刀】武器・範圍3。',
  zhangba: '【丈八蛇矛】武器・範圍3。',
  guanshi: '【貫石斧】武器・範圍3。',
  fangtian: '【方天畫戟】武器・範圍4。',
  qilingong: '【麒麟弓】武器・範圍5。',
  bagua: '【八卦陣】防具。可進行判定當【閃】（簡化）。',
  renwang: '【仁王盾】防具。黑色【殺】無效。',
  chitu: '【赤兔】-1坐騎。與其他角色距離-1。',
  dayuan: '【大宛】-1坐騎。',
  zixing: '【紫騂】-1坐騎。',
  dilu: '【的盧】+1坐騎。其他角色與你距離+1。',
  jueying: '【絕影】+1坐騎。',
  zhuahuang: '【爪黃飛電】+1坐騎。',
  hanbing: '【寒冰劍】武器・範圍2。',
  guding: '【古錠刀】武器・範圍2。目標無手牌時傷害+1（簡化待擴）。',
  tengjia: '【藤甲】防具。',
  baiyin: '【白銀獅子】防具。',
  hualiu: '【驊騮】+1坐騎。',
}

export function suitSymbol(suit: string | undefined): string {
  return (
    { spade: '♠', heart: '♥', club: '♣', diamond: '♦' } as Record<string, string>
  )[suit ?? ''] ?? ''
}

export function suitName(suit: string | undefined): string {
  return (
    { spade: '黑桃', heart: '紅桃', club: '梅花', diamond: '方塊' } as Record<
      string,
      string
    >
  )[suit ?? ''] ?? ''
}

export function rankLabel(rank: number | undefined): string {
  if (rank === undefined) return ''
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

export function isRedSuit(suit: string | undefined): boolean {
  return suit === 'heart' || suit === 'diamond'
}
