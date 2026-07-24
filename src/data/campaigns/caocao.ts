import type { GameSnapshot, Identity, MatchConfig, PackId, VictoryRule } from '../../engine/types'
import { getGeneral, listGeneralsForPick } from '../generals'
import { normalizePacks } from '../packs'
import type { MapMovement } from './map'

export interface CampaignStage {
  id: string
  index: number
  title: string
  subtitle: string
  /** Historical era label, e.g. 中平元年 */
  era: string
  /** City id on the campaign map */
  battlefieldCityId: string
  /** City ownership at this moment in the story */
  cityFactions: Record<string, string>
  /** Troop / character movements shown on the map */
  movements: MapMovement[]
  /** Optional: only show these cities (defaults to factions + movements) */
  visibleCityIds?: string[]
  /** Story before the match */
  briefing: string
  /** Link from previous stage (shown above briefing) */
  prevLink?: string
  /** Base epilogue on win (dynamic lines appended) */
  epilogueWin: string
  /** Base epilogue on lose */
  epilogueLose: string
  /** After a win, tease the next stage */
  bridgeNext?: string
  /**
   * Theme packs for this battlefield (unioned with packs of featured generals).
   * Standard is always included. Example: 赤壁 → 軍爭 for 火殺／鐵索.
   */
  packs: PackId[]
  /** Guarantee these card kinds / names appear in the deck */
  requiredCardKinds?: string[]
  /** Drop these kinds / names (e.g. trim delayed tricks on themed battles) */
  excludeCardKinds?: string[]
  /** Player is always 曹操 unless overridden */
  playerGeneralId: string
  allies: Array<{ generalId: string; name?: string }>
  /** Optional ally the player may pick (one) */
  allyChoices?: string[]
  enemies: Array<{ generalId: string; name?: string }>
  victory: VictoryRule
}

export const CAOCAO_CAMPAIGN_ID = 'caocao'

