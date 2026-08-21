import type { CampaignDef, CampaignStage } from "../campaigns/types";
import { QUN_LIEZHUAN } from "./qun";
import { SHU_LIEZHUAN } from "./shu";
import { WEI_LIEZHUAN } from "./wei";
import { WU_LIEZHUAN } from "./wu";

export const LIEZHUAN_CAMPAIGNS: CampaignDef[] = [
  ...WEI_LIEZHUAN,
  ...SHU_LIEZHUAN,
  ...WU_LIEZHUAN,
  ...QUN_LIEZHUAN,
];

export function getLiezhuan(id: string): CampaignDef | undefined {
  return LIEZHUAN_CAMPAIGNS.find((c) => c.id === id);
}

export function getLiezhuanByGeneral(generalId: string): CampaignDef | undefined {
  return LIEZHUAN_CAMPAIGNS.find((c) => c.id === `lz_${generalId}`);
}

export function findLiezhuanStage(
  stageId: string,
): { campaign: CampaignDef; stage: CampaignStage } | null {
  for (const campaign of LIEZHUAN_CAMPAIGNS) {
    const stage = campaign.stages.find((s) => s.id === stageId);
    if (stage) return { campaign, stage };
  }
  return null;
}

export function isLiezhuanId(campaignId: string): boolean {
  return campaignId.startsWith("lz_");
}
