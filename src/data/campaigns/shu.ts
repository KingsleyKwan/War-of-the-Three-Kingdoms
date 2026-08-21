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
    movements: [{ fromCityId: 'luoyang', toCityId: 'yingchuan', actor: '劉備', note: '義軍討賊' }],
    briefing:
      '涿縣桃園，桃花落在三人杯盞之間。劉備、關羽、張飛焚香結義：「不求同年同月同日生，但願同年同月同日死。」\n黃巾亂起，三人率鄉勇奔潁川。張飛已按不住丈八矛：「大哥發話，飛去取那賊首首級！」\n劉備按劍：「願與二弟共掃妖氛，匡扶漢室。」\n鼓角聲中，義軍旗號第一次升起。',
    epilogueWin:
      '黃巾潰散，義軍旗號初立。劉備望向洛陽——漢室尚在，路卻比桃園裡想的更長。',
    epilogueLose:
      '義軍初挫。若無立足之地，桃園之誓恐成空談。',
    bridgeNext: '董卓亂政，關東諸侯起兵。劉關張亦隨盟軍，兵鋒指向虎牢關——那裡有呂布。',
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
    title: '虎牢關',
    subtitle: '三英戰呂布',
    era: '初平元年',
    battlefieldCityId: 'hulao',
    cityFactions: {
      changan: '董卓',
      luoyang: '董卓',
      hulao: '董卓',
      sishui: '董卓',
      yingchuan: '聯軍',
    },
    movements: [
      { fromCityId: 'yingchuan', toCityId: 'hulao', actor: '劉關張', note: '請戰呂布' },
      { fromCityId: 'luoyang', toCityId: 'hulao', actor: '呂布', note: '為卓守關' },
    ],
    prevLink: '桃園之後，三人隨盟軍討董。汜水關華雄已授首，下一座關，是呂布親自把守的虎牢。',
    briefing:
      '虎牢關前，呂布連斬數將，諸侯無人敢出。張飛怒目：「燕人張飛在此！呂布，可敢下來決死？」\n關羽側目：「三弟莫急。備與雲長，當與你共會此賊。」\n劉備提雙股劍上馬。三騎並轡，塵土飛揚——後世所傳「三英戰呂布」，就在今日。\n關前鼓聲如雷。赤兔與三匹戰馬撞在一處。',
    epilogueWin:
      '呂布回馬入關，畫戟猶在顫。諸侯目送三騎歸來，始知劉備不是販履小輩。\n桃園之義，第一次讓天下聽見。',
    epilogueLose:
      '呂布未退，虎牢如鐵。若三兄弟折於此關，桃園之誓便止於今日。',
    bridgeNext: '討董無果，劉備流轉多年，方才寄身新野。三顧茅廬之後，孔明出山。',
    packs: ['standard'],
    playerGeneralId: 'liubei',
    allies: [
      { generalId: 'guanyu', name: '關羽' },
      { generalId: 'zhangfei', name: '張飛' },
    ],
    enemies: [
      { generalId: 'lvbu', name: '呂布' },
      { generalId: 'soldier', name: '西涼騎' },
      { generalId: 'soldier', name: '西涼騎' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'lvbu' },
  },
  {
    id: 'shu_03',
    index: 3,
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
    prevLink: '流轉半生後，劉備三顧茅廬。諸葛亮出山，曹軍隨即來犯——博望坡，草木皆兵。',
    briefing:
      '新野城外，孔明羽扇輕搖：「主公勿憂。夏侯惇性急，可誘入博望，火攻破之。」\n關張尚疑，低聲道：「量一村夫，安知兵法？」劉備止之：「勿可亂言。吾得孔明，如魚得水。」\n黃昏，博望坡枯草沒膝。伏兵已伏，火種已備。\n夏侯惇的旗出現在坡口時，孔明只說了一句：「放火。」',
    epilogueWin:
      '博望火起，曹軍退走。關張對孔明另眼相看——蜀中智囊，自此坐鎮軍帳。',
    epilogueLose:
      '新野難守。若再無援，荊州之路將更坎坷。',
    bridgeNext: '曹操大軍隨後南下。新野不守，當陽長阪，將是趙雲的戰場。',
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
    id: 'shu_04',
    index: 4,
    title: '長阪坡',
    subtitle: '子龍救主',
    era: '建安十三年',
    battlefieldCityId: 'changban',
    cityFactions: {
      changban: '曹操',
      xinye: '曹操',
      jingzhou: '曹操',
      xiangyang: '曹操',
      xuchang: '曹操',
    },
    movements: [
      { fromCityId: 'xinye', toCityId: 'changban', actor: '劉備', note: '棄城南奔' },
      { fromCityId: 'xuchang', toCityId: 'changban', actor: '曹操', note: '輕騎追擊' },
    ],
    prevLink: '博望小勝難擋大軍。曹操自北席捲荊州，劉備棄新野，攜民南走，於當陽長阪被輕騎追上。',
    briefing:
      '當陽道上，難民如潮。曹軍鐵騎已近，塵土吞沒夕陽。糜夫人投井，阿斗尚在懷中。\n趙雲勒馬回陣：「主公先行！雲去萬軍中取幼主。」\n劉備淚眼望北：「子龍若有不測，備有何面目見天下？」張飛已在橋上橫矛：「燕人張翼德在此——誰敢來決死？」\n這一仗不必全殲追兵。只要撐過追擊，便能走入江東的東風裡。',
    epilogueWin:
      '趙雲抱阿斗歸陣，鎧甲盡赤。劉備擲子於地：「為汝這孺子，幾損我一員大將！」\n長阪橋後，江水聲漸近。赤壁在望。',
    epilogueLose:
      '長阪亂軍中，旗幟散盡。若子龍不歸、幼主不還，劉備便再無立足的明天。',
    bridgeNext: '逃至夏口，孔明已過江說孫權。孫劉聯軍，將在赤壁迎戰曹操。',
    packs: ['standard', 'ex'],
    playerGeneralId: 'liubei',
    allies: [{ generalId: 'zhaoyun', name: '趙雲' }],
    allyChoices: ['zhangfei', 'guanyu', 'zhugeliang'],
    enemies: [
      { generalId: 'zhangliao', name: '張遼' },
      { generalId: 'xuchu', name: '許褚' },
      { generalId: 'soldier', name: '曹軍輕騎' },
      { generalId: 'soldier', name: '曹軍輕騎' },
    ],
    victory: { type: 'survive_rounds', rounds: 4 },
  },
  {
    id: 'shu_05',
    index: 5,
    title: '赤壁聯兵',
    subtitle: '借東風',
    era: '建安十三年',
    battlefieldCityId: 'chibi',
    cityFactions: {
      chibi: '孫權',
      chaisang: '孫權',
      jingzhou: '劉備',
      xuchang: '曹操',
      changban: '曹操',
    },
    movements: [
      { fromCityId: 'jingzhou', toCityId: 'chibi', actor: '劉備', note: '聯吳抗曹' },
      { fromCityId: 'xuchang', toCityId: 'chibi', actor: '曹操', note: '南征' },
    ],
    prevLink: '長阪死裡逃生。孔明舌戰群儒，說動孫權。周瑜主戰，東風將起。',
    briefing:
      '長江北岸樓船連營，南岸孫劉旗號並立。孔明立於七星壇上，羽扇不搖：「欲破曹公，只欠東風。」\n劉備望著江面：「備兵微將寡，全仗伯符之弟與周公瑾。此戰若勝，漢室或有轉機。」\n趙雲按槍：「主公在此，雲在此。曹賊渡江，先問槍。」\n今夜水聲、火光、東南風，將一齊來到。',
    epilogueWin:
      '連營火起，北軍大潰。劉備與周瑜分兵追擊，荊州諸郡落入視野。\n隆中對的第一步，終於落地。',
    epilogueLose:
      '東風未至，聯軍不支。若曹軍渡江，孫劉皆危，漢室更無復燃之機。',
    bridgeNext: '赤壁之後，劉備得荊州立足。益州劉璋暗弱，入川之路，要交給鳳雛。',
    packs: ['standard', 'ex', 'fire'],
    requiredCardKinds: ['火殺', 'tiesuo', 'huogong'],
    excludeCardKinds: ['lebu', 'bingliang'],
    playerGeneralId: 'liubei',
    allies: [
      { generalId: 'zhugeliang', name: '諸葛亮' },
      { generalId: 'zhaoyun', name: '趙雲' },
    ],
    allyChoices: ['guanyu', 'zhouyu', 'pangtong'],
    enemies: [
      { generalId: 'caocao', name: '曹操' },
      { generalId: 'xuchu', name: '許褚' },
      { generalId: 'zhangliao', name: '張遼' },
      { generalId: 'soldier', name: '水軍' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'shu_06',
    index: 6,
    title: '奪蜀入川',
    subtitle: '鳳雛落州',
    era: '建安十七年',
    battlefieldCityId: 'fu',
    cityFactions: {
      chengdu: '劉璋',
      fu: '劉璋',
      jingzhou: '劉備',
      hanzhong: '未定',
      xinye: '劉備',
    },
    movements: [
      { fromCityId: 'jingzhou', toCityId: 'fu', actor: '劉備', note: '應璋入川' },
      { fromCityId: 'chengdu', toCityId: 'fu', actor: '劉璋', note: '疑備拒客' },
    ],
    prevLink: '劉璋懼張魯、懼曹操，招劉備入川相助。龐統力主取蜀。涪城宴上，笑裡已有刀。',
    briefing:
      '涪水關外，山路如腸。劉璋部將已有二心，龐統附耳：「主公，今日不取，更待何時？」\n劉備猶豫：「吾以仁義待人，安可自食其言？」龐統正色：「亂世以武力，仁義在事成之後。」\n雒城未下，落鳳坡的名字尚未被寫進史書。先拿下涪城，益州才有縫隙。\n鼓響。客軍變主軍的那一刻，就在眼前。',
    epilogueWin:
      '涪城易手，劉璋退守成都。劉備望著益州沃野，知隆中對的第二步已經邁出。\n鳳雛的計策，換來了一塊能建國的土。',
    epilogueLose:
      '入川受挫，客軍反成孤軍。若不能奪州，荊州亦將兩面受敵。',
    bridgeNext: '成都既下，兵鋒北指漢中。定軍山高峻，老將黃忠請戰。',
    packs: ['standard', 'ex', 'fire'],
    playerGeneralId: 'liubei',
    allies: [{ generalId: 'pangtong', name: '龐統' }],
    allyChoices: ['zhugeliang', 'zhaoyun', 'fazheng'],
    enemies: [
      { generalId: 'liuzhang', name: '劉璋' },
      { generalId: 'soldier', name: '張任' },
      { generalId: 'soldier', name: '蜀兵' },
      { generalId: 'soldier', name: '蜀兵' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'liuzhang' },
  },
  {
    id: 'shu_07',
    index: 7,
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
    prevLink: '入蜀稍定，兵鋒北指漢中。定軍山高峻，老將黃忠請戰，法正為之畫策。',
    briefing:
      '定軍山鼓聲動地。黃忠挽弓：「今番不斬夏侯淵，誓不回營！」魏延在側：「老將軍取前，延斷其後。」\n法正指著山勢：「敵將輕敵。可示弱誘其下山，然後十面擊之。」\n劉備於陣後觀旗，心知此戰不只是一座山——漢中若得，王業可成。\n號角起。白髮與蒼鷹一同撲向夏侯淵的旗。',
    epilogueWin:
      '夏侯淵隕，漢中震動。劉備稱王漢中——蜀漢基業，至此成形。',
    epilogueLose:
      '定軍未下，漢中仍在曹軍之手。入川之功，尚未圓滿。',
    bridgeNext: '章武之後，南中叛亂。諸葛亮請命南征，要在北伐之前先定後方。',
    packs: ['standard', 'wind', 'yijiang'],
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
  {
    id: 'shu_08',
    index: 8,
    title: '南征孟獲',
    subtitle: '攻心為上',
    era: '建興三年',
    battlefieldCityId: 'nanzhong',
    cityFactions: {
      nanzhong: '孟獲',
      chengdu: '劉備',
      dingjun: '劉備',
      hanzhong: '劉備',
      jingzhou: '未定',
    },
    movements: [
      { fromCityId: 'chengdu', toCityId: 'nanzhong', actor: '諸葛亮', note: '南征' },
      { fromCityId: 'nanzhong', toCityId: 'chengdu', actor: '孟獲', note: '據險抗蜀' },
    ],
    prevLink: '先主既崩，南中雍闓、孟獲並反。孔明以「攻心為上」，親自渡瀘南征。',
    briefing:
      '瀘水毒霧蒸騰，南中鼓聲如雨。孟獲被俘已不只一次，卻總昂頭：「若再擒我，方才心服。」\n孔明不忘先主遺命：「南中不定，北伐無根。」趙雲、魏延請戰，他羽扇輕搖：「可戰。但不可屠城。要他心服，不要他滅種。」\n叢林深處，祝融的飛刀與孟獲的象陣，正等著最後一次交手。',
    epilogueWin:
      '孟獲率族拜服：「公天威也，南人不復反矣。」孔明班師，不留兵、不運糧。\n蜀傳至此可告一段落——北伐的路，還在祁山以外。',
    epilogueLose:
      '南中未定，後方不穩。若孟獲復起，成都亦將不得安枕，北伐更無從談起。',
    bridgeNext: '蜀傳完。北定中原之志，留給後來的星斗。',
    packs: ['standard', 'ex', 'forest', 'fire'],
    playerGeneralId: 'zhugeliang',
    allies: [
      { generalId: 'zhaoyun', name: '趙雲' },
      { generalId: 'weiyan', name: '魏延' },
    ],
    allyChoices: ['huangzhong', 'machao', 'jiangwei'],
    enemies: [
      { generalId: 'menghuo', name: '孟獲' },
      { generalId: 'zhurong', name: '祝融' },
      { generalId: 'soldier', name: '南蠻兵' },
      { generalId: 'soldier', name: '南蠻兵' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'menghuo' },
  },
]
