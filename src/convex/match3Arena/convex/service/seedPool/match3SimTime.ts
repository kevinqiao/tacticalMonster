export { MATCH3_MATCH_TIME_LIMIT_SEC as DEFAULT_MATCH_TIME_LIMIT_SEC } from "../match3Scoring";

export type SimTimeContext = {
  rolloutIndex: number;
};

export function createSimTimeContext(rolloutIndex: number): SimTimeContext {
  return { rolloutIndex };
}

export function simCostForOp(
  op: { op: string },
  _timeCtx: SimTimeContext,
  rolloutIndex: number
): number {
  if (op.op === "concede") return 0.5;
  return 1.2 + (rolloutIndex % 5) * 0.05;
}

export function wouldExceedTimeLimit(
  elapsedSec: number,
  costSec: number,
  matchSeconds: number
): boolean {
  return elapsedSec + costSec > matchSeconds;
}

export function resolveTerminalReason(args: {
  status: number;
  noValidMoves: boolean;
  timeUp: boolean;
  conceded: boolean;
}): import("./match3RecordedOpTypes").RolloutTerminalReason {
  if (args.conceded) return "exited";
  if (args.timeUp) return "time_up";
  if (args.noValidMoves) return "stuck";
  return "completed";
}
