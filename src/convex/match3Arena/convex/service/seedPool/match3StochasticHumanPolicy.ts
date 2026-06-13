import { findValidMoves } from "../Match3GameEngine";
import type { Match3GameStateForReplay } from "./match3RecordedOpTypes";
import { createSeededRandom } from "../../utils/seedRandom";

export type StochasticPolicyContext = {
  rolloutIndex: number;
  rng: () => number;
};

export function createStochasticPolicyContext(rolloutIndex: number, seedId: string): StochasticPolicyContext {
  return {
    rolloutIndex,
    rng: createSeededRandom(`${seedId}:policy:${rolloutIndex}`),
  };
}

function scoreMoveHeuristic(
  state: Match3GameStateForReplay,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): number {
  const result = findValidMoves(state.grid).find(
    (m) =>
      (m.r1 === r1 && m.c1 === c1 && m.r2 === r2 && m.c2 === c2) ||
      (m.r1 === r2 && m.c1 === c2 && m.r2 === r1 && m.c2 === c1)
  );
  if (!result) return -1000;
  const centerBonus = 4 - Math.abs(r1 - 3.5) - Math.abs(c1 - 3.5);
  return 10 + centerBonus;
}

export function pickNextOp(
  state: Match3GameStateForReplay,
  ctx: StochasticPolicyContext
): { op: "swap"; r1: number; c1: number; r2: number; c2: number } | { op: "concede" } | null {
  const moves = findValidMoves(state.grid);
  if (moves.length === 0) return null;

  const scored = moves.map((m) => ({
    move: m,
    score: scoreMoveHeuristic(state, m.r1, m.c1, m.r2, m.c2) + ctx.rng() * 8,
  }));
  scored.sort((a, b) => b.score - a.score);

  if (ctx.rng() < 0.02 && state.moves > 5) {
    return { op: "concede" };
  }

  const pick = scored[0]?.move ?? moves[0];
  return { op: "swap", r1: pick.r1, c1: pick.c1, r2: pick.r2, c2: pick.c2 };
}

export function updatePolicyAfterOp(_ctx: StochasticPolicyContext): void {
  // no-op for v1
}
