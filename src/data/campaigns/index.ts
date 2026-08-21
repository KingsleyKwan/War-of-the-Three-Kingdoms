import {
  buildFreeMatch,
  buildStageEpilogue,
  buildStageMatch,
  CAOCAO_CAMPAIGN_ID,
  CAOCAO_STAGES,
  resolveGeneralId,
  resolveStagePacks,
} from './caocao'
import { SHU_CAMPAIGN_ID, SHU_STAGES } from './shu'
import { WU_CAMPAIGN_ID, WU_STAGES } from './wu'
import type { CampaignDef, CampaignStage } from './types'

export type { CampaignDef, CampaignStage }
export {
  buildFreeMatch,
  buildStageEpilogue,
  buildStageMatch,
  resolveGeneralId,
  resolveStagePacks,
}

export const CAMPAIGNS: CampaignDef[] = [
  {
    id: CAOCAO_CAMPAIGN_ID,
    title: '曹操傳',
    blurb: '潁川至漢中・魏武崛起',
    stages: CAOCAO_STAGES,
  },
  {
    id: SHU_CAMPAIGN_ID,
    title: '蜀傳',
    blurb: '桃園至南征・漢昭烈之路',
    stages: SHU_STAGES,
  },
  {
    id: WU_CAMPAIGN_ID,
    title: '吳傳',
    blurb: '討董至夷陵・江東基業',
    stages: WU_STAGES,
  },
]

export function getCampaign(id: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.id === id)
}

export function findStage(stageId: string): { campaign: CampaignDef; stage: CampaignStage } | null {
  for (const campaign of CAMPAIGNS) {
    const stage = campaign.stages.find((s) => s.id === stageId)
    if (stage) return { campaign, stage }
  }
  return null
}

function progressKey(campaignId: string): string {
  return `wtk_progress_${campaignId}`
}

export function loadCampaignProgress(campaignId: string): number {
  try {
    const raw = localStorage.getItem(progressKey(campaignId))
    // Migrate old Cao Cao key
    if (!raw && campaignId === CAOCAO_CAMPAIGN_ID) {
      const legacy = localStorage.getItem('wtk_caocao_progress')
      if (legacy) {
        localStorage.setItem(progressKey(campaignId), legacy)
        return Math.max(1, parseInt(legacy, 10) || 1)
      }
    }
    const n = raw ? parseInt(raw, 10) : 1
    return Number.isFinite(n) && n >= 1 ? n : 1
  } catch {
    return 1
  }
}

export function unlockNextStage(campaignId: string, clearedIndex: number): void {
  const cur = loadCampaignProgress(campaignId)
  if (clearedIndex >= cur) {
    localStorage.setItem(progressKey(campaignId), String(clearedIndex + 1))
  }
}
