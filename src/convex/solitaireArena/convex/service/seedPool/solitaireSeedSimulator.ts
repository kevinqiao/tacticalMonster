import { SoloGameStatus } from "../../types/SoloTypes";
import { layoutFingerprint } from "./solitaireSeedDifficulty";
import { computeSolitaireCashTotalScore } from "./solitaireScoring";
import { applyOp, buildDealtState, openingMoveCount } from "./solitaireOpCodec";
import {
  beginPolicyTurn,
  createStochasticPolicyContext,
  markFoundationBurstOp,
  pickFoundationBurstOp,
  pickNextOp,
  replayPolicyContext,
  updatePolicyAfterOp,
} from "./solitaireStochasticHumanPolicy";
import type {
  RolloutDistributionMetrics,
  RolloutTerminalReason,
  SolitaireRecordedOp,
  SolitaireRolloutScript,
} from "./solitaireRecordedOpTypes";
import { HUMAN_STOCHASTIC_POLICY_VERSION as POLICY_VERSION } from "./solitaireRecordedOpTypes";
import {
  createSimTimeContext,
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  elapsedForOps,
  resolveTerminalReason,
  simCostForOp,
  wouldExceedTimeLimit,
} from "./solitaireSimTime";
import { computeDistributionMetrics } from "./solitaireSeedDifficulty";
import {
  compactRolloutsForStorage,
  DEFAULT_LAYOUT_PROBE_ROLLOUTS,
  rolloutsAreIdentical,
} from "./solitaireSeedRolloutCompact";

export { DEFAULT_LAYOUT_PROBE_ROLLOUTS } from "./solitaireSeedRolloutCompact";

const MAX_SIM_STEPS = 800;

export type SimulateRolloutOptions = {
  matchSeconds?: number;
};

function recordOp(
  state: Parameters<typeof applyOp>[0],
  ctx: ReturnType<typeof createStochasticPolicyContext>,
  timeCtx: ReturnType<typeof createSimTimeContext>,
  op: SolitaireRecordedOp,
  ops: SolitaireRecordedOp[],
  pacingMs: number[],
  elapsed: { value: number },
  matchSeconds: number
): { ok: true; terminalReason?: RolloutTerminalReason } | { ok: false; terminalReason: RolloutTerminalReason } {
  const cost = simCostForOp(op, timeCtx, ctx.rolloutIndex);
  if (wouldExceedTimeLimit(elapsed.value, cost, matchSeconds)) {
    return { ok: false, terminalReason: "time_up" };
  }

  const scoreBefore = state.score ?? 0;
  const res = applyOp(state, op);
  if (!res.ok) {
    return { ok: false, terminalReason: "stuck" };
  }
  ops.push(op);
  pacingMs.push(Math.max(200, Math.round(cost * 1000)));
  elapsed.value = Math.round((elapsed.value + cost) * 100) / 100;
  updatePolicyAfterOp(ctx, scoreBefore, state.score ?? 0, op);
  markFoundationBurstOp(ctx, op);

  if (state.status === SoloGameStatus.COMPLETED) {
    return { ok: true, terminalReason: "completed" };
  }
  return { ok: true };
}

