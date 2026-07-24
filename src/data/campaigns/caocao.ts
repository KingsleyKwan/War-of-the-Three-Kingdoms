import type { Identity, MatchConfig, PackId, VictoryRule } from '../../engine/types'

export interface CampaignStage {
  id: string
  index: number
  title: string
  subtitle: string
  briefing: string
  packs: PackId[]
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
    briefing:
      '中平元年，黃巾餘黨盤據潁川。曹操率部征討，先破張角麾下精銳，以立軍威。\n（E殺·曹操傳風格關卡・第1關）',
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
    briefing:
      '關東聯軍討伐董卓，華雄於汜水關前耀武揚威。曹操親率精銳試探敵鋒，務求斬將奪旗。\n（E殺·曹操傳風格關卡・第2關）',
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
    briefing:
      '呂布奪兗州，兵臨濮陽。曹操與典韋、許褚死守城池，務必擊退呂布軍。\n（E殺·曹操傳風格關卡・第3關）',
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
]

/** Map proxy ids used only in choices */
const CHOICE_ALIAS: Record<string, string> = {
  dianwei_proxy: 'xuchu', // MVP: 典韋用許褚代替直至專屬武將加入
}

export function resolveGeneralId(id: string): string {
  return CHOICE_ALIAS[id] ?? id
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
    packs: stage.packs,
    humanSeat: 0,
    players,
    victory: stage.victory,
    campaignStageId: stage.id,
  }
}

export function buildFreeMatch(opts: {
  mode: 'duel' | 'identity5' | 'identity8'
  useEx: boolean
  humanGeneralId: string
}): MatchConfig {
  const packs: PackId[] = opts.useEx ? ['standard', 'ex'] : ['standard']

  if (opts.mode === 'duel') {
    const foes = ['lvbu', 'zhangfei', 'ganning', 'machao'].filter(
      (id) => id !== opts.humanGeneralId,
    )
    return {
      mode: 'duel',
      packs,
      humanSeat: 0,
      players: [
        { name: '你', isHuman: true, generalId: opts.humanGeneralId, identity: 'none' },
        {
          name: '電腦',
          isHuman: false,
          generalId: foes[Math.floor(Math.random() * foes.length)],
          identity: 'none',
        },
      ],
    }
  }

  const identities: Identity[] =
    opts.mode === 'identity8'
      ? ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'rebel', 'spy']
      : ['lord', 'loyal', 'rebel', 'rebel', 'spy']

  const shuffled = [...identities].sort(() => Math.random() - 0.5)
  const needAi = shuffled.length - 1
  const pool = [
    'caocao',
    'liubei',
    'sunquan',
    'guanyu',
    'zhangfei',
    'zhouyu',
    'ganning',
    'zhaoyun',
    'simayi',
    'zhenji',
    'diaochan',
    'huatuo',
    'machao',
    'lvmeng',
    'xiahoudun',
    'zhangliao',
    'huanggai',
    'luxun',
    'daqiao',
    'sunshangxiang',
    'guojia',
    'xuchu',
    'zhugeliang',
    'huangyueying',
  ].filter((id) => id !== opts.humanGeneralId)

  const aiGenerals = [...pool].sort(() => Math.random() - 0.5).slice(0, needAi)
  const players: MatchConfig['players'] = shuffled.map((identity, i) => {
    if (i === 0) {
      return {
        name: '你',
        isHuman: true,
        generalId: opts.humanGeneralId,
        identity,
      }
    }
    return {
      name: `電腦${i}`,
      isHuman: false,
      generalId: aiGenerals[i - 1],
      identity,
    }
  })

  return { mode: opts.mode, packs, humanSeat: 0, players }
}
