import type { HallKind } from "./config";

/** Per-venue XP / level — separate from Mayor (town) progression. */
export const VENUE_LEVEL_CONFIG = {
  maxLevel: 5,
  xpPerTrialComplete: 6,
  xpPerShowdownComplete: 12,
  xpPerShowdownWin: 6,
  dailyXpCap: {
    trial: 60,
    showdown: 100,
  } satisfies Record<HallKind, number>,
  /** Cumulative XP thresholds; index = level (Lv.1 = 0 XP). */
  levelXp: [0, 0, 20, 50, 90, 140] as const,
} as const;

export function venueLevelFromXp(xp: number): number {
  const table = VENUE_LEVEL_CONFIG.levelXp;
  let level = 1;
  for (let i = 2; i < table.length; i++) {
    if (xp >= table[i]!) level = i;
    else break;
  }
  return Math.min(level, VENUE_LEVEL_CONFIG.maxLevel);
}

export function xpToNextVenueLevel(xp: number, level: number): number | null {
  if (level >= VENUE_LEVEL_CONFIG.maxLevel) return null;
  const next = VENUE_LEVEL_CONFIG.levelXp[level + 1];
  if (next == null) return null;
  return Math.max(0, next - xp);
}
