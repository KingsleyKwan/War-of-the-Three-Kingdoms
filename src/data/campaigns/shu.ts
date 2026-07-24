import type { CampaignStage } from './types'

export const SHU_CAMPAIGN_ID = 'shu'

export const SHU_STAGES: CampaignStage[] = [
  {
    id: 'shu_01',
    index: 1,
    title: '桃園起兵',
    subtitle: '討黃巾',
    era: '中平元年',
    battlefieldCityId: 'yingchuan',
    cityFactions: {
      luoyang: '漢廷',
      yingchuan: '黃巾',
      xinye: '未定',
      jingzhou: '未定',
    },
    movements: [
      { fromCityId: 'luoyang', toCityId: 'yingchuan', actor: '劉備', note: '義軍討賊' },
    ],
    briefing:
      '涿縣桃園，劉備與關羽、張飛義結金蘭。黃巾亂起，三人率義軍奔潁川。\n「願與二弟共掃妖氛，匡扶漢室！」\n鼓角聲中，劉備拔劍當先。',
    epilogueWin:
      '黃巾潰散，義軍旗號初立。劉備望向南方——荊州大地，尚有更長的路。',
    epilogueLose:
      '義軍初挫。若無立足之地，桃園之誓恐成空談。',
    bridgeNext: '劉備投奔劉表，屯兵新野。曹軍南下之訊，已在風中。',
    packs: ['standard'],
    playerGeneralId: 'liubei',
    allies: [
      { generalId: 'guanyu', name: '關羽' },
      { generalId: 'zhangfei', name: '張飛' },
    ],
    enemies: [
      { generalId: 'zhangjiao', name: '張角' },
      { generalId: 'soldier', name: '黃巾兵' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'shu_02',
    index: 2,
    title: '博望坡',
    subtitle: '孔明初陣',
    era: '建安十二年',
    battlefieldCityId: 'xinye',
    cityFactions: {
      xinye: '劉備',
      jingzhou: '劉表',
      xuchang: '曹操',
      wancheng: '曹操',
    },
    movements: [
      { fromCityId: 'xuchang', toCityId: 'xinye', actor: '曹軍', note: '南征' },
      { fromCityId: 'jingzhou', toCityId: 'xinye', actor: '諸葛亮', note: '出山輔主' },
    ],
    prevLink: '三顧茅廬後，諸葛亮出山。曹軍來犯，博望坡草木皆兵。',
    briefing:
      '新野城外，孔明羽扇輕搖：「主公勿憂，博望一戰，可挫曹軍銳氣。」\n關張尚疑，劉備卻已信任軍師。\n火光將起，伏兵待發。',
    epilogueWin:
      '博望火起，曹軍退走。關張對孔明另眼相看——蜀中智囊，自此坐鎮軍帳。',
    epilogueLose:
      '新野難守。若再無援，荊州之路將更坎坷。',
    bridgeNext: '荊州風雲變幻。入川之路，需先鋒與老將並肩。',
    packs: ['standard', 'fire'],
    playerGeneralId: 'liubei',
    allies: [
      { generalId: 'zhugeliang', name: '諸葛亮' },
      { generalId: 'zhaoyun', name: '趙雲' },
    ],
    allyChoices: ['guanyu', 'zhangfei', 'pangtong'],
    enemies: [
      { generalId: 'xiahoudun', name: '夏侯惇' },
      { generalId: 'soldier', name: '曹軍' },
      { generalId: 'soldier', name: '曹軍' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'shu_03',
    index: 3,
    title: '定軍山',
    subtitle: '老將黃忠',
    era: '建安二十四年',
    battlefieldCityId: 'dingjun',
    cityFactions: {
      dingjun: '曹操',
      chengdu: '劉備',
      hanzhong: '曹操',
      jingzhou: '劉備',
    },
    movements: [
      { fromCityId: 'chengdu', toCityId: 'dingjun', actor: '黃忠', note: '奪漢中' },
      { fromCityId: 'hanzhong', toCityId: 'dingjun', actor: '夏侯淵', note: '守山' },
    ],
    prevLink: '入蜀稍定，兵鋒北指漢中。定軍山高峻，老將黃忠請戰。',
    briefing:
      '定軍山鼓聲動地。黃忠挽弓：「今番不斬夏侯淵，誓不回營！」\n魏延側翼相助，劉備於陣後觀旗。\n此一戰，定漢中歸屬。',
    epilogueWin:
      '夏侯淵隕，漢中震動。劉備稱王漢中——蜀漢基業，至此成形。',
    epilogueLose:
      '定軍未下，漢中仍在曹軍之手。入川之功，尚未圓滿。',
    bridgeNext: '蜀傳暫告一段落。更多關卡將隨後續擴充。',
    packs: ['standard', 'wind'],
    playerGeneralId: 'liubei',
    allies: [
      { generalId: 'huangzhong', name: '黃忠' },
      { generalId: 'weiyan', name: '魏延' },
    ],
    allyChoices: ['zhaoyun', 'fazheng', 'zhugeliang'],
    enemies: [
      { generalId: 'xiahouyuan', name: '夏侯淵' },
      { generalId: 'zhanghe', name: '張郃' },
      { generalId: 'soldier', name: '曹軍' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'xiahouyuan' },
  },
]
