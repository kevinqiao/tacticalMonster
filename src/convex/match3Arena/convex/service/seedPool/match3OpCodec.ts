import { Match3GameStatus } from "../../types/Match3Types";
import { Match3GameEngine } from "../Match3GameEngine";
import type { Match3GameStateForReplay, Match3RecordedOp, Match3RecordedStep } from "./match3RecordedOpTypes";
import { toMatch3RecordedOp } from "./match3RecordedOpTypes";

export function buildInitialState(seedId: string): Match3GameStateForReplay {
  const game = Match3GameEngine.createGame(seedId);
  return {
    grid: game.grid,
    score: game.score,
    moves: game.moves,
    status: game.status,
    seed: game.seed,
    refillCounter: game.refillCounter,
  };
}

export function applyRecordedOp(
  state: Match3GameStateForReplay,
  op: Match3RecordedOp | Match3RecordedStep
):
  | { ok: true; state: Match3GameStateForReplay; clearWaveCount: number }
  | { ok: false; reason: string } {
  const core = toMatch3RecordedOp(op as Match3RecordedStep);
  if (core.op === "concede") {
    return {
      ok: true,
      state: { ...state, status: Match3GameStatus.CANCELLED },
      clearWaveCount: 0,
    };
  }

  const result = Match3GameEngine.applySwap(state, core.r1, core.c1, core.r2, core.c2);
  if (!result.ok) {
    return { ok: false, reason: result.error };
  }

  const clearWaveCount = result.turnScript.filter((step) => step.kind === "clear").length;

  return {
    ok: true,
    state: {
      grid: result.grid,
      score: result.score,
      moves: result.moves,
      status: state.status,
      seed: state.seed,
      refillCounter: result.refillCounter,
    },
    clearWaveCount,
  };
}
