import type { GeneralDef, Kingdom } from "../engine/types";

/** Simple Q-version (chibi) portrait — unlocked by completing a character's 列傳. */

type Hair = "short" | "long" | "topknot" | "wild" | "bun" | "twin" | "cape";
type Hat =
  | "none"
  | "wing"
  | "guan"
  | "zhuge"
  | "helm"
  | "plume"
  | "turban"
  | "flower"
  | "headband"
  | "crown"
  | "veil";
type Beard = "none" | "goatee" | "full" | "long" | "stubble";
type Prop = "none" | "fan" | "blade" | "spear" | "bow" | "peach" | "scroll" | "flower";

export interface ChibiTraits {
  hair: Hair;
  hairColor: string;
  hat: Hat;
  beard: Beard;
  robe: string;
  robeDark: string;
  accent: string;
  skin: string;
  prop: Prop;
  fierce?: boolean;
}

const KINGDOM_ROBE: Record<Kingdom, { robe: string; dark: string; accent: string }> = {
  wei: { robe: "#3a5a9a", dark: "#243a68", accent: "#8eb4e8" },
  shu: { robe: "#8b1e1e", dark: "#5c1010", accent: "#e8b45a" },
  wu: { robe: "#2c6b45", dark: "#1a4630", accent: "#7dcea0" },
  qun: { robe: "#6b5a2c", dark: "#44381c", accent: "#d4b46a" },
  god: { robe: "#5a3a7a", dark: "#3a2452", accent: "#c4a0e0" },
};

