import { Match3GameStatus } from "../../types/Match3Types";
import { findValidMoves } from "../Match3GameEngine";
import { computeMatch3TotalScore } from "../match3Scoring";
import { applyRecordedOp, buildInitialState } from "./match3OpCodec";
import type {
  Match3RecordedOp,
  Match3RolloutScript,
  RolloutDistributionMetrics,
  RolloutTerminalReason,
} from "./match3RecordedOpTypes";
import { HUMAN_STOCHASTIC_POLICY_VERSION as POLICY_VERSION } from "./match3RecordedOpTypes";
import {
  createStochasticPolicyContext,
  pickNextOp,
  updatePolicyAfterOp,
} from "./match3StochasticHumanPolicy";
import {
  createSimTimeContext,
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  resolveTerminalReason,
  simCostForOp,
  wouldExceedTimeLimit,
} from "./match3SimTime";
import { computeDistributionMetrics } from "./match3SeedDifficulty";

const MAX_SIM_STEPS = 500;

export type SimulateRolloutOptions = {
  matchSeconds?: number;
};

function recordOp(
  state: ReturnType<typeof buildInitialState>,
  ctx: ReturnType<typeof createStochasticPolicyContext>,
  timeCtx: ReturnType<typeof createSimTimeContext>,
  op: Match3RecordedOp,
  ops: Match3RecordedOp[],
  pacingMs: number[],
  elapsed: { value: number },
  matchSeconds: number
): { ok: true; state: typeof state; terminalReason?: RolloutTerminalReason } | { ok: false; terminalReason: RolloutTerminalReason } {
  const cost = simCostForOp(op, timeCtx, ctx.rolloutIndex);
  if (wouldExceedTimeLimit(elapsed.value, cost, matchSeconds)) {
    return { ok: false, terminalReason: "time_up" };
  }

  const res = applyRecordedOp(state, op);
  if (!res.ok) {
    return { ok: false, terminalReason: "stuck" };
  }

  ops.push(op);
  pacingMs.push(Math.max(150, Math.round(cost * 1000)));
  elapsed.value = Math.round((elapsed.value + cost) * 100) / 100;
  updatePolicyAfterOp(ctx);

  if (res.state.status === Match3GameStatus.CANCELLED) {
    return { ok: true, state: res.state, terminalReason: "exited" };
  }
  return { ok: true, state: res.state };
}

export function simulateRollout(
  seedId: string,
  rolloutIndex: number,
  opts: SimulateRolloutOptions = {}
): Match3RolloutScript {
  const matchSeconds = opts.matchSeconds ?? DEFAULT_MATCH_TIME_LIMIT_SEC;
  let state = buildInitialState(seedId);
  const ops: Match3RecordedOp[] = [];
  const pacingMs: number[] = [];
  const elapsed = { value: 0 };
  const ctx = createStochasticPolicyContext(rolloutIndex, seedId);
  const timeCtx = createSimTimeContext(rolloutIndex);

  let terminalReason: RolloutTerminalReason = "completed";
  let completed = false;

  for (let step = 0; step < MAX_SIM_STEPS; step++) {
    const next = pickNextOp(state, ctx);
    if (!next) {
      terminalReason = "stuck";
      completed = true;
      break;
    }

    const recorded: Match3RecordedOp =
      next.op === "concede"
        ? { op: "concede" }
        : { op: "swap", r1: next.r1, c1: next.c1, r2: next.r2, c2: next.c2 };

    const result = recordOp(state, ctx, timeCtx, recorded, ops, pacingMs, elapsed, matchSeconds);
    if (!result.ok) {
      terminalReason = result.terminalReason;
      break;
    }
    state = result.state;
    if (result.terminalReason === "exited") {
      terminalReason = "exited";
      completed = true;
      break;
    }
    if (findValidMoves(state.grid).length === 0) {
      terminalReason = "stuck";
      completed = true;
      break;
    }
  }

  const finalScore = computeMatch3TotalScore(state.score, elapsed.value, matchSeconds);

  return {
    rolloutIndex,
    policyVersion: POLICY_VERSION,
    ops,
    replayPacingMs: pacingMs,
    finalScore,
    moves: state.moves,
    completed,
    terminalReason,
    elapsedSimSeconds: elapsed.value,
  };
}

export function simulateSeedRollouts(
  seedId: string,
  rolloutCount: number,
  opts: SimulateRolloutOptions = {}
): { rollouts: Match3RolloutScript[]; metrics: RolloutDistributionMetrics } {
  const rollouts: Match3RolloutScript[] = [];
  for (let i = 0; i < rolloutCount; i++) {
    rollouts.push(simulateRollout(seedId, i, opts));
  }
  const matchSeconds = opts.matchSeconds ?? DEFAULT_MATCH_TIME_LIMIT_SEC;
  const metrics = computeDistributionMetrics(rollouts, seedId, rolloutCount, matchSeconds);
  return { rollouts, metrics };
}
