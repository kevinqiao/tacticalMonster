/**
 * Match-3 共享类型（Convex ↔ 前端）
 */

export const MATCH3_GRID_ROWS = 8;
export const MATCH3_GRID_COLS = 8;
export const MATCH3_CANDY_TYPES = 6;

export enum Match3GameStatus {
  PLAYING = 0,
  COMPLETED = 1,
  CANCELLED = 2,
}

/** 客户端交互阶段（不写入 Convex） */
export enum GameInteractionPhase {
  idle = "idle",
  pointerDrag = "pointerDrag",
  animating = "animating",
}

export type Match3Cell = {
  row: number;
  col: number;
  asset: number;
  id: string;
};

export type Match3TurnStep =
  | { kind: "swap"; r1: number; c1: number; r2: number; c2: number }
  | { kind: "clear"; cells: Array<{ row: number; col: number }> }
  | {
      kind: "fall";
      moves: Array<{ from: { row: number; col: number }; to: { row: number; col: number }; asset: number }>;
    }
  | { kind: "spawn"; cells: Array<{ row: number; col: number; asset: number }> };

export type Match3GameState = {
  _id?: string;
  gameId: string;
  grid: Match3Cell[][];
  score: number;
  moves: number;
  status: Match3GameStatus;
  seed?: string;
  playStartedAt?: number;
  dueTime?: number;
  casualTimeoutScheduledId?: string;
  refillCounter?: number;
  lastUpdate?: number;
  recordedOps?: import("../service/seedPool/match3RecordedOpTypes").Match3RecordedStep[];
  lastOpAt?: number;
};

export type Match3Rule = {
  isValidSwap: (r1: number, c1: number, r2: number, c2: number) => boolean;
  hasValidMoves: () => boolean;
  isGameOver: () => boolean;
};