export function simulateRollout(
  seedId: string,
  rolloutIndex: number,
  opts: SimulateRolloutOptions = {}
): SolitaireRolloutScript {
  const matchSeconds = opts.matchSeconds ?? DEFAULT_MATCH_TIME_LIMIT_SEC;
  const state = buildDealtState(seedId);
  const ctx = createStochasticPolicyContext(seedId, rolloutIndex);
  const timeCtx = createSimTimeContext(seedId, rolloutIndex);
  const ops: SolitaireRecordedOp[] = [];
  const replayPacingMs: number[] = [];
  const elapsed = { value: 0 };
  let terminalReason: RolloutTerminalReason = "exited";

  for (let step = 0; step < MAX_SIM_STEPS; step++) {
    if (state.status === SoloGameStatus.COMPLETED) {
      terminalReason = "completed";
      break;
    }

    beginPolicyTurn(ctx);

    while (ctx.foundationBurstThisTurn < ctx.persona.maxFoundationBurst) {
      const foundationOp = pickFoundationBurstOp(state, ctx);
      if (!foundationOp) break;

      const burstResult = recordOp(
        state,
        ctx,
        timeCtx,
        foundationOp,
        ops,
        replayPacingMs,
        elapsed,
        matchSeconds
      );
      if (!burstResult.ok) {
        terminalReason = burstResult.terminalReason;
        break;
      }
      if (burstResult.terminalReason === "completed") {
        terminalReason = "completed";
        break;
      }
    }

    if (terminalReason === "time_up" || terminalReason === "stuck" || terminalReason === "completed") {
      break;
    }

    const next = pickNextOp(state, ctx);
    if (!next) {
      break;
    }

    const mainResult = recordOp(
      state,
      ctx,
      timeCtx,
      next,
      ops,
      replayPacingMs,
      elapsed,
      matchSeconds
    );
    if (!mainResult.ok) {
      terminalReason = mainResult.terminalReason;
      break;
    }
    if (mainResult.terminalReason === "completed") {
      terminalReason = "completed";
      break;
    }
  }

  const elapsedSimSeconds = elapsedForOps(ops, seedId, rolloutIndex);
  const finalState = buildDealtState(seedId);
  const ctxEnd = replayPolicyContext(seedId, rolloutIndex, ops, finalState);
  const timeCtxEnd = createSimTimeContext(seedId, rolloutIndex);
  for (const op of ops) {
    simCostForOp(op, timeCtxEnd, rolloutIndex);
  }

  const completed = finalState.status === SoloGameStatus.COMPLETED;
  if (completed) {
    terminalReason = "completed";
  } else if (terminalReason === "time_up") {
    // keep time_up from the op that would cross the limit
  } else {
    const nextOp = pickNextOp(finalState, ctxEnd);
    terminalReason = resolveTerminalReason(
      false,
      elapsedSimSeconds,
      matchSeconds,
      nextOp,
      finalState,
      ctxEnd,
      timeCtxEnd
    );
  }

  return {
    rolloutIndex,
    policyVersion: POLICY_VERSION,
    ops,
    replayPacingMs,
    finalScore: computeSolitaireCashTotalScore(
      finalState.score ?? 0,
      elapsedSimSeconds,
      matchSeconds
    ),
    moves: finalState.moves ?? 0,
    completed,
    terminalReason,
    elapsedSimSeconds,
  };
}

export type SimulateSeedRolloutsOptions = {
  matchSeconds?: number;
  /** Keep all k rollout files even when scores/paths are identical (research only). */
  keepDuplicateRollouts?: boolean;
};

export function simulateSeedRollouts(
  seedId: string,
  k: number = DEFAULT_LAYOUT_PROBE_ROLLOUTS,
  opts: SimulateSeedRolloutsOptions = {}
): {
  rollouts: SolitaireRolloutScript[];
  metrics: RolloutDistributionMetrics;
  /** True when every rollout produced the same score/path (extra rollouts add no information). */
  rolloutsCollapsed: boolean;
} {
  const matchSeconds = opts.matchSeconds ?? DEFAULT_MATCH_TIME_LIMIT_SEC;
  const initial = buildDealtState(seedId);
  const openingMoves = openingMoveCount(initial);
  const fp = layoutFingerprint(initial.cards);

  const simulated: SolitaireRolloutScript[] = [];
  for (let rolloutIndex = 0; rolloutIndex < k; rolloutIndex++) {
    simulated.push(simulateRollout(seedId, rolloutIndex, { matchSeconds }));
  }

  const rolloutsCollapsed = rolloutsAreIdentical(simulated);
  const rollouts = opts.keepDuplicateRollouts
    ? simulated
    : compactRolloutsForStorage(simulated);

  const metrics = computeDistributionMetrics(simulated, {
    openingMoveCount: openingMoves,
    layoutFingerprint: fp,
    matchTimeLimitSec: matchSeconds,
  });

  return { rollouts, allRollouts: simulated, metrics, rolloutsCollapsed };
}

export function fingerprintForSeed(seedId: string): string {
  const initial = buildDealtState(seedId);
  return layoutFingerprint(initial.cards);
}
