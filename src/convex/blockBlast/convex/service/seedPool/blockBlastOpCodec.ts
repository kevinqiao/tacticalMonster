/**
 * Block Blast 确定性盘面 + 落子重放：与 solitaire solitaireOpCodec 同层。
 * 由 seedId 通过 BlockBlastGameEngine 确定性出块；op 为 { place, slot, row, col }。
 */
import {
  BLOCK_BLAST_DEFAULT_GRID_SIZE,
  BlockBlastGameStatus,
  type BlockBlastGridSize,
  type Shape,
} from "../../types/BlockBlastTypes";
import { canPlaceShape } from "../../utils/gameRules";
import { BlockBlastGameEngine } from "../BlockBlastGameEngine";
import type { BlockBlastRecordedOp } from "./blockBlastRecordedOpTypes";

/** seed pool 统一以默认 8×8 盘面生成（休闲 Block Blast 默认网格）。 */
export const POOL_GRID_SIZE: BlockBlastGridSize = BLOCK_BLAST_DEFAULT_GRID_SIZE;

export type BlockBlastSimState = {
  gridSize: BlockBlastGridSize;
  grid: number[][];
  shapes: Shape[];
  nextShapes: Shape[];
  score: number;
  lines: number;
  moves: number;
  status: BlockBlastGameStatus;
  seed?: string;
  shapeCounter?: number;
};

export function buildInitialState(seedId: string): BlockBlastSimState {
  const base = BlockBlastGameEngine.createInitialGame("sim", seedId, POOL_GRID_SIZE);
  return {
    gridSize: base.gridSize ?? POOL_GRID_SIZE,
    grid: base.grid.map((r) => [...r]),
    shapes: base.shapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
    nextShapes: base.nextShapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
    score: base.score,
    lines: base.lines,
    moves: base.moves,
    status: base.status,
    seed: base.seed,
    shapeCounter: base.shapeCounter,
  };
}

export function cloneSimState(state: BlockBlastSimState): BlockBlastSimState {
  return {
    ...state,
    grid: state.grid.map((r) => [...r]),
    shapes: state.shapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
    nextShapes: state.nextShapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
  };
}

export type ApplyOpResult =
  | { ok: true; conceded?: boolean }
  | { ok: false; reason: string };

export function applyOp(state: BlockBlastSimState, op: BlockBlastRecordedOp): ApplyOpResult {
  if (op.op === "concede") {
    state.status = BlockBlastGameStatus.CANCELLED;
    return { ok: true, conceded: true };
  }

  const shape = state.shapes[op.slot];
  if (!shape) {
    return { ok: false, reason: "slot_empty" };
  }
  const res = BlockBlastGameEngine.applyPlaceShape(
    {
      grid: state.grid,
      gridSize: state.gridSize,
      shapes: state.shapes,
      nextShapes: state.nextShapes,
      score: state.score,
      lines: state.lines,
      moves: state.moves,
      status: state.status,
      seed: state.seed,
      shapeCounter: state.shapeCounter,
    },
    shape.id,
    op.row,
    op.col
  );
  if (!res.ok) {
    return { ok: false, reason: res.error };
  }
  state.grid = res.data.grid;
  state.shapes = res.data.shapes;
  state.nextShapes = res.data.nextShapes;
  state.score = res.data.score;
  state.lines = res.data.lines;
  state.moves = res.data.moves;
  state.status = res.data.status;
  state.shapeCounter = res.data.shapeCounter;
  return { ok: true };
}

export type PlacementCandidate = {
  slot: number;
  row: number;
  col: number;
};

/** 当前手牌所有合法落子（slot × row × col）。 */
export function enumeratePlacements(state: BlockBlastSimState): PlacementCandidate[] {
  const n = state.gridSize;
  const out: PlacementCandidate[] = [];
  for (let slot = 0; slot < state.shapes.length; slot++) {
    const shape = state.shapes[slot]!.shape;
    const sh = shape.length;
    const sw = shape[0]?.length ?? 0;
    for (let row = 0; row <= n - sh; row++) {
      for (let col = 0; col <= n - sw; col++) {
        if (canPlaceShape(state.grid, shape, row, col)) {
          out.push({ slot, row, col });
        }
      }
    }
  }
  return out;
}

/** 开局合法落子数（用于难度/快筛）。 */
export function openingMoveCount(state: BlockBlastSimState): number {
  return enumeratePlacements(state).length;
}

export function replayOps(
  seedId: string,
  ops: BlockBlastRecordedOp[]
): { finalScore: number; moves: number; completed: boolean; conceded: boolean } {
  const state = buildInitialState(seedId);
  for (const op of ops) {
    const res = applyOp(state, op);
    if (!res.ok) {
      throw new Error(`replay failed on ${JSON.stringify(op)}: ${res.reason}`);
    }
    if (res.conceded) break;
    if (state.status === BlockBlastGameStatus.LOST) break;
  }
  return {
    finalScore: state.score ?? 0,
    moves: state.moves ?? 0,
    completed: false,
    conceded: state.status === BlockBlastGameStatus.CANCELLED,
  };
}