const TRAITS: Record<string, Partial<ChibiTraits>> = {
  caocao: { hat: "wing", beard: "goatee", hair: "short", robe: "#2a3a5c" },
  simayi: { hat: "wing", beard: "goatee", hair: "short", robe: "#3a3558" },
  xiahoudun: { hat: "headband", beard: "stubble", fierce: true, accent: "#c45a5a" },
  zhangliao: { hat: "helm", beard: "stubble", hair: "short" },
  xuchu: { hat: "none", hair: "wild", beard: "stubble", fierce: true, robe: "#5a3a28" },
  guojia: { hat: "none", hair: "topknot", beard: "none", robe: "#3a5080" },
  zhenji: { hat: "veil", hair: "long", hairColor: "#1a1420", robe: "#4a3a78", accent: "#e8b4c4" },
  liubei: { hat: "crown", beard: "goatee", hair: "short", robe: "#7a1820" },
  guanyu: { hat: "guan", beard: "long", hair: "short", robe: "#1e5c3a", robeDark: "#0f3a24", accent: "#c4a35a" },
  zhangfei: { hat: "headband", beard: "full", hair: "wild", fierce: true, robe: "#1a1a1a", hairColor: "#0a0a0a" },
  zhugeliang: { hat: "zhuge", beard: "goatee", hair: "short", prop: "fan", robe: "#c4b090", robeDark: "#8a7860" },
  zhaoyun: { hat: "helm", beard: "none", hair: "short", prop: "spear", robe: "#d8dce8", robeDark: "#8a90a4", accent: "#3a5a9a" },
  machao: { hat: "helm", beard: "stubble", hair: "short", robe: "#c8c0a8" },
  huangyueying: { hat: "none", hair: "bun", prop: "scroll", robe: "#6b3a48", accent: "#e8c4a0" },
  sunquan: { hat: "crown", beard: "none", hair: "short", robe: "#245a3c" },
  ganning: { hat: "none", hair: "wild", beard: "stubble", fierce: true, robe: "#1a1a1a", accent: "#c4a35a" },
  lvmeng: { hat: "none", hair: "short", beard: "stubble", robe: "#2a5a40" },
  huanggai: { hat: "none", hair: "short", beard: "full", robe: "#3a4a38" },
  zhouyu: { hat: "none", hair: "topknot", beard: "none", robe: "#1e4a38", accent: "#e8d49a" },
  daqiao: { hat: "flower", hair: "long", hairColor: "#2a2018", robe: "#c45a6a", accent: "#f0c8d0" },
  luxun: { hat: "none", hair: "short", beard: "none", robe: "#2c6b45" },
  sunshangxiang: { hat: "none", hair: "twin", prop: "bow", robe: "#2c6b45", accent: "#e8b4c4" },
  huatuo: { hat: "none", hair: "topknot", beard: "goatee", robe: "#6a5a38", prop: "peach" },
  lvbu: { hat: "plume", beard: "stubble", hair: "short", fierce: true, robe: "#6a2a4a", accent: "#e8c45a" },
  diaochan: { hat: "flower", hair: "long", hairColor: "#1a1014", robe: "#8a2a4a", accent: "#f0c0d0" },
  zhangjiao: { hat: "turban", beard: "goatee", hair: "short", robe: "#c4a03a", robeDark: "#8a7020" },
  xiahouyuan: { hat: "helm", beard: "stubble", hair: "short" },
  caoren: { hat: "helm", beard: "stubble", hair: "short" },
  huangzhong: { hat: "none", hair: "short", beard: "full", prop: "bow", robe: "#6a3a28" },
  weiyan: { hat: "none", hair: "wild", beard: "stubble", fierce: true },
  xiaoqiao: { hat: "flower", hair: "long", robe: "#d47890", accent: "#f4d0d8" },
  zhoutai: { hat: "none", hair: "wild", beard: "stubble", fierce: true, robe: "#2a3a30" },
  yuji: { hat: "turban", beard: "goatee", robe: "#6a4a78" },
  dianwei: { hat: "none", hair: "wild", beard: "stubble", fierce: true, robe: "#4a2a20" },
  xunyu: { hat: "wing", beard: "none", hair: "short", robe: "#3a4a78" },
  pangtong: { hat: "none", hair: "wild", beard: "goatee", robe: "#5a4a38" },
  wolong: { hat: "zhuge", beard: "goatee", prop: "fan", robe: "#c4b090" },
  taishici: { hat: "headband", beard: "stubble", hair: "short", fierce: true },
  pangde: { hat: "helm", beard: "stubble", hair: "short" },
  yanliangwenchou: { hat: "helm", beard: "full", fierce: true },
  xuhuang: { hat: "helm", beard: "stubble" },
  caopi: { hat: "crown", beard: "none", hair: "short", robe: "#3a4a78" },
  menghuo: { hat: "none", hair: "wild", beard: "full", fierce: true, robe: "#3d6b3a" },
  zhurong: { hat: "none", hair: "wild", hairColor: "#3a2010", robe: "#8b3a1e", accent: "#e8783a" },
  sunjian: { hat: "helm", beard: "goatee" },
  lusu: { hat: "none", hair: "short", beard: "goatee", robe: "#2c6b45" },
  jiaxu: { hat: "none", hair: "short", beard: "goatee", robe: "#4a3a30" },
  zhanghe: { hat: "helm", beard: "stubble" },
  dengai: { hat: "none", hair: "short", beard: "stubble" },
  jiangwei: { hat: "zhuge", beard: "none", hair: "topknot", robe: "#8b1e1e" },
  liushan: { hat: "crown", beard: "none", hair: "short", robe: "#8b4a4a" },
  sunce: { hat: "headband", beard: "none", hair: "short", fierce: true, robe: "#1e5a3a" },
  zhangzhaozhanghong: { hat: "wing", beard: "goatee" },
  zuoci: { hat: "none", hair: "wild", beard: "goatee", robe: "#5a3a7a" },
  caiwenji: { hat: "none", hair: "long", robe: "#5a3a48", accent: "#e8c4d0" },
  fazheng: { hat: "none", hair: "short", beard: "goatee" },
  xusheng: { hat: "helm", beard: "stubble", fierce: true },
  wuguotai: { hat: "none", hair: "bun", robe: "#2c6b45" },
  liufeng: { hat: "none", hair: "short", beard: "stubble" },
};

function traitsFor(g: GeneralDef): ChibiTraits {
  const base = KINGDOM_ROBE[g.kingdom];
  const female = g.gender === "female";
  const over = TRAITS[g.id] ?? {};
  return {
    hair: female ? "long" : "short",
    hairColor: "#1c1612",
    hat: "none",
    beard: "none",
    robe: base.robe,
    robeDark: base.dark,
    accent: base.accent,
    skin: female ? "#f0d0be" : "#e2c09a",
    prop: "none",
    fierce: false,
    ...over,
  };
}

