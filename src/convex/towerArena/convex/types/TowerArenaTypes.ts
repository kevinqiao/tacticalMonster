import type { TowerArenaSeed } from "./TowerArenaSeed";

export enum TowerGamePhase {
  BUILD = "build",
  WAVE = "wave",
  ENDED = "ended",
}

export enum TowerGameStatus {
  CREATED = 0,
  PLAYING = 1,
  COMPLETED = 2,
  CANCELLED = 3,
}

export type PlacedTower = {
  slotId: string;
  towerId: string;
  level: number;
};

export type TowerGameState = {
  seed: TowerArenaSeed;
  phase: TowerGamePhase;
  status: TowerGameStatus;
  lives: number;
  gold: number;
  currentWave: number;
  wavesCleared: number;
  towers: PlacedTower[];
  unlockedTowerIds: string[];
  score: number;
  elapsedSimMs: number;
  moves: number;
  playStartedAt?: number;
};

export type TowerRecordedOp =
  | { op: "place"; slotId: string; towerId: string }
  | { op: "upgrade"; slotId: string }
  | { op: "sell"; slotId: string }
  | { op: "start_wave" }
  | { op: "concede" };

export type TowerGameRow = TowerGameState & {
  gameId: string;
  seedId: string;
  dueTime?: number;
  casualTimeoutScheduledId?: string;
  lastUpdate?: number;
};
