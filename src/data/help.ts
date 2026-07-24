/** Card / skill / equip help text for in-match detail panels */
export const CARD_HELP: Record<string, string> = {
  sha: '【殺】出牌階段對攻擊範圍內一名角色使用。目標可打出【閃】抵消；否則受到1點傷害。每階段限一張（諸葛連弩／咆哮除外）。',
  shan: '【閃】成為【殺】的目標時打出，抵消之。',
  tao: '【桃】出牌階段令自己回1體力；或在角色瀕死時使用令其回1體力。',
  wuzhong: '【無中生有】摸兩張牌。',
  guohe: '【過河拆橋】棄置目標區域內你選擇的一張牌（手牌或裝備）。',
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
  cixiong:
    '【雌雄雙股劍】武器・範圍2。指定異性目標使用【殺】時，目標須棄一張手牌或令你摸一張牌。',
  qinggang: '【青釭劍】武器・範圍2。你的【殺】無視目標防具。',
  qinglong:
    '【青龍偃月刀】武器・範圍3。你的【殺】被【閃】抵消後，可再出一張【殺】攻擊同一目標。',
  zhangba: '【丈八蛇矛】武器・範圍3。可將兩張手牌當【殺】使用。',
  guanshi:
    '【貫石斧】武器・範圍3。你的【殺】被【閃】抵消後，可棄兩張牌令此【殺】仍造成傷害。',
  fangtian:
    '【方天畫戟】武器・範圍4。你使用的【殺】是你最後的手牌時，可以額外指定至多兩個目標。',
  qilingong:
    '【麒麟弓】武器・範圍5。你使用【殺】對目標造成傷害後，可棄置其一匹坐騎。',
  bagua: '【八卦陣】防具。需要使用【閃】時可進行判定，紅色判定牌視為打出【閃】。',
  renwang: '【仁王盾】防具。黑色【殺】對你無效。',
  chitu: '【赤兔】-1坐騎。與其他角色距離-1。',
  dayuan: '【大宛】-1坐騎。',
  zixing: '【紫騂】-1坐騎。',
  dilu: '【的盧】+1坐騎。其他角色與你距離+1。',
  jueying: '【絕影】+1坐騎。',
  zhuahuang: '【爪黃飛電】+1坐騎。',
  hanbing:
    '【寒冰劍】武器・範圍2。你使用【殺】造成傷害時，可改為棄置目標兩張牌（不造成傷害）。',
  guding: '【古錠刀】武器・範圍2。目標沒有手牌時，此【殺】傷害+1。',
  tengjia:
    '【藤甲】防具。【南蠻入侵】與【萬箭齊發】對你無效；你受到的火焰傷害+1。',
  baiyin:
    '【白銀獅子】防具。你每次受到傷害時，至多承受1點傷害；當你失去裝備區裡的此牌時，你回覆1點體力。',
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
