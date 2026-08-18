import { VENUE_LEVEL_CONFIG as VENUE_LEVEL_CONFIG_GENERATED } from "../../data/townEconomyGenerated";
import type { HallKind } from "../../data/portalTownVenueCatalog";

/**
 * Per-venue XP / level — separate from Mayor (town) progression.
 * SSOT: scripts/portal/economy/mayfield-zone-economy.json → townEconomyGenerated.ts
 */
export const VENUE_LEVEL_CONFIG = VENUE_LEVEL_CONFIG_GENERATED satisfies {
  dailyXpCap: Record<HallKind, number>;
};

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
