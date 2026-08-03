import { createSeededRandom } from "../utils/seedRandom";
import {
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  DEFAULT_TOWER_SCORE_WEIGHTS,
  type TowerArenaSeed,
  type TowerCatalogEntry,
  type TowerEnemyCatalogEntry,
} from "../types/TowerArenaSeed";

export const TOWER_STOCHASTIC_POLICY_VERSION = "tower-stochastic-v1" as const;

export function makeTowerSeedId(poolVersion: string, index: number): string {
  return `tower-pool:${poolVersion}:${index}`;
}

export function parseTowerSeedId(seedId: string): { poolVersion: string; index: number } | null {
  const m = /^tower-pool:([^:]+):(\d+)$/.exec(seedId.trim());
  if (!m) return null;
  return { poolVersion: m[1]!, index: Number(m[2]) };
}

const BASE_TOWER_CATALOG: TowerCatalogEntry[] = [
  {
    id: "archer",
    cost: 50,
    maxLevel: 3,
    statsByLevel: [
      { damage: 8, range: 120, fireCooldownMs: 800, upgradeCost: 40 },
      { damage: 14, range: 130, fireCooldownMs: 700, upgradeCost: 70 },
      { damage: 22, range: 140, fireCooldownMs: 600, upgradeCost: 0 },
    ],
  },
  {
    id: "cannon",
    cost: 90,
    maxLevel: 3,
    statsByLevel: [
      { damage: 28, range: 90, fireCooldownMs: 1400, upgradeCost: 60 },
      { damage: 42, range: 95, fireCooldownMs: 1200, upgradeCost: 90 },
      { damage: 60, range: 100, fireCooldownMs: 1000, upgradeCost: 0 },
    ],
  },
  {
    id: "mage",
    cost: 120,
    maxLevel: 2,
    statsByLevel: [
      { damage: 18, range: 150, fireCooldownMs: 1000, upgradeCost: 100 },
      { damage: 35, range: 160, fireCooldownMs: 850, upgradeCost: 0 },
    ],
  },
];

const BASE_ENEMY_CATALOG: TowerEnemyCatalogEntry[] = [
  { id: "grunt", hp: 40, speed: 55, bounty: 8 },
  { id: "runner", hp: 25, speed: 85, bounty: 10 },
  { id: "brute", hp: 120, speed: 35, bounty: 18 },
  { id: "boss", hp: 400, speed: 28, bounty: 80 },
];

/** 从 seedId 确定性生成 Lane TD 题面 */
export function generateTowerSeedFromId(seedId: string): TowerArenaSeed {
  const parsed = parseTowerSeedId(seedId);
  const rng = createSeededRandom(seedId);
  const index = parsed?.index ?? 0;
  const variant = index % 6;

  const pathLength = 600 + Math.floor(rng() * 200);
  const slotCount = 8 + (variant % 3);
  const waveCount = 5;

  const towerSlots = Array.from({ length: slotCount }, (_, i) => ({
    id: `s${i}`,
    x: 80 + (i % 4) * 140,
    y: 60 + Math.floor(i / 4) * 100,
    pathIds: ["main"],
  }));

  const waves = Array.from({ length: waveCount }, (_, wi) => {
    const tier = wi + 1;
    const gruntCount = 3 + tier + Math.floor(rng() * 2);
    const hasRunner = tier >= 2 && rng() > 0.3;
    const hasBrute = tier >= 4;
    const enemies = [{ typeId: "grunt", count: gruntCount, intervalMs: 700 }];
    if (hasRunner) {
      enemies.push({ typeId: "runner", count: 2 + tier, intervalMs: 900 });
    }
    if (hasBrute) {
      enemies.push({ typeId: "brute", count: 1 + (tier >= 5 ? 1 : 0), intervalMs: 1200 });
    }
    if (tier === waveCount) {
      enemies.push({ typeId: "boss", count: 1, intervalMs: 1500 });
    }
    return { enemies, pauseMs: 1500 };
  });

  const waveClearBonus = waves.map((_, i) => 25 + i * 15 + Math.floor(rng() * 20));

  return {
    mapId: `lane_${variant}_${index}`,
    paths: [
      {
        id: "main",
        waypoints: [
          { x: 0, y: 120 },
          { x: pathLength * 0.35, y: 120 },
          { x: pathLength * 0.55, y: 180 },
          { x: pathLength * 0.75, y: 120 },
          { x: pathLength, y: 120 },
        ],
      },
    ],
    towerSlots,
    waves,
    economy: {
      startGold: 120 + variant * 10,
      waveClearBonus,
    },
    towerCatalog: BASE_TOWER_CATALOG,
    enemyCatalog: BASE_ENEMY_CATALOG,
    inRunProgression:
      variant >= 3
        ? [{ afterWave: 2, grant: { type: "gold", amount: 40 } }]
        : undefined,
    matchTimeLimitSec: DEFAULT_MATCH_TIME_LIMIT_SEC,
    scoreWeights: DEFAULT_TOWER_SCORE_WEIGHTS,
    startingLives: 10,
  };
}

export function resolveTowerSeed(seedOrId: string): TowerArenaSeed {
  if (seedOrId.startsWith("tower-pool:")) {
    return generateTowerSeedFromId(seedOrId);
  }
  try {
    return JSON.parse(seedOrId) as TowerArenaSeed;
  } catch {
    return generateTowerSeedFromId(makeTowerSeedId("v1", 0));
  }
}

export function mapFingerprint(seed: TowerArenaSeed): string {
  const parts = [
    seed.mapId,
    String(seed.towerSlots.length),
    String(seed.waves.length),
    seed.paths.map((p) => p.waypoints.map((w) => `${w.x},${w.y}`).join("|")).join(";"),
  ];
  return parts.join("::");
}
