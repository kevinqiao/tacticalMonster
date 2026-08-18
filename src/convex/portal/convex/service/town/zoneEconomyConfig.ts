/**
 * Mayfield Zone economy — formulas + typed wrappers.
 * SSOT: scripts/portal/economy/mayfield-zone-economy.json
 * Generated: src/convex/portal/convex/data/townEconomyGenerated.ts
 *   npm run portal:economy:sync
 */

import {
  DISTRICTS as DISTRICTS_GENERATED,
  GAME_CATALOG as GAME_CATALOG_GENERATED,
  GAME_OPS as GAME_OPS_GENERATED,
  MAYOR_LEVEL_CONFIG as MAYOR_LEVEL_CONFIG_GENERATED,
  TERM_PASS as TERM_PASS_GENERATED,
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
  coinTableBonus?: {
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
  minPriorDistrictLevel: number;
  minMayorLevel: number;
  mainQuestId: string;
  expansionFeeCoins: number;
}

export interface DistrictConfig {
  label: string;
  labelZh: string;
  developCost: number;
  rebrandCost: number;
  typeChoices: ZoneTypeId[];
  gameType?: string | null;
  passiveDistrictBonus: number;
  prosperityDistrictFactor: number;
  maxProsperityUnits: number;
  slots: DistrictSlotConfig[];
  expansion: DistrictExpansionConfig | null;
}

export type TermPassRewardKind = "coins" | "tickets" | "title";

export interface TermPassReward {
  node: number;
  kind: TermPassRewardKind;
  amount?: number;
  titleId?: string;
  title?: string;
}

export interface TermPassConfig {
  xpPerShowdown: number;
  xpPerSoloSuccess: number;
  prosperitySpeedPerPoint: number;
  mainNodes: number;
  nodeXp: number[];
  rewards: TermPassReward[];
}

export interface GameCatalogEntry {
  gameType: string;
  label: string;
  requiredDistrict: DistrictId | null;
}

export interface GameOpsEvent {
  id: string;
  kind: "featured" | "launch" | "dual";
  title: string;
  gameType?: string;
  gameTypes?: string[];
}

export interface GameOpsConfig {
  featuredPlaysRequired: number;
  featuredCoinReward: number;
  dualPlaysRequired: number;
  dualCoinReward: number;
  rotation: GameOpsEvent[];
}

export const ZONE_ECONOMY_VERSION = TOWN_ECONOMY_VERSION;
export const ZONE_GLOBAL = ZONE_GLOBAL_GENERATED;
export const MAYOR_LEVEL_CONFIG = MAYOR_LEVEL_CONFIG_GENERATED;
export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = ZONE_TYPES_GENERATED;
export const DISTRICTS: Record<DistrictId, DistrictConfig> = DISTRICTS_GENERATED;
export const TERM_PASS: TermPassConfig = TERM_PASS_GENERATED;
export const GAME_CATALOG: GameCatalogEntry[] = GAME_CATALOG_GENERATED;
export const GAME_OPS: GameOpsConfig = GAME_OPS_GENERATED;

export const DISTRICT_TYPE_CHOICES: ZoneTypeId[] = [
  "commercial",
  "industrial",
  "tourism",
  "entertainment",
];

export function developCostForSlotIndex(slotIndex: number): number {
  const { developCostBase, developExponent } = ZONE_GLOBAL;
  return Math.round(developCostBase * developExponent ** (slotIndex - 1));
}

export function districtDevelopCost(districtId: DistrictId): number {
  return DISTRICTS[districtId].developCost;
}

export function districtRebrandCost(districtId: DistrictId): number {
  return DISTRICTS[districtId].rebrandCost;
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
  coinGamesThisWeek?: number;
}): number {
  const typeCfg = ZONE_TYPES[args.zoneType];
  const district = DISTRICTS[args.districtId];
  if (typeCfg.passiveBasePerHour <= 0 || args.level < 1) return 0;

  let rate =
    typeCfg.passiveBasePerHour *
    ZONE_GLOBAL.passiveGrowth ** (args.level - 1) *
    district.passiveDistrictBonus;

  const showdownBonus = typeCfg.showdownBonus;
  if (showdownBonus && (args.showdownGamesThisWeek ?? 0) >= showdownBonus.minGamesPerWeek) {
    rate *= showdownBonus.passiveMultiplier;
  }
  const coinBonus = typeCfg.coinTableBonus;
  if (coinBonus && (args.coinGamesThisWeek ?? 0) >= coinBonus.minGamesPerWeek) {
    rate *= coinBonus.passiveMultiplier;
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

export function prosperityScoreFromDistricts(
  districts: Array<{ zoneType: ZoneTypeId; level: number; districtId: DistrictId }>
): number {
  const total = districts.reduce(
    (sum, d) =>
      sum + slotProsperityUnits({ zoneType: d.zoneType, level: d.level, districtId: d.districtId }),
    0
  );
  const cap = DISTRICTS.D0.maxProsperityUnits + DISTRICTS.D1.maxProsperityUnits;
  return Math.min(100, Math.round((100 * total) / Math.max(1, cap)));
}

export function districtLevelTotal(
  ops: Record<string, { level?: number } | undefined>
): number {
  return (ops.D0?.level ?? 0) + (ops.D1?.level ?? 0);
}

export function prosperityPassSpeed(prosperityScore: number): number {
  const score = Math.min(100, Math.max(0, prosperityScore));
  return 1 + TERM_PASS.prosperitySpeedPerPoint * score;
}

export function levyCycleMs(): number {
  return ZONE_GLOBAL.levyCycleHours * 3_600_000;
}

export function townLevyPayout(passivePerHourTotal: number): number {
  return Math.floor(Math.max(0, passivePerHourTotal) * ZONE_GLOBAL.levyCycleHours);
}

export function townLevyTick(args: {
  passivePerHourTotal: number;
  startedAt: number | null;
  nowMs?: number;
}): {
  active: boolean;
  ready: boolean;
  collectable: number;
  payout: number;
  remainingMs: number;
  readyAt: number;
  startedAt: number | null;
  dripping: boolean;
} {
  const now = args.nowMs ?? Date.now();
  const cycleMs = levyCycleMs();
  const payout = townLevyPayout(args.passivePerHourTotal);
  const active = payout > 0;
  if (!active) {
    return {
      active: false,
      ready: false,
      collectable: 0,
      payout: 0,
      remainingMs: cycleMs,
      readyAt: now + cycleMs,
      startedAt: args.startedAt,
      dripping: false,
    };
  }
  const startedAt = args.startedAt;
  const elapsedMs = startedAt == null ? cycleMs : Math.min(cycleMs, Math.max(0, now - startedAt));
  const remainingMs = Math.max(0, cycleMs - elapsedMs);
  const collectable = Math.min(payout, Math.floor(args.passivePerHourTotal * (elapsedMs / 3_600_000)));
  return {
    active,
    ready: collectable > 0,
    collectable,
    payout,
    remainingMs,
    readyAt: (startedAt ?? now - cycleMs) + cycleMs,
    startedAt,
    dripping: remainingMs > 0,
  };
}

/** Drips until 8h, then freezes. Collect anytime for the dripped amount. */
export function collectablePassiveCoins(args: {
  passivePerHourTotal: number;
  elapsedMs: number;
}): number {
  return townLevyTick({
    passivePerHourTotal: args.passivePerHourTotal,
    startedAt: 0,
    nowMs: args.elapsedMs,
  }).collectable;
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
