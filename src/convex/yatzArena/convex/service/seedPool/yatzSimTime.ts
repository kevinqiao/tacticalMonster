/**
 * Yatz bot rollout pacing — per-op think time with persona + jitter.
 * Tuned so a full 13-round greedy rollout ≈ 3–4 minutes (human-like).
 */
import { createSeededRandom } from "../../utils/seedRandom";
import { personaForRollout } from "./yatzHumanPersonas";
import type { YatzRecordedStep } from "./yatzRecordedOpTypes";

export const YATZ_SIM_SECONDS_PER_OP = {
  roll: 2.8,
  toggle_hold: 1.4,
  pick_category: 7.5,
  concede: 0,
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

function baseSecondsForOp(op: YatzRecordedStep): number {
  if (op.op === "roll") return YATZ_SIM_SECONDS_PER_OP.roll;
  if (op.op === "toggle_hold") return YATZ_SIM_SECONDS_PER_OP.toggle_hold;
  if (op.op === "pick_category") return YATZ_SIM_SECONDS_PER_OP.pick_category;
  return YATZ_SIM_SECONDS_PER_OP.concede;
}

function scaleKeyForOp(op: YatzRecordedStep): keyof typeof YATZ_SIM_SECONDS_PER_OP {
  if (op.op === "toggle_hold") return "toggle_hold";
  if (op.op === "pick_category") return "pick_category";
  if (op.op === "roll") return "roll";
  return "concede";
}

/** Seeded per-op think time (seconds). Advances `ctx.opIndex` when provided. */
export function simCostForOp(
  op: YatzRecordedStep,
  ctx?: SimTimeContext,
  rolloutIndex = 0
): number {
  const base = baseSecondsForOp(op);
  if (base <= 0) return 0;

  const persona = personaForRollout(rolloutIndex);
  const scale = persona.thinkTimeScale[scaleKeyForOp(op)];
  const jitter = ctx ? 0.7 + ctx.rng() * 0.6 : 1;
  const cost = base * scale * jitter;
  if (ctx) ctx.opIndex += 1;
  return Math.round(cost * 100) / 100;
}

export function replayPacingMsForOp(
  op: YatzRecordedStep,
  ctx?: SimTimeContext,
  rolloutIndex = 0
): number {
  const sec = simCostForOp(op, ctx, rolloutIndex);
  const floorMs =
    op.op === "pick_category" ? 1500 : op.op === "toggle_hold" ? 600 : op.op === "roll" ? 900 : 200;
  return Math.max(floorMs, Math.round(sec * 1000));
}

export function buildReplayPacingMs(
  ops: YatzRecordedStep[],
  seedId: string,
  rolloutIndex: number
): number[] {
  const ctx = createSimTimeContext(seedId, rolloutIndex);
  return ops.map((op) => replayPacingMsForOp(op, ctx, rolloutIndex));
}

export function elapsedForOps(
  ops: YatzRecordedStep[],
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

/** Scale pacing so step delays sum to targetMs (e.g. platform bot duration). */
export function scalePacingToTargetMs(pacingMs: number[], targetMs: number): number[] {
  if (pacingMs.length === 0 || targetMs <= 0) return pacingMs;
  const total = pacingMs.reduce((a, b) => a + b, 0);
  if (total <= 0) return pacingMs;
  const ratio = targetMs / total;
  return pacingMs.map((ms) => Math.max(50, Math.round(ms * ratio)));
}
