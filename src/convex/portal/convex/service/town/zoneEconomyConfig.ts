/**
 * Mayfield Zone economy — SSOT: scripts/portal/economy/mayfield-zone-economy.json
 * M2: consumed by townDevelopZone / townCollectPassive / prosperity helpers.
 */

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

/** Mirrors mayfield-zone-economy.json — edit JSON then copy constants here until sync script lands. */
export const ZONE_ECONOMY_VERSION = 1 as const;

export const ZONE_GLOBAL = {
  developCostBase: 150,
  developExponent: 1.45,
  upgradeExponent: 1.55,
  passiveGrowth: 1.35,
  maxZoneLevel: 5,
  maxOfflineHours: 12,
  passiveCapWeeklyShare: 0.25,
  passiveCapSoftWeeklyShare: 0.3,
  passiveCapRollingDays: 7,
  minCollectIntervalMs: 60_000,
  startingCoins: 5000,
} as const;

export const MAYOR_LEVEL_CONFIG = {
  maxLevel: 30,
  xpPerShowdownComplete: 8,
  xpPerTrialComplete: 3,
  xpPerShowdownWin: 4,
  dailyMayorXpCap: 120,
  levelXp: [
    0, 0, 40, 95, 170, 265, 380, 515, 670, 845, 1040, 1255, 1490, 1745, 2020, 2315,
    2630, 2965, 3320, 3695, 4090, 4505, 4940, 5395, 5870, 6365, 6880, 7415, 7970,
    8545, 9140,
  ] as const,
} as const;

export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = {
  commercial: {
    label: "Commercial",
    labelZh: "商业区",
    passiveBasePerHour: 1.2,
    upgradeCostBase: 80,
    prosperityWeight: 1.0,
    allowedDistricts: ["D0", "D1"],
  },
  industrial: {
    label: "Industrial",
    labelZh: "工业区",
    passiveBasePerHour: 1.5,
    upgradeCostBase: 68,
    prosperityWeight: 0.9,
    allowedDistricts: ["D0", "D1"],
  },
  tourism: {
    label: "Tourism",
    labelZh: "旅游区",
    passiveBasePerHour: 0.9,
    upgradeCostBase: 90,
    prosperityWeight: 1.4,
    allowedDistricts: ["D0", "D1"],
  },
  entertainment: {
    label: "Entertainment",
    labelZh: "娱乐区",
    passiveBasePerHour: 1.1,
    upgradeCostBase: 85,
    prosperityWeight: 1.1,
    showdownBonus: { minGamesPerWeek: 5, passiveMultiplier: 1.25 },
    allowedDistricts: ["D0", "D1"],
  },
  civic: {
    label: "Civic",
    labelZh: "市政区",
    passiveBasePerHour: 0,
    upgradeCostBase: 0,
    prosperityWeight: 0.5,
    prebuiltOnly: true,
    allowedDistricts: ["D0"],
  },
};

export const DISTRICTS: Record<DistrictId, DistrictConfig> = {
  D0: {
    label: "Old Square",
    labelZh: "老广场",
    passiveDistrictBonus: 1.0,
    prosperityDistrictFactor: 1.0,
    maxProsperityUnits: 28,
    slots: [
      { slotId: "d0_civic", zoneType: "civic", developable: false, prebuiltLevel: 1 },
      { slotId: "d0_z1", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d0_z2", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d0_z3", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d0_z4", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
    ],
    expansion: null,
  },
  D1: {
    label: "Market Street",
    labelZh: "市场街",
    passiveDistrictBonus: 1.15,
    prosperityDistrictFactor: 1.1,
    maxProsperityUnits: 38,
    slots: [
      { slotId: "d1_z1", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d1_z2", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d1_z3", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d1_z4", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
      { slotId: "d1_z5", zoneType: null, developable: true, choices: ["commercial", "industrial", "tourism", "entertainment"] },
    ],
    expansion: {
      requiresDistrict: "D0",
      minDevelopedZonesInPriorDistrict: 3,
      minMayorLevel: 3,
      mainQuestId: "quest_d1_market",
      expansionFeeCoins: 800,
    },
  },
};

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
