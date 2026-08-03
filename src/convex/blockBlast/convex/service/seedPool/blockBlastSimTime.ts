/**
 * Block Blast 模拟计时：每步思考时间按人格缩放 + 抖动。
 * 默认与真实休闲对局一致（5 分钟），与 solitaireSimTime 对齐。
 */
import { createSeededRandom } from "./blockBlastSeedRandom";
import { personaForRollout } from "./blockBlastHumanPersonas";
import { applyOp, buildInitialState, enumeratePlacements } from "./blockBlastOpCodec";
import { BLOCK_BLAST_MATCH_TIME_LIMIT_SEC, computeBlockBlastTotalScore } from "./blockBlastScoring";
import { BlockBlastGameStatus } from "../../types/BlockBlastTypes";
import type {
  BlockBlastRecordedOp,
  RolloutTerminalReason,
} from "./blockBlastRecordedOpTypes";

export const DEFAULT_MATCH_TIME_LIMIT_SEC = BLOCK_BLAST_MATCH_TIME_LIMIT_SEC;

/**
 * 统一缩放所有人格 base thinkTimeSec（见 blockBlastHumanPersonas.ts）。
 * pool create 默认用 CLI `--think-time-scale`；未传时用本常量。
 */
export const BLOCK_BLAST_SIM_THINK_TIME_SCALE = 1;

export function resolveThinkTimeScale(override?: number): number {
  if (override != null && Number.isFinite(override) && override > 0) {
    return override;
  }
  return BLOCK_BLAST_SIM_THINK_TIME_SCALE;
}

export type SimTimeContext = {
  rng: () => number;
  opIndex: number;
  thinkTimeScale: number;
};

export function createSimTimeContext(
  seedId: string,
  rolloutIndex: number,
  thinkTimeScale?: number
): SimTimeContext {
  return {
    rng: createSeededRandom(`${seedId}|simtime|${rolloutIndex}`),
    opIndex: 0,
    thinkTimeScale: resolveThinkTimeScale(thinkTimeScale),
  };
}

/** 单步思考时间（秒），按人格缩放 + 抖动；推进 ctx.opIndex。 */
export function simCostForOp(
  op: BlockBlastRecordedOp,
  ctx?: SimTimeContext,
  rolloutIndex = 0
): number {
  if (op.op === "concede") return 0;
  const persona = personaForRollout(rolloutIndex);
  const jitter = ctx ? 0.75 + ctx.rng() * 0.5 : 1;
  const scale = ctx?.thinkTimeScale ?? BLOCK_BLAST_SIM_THINK_TIME_SCALE;
  const cost = persona.thinkTimeSec * scale * jitter;
  if (ctx) ctx.opIndex += 1;
  return Math.round(cost * 100) / 100;
}

export function replayPacingMsForOp(
  op: BlockBlastRecordedOp,
  ctx?: SimTimeContext,
  rolloutIndex = 0
): number {
  const sec = simCostForOp(op, ctx, rolloutIndex);
  return Math.max(200, Math.round(sec * 1000));
}

export function elapsedForOps(
  ops: BlockBlastRecordedOp[],
  seedId?: string,
  rolloutIndex = 0,
  thinkTimeScale?: number
): number {
  const ctx = seedId ? createSimTimeContext(seedId, rolloutIndex, thinkTimeScale) : undefined;
  let elapsed = 0;
  for (const op of ops) {
    elapsed += simCostForOp(op, ctx, rolloutIndex);
  }
  return Math.round(elapsed * 100) / 100;
}

export function wouldExceedTimeLimit(
  elapsed: number,
  opCostSec: number,
  limitSec: number = DEFAULT_MATCH_TIME_LIMIT_SEC
): boolean {
  return elapsed + opCostSec > limitSec;
}

/** stuck = 已无合法落子；否则 time_up（超时或步数封顶）。Block Blast 无 completed。 */
export function resolveTerminalReason(hasNextPlacement: boolean): RolloutTerminalReason {
  return hasNextPlacement ? "time_up" : "stuck";
}

export type ReplayWithTimeResult = {
  finalScore: number;
  moves: number;
  completed: boolean;
  terminalReason: RolloutTerminalReason;
  elapsedSimSeconds: number;
};

export function replayOpsWithTimeLimit(
  seedId: string,
  ops: BlockBlastRecordedOp[],
  limitSec: number = DEFAULT_MATCH_TIME_LIMIT_SEC,
  rolloutIndex: number = 0,
  thinkTimeScale?: number
): ReplayWithTimeResult {
  const state = buildInitialState(seedId);
  const timeCtx = createSimTimeContext(seedId, rolloutIndex, thinkTimeScale);
  let elapsed = 0;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const cost = simCostForOp(op, timeCtx, rolloutIndex);
    elapsed = Math.round((elapsed + cost) * 100) / 100;
    const res = applyOp(state, op);
    if (!res.ok) {
      throw new Error(`replay failed on ${JSON.stringify(op)}: ${res.reason}`);
    }
    if (state.status === BlockBlastGameStatus.CANCELLED) break;
  }

  const hasNext = enumeratePlacements(state).length > 0;
  return {
    finalScore: computeBlockBlastTotalScore(state.score ?? 0, state.lines ?? 0, state.moves ?? 0),
    moves: state.moves ?? 0,
    completed: false,
    terminalReason: resolveTerminalReason(hasNext),
    elapsedSimSeconds: elapsed,
  };
}
