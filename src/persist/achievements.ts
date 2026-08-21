import { listGeneralsForPick } from "../data/generals";
import { CAMPAIGNS, loadCampaignProgress } from "../data/campaigns";
import { LIEZHUAN_CAMPAIGNS } from "../data/liezhuan";
import {
  achievementCount,
  hasAchievement,
  hasSkin,
  loadMeta,
  unlockedSkinCount,
  unlockAchievement,
  type UnlockBanner,
} from "./progress";

export type AchievementKind = "liezhuan" | "set" | "campaign" | "feat";

export interface AchievementDef {
  id: string;
  kind: AchievementKind;
  title: string;
  hint: string;
  generalId?: string;
  secret?: boolean;
}

function kingdomName(k: string): string {
  return ({ wei: "魏", shu: "蜀", wu: "吳", qun: "群", god: "神" } as Record<string, string>)[k] ?? k;
}

export function listAchievementDefs(): AchievementDef[] {
  const lz: AchievementDef[] = LIEZHUAN_CAMPAIGNS.map((c) => {
    const generalId = c.id.replace(/^lz_/, "");
    return {
      id: `lzdone_${generalId}`,
      kind: "liezhuan",
      title: `${c.title}完`,
      hint: `完成${c.title}全部關卡，解鎖 Q 版造型`,
      generalId,
    };
  });

  const kingdoms: AchievementDef[] = (["wei", "shu", "wu", "qun"] as const).map((k) => ({
    id: `set_${k}`,
    kind: "set",
    title: `${kingdomName(k)}將集齊`,
    hint: `完成所有${kingdomName(k)}將列傳`,
  }));

  const camps: AchievementDef[] = CAMPAIGNS.map((c) => ({
    id: `camp_${c.id}`,
    kind: "campaign",
    title: `${c.title}通關`,
    hint: `完成劇情「${c.title}」全部關卡`,
  }));

  const feats: AchievementDef[] = [
    {
      id: "feat_first_skin",
      kind: "feat",
      title: "初解丹青",
      hint: "解鎖第一件 Q 版造型",
    },
    {
      id: "feat_first_win",
      kind: "feat",
      title: "初陣告捷",
      hint: "任意對局取得一勝",
    },
    {
      id: "feat_wins_10",
      kind: "feat",
      title: "十戰十勝",
      hint: "累計勝利 10 場",
    },
    {
      id: "feat_wins_30",
      kind: "feat",
      title: "百戰餘生",
      hint: "累計勝利 30 場",
    },
    {
      id: "feat_identity",
      kind: "feat",
      title: "亂世梟雄",
      hint: "在身份局中獲勝",
    },
    {
      id: "feat_all_skins",
      kind: "feat",
      title: "丹青滿堂",
      hint: "解鎖全部武將的 Q 版造型",
    },
    {
      id: "feat_all_lz",
      kind: "feat",
      title: "列傳全書",
      hint: "完成全部武將列傳",
    },
  ];

  return [...lz, ...kingdoms, ...camps, ...feats];
}

export function evaluateAchievements(): UnlockBanner[] {
  const banners: UnlockBanner[] = [];
  const meta = loadMeta();
  const pick = listGeneralsForPick();
  const byK = (k: string) => pick.filter((g) => g.kingdom === k);

  const tryUnlock = (id: string, title: string, detail: string, generalId?: string) => {
    if (unlockAchievement(id)) {
      banners.push({ kind: "achievement", title, detail, generalId });
    }
  };

  for (const g of pick) {
    if (hasSkin(g.id) && !hasAchievement(`lzdone_${g.id}`)) {
      tryUnlock(`lzdone_${g.id}`, `${g.name}列傳完`, "解鎖 Q 版造型", g.id);
    }
  }

  for (const k of ["wei", "shu", "wu", "qun"] as const) {
    const gens = byK(k);
    if (gens.length && gens.every((g) => hasSkin(g.id))) {
      const def = listAchievementDefs().find((a) => a.id === `set_${k}`);
      if (def) tryUnlock(def.id, def.title, def.hint);
    }
  }

  for (const c of CAMPAIGNS) {
    if (loadCampaignProgress(c.id) > c.stages.length) {
      tryUnlock(`camp_${c.id}`, `${c.title}通關`, `完成劇情「${c.title}」全部關卡`);
    }
  }

  if (unlockedSkinCount() >= 1) {
    tryUnlock("feat_first_skin", "初解丹青", "解鎖第一件 Q 版造型");
  }
  if (meta.stats.wins >= 1) tryUnlock("feat_first_win", "初陣告捷", "任意對局取得一勝");
  if (meta.stats.wins >= 10) tryUnlock("feat_wins_10", "十戰十勝", "累計勝利 10 場");
  if (meta.stats.wins >= 30) tryUnlock("feat_wins_30", "百戰餘生", "累計勝利 30 場");
  if (meta.stats.identityWins >= 1) tryUnlock("feat_identity", "亂世梟雄", "在身份局中獲勝");
  if (pick.length && pick.every((g) => hasSkin(g.id))) {
    tryUnlock("feat_all_skins", "丹青滿堂", "解鎖全部武將的 Q 版造型");
    tryUnlock("feat_all_lz", "列傳全書", "完成全部武將列傳");
  }

  return banners;
}

export function achievementProgress(): { unlocked: number; total: number } {
  const total = listAchievementDefs().length;
  return { unlocked: achievementCount(), total };
}

export function isAchievementUnlocked(id: string): boolean {
  return hasAchievement(id);
}
