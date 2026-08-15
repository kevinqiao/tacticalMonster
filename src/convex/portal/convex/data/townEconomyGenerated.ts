/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: scripts/portal/economy/mayfield-zone-economy.json
 * Town-only zone / mayor / district meta. Shared play defaults live in portal-economy.json.
 * Regenerate: npm run portal:economy:sync
 * Check:     npm run portal:economy:sync:check
 */

import type {
  DistrictConfig,
  DistrictId,
  ZoneTypeConfig,
  ZoneTypeId,
} from "../service/town/zoneEconomyConfig";

export const TOWN_ECONOMY_VERSION = 1 as const;
export const TOWN_ECONOMY_TOWN_ID = "mayfield" as const;

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
  minCollectIntervalMs: 60000,
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
    2630, 2965, 3320, 3695, 4090, 4505, 4940, 5395, 5870, 6365, 6880, 7415, 7970, 8545, 9140,
  ] as const,
} as const;

export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = {
  commercial: {
    label: "Commercial",
    labelZh: "商业区",
    passiveBasePerHour: 1.2,
    upgradeCostBase: 80,
    prosperityWeight: 1,
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
    showdownBonus: {
      minGamesPerWeek: 5,
      passiveMultiplier: 1.25,
    },
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
    passiveDistrictBonus: 1,
    prosperityDistrictFactor: 1,
    maxProsperityUnits: 28,
    slots: [
      {
        slotId: "d0_civic",
        zoneType: "civic",
        developable: false,
        prebuiltLevel: 1,
      },
      {
        slotId: "d0_z1",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d0_z2",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d0_z3",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d0_z4",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
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
      {
        slotId: "d1_z1",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d1_z2",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d1_z3",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d1_z4",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
      {
        slotId: "d1_z5",
        zoneType: null,
        developable: true,
        choices: ["commercial", "industrial", "tourism", "entertainment"],
      },
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
