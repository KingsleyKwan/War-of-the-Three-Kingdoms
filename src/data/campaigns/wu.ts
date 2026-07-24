import type { CampaignStage } from './types'

export const WU_CAMPAIGN_ID = 'wu'

export const WU_STAGES: CampaignStage[] = [
  {
    id: 'wu_01',
    index: 1,
    title: '孫堅討董',
    subtitle: '江東猛虎',
    era: '初平元年',
    battlefieldCityId: 'sishui',
    cityFactions: {
      changan: '董卓',
      luoyang: '董卓',
      sishui: '董卓',
      chaisang: '孫堅',
    },
    movements: [
      { fromCityId: 'chaisang', toCityId: 'sishui', actor: '孫堅', note: '聯軍先鋒' },
    ],
    briefing:
      '孫堅率江東子弟會盟討董。關前鼓角齊鳴，猛虎之師直撲汜水。\n「董卓亂政，天下共討——兒郎們，隨我衝陣！」',
    epilogueWin:
      '關前小勝，孫堅威名遠播。江東子弟望向東方——那邊，才是真正的基業。',
    epilogueLose:
      '討董受挫。若無轉機，江東旗號恐難再揚。',
    bridgeNext: '孫堅身故後，孫策接過虎符，欲平定江東。',
    packs: ['standard', 'forest'],
    playerGeneralId: 'sunjian',
    allies: [{ generalId: 'sunce', name: '孫策' }],
    allyChoices: ['huanggai', 'ganning', 'zhoutai'],
    enemies: [
      { generalId: 'huaxiong', name: '華雄' },
      { generalId: 'soldier', name: '西涼騎' },
      { generalId: 'soldier', name: '西涼騎' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'wu_02',
    index: 2,
    title: '小霸王平江東',
    subtitle: '孫策崛起',
    era: '興平二年',
    battlefieldCityId: 'chaisang',
    cityFactions: {
      chaisang: '孫策',
      jingzhou: '劉表',
      chibi: '未定',
    },
    movements: [
      { fromCityId: 'chaisang', toCityId: 'chaisang', actor: '孫策', note: '掃平山賊' },
    ],
    prevLink: '孫策以玉璽為質，借兵東渡，誓取江東六郡。',
    briefing:
      '嚴白虎等據地稱霸。孫策與周瑜、周泰並騎臨陣：「江東兒郎，今日定此州！」\n小霸王之號，將在此役鑄成。',
    epilogueWin:
      '嚴白虎敗走，江東初定。孫策據有吳會——孫氏之業，由此而興。',
    epilogueLose:
      '江東未平。若嚴白虎復起，孫氏基業難穩。',
    bridgeNext: '北有曹操，西有劉備。長江之上，赤壁東風將起。',
    packs: ['standard', 'mountain', 'wind'],
    playerGeneralId: 'sunce',
    allies: [
      { generalId: 'zhouyu', name: '周瑜' },
      { generalId: 'zhoutai', name: '周泰' },
    ],
    allyChoices: ['taishici', 'huanggai', 'ganning'],
    enemies: [
      { generalId: 'yanbaihu', name: '嚴白虎' },
      { generalId: 'soldier', name: '山賊' },
      { generalId: 'soldier', name: '山賊' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'yanbaihu' },
  },
  {
    id: 'wu_03',
    index: 3,
    title: '赤壁之戰',
    subtitle: '火燒連環',
    era: '建安十三年',
    battlefieldCityId: 'chibi',
    cityFactions: {
      chibi: '孫權',
      chaisang: '孫權',
      xuchang: '曹操',
      jingzhou: '劉備',
    },
    movements: [
      { fromCityId: 'chaisang', toCityId: 'chibi', actor: '周瑜', note: '聯劉抗曹' },
      { fromCityId: 'xuchang', toCityId: 'chibi', actor: '曹操', note: '南征' },
    ],
    prevLink: '孫權繼位，魯肅主和、周瑜主戰。東風起時，火攻可破連營。',
    briefing:
      '長江浩渺，曹軍樓船連營。周瑜、魯肅立於船頭，火油已備。\n孫權拔劍斫案：「孤與曹賊，勢不兩立！」\n今夜，只要東風。',
    epilogueWin:
      '火光映江，北軍大潰。孫權望北岸殘焰：「江東可保。」南北對峙之局，由此而定。',
    epilogueLose:
      '東風未至，連營未破。若曹軍渡江，江東危矣。',
    bridgeNext: '吳傳暫告一段落。更多關卡將隨後續擴充。',
    packs: ['standard', 'ex', 'forest', 'fire'],
    requiredCardKinds: ['火殺', 'tiesuo', 'huogong'],
    excludeCardKinds: ['lebu', 'bingliang'],
    playerGeneralId: 'sunquan',
    allies: [
      { generalId: 'zhouyu', name: '周瑜' },
      { generalId: 'lusu', name: '魯肅' },
    ],
    allyChoices: ['huanggai', 'taishici', 'xusheng'],
    enemies: [
      { generalId: 'caocao', name: '曹操' },
      { generalId: 'xuchu', name: '許褚' },
      { generalId: 'soldier', name: '水軍' },
      { generalId: 'soldier', name: '水軍' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
]
