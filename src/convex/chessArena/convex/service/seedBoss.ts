/**
 * 小时 seed → 固定 Boss / 地图。
 * 不接受 teamPower，也不调用 calculateScaleBoss / findPowerStage。
 */

import { CHESS_BOSS_CATALOG, ChessBossConfig } from "../data/bossCatalog";
import { CHESS_MAP_CATALOG, ChessMapConfig } from "../data/maps";

export type FixedBossSnapshot = {
  bossId: string;
  monsterId: string;
  name: string;
  tags: string[];
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  assetPath: string;
  position: { q: number; r: number };
  minions: [];
};

export type HourlySeedPreview = {
  seedId: string;
  boss: FixedBossSnapshot;
  map: ChessMapConfig;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function freezeBoss(config: ChessBossConfig): FixedBossSnapshot {
  return {
    bossId: config.bossId,
    monsterId: config.monsterId,
    name: config.name,
    tags: [...config.tags],
    hp: config.hp,
    damage: config.damage,
    defense: config.defense,
    speed: config.speed,
    assetPath: config.assetPath,
    position: { ...config.position },
    minions: [],
  };
}

/**
 * 同一 seedId 永远展开成同一 Boss 数值与地图。
 * loadout / teamPower 不得作为参数。
 */
export function expandHourlySeed(seedId: string): HourlySeedPreview {
  const hash = hashString(seedId);
  const boss = CHESS_BOSS_CATALOG[hash % CHESS_BOSS_CATALOG.length];
  const map = CHESS_MAP_CATALOG[Math.floor(hash / 7) % CHESS_MAP_CATALOG.length];
  return {
    seedId,
    boss: freezeBoss(boss),
    map: {
      ...map,
      obstacles: map.obstacles.map((o) => ({ ...o })),
      disables: map.disables.map((d) => ({ ...d })),
    },
  };
}
