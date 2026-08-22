import type { CampaignDef, CampaignStage } from './types'

export const TUTORIAL_CAMPAIGN_ID = 'tutorial'

const baseCities = {
  luoyang: '漢廷',
  yingchuan: '演武場',
}

function stage(
  partial: Omit<CampaignStage, 'cityFactions' | 'movements' | 'packs'> & {
    packs?: CampaignStage['packs']
  },
): CampaignStage {
  return {
    cityFactions: { ...baseCities },
    movements: [{ fromCityId: 'luoyang', toCityId: 'yingchuan', actor: '教習', note: '演武' }],
    packs: partial.packs ?? ['standard'],
    ...partial,
  }
}

export const TUTORIAL_STAGES: CampaignStage[] = [
  stage({
    id: 'tutorial_01',
    index: 1,
    title: '第一課・基本牌',
    subtitle: '殺、閃、出牌與棄牌',
    era: '演武',
    battlefieldCityId: 'yingchuan',
    briefing:
      '教習立於演武場：「先學會三張基本牌。【殺】攻擊距離內的敵人；對方可用【閃】抵消；【桃】回體力。出牌階段結束後，手牌不得超過體力上限。」\n這一關對手只有一名木人，你手中已備好殺與閃。依畫面框框操作即可。',
    epilogueWin: '木人倒下。基本出牌已通。下一課講錦囊與裝備。',
    epilogueLose: '木人未倒。再來一次：先出【殺】，點敵方座位，再結束出牌。',
    bridgeNext: '接著學習裝備與錦囊。',
    playerGeneralId: 'liubei',
    allies: [],
    enemies: [{ generalId: 'soldier', name: '木人' }],
    victory: { type: 'eliminate_enemies' },
    requiredCardKinds: ['sha', 'shan', 'tao'],
    setup: {
      player: {
        hp: 4,
        maxHp: 4,
        handKinds: ['sha', 'sha', 'shan', 'tao'],
        handCount: 4,
      },
      enemies: { hp: 2, maxHp: 2, handKinds: ['shan'], handCount: 2 },
    },
  }),
  stage({
    id: 'tutorial_02',
    index: 2,
    title: '第二課・錦囊與裝備',
    subtitle: '無中生有、過河拆橋、武器',
    era: '演武',
    battlefieldCityId: 'yingchuan',
    briefing:
      '教習取出連弩：「裝備區的武器會改攻擊範圍。【諸葛連弩】讓你一回合可出多張【殺】。【無中生有】摸兩張；【過河拆橋】可拆對手區域裡的牌。」\n你開場已裝備連弩，手中有錦囊。先用錦囊再出殺。',
    epilogueWin: '錦囊與裝備皆已見過。下一課處理瀕死與【桃】。',
    epilogueLose: '此關重在練習裝備與錦囊，可再打一次。',
    bridgeNext: '最後一課：瀕死求桃。',
    playerGeneralId: 'guanyu',
    allies: [],
    enemies: [
      { generalId: 'soldier', name: '木人甲' },
      { generalId: 'soldier', name: '木人乙' },
    ],
    victory: { type: 'eliminate_enemies' },
    requiredCardKinds: ['zhuge', 'wuzhong', 'guohe', 'sha'],
    setup: {
      player: {
        hp: 4,
        maxHp: 4,
        equipKinds: ['zhuge'],
        handKinds: ['wuzhong', 'guohe', 'sha', 'sha'],
        handCount: 4,
      },
      enemies: { hp: 2, maxHp: 2, handCount: 3 },
    },
  }),
  stage({
    id: 'tutorial_03',
    index: 3,
    title: '第三課・瀕死與桃',
    subtitle: '體力歸零時如何救人',
    era: '演武',
    battlefieldCityId: 'yingchuan',
    briefing:
      '教習收聲：「體力降至 0 即進入瀕死。座位順序詢問是否出【桃】；救回 1 點才算活。酒也可在自己瀕死時當桃用，但不能救別人。」\n這一關你與對手都只有 1 點體力。打出傷害或準備好【桃】。',
    epilogueWin:
      '三課已畢。可隨時從標題畫面再進教學關卡。往後自由對戰與列傳，提示條會標明你該做的下一步。',
    epilogueLose: '瀕死未救回即陣亡。記得手中有【桃】時，詢問框出現就打出。',
    playerGeneralId: 'huatuo',
    allies: [],
    enemies: [{ generalId: 'soldier', name: '死士木人' }],
    victory: { type: 'eliminate_enemies' },
    requiredCardKinds: ['sha', 'tao', 'shan'],
    setup: {
      player: {
        hp: 1,
        maxHp: 3,
        handKinds: ['sha', 'tao', 'tao', 'shan'],
        handCount: 4,
      },
      enemies: { hp: 1, maxHp: 2, handKinds: ['sha'], handCount: 2 },
    },
  }),
]

export const TUTORIAL_CAMPAIGN: CampaignDef = {
  id: TUTORIAL_CAMPAIGN_ID,
  title: '教學關卡',
  blurb: '三關逐步講解基本牌、錦囊裝備與瀕死求桃',
  stages: TUTORIAL_STAGES,
}

export function isTutorialId(campaignId: string | null | undefined): boolean {
  return campaignId === TUTORIAL_CAMPAIGN_ID || !!campaignId?.startsWith('tutorial')
}

export function isTutorialStageId(stageId: string | null | undefined): boolean {
  return !!stageId?.startsWith('tutorial_')
}
