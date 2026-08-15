/**
 * Mayfield Zone economy — formulas + typed wrappers.
 * SSOT: scripts/portal/economy/mayfield-zone-economy.json
 * Generated: src/convex/portal/convex/data/townEconomyGenerated.ts
 *   npm run portal:economy:sync
 */

import {
  DISTRICTS as DISTRICTS_GENERATED,
  MAYOR_LEVEL_CONFIG as MAYOR_LEVEL_CONFIG_GENERATED,
  TOWN_ECONOMY_VERSION,
  ZONE_GLOBAL as ZONE_GLOBAL_GENERATED,
  ZONE_TYPES as ZONE_TYPES_GENERATED,
} from "../../data/townEconomyGenerated";

export type ZoneTypeId =
  | "commercial"
  | "industrial"
  | "tourism"
  | "entertainment"
  | "civic";

export type DistrictId = "D0" | "D1";

export interface ZoneTypeConfig {
  label: string;
  labelZh: string;
  passiveBasePerHour: number;
  upgradeCostBase: number;
  prosperityWeight: number;
  prebuiltOnly?: boolean;
  allowedDistricts: DistrictId[];
  showdownBonus?: {
    minGamesPerWeek: number;
    passiveMultiplier: number;
  };
}

export interface DistrictSlotConfig {
  slotId: string;
  zoneType: ZoneTypeId | null;
  developable: boolean;
  prebuiltLevel?: number;
  choices?: ZoneTypeId[];
}

export interface DistrictExpansionConfig {
  requiresDistrict: DistrictId;
  minDevelopedZonesInPriorDistrict: number;
  minMayorLevel: number;
  mainQuestId: string;
  expansionFeeCoins: number;
}

export interface DistrictConfig {
  label: string;
  labelZh: string;
  passiveDistrictBonus: number;
  prosperityDistrictFactor: number;
  maxProsperityUnits: number;
  slots: DistrictSlotConfig[];
  expansion: DistrictExpansionConfig | null;
}

export const ZONE_ECONOMY_VERSION = TOWN_ECONOMY_VERSION;
export const ZONE_GLOBAL = ZONE_GLOBAL_GENERATED;
export const MAYOR_LEVEL_CONFIG = MAYOR_LEVEL_CONFIG_GENERATED;
export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = ZONE_TYPES_GENERATED;
export const DISTRICTS: Record<DistrictId, DistrictConfig> = DISTRICTS_GENERATED;

export function developCostForSlotIndex(slotIndex: number): number {
  const { developCostBase, developExponent } = ZONE_GLOBAL;
  return Math.round(developCostBase * developExponent ** (slotIndex - 1));
}

export function upgradeCost(zoneType: ZoneTypeId, currentLevel: number): number {
  const cfg = ZONE_TYPES[zoneType];
  if (cfg.prebuiltOnly || cfg.upgradeCostBase <= 0) return 0;
  return Math.round(cfg.upgradeCostBase * ZONE_GLOBAL.upgradeExponent ** currentLevel);
}

export function passivePerHour(args: {
  zoneType: ZoneTypeId;
  level: number;
  districtId: DistrictId;
  showdownGamesThisWeek?: number;
}): number {
  const typeCfg = ZONE_TYPES[args.zoneType];
  const district = DISTRICTS[args.districtId];
  if (typeCfg.passiveBasePerHour <= 0 || args.level < 1) return 0;

  let rate =
    typeCfg.passiveBasePerHour *
    ZONE_GLOBAL.passiveGrowth ** (args.level - 1) *
    district.passiveDistrictBonus;

  const bonus = typeCfg.showdownBonus;
  if (
    bonus &&
    (args.showdownGamesThisWeek ?? 0) >= bonus.minGamesPerWeek
  ) {
    rate *= bonus.passiveMultiplier;
  }
  return Math.round(rate * 100) / 100;
}

export function slotProsperityUnits(args: {
  zoneType: ZoneTypeId;
  level: number;
  districtId: DistrictId;
}): number {
  const typeCfg = ZONE_TYPES[args.zoneType];
  const district = DISTRICTS[args.districtId];
  return typeCfg.prosperityWeight * args.level * district.prosperityDistrictFactor;
}

export function prosperityScoreFromSlots(
  slots: Array<{ zoneType: ZoneTypeId; level: number; districtId: DistrictId }>,
  districtId: DistrictId
): number {
  const district = DISTRICTS[districtId];
  const total = slots.reduce(
    (sum, s) => sum + slotProsperityUnits({ zoneType: s.zoneType, level: s.level, districtId: s.districtId }),
    0
  );
  return Math.min(100, Math.round((100 * total) / district.maxProsperityUnits));
}

export function collectablePassiveCoins(args: {
  passivePerHourTotal: number;
  elapsedMs: number;
  maxOfflineHours?: number;
}): number {
  const capHours = args.maxOfflineHours ?? ZONE_GLOBAL.maxOfflineHours;
  const elapsedHours = Math.max(0, args.elapsedMs / 3_600_000);
  const hours = Math.min(elapsedHours, capHours);
  return Math.floor(args.passivePerHourTotal * hours);
}

export function mayorLevelFromXp(xp: number): number {
  const table = MAYOR_LEVEL_CONFIG.levelXp;
  let level = 1;
  for (let i = 2; i < table.length; i++) {
    if (xp >= table[i]!) level = i;
    else break;
  }
  return Math.min(level, MAYOR_LEVEL_CONFIG.maxLevel);
}

/** Developable slot index within district (1-based among developable slots only). */
export function developableSlotIndex(districtId: DistrictId, slotId: string): number | null {
  const developable = DISTRICTS[districtId].slots.filter((s) => s.developable);
  const idx = developable.findIndex((s) => s.slotId === slotId);
  return idx >= 0 ? idx + 1 : null;
}
