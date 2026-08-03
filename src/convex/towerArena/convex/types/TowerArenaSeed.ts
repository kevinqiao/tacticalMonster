/** Lane Puzzle TD seed — 竞技局权威题面 */

export type TowerWaypoint = { x: number; y: number };

export type TowerPathDef = {
  id: string;
  waypoints: TowerWaypoint[];
};

export type TowerSlotDef = {
  id: string;
  x: number;
  y: number;
  pathIds: string[];
};

export type TowerEnemySpawn = {
  typeId: string;
  count: number;
  intervalMs: number;
};

export type TowerWaveDef = {
  enemies: TowerEnemySpawn[];
  pauseMs: number;
};

export type TowerStatsByLevel = {
  damage: number;
  range: number;
  fireCooldownMs: number;
  upgradeCost: number;
};

export type TowerCatalogEntry = {
  id: string;
  cost: number;
  maxLevel: number;
  statsByLevel: TowerStatsByLevel[];
};

export type TowerEnemyCatalogEntry = {
  id: string;
  hp: number;
  speed: number;
  bounty: number;
};

export type InRunGrant =
  | { type: "gold"; amount: number }
  | { type: "unlockTower"; towerId: string };

export type InRunProgressionEntry = {
  afterWave: number;
  grant: InRunGrant;
};

export type TowerScoreWeights = {
  lifePoint: number;
  waveBonus: number;
  goldBonus: number;
  timePenaltyPerSec: number;
};

export type TowerArenaSeed = {
  mapId: string;
  paths: TowerPathDef[];
  towerSlots: TowerSlotDef[];
  waves: TowerWaveDef[];
  economy: {
    startGold: number;
    waveClearBonus: number[];
  };
  towerCatalog: TowerCatalogEntry[];
  enemyCatalog: TowerEnemyCatalogEntry[];
  inRunProgression?: InRunProgressionEntry[];
  matchTimeLimitSec: number;
  scoreWeights: TowerScoreWeights;
  startingLives: number;
};

export const DEFAULT_TOWER_SCORE_WEIGHTS: TowerScoreWeights = {
  lifePoint: 200,
  waveBonus: 500,
  goldBonus: 2,
  timePenaltyPerSec: 3,
};

export const DEFAULT_MATCH_TIME_LIMIT_SEC = 480;
