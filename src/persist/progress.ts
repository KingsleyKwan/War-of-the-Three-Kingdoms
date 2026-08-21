/** Versioned player meta: 列傳進度, skins, achievements, stats. */

export const CHIBI_SKIN = "chibi";

export interface PlayerStats {
  wins: number;
  losses: number;
  stagesCleared: number;
  identityWins: number;
}

export interface UnlockBanner {
  kind: "skin" | "achievement";
  title: string;
  detail: string;
  generalId?: string;
}

export interface MetaState {
  version: number;
  /** generalId → unlocked skin ids (currently only "chibi") */
  unlockedSkins: Record<string, string[]>;
  /** generalId → equipped skin id, or null/absent = default (no skin) */
  equippedSkin: Record<string, string | null>;
  /** achievement id → unix ms */
  achievements: Record<string, number>;
  stats: PlayerStats;
}

const KEY = "wtk_meta_v1";
const VERSION = 1;

const DEFAULTS: MetaState = {
  version: VERSION,
  unlockedSkins: {},
  equippedSkin: {},
  achievements: {},
  stats: { wins: 0, losses: 0, stagesCleared: 0, identityWins: 0 },
};

function readRaw(): MetaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<MetaState>;
    return {
      version: VERSION,
      unlockedSkins: parsed.unlockedSkins && typeof parsed.unlockedSkins === "object" ? parsed.unlockedSkins : {},
      equippedSkin: parsed.equippedSkin && typeof parsed.equippedSkin === "object" ? parsed.equippedSkin : {},
      achievements: parsed.achievements && typeof parsed.achievements === "object" ? parsed.achievements : {},
      stats: {
        wins: Number(parsed.stats?.wins) || 0,
        losses: Number(parsed.stats?.losses) || 0,
        stagesCleared: Number(parsed.stats?.stagesCleared) || 0,
        identityWins: Number(parsed.stats?.identityWins) || 0,
      },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function writeRaw(s: MetaState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode */
  }
}

let cache: MetaState | null = null;

/** Test helper — drop in-memory cache so the next load re-reads storage. */
export function resetMetaCache(): void {
  cache = null;
}

export function loadMeta(): MetaState {
  if (!cache) cache = readRaw();
  return cache;
}

function save(): void {
  if (!cache) cache = readRaw();
  writeRaw(cache);
}

export function hasSkin(generalId: string, skinId = CHIBI_SKIN): boolean {
  return loadMeta().unlockedSkins[generalId]?.includes(skinId) ?? false;
}

export function getEquippedSkin(generalId: string): string | null {
  const meta = loadMeta();
  const eq = meta.equippedSkin[generalId];
  if (!eq) return null;
  if (!hasSkin(generalId, eq)) return null;
  return eq;
}

/** Default is no skin. Unlocking auto-equips so the reward is visible. */
export function unlockSkin(generalId: string, skinId = CHIBI_SKIN): boolean {
  const meta = loadMeta();
  const list = meta.unlockedSkins[generalId] ?? [];
  if (list.includes(skinId)) return false;
  meta.unlockedSkins[generalId] = [...list, skinId];
  meta.equippedSkin[generalId] = skinId;
  save();
  return true;
}

export function setEquippedSkin(generalId: string, skinId: string | null): void {
  const meta = loadMeta();
  if (skinId && !hasSkin(generalId, skinId)) return;
  meta.equippedSkin[generalId] = skinId;
  save();
}

export function hasAchievement(id: string): boolean {
  return !!loadMeta().achievements[id];
}

export function unlockAchievement(id: string): boolean {
  const meta = loadMeta();
  if (meta.achievements[id]) return false;
  meta.achievements[id] = Date.now();
  save();
  return true;
}

export function recordMatchResult(opts: { won: boolean; identity: boolean }): void {
  const meta = loadMeta();
  if (opts.won) {
    meta.stats.wins += 1;
    if (opts.identity) meta.stats.identityWins += 1;
  } else {
    meta.stats.losses += 1;
  }
  save();
}

export function recordStageCleared(): void {
  const meta = loadMeta();
  meta.stats.stagesCleared += 1;
  save();
}

export function unlockedSkinCount(): number {
  return Object.values(loadMeta().unlockedSkins).filter((s) => s.includes(CHIBI_SKIN)).length;
}

export function achievementCount(): number {
  return Object.keys(loadMeta().achievements).length;
}
