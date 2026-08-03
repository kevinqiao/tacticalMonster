import { SoloGameStatus } from "../../types/SoloTypes";
import { createSeededRandom } from "../../utils/seedRandom";
import { applyOp, buildDealtState } from "./solitaireOpCodec";
import { personaForRollout } from "./solitaireHumanPersonas";
import { computeSolitaireCashTotalScore } from "./solitaireScoring";
import {
  createStochasticPolicyContext,
  shouldCashEarlyExit,
  updatePolicyAfterOp,
  type StochasticPolicyContext,
} from "./solitaireStochasticHumanPolicy";
import type {
  RolloutTerminalReason,
  SolitaireRecordedOp,
} from "./solitaireRecordedOpTypes";

export const DEFAULT_MATCH_TIME_LIMIT_SEC = 300;

export const SIM_SECONDS_PER_OP = {
  draw: 2,
  recycle: 2,
  move: 2,
  foundation: 1.5,
} as const;

export type SimTimeContext = {
  rng: () => number;
  opIndex: number;
};

export function createSimTimeContext(seedId: string, rolloutIndex: number): SimTimeContext {
  return {
    rng: createSeededRandom(`${seedId}|simtime|${rolloutIndex}`),
    opIndex: 0,
  };
}

function baseSecondsForOp(op: SolitaireRecordedOp): number {
  if (op.op === "move" && op.to.startsWith("foundation-")) {
    return SIM_SECONDS_PER_OP.foundation;
  }
  if (op.op === "draw") return SIM_SECONDS_PER_OP.draw;
  if (op.op === "recycle") return SIM_SECONDS_PER_OP.recycle;
  if (op.op === "move") return SIM_SECONDS_PER_OP.move;
  return 0;
}

function scaleKeyForOp(op: SolitaireRecordedOp): keyof typeof SIM_SECONDS_PER_OP {
  if (op.op === "move" && op.to.startsWith("foundation-")) return "foundation";
  if (op.op === "draw") return "draw";
  if (op.op === "recycle") return "recycle";
  return "move";
}

/** Seeded per-op think time (seconds). Advances `ctx.opIndex` when provided. */
export function simCostForOp(op: SolitaireRecordedOp, ctx?: SimTimeContext, rolloutIndex = 0): number {
  const base = baseSecondsForOp(op);
  if (base <= 0) return 0;

  const persona = personaForRollout(rolloutIndex);
  const scale = persona.thinkTimeScale[scaleKeyForOp(op)];
  const jitter = ctx ? 0.75 + ctx.rng() * 0.5 : 1;
  const cost = base * scale * jitter;
  if (ctx) ctx.opIndex += 1;
  return Math.round(cost * 100) / 100;
}

export function replayPacingMsForOp(
  op: SolitaireRecordedOp,
  ctx?: SimTimeContext,
  rolloutIndex = 0
): number {
  const sec = simCostForOp(op, ctx, rolloutIndex);
  return Math.max(200, Math.round(sec * 1000));
}

export function buildReplayPacingMs(
  ops: SolitaireRecordedOp[],
  seedId: string,
  rolloutIndex: number
): number[] {
  const ctx = createSimTimeContext(seedId, rolloutIndex);
  return ops.map((op) => replayPacingMsForOp(op, ctx, rolloutIndex));
}

export function elapsedFromPacingMs(pacingMs: number[]): number {
  const ms = pacingMs.reduce((a, b) => a + b, 0);
  return Math.round((ms / 1000) * 100) / 100;
}

export function wouldExceedTimeLimit(
  elapsed: number,
  opCostSec: number,
  limitSec: number = DEFAULT_MATCH_TIME_LIMIT_SEC
): boolean {
  return elapsed + opCostSec > limitSec;
}

export function elapsedForOps(
  ops: SolitaireRecordedOp[],
  seedId?: string,
  rolloutIndex = 0
): number {
  const ctx = seedId ? createSimTimeContext(seedId, rolloutIndex) : undefined;
  let elapsed = 0;
  for (const op of ops) {
    elapsed += simCostForOp(op, ctx, rolloutIndex);
  }
  return Math.round(elapsed * 100) / 100;
}

export type ReplayWithTimeResult = {
  finalScore: number;
  moves: number;
  completed: boolean;
  terminalReason: RolloutTerminalReason;
  elapsedSimSeconds: number;
};

export function resolveTerminalReason(
  completed: boolean,
  elapsed: number,
  limitSec: number,
  nextOp: SolitaireRecordedOp | null,
  state: SoloGameState,
  ctx: StochasticPolicyContext,
  timeCtx?: SimTimeContext
): RolloutTerminalReason {
  if (completed) return "completed";
  if (nextOp && timeCtx) {
    const nextCost = simCostForOp(nextOp, timeCtx, ctx.rolloutIndex);
    if (wouldExceedTimeLimit(elapsed, nextCost, limitSec)) {
      return "time_up";
    }
  }
  if (shouldCashEarlyExit(state, ctx, elapsed) || !nextOp) {
    return "exited";
  }
  return "stuck";
}

export function replayOpsWithTimeLimit(
  seedId: string,
  ops: SolitaireRecordedOp[],
  limitSec: number = DEFAULT_MATCH_TIME_LIMIT_SEC,
  rolloutIndex: number = 0,
  nextOpAfterReplay: SolitaireRecordedOp | null = null,
  replayPacingMs?: number[]
): ReplayWithTimeResult {
  const state = buildDealtState(seedId);
  const ctx = createStochasticPolicyContext(seedId, rolloutIndex);
  const timeCtx = replayPacingMs ? undefined : createSimTimeContext(seedId, rolloutIndex);
  let elapsed = 0;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const cost =
      replayPacingMs != null
        ? replayPacingMs[i]! / 1000
        : simCostForOp(op, timeCtx, rolloutIndex);
    if (elapsed + cost > limitSec) {
      return {
        finalScore: computeSolitaireCashTotalScore(state.score ?? 0, elapsed, limitSec),
        moves: state.moves ?? 0,
        completed: false,
        terminalReason: "time_up",
        elapsedSimSeconds: elapsed,
      };
    }
    elapsed = Math.round((elapsed + cost) * 100) / 100;
    const scoreBefore = state.score ?? 0;
    const res = applyOp(state, op);
    if (!res.ok) {
      throw new Error(`replay failed on ${JSON.stringify(op)}: ${res.reason}`);
    }
    updatePolicyAfterOp(ctx, scoreBefore, state.score ?? 0, op);
    if (state.status === SoloGameStatus.COMPLETED) {
      return {
        finalScore: computeSolitaireCashTotalScore(state.score ?? 0, elapsed, limitSec),
        moves: state.moves ?? 0,
        completed: true,
        terminalReason: "completed",
        elapsedSimSeconds: elapsed,
      };
    }
  }

  const completed = state.status === SoloGameStatus.COMPLETED;
  return {
    finalScore: computeSolitaireCashTotalScore(state.score ?? 0, elapsed, limitSec),
    moves: state.moves ?? 0,
    completed,
    terminalReason: resolveTerminalReason(
      completed,
      elapsed,
      limitSec,
      nextOpAfterReplay,
      state,
      ctx,
      timeCtx
    ),
    elapsedSimSeconds: elapsed,
  };
}
