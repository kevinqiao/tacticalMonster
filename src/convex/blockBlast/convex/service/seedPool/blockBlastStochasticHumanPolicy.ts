/**
 * Block Blast 随机拟人落子策略：枚举手牌候选落子，按消行/盘面空旷/孔洞启发打分，
 * 按人格 greediness 在 topN 内随机挑选。驱动所有 rollout。
 */
import { checkLines, clearLines, placeShapeOnGrid } from "../../utils/gameRules";
import { createSeededRandom } from "./blockBlastSeedRandom";
import {
  enumeratePlacements,
  type BlockBlastSimState,
  type PlacementCandidate,
} from "./blockBlastOpCodec";
import type { HumanPersona } from "./blockBlastHumanPersonas";
import { personaForRollout } from "./blockBlastHumanPersonas";
import type { BlockBlastRecordedOp } from "./blockBlastRecordedOpTypes";

export type StochasticPolicyContext = {
  rng: () => number;
  rolloutIndex: number;
  persona: HumanPersona;
  totalMoves: number;
};

export function createStochasticPolicyContext(
  seedId: string,
  rolloutIndex: number
): StochasticPolicyContext {
  return {
    rng: createSeededRandom(`${seedId}|rollout|${rolloutIndex}`),
    rolloutIndex,
    persona: personaForRollout(rolloutIndex),
    totalMoves: 0,
  };
}

function countFilled(grid: number[][]): number {
  let filled = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== 0) filled += 1;
    }
  }
  return filled;
}

/** 被填充格/边界完全包围的空格数（越多越糟）。 */
function countHoles(grid: number[][]): number {
  const n = grid.length;
  let holes = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r]![c] !== 0) continue;
      const up = r === 0 || grid[r - 1]![c] !== 0;
      const down = r === n - 1 || grid[r + 1]![c] !== 0;
      const left = c === 0 || grid[r]![c - 1] !== 0;
      const right = c === n - 1 || grid[r]![c + 1] !== 0;
      if (up && down && left && right) holes += 1;
    }
  }
  return holes;
}

/** 候选落子的启发分（仅在 grid 副本上模拟，不触发出块）。 */
export function evaluatePlacement(
  state: BlockBlastSimState,
  candidate: PlacementCandidate,
  persona: HumanPersona
): number {
  const shape = state.shapes[candidate.slot]!;
  const grid = state.grid.map((r) => [...r]);
  placeShapeOnGrid(grid, shape.shape, shape.color, candidate.row, candidate.col);
  const { rows, cols } = checkLines(grid);
  const linesCleared = rows.length + cols.length;
  if (linesCleared > 0) {
    clearLines(grid, rows, cols);
  }
  const filled = countFilled(grid);
  const holes = countHoles(grid);
  return (
    linesCleared * persona.lineClearBias -
    filled * persona.emptinessBias -
    holes * persona.holeBias
  );
}

export function pickNextOp(
  state: BlockBlastSimState,
  ctx: StochasticPolicyContext
): BlockBlastRecordedOp | null {
  const candidates = enumeratePlacements(state);
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((c) => ({ candidate: c, score: evaluatePlacement(state, c, ctx.persona) }))
    .sort((a, b) => b.score - a.score);

  const persona = ctx.persona;
  let pickIdx = 0;
  if (ctx.rng() >= persona.greediness) {
    const topN = Math.min(persona.tableauTopN, scored.length);
    pickIdx = Math.floor(ctx.rng() * topN);
  }
  const chosen = scored[Math.min(pickIdx, scored.length - 1)]!.candidate;
  return { op: "place", slot: chosen.slot, row: chosen.row, col: chosen.col };
}

export function updatePolicyAfterOp(
  ctx: StochasticPolicyContext,
  _scoreBefore: number,
  _scoreAfter: number,
  _op: BlockBlastRecordedOp
): void {
  ctx.totalMoves += 1;
}