export const CAOCAO_STAGES: CampaignStage[] = [
  {
    id: 'cc_01',
    index: 1,
    title: '潁川之戰',
    subtitle: '黃巾餘黨',
    era: '中平元年',
    battlefieldCityId: 'yingchuan',
    cityFactions: {
      luoyang: '漢廷',
      yingchuan: '黃巾',
      xuchang: '未定',
      wancheng: '未定',
    },
    movements: [
      { fromCityId: 'luoyang', toCityId: 'yingchuan', actor: '曹操', note: '奉詔討黃巾' },
      { fromCityId: 'yingchuan', toCityId: 'xuchang', actor: '張角餘黨', note: '據地爲亂' },
    ],
    briefing:
      '中平元年，黃巾餘黨盤據潁川。夜色沉沉，營火遠近明滅。\n曹操勒馬陣前，望見敵旌上「張角」二字，心中暗忖：此戰若不能速勝，黃巾勢必復燃。\n「傳令——全軍聽令，破敵立威！」\n鼓聲驟起，鐵騎踏破荒草，直指敵陣。',
    epilogueWin:
      '潁川煙塵漸散。黃巾旗折，亂兵四散入林。\n曹操收刀入鞘，望向洛陽方向——這一仗，只是起步。關東烽火將起，亂世才剛揭幕。',
    epilogueLose:
      '潁川未下，黃巾氣焰更盛。曹操敗退收兵，夜營燈火稀疏。\n若此關不破，往後討董、爭兗，皆無根基。',
    bridgeNext: '未幾，董卓廢立，關東諸侯起兵。曹操亦率部會於聯軍，兵鋒直指汜水關。',
    packs: ['standard'],
    playerGeneralId: 'caocao',
    allies: [],
    enemies: [
      { generalId: 'zhangjiao', name: '張角' },
      { generalId: 'soldier', name: '黃巾兵' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'cc_02',
    index: 2,
    title: '汜水關之戰',
    subtitle: '討董先鋒',
    era: '初平元年',
    battlefieldCityId: 'sishui',
    cityFactions: {
      changan: '董卓',
      luoyang: '董卓',
      sishui: '董卓',
      hulao: '董卓',
      yingchuan: '曹操',
    },
    movements: [
      { fromCityId: 'yingchuan', toCityId: 'sishui', actor: '曹操', note: '聯軍先鋒' },
      { fromCityId: 'luoyang', toCityId: 'sishui', actor: '華雄', note: '守關拒敵' },
    ],
    prevLink: '潁川破黃巾後，曹操聲名漸起。董卓亂政，關東盟軍會師——下一刀，砍向汜水關。',
    briefing:
      '關東聯軍討董，汜水關前卻連折數將。華雄刀下無人能敵，軍中人人色變。\n曹操拍案而起：「華雄不過一偏將耳！我願親往，試其鋒銳。」\n夜霧未散，關前號角低鳴。此行只為斬將奪旗，以振聯軍士氣。',
    epilogueWin:
      '華雄旗倒，汜水關鼓聲一頓。聯軍士氣大振，帳中紛紛舉杯。\n曹操卻未久留——他知董卓主力尚在虎牢、洛陽，此勝只換得一息進攻之機。',
    epilogueLose:
      '華雄未斬，聯軍氣奪。曹操退回本陣，耳邊仍是西涼鐵騎踏塵之聲。\n若汜水不破，往後濮陽、兖州之危，恐更難解。',
    bridgeNext: '討董未竟，呂布卻奪兖州。曹操聞報色變——根基若失，一切皆空。軍馬急轉，直奔濮陽。',
    packs: ['standard'],
    playerGeneralId: 'caocao',
    allies: [{ generalId: 'xiahoudun' }],
    allyChoices: ['xuchu', 'zhangliao', 'dianwei_proxy'],
    enemies: [
      { generalId: 'huaxiong', name: '華雄' },
      { generalId: 'soldier', name: '西涼騎' },
      { generalId: 'soldier', name: '西涼騎' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'huaxiong' },
  },
  {
    id: 'cc_03',
    index: 3,
    title: '濮陽之戰',
    subtitle: '呂布來攻',
    era: '興平元年',
    battlefieldCityId: 'puyang',
    cityFactions: {
      yanzhou: '呂布',
      puyang: '呂布',
      xuchang: '曹操',
      luoyang: '未定',
      sishui: '未定',
    },
    movements: [
      { fromCityId: 'yanzhou', toCityId: 'puyang', actor: '呂布', note: '奪兖攻城' },
      { fromCityId: 'xuchang', toCityId: 'puyang', actor: '曹操', note: '回師死守' },
    ],
    prevLink: '汜水關斬華雄後，聯軍內訌、董卓西遷。曹操立足未穩，呂布已自兖州殺來濮陽。',
    briefing:
      '呂布奪兖州，鐵騎直逼濮陽。城頭風急，旗角撕裂如紙。\n曹操與典韋、許褚立於垛口，望見呂布赤兔如電，心知此戰不可退。\n「守住城池——今夜，濮陽不能落！」\n箭雨將至，城門緊閉，決戰開始。',
    epilogueWin:
      '濮陽城頭火光漸熄。呂布引殘騎北撤，兖州危局暫緩。\n曹操撫城垛而立：亂世爭雄，先要有一塊能站穩的土。',
    epilogueLose:
      '濮陽失守，煙塵吞沒城門。曹操敗走，典韋許褚死戰殿後的喊聲猶在耳中。\n兖州若盡失，曹操傳之路，將更坎坷。',
    bridgeNext: '兖州稍定，曹操南征張繡。宛城風光雖好，卻暗藏殺機——賈詡之計，尚在城中。',
    packs: ['standard', 'ex'],
    playerGeneralId: 'caocao',
    allies: [{ generalId: 'xuchu' }],
    allyChoices: ['zhangliao', 'guojia', 'xiahoudun'],
    enemies: [
      { generalId: 'lvbu', name: '呂布' },
      { generalId: 'diaochan', name: '貂蟬' },
      { generalId: 'soldier', name: '并州兵' },
      { generalId: 'soldier', name: '并州兵' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'cc_04',
    index: 4,
    title: '宛城之戰',
    subtitle: '張繡反噬',
    era: '建安二年',
    battlefieldCityId: 'wancheng',
    cityFactions: {
      wancheng: '張繡',
      xuchang: '曹操',
      puyang: '曹操',
      yanzhou: '曹操',
      luoyang: '未定',
    },
    movements: [
      { fromCityId: 'xuchang', toCityId: 'wancheng', actor: '曹操', note: '南征張繡' },
      { fromCityId: 'wancheng', toCityId: 'xuchang', actor: '張繡', note: '偽降夜襲' },
    ],
    prevLink: '濮陽卻呂布後，曹操根基漸穩。南陽張繡據宛，曹操親征，欲一舉收服。',
    briefing:
      '宛城外，曹軍大營連綿。張繡出降，帳中酒宴尚溫，夜色卻忽然變了。\n刀光自營門起，火光映得半邊天赤。\n曹操拔劍大呼：「保護中軍——張繡反了！」',
    epilogueWin:
      '宛城火勢被壓下，張繡敗走。曹操衣甲猶有焦痕，望著南天沉默良久。\n這一仗提醒他：亂世不止刀槍，還有人心與計謀。',
    epilogueLose:
      '夜襲得手，曹營大亂。曹操倉皇突圍，身後是燃燒的旗幟與未竟的南征。\n若宛城之恥不雪，許昌亦難安枕。',
    bridgeNext: '北方袁紹勢力日盛，官渡一線遲早一戰。曹操收攏兵馬，目光轉向河北。',
    packs: ['standard', 'ex'],
    playerGeneralId: 'caocao',
    allies: [{ generalId: 'dianwei_proxy', name: '典韋' }],
    allyChoices: ['xuchu', 'xiahoudun', 'guojia'],
    enemies: [
      { generalId: 'zhangxiu', name: '張繡' },
      { generalId: 'simayi', name: '賈詡' },
      { generalId: 'soldier', name: '宛城兵' },
      { generalId: 'soldier', name: '宛城兵' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
  {
    id: 'cc_05',
    index: 5,
    title: '官渡之戰',
    subtitle: '決戰河北',
    era: '建安五年',
    battlefieldCityId: 'guandu',
    cityFactions: {
      ye: '袁紹',
      guandu: '曹操',
      xuchang: '曹操',
      puyang: '曹操',
      wancheng: '曹操',
      luoyang: '曹操',
    },
    movements: [
      { fromCityId: 'ye', toCityId: 'guandu', actor: '袁紹', note: '大軍南下' },
      { fromCityId: 'xuchang', toCityId: 'guandu', actor: '曹操', note: '以少敵眾' },
    ],
    prevLink: '宛城驚魂之後，北方袁紹傾巢南下。曹操屯兵官渡，背靠許昌，決一死戰。',
    briefing:
      '官渡黃沙漫天，袁軍營寨望不到邊。曹操帳中燭火搖晃，諸將面色凝重。\n「彼眾我寡，然糧道可斷、士氣可奪。今晚，只許勝，不許退。」\n夜風掠過河岸，戰鼓自遠而近。',
    epilogueWin:
      '袁軍崩潰，河北震動。曹操於官渡高崗遠望鄴城方向，知天下重心已悄然南移。\n許昌燈火，比往日更亮一分。',
    epilogueLose:
      '官渡防線崩裂，曹軍北退。許昌告急之聲不絕於耳。\n若袁紹長驅而入，曹操傳的下半部，恐無從寫起。',
    bridgeNext: '北方稍定，江東孫權與劉備卻在長江聯手。赤壁的東風，已經在吹。',
    packs: ['standard', 'ex'],
    playerGeneralId: 'caocao',
    allies: [{ generalId: 'xunyu_proxy', name: '荀彧' }],
    allyChoices: ['guojia', 'xiahoudun', 'zhangliao'],
    enemies: [
      { generalId: 'yuanshao', name: '袁紹' },
      { generalId: 'soldier', name: '顏良' },
      { generalId: 'soldier', name: '文醜' },
      { generalId: 'soldier', name: '河北軍' },
      { generalId: 'soldier', name: '河北軍' },
    ],
    victory: { type: 'kill_target', targetGeneralId: 'yuanshao' },
  },
  {
    id: 'cc_06',
    index: 6,
    title: '赤壁之戰',
    subtitle: '江東烽火',
    era: '建安十三年',
    battlefieldCityId: 'chibi',
    cityFactions: {
      chibi: '孫權',
      chaisang: '孫權',
      xuchang: '曹操',
      guandu: '曹操',
      ye: '曹操',
      wancheng: '曹操',
    },
    movements: [
      { fromCityId: 'xuchang', toCityId: 'chibi', actor: '曹操', note: '南征江東' },
      { fromCityId: 'chaisang', toCityId: 'chibi', actor: '周瑜', note: '聯劉抗曹' },
    ],
    prevLink: '官渡勝後，曹操威震北方。八十萬大軍號稱南下，江面之上，東風將起。',
    briefing:
      '長江浩渺，曹軍樓船連營。對岸周瑜、孫權旗號鮮明，火油之氣隱隱可聞。\n曹操立於船頭：「破江東，天下可定！」\n水聲拍舷，火光將在今夜決定南北之勢。',
    epilogueWin:
      '江面殘焰漸熄。曹軍雖疲，旗幟仍在。曹操望著南岸，知此勝不過一時——江東根深，未可輕言一統。',
    epilogueLose:
      '東風起，連營火。樓船傾覆，北軍大潰。曹操敗走華容道方向，衣甲盡濕。\n赤壁一敗，南北對峙之局就此定下。',
    bridgeNext: '曹操傳暫告一段落。亂世未盡，更多關卡將隨後續擴充而至。',
    packs: ['standard', 'ex'],
    requiredCardKinds: ['火殺', 'tiesuo', 'huogong'],
    excludeCardKinds: ['lebu', 'bingliang'],
    playerGeneralId: 'caocao',
    allies: [{ generalId: 'xuchu' }],
    allyChoices: ['zhangliao', 'xiahoudun', 'guojia'],
    enemies: [
      { generalId: 'zhouyu', name: '周瑜' },
      { generalId: 'sunquan', name: '孫權' },
      { generalId: 'zhaoyun', name: '趙雲' },
      { generalId: 'soldier', name: '江東水軍' },
      { generalId: 'soldier', name: '江東水軍' },
    ],
    victory: { type: 'eliminate_enemies' },
  },
]

/** Map proxy ids used only in choices / allies */
const CHOICE_ALIAS: Record<string, string> = {
  dianwei_proxy: 'xuchu', // MVP: 典韋用許褚代替直至專屬武將加入
  xunyu_proxy: 'guojia', // 荀彧暫以郭嘉代替
}

export function resolveGeneralId(id: string): string {
  return CHOICE_ALIAS[id] ?? id
}

/** Theme packs + packs of every general featured on this stage */
export function resolveStagePacks(stage: CampaignStage): PackId[] {
  const ids = new Set<string>([stage.playerGeneralId])
  for (const a of stage.allies) ids.add(a.generalId)
  for (const id of stage.allyChoices ?? []) ids.add(id)
  for (const e of stage.enemies) ids.add(e.generalId)

  const packs: PackId[] = [...stage.packs]
  for (const rawId of ids) {
    try {
      const g = getGeneral(resolveGeneralId(rawId))
      packs.push(g.pack)
    } catch {
      /* ignore unknown until resolved */
    }
  }
  return normalizePacks(packs)
}

const PROGRESS_KEY = 'wtk_caocao_progress'

export function loadCampaignProgress(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const n = raw ? parseInt(raw, 10) : 1
    return Number.isFinite(n) && n >= 1 ? n : 1
  } catch {
    return 1
  }
}

export function unlockNextStage(clearedIndex: number): void {
  const cur = loadCampaignProgress()
  if (clearedIndex >= cur) {
    localStorage.setItem(PROGRESS_KEY, String(clearedIndex + 1))
  }
}

export function buildStageMatch(
  stage: CampaignStage,
  chosenAllyId?: string,
): MatchConfig {
  const players: MatchConfig['players'] = []

  players.push({
    name: '你',
    isHuman: true,
    generalId: stage.playerGeneralId,
    identity: 'none',
  })

  for (const a of stage.allies) {
    players.push({
      name: a.name ?? '友軍',
      isHuman: false,
      generalId: resolveGeneralId(a.generalId),
      identity: 'none',
    })
  }

  if (chosenAllyId) {
    players.push({
      name: '友軍',
      isHuman: false,
      generalId: resolveGeneralId(chosenAllyId),
      identity: 'none',
    })
  }

  for (const e of stage.enemies) {
    players.push({
      name: e.name ?? '敵軍',
      isHuman: false,
      generalId: resolveGeneralId(e.generalId),
      identity: 'none',
    })
  }

  return {
    mode: 'duel',
    packs: resolveStagePacks(stage),
    requiredCardKinds: stage.requiredCardKinds,
    excludeCardKinds: stage.excludeCardKinds,
    humanSeat: 0,
    players,
    victory: stage.victory,
    campaignStageId: stage.id,
  }
}

/** Human side = human + fixed allies + chosen ally; enemies = rest */
export function buildStageEpilogue(stage: CampaignStage, game: GameSnapshot): string {
  const won = !!game.winnerIds?.includes(0)
  const fixedAllies = stage.allies.length
  const enemyCount = stage.enemies.length
  const hasChosenAlly = game.players.length === 1 + fixedAllies + 1 + enemyCount
  const lastFriendly = hasChosenAlly ? fixedAllies + 1 : fixedAllies
  const friends = game.players.filter((p) => p.id <= lastFriendly)
  const foes = game.players.filter((p) => p.id > lastFriendly)

  const aliveFriends = friends.filter((p) => p.alive)
  const deadFriends = friends.filter((p) => !p.alive)
  const aliveFoes = foes.filter((p) => p.alive)
  const deadFoes = foes.filter((p) => !p.alive)

  const friendLabel = (p: (typeof friends)[0]) => (p.isHuman ? '曹操' : p.name)

  const lines: string[] = []
  lines.push(won ? stage.epilogueWin : stage.epilogueLose)

  lines.push(
    `此役結束於第 ${game.round} 輪。我方尚存 ${aliveFriends.length} 人${
      aliveFriends.length ? `：${aliveFriends.map(friendLabel).join('、')}` : ''
    }；陣亡 ${deadFriends.length} 人${
      deadFriends.length ? `：${deadFriends.map(friendLabel).join('、')}` : ''
    }。`,
  )

  if (deadFoes.length) {
    lines.push(`敵方陣亡：${deadFoes.map((p) => p.name).join('、')}。`)
  }
  if (aliveFoes.length) {
    lines.push(
      won
        ? `戰場餘燼中，敵旌仍見：${aliveFoes.map((p) => p.name).join('、')}。`
        : `敵方仍在：${aliveFoes.map((p) => p.name).join('、')}。`,
    )
  }

  const kills = game.killLog ?? []
  if (kills.length) {
    const notable = kills
      .filter((k) => k.killerName)
      .map((k) => `${k.killerName} 斬 ${k.victimName}`)
    if (notable.length) {
      lines.push(`交鋒記錄：${notable.join('；')}。`)
    }
    const last = kills[kills.length - 1]
    if (last?.killerName) {
      lines.push(
        won
          ? `終局一擊：${last.killerName} 擊倒 ${last.victimName}，勝負遂定。`
          : `敗因一擊：${last.killerName} 擊倒 ${last.victimName}，戰局崩壞。`,
      )
    }
  } else if (won) {
    lines.push('敵勢已盡，曹操於陣前收兵。')
  }

  if (won && stage.bridgeNext) {
    lines.push(stage.bridgeNext)
  } else if (!won) {
    lines.push('重整旗鼓，或可再戰此關——曹操傳的路，不會止於此敗。')
  }

  return lines.join('\n')
}

export function buildFreeMatch(opts: {
  mode: 'duel' | 'identity5' | 'identity8'
  packs: PackId[]
  /** If true, offer full general list; else random 3 */
  forceSelectGeneral: boolean
}): MatchConfig {
  const packs = normalizePacks(opts.packs)
  const allIds = listGeneralsForPick(packs).map((g) => g.id)
  const offeredGenerals = opts.forceSelectGeneral
    ? allIds
    : [...allIds].sort(() => Math.random() - 0.5).slice(0, 3)

  if (opts.mode === 'duel') {
    return {
      mode: 'duel',
      packs,
      humanSeat: 0,
      players: [
        { name: '你', isHuman: true, generalId: '', identity: 'none' },
        { name: '電腦', isHuman: false, generalId: '', identity: 'none' },
      ],
      deferGeneralPick: true,
      offeredGenerals,
    }
  }

  const identities: Identity[] =
    opts.mode === 'identity8'
      ? ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'rebel', 'spy']
      : ['lord', 'loyal', 'rebel', 'rebel', 'spy']

  const shuffled = [...identities].sort(() => Math.random() - 0.5)
  const players: MatchConfig['players'] = shuffled.map((identity, i) => ({
    name: i === 0 ? '你' : `電腦${i}`,
    isHuman: i === 0,
    generalId: '',
    identity,
  }))

  return {
    mode: opts.mode,
    packs,
    humanSeat: 0,
    players,
    deferGeneralPick: true,
    offeredGenerals,
  }
}