function xml(s: string): string {
  return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

export function chibiDataUri(g: GeneralDef): string {
  const t = traitsFor(g);
  const eyes = t.fierce
    ? `<path d="M36 44 L44 46" stroke="#1a120c" stroke-width="2.2" stroke-linecap="round"/>
       <path d="M60 46 L52 44" stroke="#1a120c" stroke-width="2.2" stroke-linecap="round"/>
       <circle cx="40" cy="47" r="2.1" fill="#1a120c"/>
       <circle cx="56" cy="47" r="2.1" fill="#1a120c"/>`
    : `<ellipse cx="40" cy="46" rx="3.2" ry="4.2" fill="#1a120c"/>
       <ellipse cx="56" cy="46" rx="3.2" ry="4.2" fill="#1a120c"/>
       <circle cx="41" cy="45" r="1" fill="#fff"/>
       <circle cx="57" cy="45" r="1" fill="#fff"/>`;
  const blush =
    g.gender === "female"
      ? `<ellipse cx="34" cy="52" rx="4" ry="2.2" fill="#e8a0a8" opacity="0.55"/>
         <ellipse cx="62" cy="52" rx="4" ry="2.2" fill="#e8a0a8" opacity="0.55"/>`
      : "";
  const mouth = t.fierce
    ? `<path d="M44 56 Q48 54 52 56" fill="none" stroke="#8b3a2a" stroke-width="1.6" stroke-linecap="round"/>`
    : `<path d="M44 55 Q48 59 52 55" fill="none" stroke="#8b3a2a" stroke-width="1.6" stroke-linecap="round"/>`;

  const hair = hairSvg(t);
  const hat = hatSvg(t);
  const beard = beardSvg(t);
  const prop = propSvg(t);
  const label = xml(g.name.slice(0, 1));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.robe}"/>
      <stop offset="100%" stop-color="${t.robeDark}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="14" fill="url(#bg)"/>
  <rect x="3" y="3" width="90" height="90" rx="12" fill="none" stroke="${t.accent}" stroke-opacity="0.45" stroke-width="1.5"/>
  <ellipse cx="48" cy="82" rx="22" ry="16" fill="${t.robeDark}"/>
  <ellipse cx="48" cy="78" rx="18" ry="14" fill="${t.robe}"/>
  <rect x="40" y="64" width="16" height="10" rx="4" fill="${t.skin}"/>
  <circle cx="48" cy="46" r="20" fill="${t.skin}"/>
  ${hair}
  ${hat}
  ${eyes}
  ${blush}
  ${mouth}
  ${beard}
  ${prop}
  <text x="48" y="90" text-anchor="middle" font-size="9" font-family="serif" fill="#f6ecd4" opacity="0.9">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hairSvg(t: ChibiTraits): string {
  const c = t.hairColor;
  switch (t.hair) {
    case "long":
      return `<path d="M28 44 Q24 70 30 86 Q48 78 66 86 Q72 70 68 44 Q64 28 48 26 Q32 28 28 44Z" fill="${c}"/>
              <circle cx="48" cy="44" r="18" fill="${t.skin}"/>`;
    case "twin":
      return `<circle cx="26" cy="40" r="8" fill="${c}"/>
              <circle cx="70" cy="40" r="8" fill="${c}"/>
              <path d="M30 34 Q48 22 66 34 Q64 30 48 28 Q32 30 30 34Z" fill="${c}"/>`;
    case "bun":
      return `<circle cx="48" cy="24" r="8" fill="${c}"/>
              <path d="M30 40 Q32 26 48 26 Q64 26 66 40" fill="${c}"/>`;
    case "topknot":
      return `<path d="M30 40 Q32 26 48 26 Q64 26 66 40" fill="${c}"/>
              <ellipse cx="48" cy="22" rx="6" ry="7" fill="${c}"/>`;
    case "wild":
      return `<path d="M26 50 L22 30 L34 36 L40 20 L48 32 L56 18 L62 36 L74 28 L70 50 Q64 28 48 26 Q32 28 26 50Z" fill="${c}"/>`;
    case "cape":
      return `<path d="M28 42 Q30 24 48 24 Q66 24 68 42" fill="${c}"/>`;
    default:
      return `<path d="M29 42 Q30 26 48 25 Q66 26 67 42 Q64 32 48 30 Q32 32 29 42Z" fill="${c}"/>`;
  }
}

function hatSvg(t: ChibiTraits): string {
  switch (t.hat) {
    case "wing":
      return `<rect x="28" y="24" width="40" height="8" rx="2" fill="#1a120c"/>
              <rect x="38" y="14" width="20" height="12" rx="2" fill="#1a120c"/>
              <path d="M28 28 L16 24 L28 32Z" fill="#1a120c"/>
              <path d="M68 28 L80 24 L68 32Z" fill="#1a120c"/>`;
    case "guan":
      return `<rect x="30" y="22" width="36" height="10" rx="2" fill="#1e5c3a"/>
              <rect x="40" y="14" width="16" height="10" fill="#1e5c3a"/>
              <rect x="44" y="10" width="8" height="6" fill="${t.accent}"/>`;
    case "zhuge":
      return `<path d="M24 34 L48 14 L72 34 L64 30 L48 20 L32 30Z" fill="#f0e4c4" stroke="#6a5a38" stroke-width="1"/>
              <path d="M40 22 L48 16 L56 22" fill="none" stroke="#6a5a38" stroke-width="1"/>`;
    case "helm":
      return `<path d="M28 40 Q30 18 48 16 Q66 18 68 40" fill="#8a9098"/>
              <rect x="26" y="36" width="44" height="6" rx="1" fill="#6a7078"/>
              <rect x="46" y="14" width="4" height="10" fill="${t.accent}"/>`;
    case "plume":
      return `<path d="M28 40 Q30 18 48 16 Q66 18 68 40" fill="#6a2a4a"/>
              <path d="M44 16 Q40 0 48 8 Q56 0 52 16" fill="#c4a35a"/>
              <path d="M46 16 Q48 -2 50 16" fill="#e8d49a"/>`;
    case "turban":
      return `<ellipse cx="48" cy="30" rx="22" ry="12" fill="#e8c45a"/>
              <ellipse cx="48" cy="26" rx="16" ry="8" fill="#c4a03a"/>`;
    case "flower":
      return `<circle cx="66" cy="34" r="5" fill="#e87890"/>
              <circle cx="70" cy="30" r="4" fill="#f0c8d0"/>
              <circle cx="62" cy="30" r="3.5" fill="#d45a78"/>`;
    case "headband":
      return `<rect x="28" y="34" width="40" height="7" fill="#8b1e1e"/>
              <rect x="28" y="34" width="40" height="2" fill="#c4a35a"/>`;
    case "crown":
      return `<path d="M28 34 L32 20 L40 28 L48 16 L56 28 L64 20 L68 34Z" fill="#c4a35a"/>
              <rect x="28" y="32" width="40" height="5" fill="#a88840"/>`;
    case "veil":
      return `<path d="M30 38 Q48 28 66 38 Q64 34 48 32 Q32 34 30 38Z" fill="#d8d0e8"/>
              <path d="M32 40 Q30 70 36 82" fill="none" stroke="#d8d0e8" stroke-width="3" opacity="0.7"/>`;
    default:
      return "";
  }
}

function beardSvg(t: ChibiTraits): string {
  const c = "#2a2018";
  switch (t.beard) {
    case "goatee":
      return `<ellipse cx="48" cy="64" rx="4" ry="6" fill="${c}"/>`;
    case "full":
      return `<path d="M34 56 Q36 72 48 76 Q60 72 62 56 Q48 64 34 56Z" fill="${c}"/>`;
    case "long":
      return `<path d="M36 56 Q34 80 48 88 Q62 80 60 56 Q48 66 36 56Z" fill="${c}"/>`;
    case "stubble":
      return `<path d="M36 58 Q48 64 60 58" fill="none" stroke="${c}" stroke-width="3" opacity="0.55" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

function propSvg(t: ChibiTraits): string {
  switch (t.prop) {
    case "fan":
      return `<path d="M70 58 L90 48 L88 68 Z" fill="#f0e4c4" stroke="#6a5a38" stroke-width="1"/>`;
    case "blade":
      return `<rect x="72" y="40" width="5" height="36" rx="1" fill="#c0c4c8"/>
              <rect x="70" y="74" width="9" height="6" fill="#6a3a20"/>`;
    case "spear":
      return `<rect x="76" y="22" width="3" height="58" fill="#8a6a38"/>
              <path d="M74 22 L77.5 10 L81 22Z" fill="#c0c4c8"/>`;
    case "bow":
      return `<path d="M72 30 Q92 48 72 70" fill="none" stroke="#6a3a20" stroke-width="3"/>
              <path d="M74 32 L74 68" stroke="#d8c4a0" stroke-width="1"/>`;
    case "peach":
      return `<circle cx="78" cy="70" r="7" fill="#e87878"/>
              <path d="M78 64 Q82 58 86 62" fill="#3a8a4a"/>`;
    case "scroll":
      return `<rect x="70" y="60" width="18" height="10" rx="2" fill="#f0e4c4"/>
              <rect x="70" y="60" width="3" height="10" fill="#c4a35a"/>`;
    case "flower":
      return `<circle cx="78" cy="68" r="5" fill="#e87890"/>`;
    default:
      return "";
  }
}

export function traitsPreview(g: GeneralDef): ChibiTraits {
  return traitsFor(g);
}
