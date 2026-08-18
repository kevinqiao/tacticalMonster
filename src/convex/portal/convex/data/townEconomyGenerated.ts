/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: scripts/portal/economy/mayfield-zone-economy.json
 * Town-only zone / mayor / venue / prosperity / district meta. Shared play defaults live in portal-economy.json.
 * Regenerate: npm run portal:economy:sync
 * Check:     npm run portal:economy:sync:check
 */

import type {
  DistrictConfig,
  DistrictId,
  GameCatalogEntry,
  GameOpsConfig,
  TermPassConfig,
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
  levyCycleHours: 8,
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

export const VENUE_LEVEL_CONFIG = {
  maxLevel: 5,
  xpPerTrialComplete: 6,
  xpPerShowdownComplete: 12,
  xpPerShowdownWin: 6,
  dailyXpCap: {
    trial: 60,
    showdown: 100,
  },
  levelXp: [0, 0, 20, 50, 90, 140] as const,
} as const;

export const PROSPERITY_MILESTONES = [
  {
    id: "pros_25",
    threshold: 25,
    title: "Awakening Square",
    titleZh: "苏醒广场",
    blurb: "Town plaque unlocked in Mayor's Office.",
  },
  {
    id: "pros_50",
    threshold: 50,
    title: "Growing Main Street",
    titleZh: "成长主街",
    blurb: "Prosperity banner on your Mayor profile.",
  },
  {
    id: "pros_75",
    threshold: 75,
    title: "Busy Mayfield",
    titleZh: "繁忙 Mayfield",
    blurb: "Map district label flair (coming soon).",
  },
  {
    id: "pros_100",
    threshold: 100,
    title: "Golden Mayfield",
    titleZh: "黄金 Mayfield",
    blurb: "Legend mayor title on Me tab.",
  },
] as const;

export const TOWN_PLAY_ENTRY = {
  freePlaySoloDailyCap: 5,
  freePlayMultiDailyCap: 0,
  adEntryEnabled: false,
  adEntrySoloDailyCap: 0,
  adEntryMultiDailyCap: 0,
  ticketEntryEnabled: true,
  ticketEntrySoloPriceTickets: 1,
  ticketEntrySoloDailyCap: 0,
  ticketEntryMultiPriceTickets: 1,
  ticketEntryMultiDailyCap: 100,
  soloSuccessDailyEnabled: true,
  soloSuccessDailyCap: 5,
  soloSuccessAllowPlayAfterCap: false,
} as const;

export const ZONE_TYPES: Record<ZoneTypeId, ZoneTypeConfig> = {
  commercial: {
    label: "Finance",
    labelZh: "金融区",
    passiveBasePerHour: 1.2,
    upgradeCostBase: 80,
    prosperityWeight: 1,
    coinTableBonus: {
      minGamesPerWeek: 3,
      passiveMultiplier: 1.2,
    },
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
    developCost: 150,
    rebrandCost: 250,
    typeChoices: ["commercial", "industrial", "tourism", "entertainment"],
    gameType: "solitaire",
    passiveDistrictBonus: 1,
    prosperityDistrictFactor: 1,
    maxProsperityUnits: 7,
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
    developCost: 400,
    rebrandCost: 320,
    typeChoices: ["commercial", "industrial", "tourism", "entertainment"],
    gameType: "yatz",
    passiveDistrictBonus: 1.15,
    prosperityDistrictFactor: 1.1,
    maxProsperityUnits: 8,
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
      minPriorDistrictLevel: 3,
      minMayorLevel: 3,
      mainQuestId: "quest_d1_market",
      expansionFeeCoins: 800,
    },
  },
};

export const TERM_PASS: TermPassConfig = {
  xpPerShowdown: 10,
  xpPerSoloSuccess: 4,
  prosperitySpeedPerPoint: 0.004,
  mainNodes: 20,
  nodeXp: [20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40],
  rewards: [
    {
      node: 1,
      kind: "coins",
      amount: 40,
    },
    {
      node: 2,
      kind: "coins",
      amount: 50,
    },
    {
      node: 3,
      kind: "coins",
      amount: 60,
    },
    {
      node: 4,
      kind: "title",
      titleId: "square_squire",
      title: "Square Squire",
    },
    {
      node: 5,
      kind: "coins",
      amount: 80,
    },
    {
      node: 6,
      kind: "coins",
      amount: 80,
    },
    {
      node: 7,
      kind: "coins",
      amount: 90,
    },
    {
      node: 8,
      kind: "tickets",
      amount: 1,
    },
    {
      node: 9,
      kind: "coins",
      amount: 90,
    },
    {
      node: 10,
      kind: "coins",
      amount: 120,
    },
    {
      node: 11,
      kind: "coins",
      amount: 100,
    },
    {
      node: 12,
      kind: "coins",
      amount: 100,
    },
    {
      node: 13,
      kind: "coins",
      amount: 110,
    },
    {
      node: 14,
      kind: "coins",
      amount: 110,
    },
    {
      node: 15,
      kind: "coins",
      amount: 150,
    },
    {
      node: 16,
      kind: "tickets",
      amount: 1,
    },
    {
      node: 17,
      kind: "coins",
      amount: 120,
    },
    {
      node: 18,
      kind: "coins",
      amount: 120,
    },
    {
      node: 19,
      kind: "coins",
      amount: 140,
    },
    {
      node: 20,
      kind: "title",
      titleId: "term_mayor",
      title: "Term Mayor",
    },
  ],
};

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    gameType: "solitaire",
    label: "Solitaire",
    requiredDistrict: null,
  },
  {
    gameType: "yatz",
    label: "Yatz",
    requiredDistrict: "D1",
  },
];

export const GAME_OPS: GameOpsConfig = {
  featuredPlaysRequired: 3,
  featuredCoinReward: 80,
  dualPlaysRequired: 1,
  dualCoinReward: 60,
  rotation: [
    {
      id: "featured_solitaire",
      kind: "featured",
      gameType: "solitaire",
      title: "This week: Solitaire",
    },
    {
      id: "featured_yatz",
      kind: "featured",
      gameType: "yatz",
      title: "This week: Yatz",
    },
    {
      id: "launch_yatz",
      kind: "launch",
      gameType: "yatz",
      title: "Market Street launch: Yatz",
    },
    {
      id: "dual_play",
      kind: "dual",
      gameTypes: ["solitaire", "yatz"],
      title: "Play both halls",
    },
  ],
};
