import type { PackId, VictoryRule } from "../../engine/types";
import type { CampaignDef, CampaignStage, StageSetup } from "../campaigns/types";
import { getGeneral } from "../generals";

export type Side = string | { id: string; name?: string };

export interface LzDraft {
  title: string;
  sub: string;
  era: string;
  city: string;
  brief: string;
  win: string;
  lose: string;
  enemies: Side[];
  allies?: Side[];
  allyChoices?: string[];
  kill?: string;
  packs?: PackId[];
  next?: string;
  survive?: number;
  setup?: StageSetup;
}

const FACTION: Record<string, string> = {
  wei: "曹操",
  shu: "劉備",
  wu: "孫權",
  qun: "未定",
  god: "未定",
};

const NEIGHBOR: Record<string, string> = {
  yingchuan: "luoyang",
  luoyang: "xuchang",
  xuchang: "yingchuan",
  sishui: "luoyang",
  hulao: "luoyang",
  puyang: "yanzhou",
  yanzhou: "puyang",
  xuzhou: "xiapi",
  xiapi: "xuzhou",
  wancheng: "xinye",
  guandu: "ye",
  ye: "guandu",
  chibi: "chaisang",
  chaisang: "chibi",
  xinye: "xiangyang",
  jingzhou: "xiangyang",
  xiangyang: "jingzhou",
  chengdu: "fu",
  fu: "chengdu",
  hanzhong: "dingjun",
  dingjun: "hanzhong",
  tongguan: "changan",
  changan: "tongguan",
  hefei: "ruxu",
  ruxu: "hefei",
  yiling: "jingzhou",
  changban: "xiangyang",
  nanzhong: "chengdu",
};

function norm(s: Side): { generalId: string; name?: string } {
  return typeof s === "string" ? { generalId: s } : { generalId: s.id, name: s.name };
}

export function makeStages(generalId: string, drafts: LzDraft[]): CampaignStage[] {
  const g = getGeneral(generalId);
  const faction = FACTION[g.kingdom] ?? "未定";
  return drafts.map((d, i) => {
    const index = i + 1;
    const from = NEIGHBOR[d.city] ?? "luoyang";
    const victory: VictoryRule = d.survive
      ? { type: "survive_rounds", rounds: d.survive }
      : d.kill
        ? { type: "kill_target", targetGeneralId: d.kill }
        : { type: "eliminate_enemies" };
    return {
      id: `lz_${generalId}_${index}`,
      index,
      title: d.title,
      subtitle: d.sub,
      era: d.era,
      battlefieldCityId: d.city,
      cityFactions: {
        [d.city]: faction,
        [from]: "未定",
      },
      movements: [{ fromCityId: from, toCityId: d.city, actor: g.name, note: d.sub }],
      briefing: d.brief,
      epilogueWin: d.win,
      epilogueLose: d.lose,
      bridgeNext: d.next,
      packs: d.packs ?? ["standard"],
      playerGeneralId: generalId,
      allies: (d.allies ?? []).map(norm),
      allyChoices: d.allyChoices,
      enemies: d.enemies.map(norm),
      victory,
      setup: d.setup,
    };
  });
}

export function makeLiezhuan(generalId: string, blurb: string, drafts: LzDraft[]): CampaignDef {
  const g = getGeneral(generalId);
  return {
    id: `lz_${generalId}`,
    title: `${g.name}列傳`,
    blurb,
    stages: makeStages(generalId, drafts),
  };
}
