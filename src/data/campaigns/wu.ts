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
    movements: [{ fromCityId: 'chaisang', toCityId: 'sishui', actor: '孫堅', note: '聯軍先鋒' }],
    briefing:
      '孫堅率江東子弟會盟討董。帳中孫策請為先鋒，孫堅按住虎子的肩：「此去兇險，你且隨我，看江東兒郎如何破關。」\n關前鼓角齊鳴。華雄的旗在霧裡若隱若現。\n孫堅提古錠刀上馬：「董卓亂政，天下共討——兒郎們，隨我衝陣！」\n猛虎之師，第一次把江東的名字送到中原耳中。',
    epilogueWin:
      '關前小勝，孫堅威名遠播。江東子弟望向東方——那邊，才是真正的基業。',
    epilogueLose:
      '討董受挫。若無轉機，江東旗號恐難再揚。',
    bridgeNext: '孫堅身故後，孫策接過虎符，以玉璽為質借兵東渡，欲平定江東。',
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
    movements: [{ fromCityId: 'chaisang', toCityId: 'chaisang', actor: '孫策', note: '掃平山賊' }],
    prevLink: '孫策以玉璽為質，借兵東渡，誓取江東六郡。周瑜自舒城來會，小霸王之勢初成。',
    briefing:
      '嚴白虎等據地稱霸，山寨連綿。孫策與周瑜並騎臨江：「江東形勝，豈可落於賊手？」\n周泰已在陣前解開衣甲，胸口舊傷如地圖：「主公但進，泰以身當之。」\n孫策大笑，揚鞭指向對岸：「江東兒郎，今日定此州！」\n小霸王之號，將在此役鑄成。',
    epilogueWin:
      '嚴白虎敗走，江東初定。孫策據有吳會——孫氏之業，由此而興。',
    epilogueLose:
      '江東未平。若嚴白虎復起，孫氏基業難穩。',
    bridgeNext: '孫策遇刺後，孫權繼位。北有曹操，西有劉備。長江之上，赤壁東風將起。',
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
    prevLink: '孫權繼位，魯肅主聯劉、周瑜主戰。黃蓋已願苦肉，東風起時，火攻可破連營。',
    briefing:
      '長江浩渺，曹軍樓船連營。周瑜、魯肅立於船頭，火油已備。黃蓋在側，背上杖傷未愈。\n孫權拔劍斫案：「孤與曹賊，勢不兩立！諸將再有言降者，有如此案。」\n周瑜望北岸：「丞相連船，是天賜我也。只待東南風起。」\n今夜，只要東風。',
    epilogueWin:
      '火光映江，北軍大潰。孫權望北岸殘焰：「江東可保。」南北對峙之局，由此而定。',
    epilogueLose:
      '東風未至，連營未破。若曹軍渡江，江東危矣。',
    bridgeNext: '赤壁之後，曹操未再大舉下江。張遼卻奉命守合肥——江淮之間，還有一場惡仗。',
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
  {
    id: 'wu_04',
    index: 4,
    title: '逍遙津',
    subtitle: '張遼止啼',
    era: '建安二十年',
    battlefieldCityId: 'hefei',
    cityFactions: {
      hefei: '曹操',
      chaisang: '孫權',
      ruxu: '孫權',
      xuchang: '曹操',
      chibi: '孫權',
    },
    movements: [
      { fromCityId: 'chaisang', toCityId: 'hefei', actor: '孫權', note: '親征合肥' },
      { fromCityId: 'xuchang', toCityId: 'hefei', actor: '張遼', note: '八百破十萬' },
    ],
    prevLink: '孫權乘曹操西征漢中，親提十萬之眾攻合肥。守將張遼、李典、樂進兵不滿七千。',
    briefing:
      '合肥城頭，張遼的旗在風裡繃直。孫權立於逍遙津南岸，望著對岸那一點魏幟：「不過一偏將耳，何足懼？」\n甘寧請戰，太史慈按槍。張遼卻已選死士八百，夜半出城。\n黎明，喊殺聲從營後炸開。江東兒郎第一次聽見那句會傳遍江南的話——「張遼來也！」\n這一仗要衝破他的突襲，守住孫權的旗。',
    epilogueWin:
      '張遼退入城中。孫權於逍遙津整理殘部，望著合肥城牆，知江淮不是可以一口吞下的。\n從此江南小兒夜啼，母親只說：張遼來了。',
    epilogueLose:
      '逍遙津橋斷，孫權幾乎被擒。若主公有失，江東基業便止於此津。',
    bridgeNext: '合肥未下，關羽卻已敗走麥城。劉備盡起蜀中之兵，要為義弟報仇——夷陵在望。',
    packs: ['standard', 'ex', 'fire'],
    playerGeneralId: 'sunquan',
    allies: [
      { generalId: 'ganning', name: '甘寧' },
      { generalId: 'zhoutai', name: '周泰' },
    ],
    allyChoices: ['taishici', 'lvmeng', 'xusheng'],
    enemies: [
      { generalId: 'zhangliao', name: '張遼' },
      { generalId: 'soldier', name: '李典' },
      { generalId: 'soldier', name: '樂進' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'wu_05',
    index: 5,
    title: '夷陵之戰',
    subtitle: '火燒連營',
    era: '章武二年',
    battlefieldCityId: 'yiling',
    cityFactions: {
      yiling: '劉備',
      jingzhou: '孫權',
      chaisang: '孫權',
      chengdu: '劉備',
      chibi: '孫權',
    },
    movements: [
      { fromCityId: 'chengdu', toCityId: 'yiling', actor: '劉備', note: '為羽報仇' },
      { fromCityId: 'chaisang', toCityId: 'yiling', actor: '陸遜', note: '堅守待變' },
    ],
    prevLink: '關羽敗亡，劉備盡起蜀兵東征。陸遜臨危受命，先讓後打，要等蜀軍在密林裡把營連起來。',
    briefing:
      '夷陵峽江如線，兩岸林木蔽日。劉備連營數百里，軍心焦躁。陸遜卻按兵不動，只道：「火攻之計，只待東風。」\n孫權在建業坐鎮，書信只寫：「丞相但便宜行事。江東存亡，託於陸伯言。」\n帳中諸將不服，陸遜拔劍：「再有言戰者，斬。」\n直至蜀營煙灶連成一線——他才下令：放火。',
    epilogueWin:
      '連營火起，蜀軍大潰。劉備逃入白帝。陸遜立於峽口，不追：「魏軍或將乘虛。」\n江東再一次用火，寫下自己的疆界。',
    epilogueLose:
      '陸遜未及放火，蜀軍已破吳陣。若夷陵失守，建業震動，孫權難安。',
    bridgeNext: '夷陵之後，曹丕屢次伐吳。濡須口是長江的門閂——孫權將親自守在那裡。',
    packs: ['standard', 'ex', 'fire'],
    requiredCardKinds: ['火殺', 'huogong'],
    playerGeneralId: 'sunquan',
    allies: [
      { generalId: 'luxun', name: '陸遜' },
      { generalId: 'xusheng', name: '徐盛' },
    ],
    allyChoices: ['zhoutai', 'ganning', 'lusu'],
    enemies: [
      { generalId: 'liubei', name: '劉備' },
      { generalId: 'zhangfei', name: '張飛' },
      { generalId: 'huangzhong', name: '黃忠' },
      { generalId: 'soldier', name: '蜀兵' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'wu_06',
    index: 6,
    title: '濡須口',
    subtitle: '江淮門閂',
    era: '黃初三年',
    battlefieldCityId: 'ruxu',
    cityFactions: {
      ruxu: '孫權',
      hefei: '曹操',
      chaisang: '孫權',
      xuchang: '曹操',
      yiling: '孫權',
    },
    movements: [
      { fromCityId: 'xuchang', toCityId: 'ruxu', actor: '曹軍', note: '南下試江' },
      { fromCityId: 'chaisang', toCityId: 'ruxu', actor: '孫權', note: '親守濡須' },
    ],
    prevLink: '夷陵勝後，北方仍不死心。曹軍數次臨江，濡須塢是江東最後的門閂。',
    briefing:
      '濡須口浪高過櫓。孫權立於塢上，望見北岸魏幟如林。周泰解衣，把舊傷給主公看：「此皆為主公所留。」\n孫權執其臂，淚下：「卿乃孤之戈壁。」徐盛在水寨佈疑城，陸遜守側翼。\n北岸鼓響。曹操（或其後繼）的水軍要試這道門，能不能被撞開。\n江東基業，就守在這一段江上。',
    epilogueWin:
      '北軍不克而退。孫權於濡須塢上遠望中原，知這條江已經變成國界。\n吳傳至此可告一段落。孫氏三代，終於把江東寫進了天下的版圖。',
    epilogueLose:
      '濡須塢破，江防洞開。若建業有失，孫氏三代心血，便付之東流。',
    bridgeNext: '吳傳完。長江依舊，南北仍在。',
    packs: ['standard', 'ex', 'wind', 'yijiang'],
    playerGeneralId: 'sunquan',
    allies: [
      { generalId: 'zhoutai', name: '周泰' },
      { generalId: 'luxun', name: '陸遜' },
    ],
    allyChoices: ['xusheng', 'ganning', 'lusu'],
    enemies: [
      { generalId: 'zhangliao', name: '張遼' },
      { generalId: 'zhanghe', name: '張郃' },
      { generalId: 'xuchu', name: '許褚' },
      { generalId: 'soldier', name: '魏水軍' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
]
