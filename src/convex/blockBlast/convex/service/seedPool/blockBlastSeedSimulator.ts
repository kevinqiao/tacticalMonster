import { BlockBlastGameStatus } from "../../types/BlockBlastTypes";
import {
  applyOp,
  buildInitialState,
  enumeratePlacements,
  openingMoveCount,
} from "./blockBlastOpCodec";
import { layoutFingerprint, computeDistributionMetrics } from "./blockBlastSeedDifficulty";
import { computeBlockBlastTotalScore } from "./blockBlastScoring";
import {
  createStochasticPolicyContext,
  pickNextOp,
  updatePolicyAfterOp,
} from "./blockBlastStochasticHumanPolicy";
import type {
  BlockBlastRecordedOp,
  BlockBlastRolloutScript,
  RolloutDistributionMetrics,
  RolloutExperienceStats,
} from "./blockBlastRecordedOpTypes";
import { resolveBlockBlastPolicyVersion } from "./blockBlastRecordedOpTypes";
import {
  createSimTimeContext,
  DEFAULT_MATCH_TIME_LIMIT_SEC,
  elapsedForOps,
  resolveTerminalReason,
  simCostForOp,
  wouldExceedTimeLimit,
} from "./blockBlastSimTime";
import {
  compactRolloutsForStorage,
  DEFAULT_LAYOUT_PROBE_ROLLOUTS,
  rolloutsAreIdentical,
} from "./blockBlastSeedRolloutCompact";
import {
  isJackpotBurst,
  isMediumBurst,
  LATE_GAME_REACH_SEC,
} from "./blockBlastExperienceKpi";

export { DEFAULT_LAYOUT_PROBE_ROLLOUTS } from "./blockBlastSeedRolloutCompact";

/** 上限足够大，随机 bot 几乎总在此前 stuck。 */
const MAX_SIM_STEPS = 5000;

export type SimulateRolloutOptions = {
  matchSeconds?: number;
  thinkTimeScale?: number;
};

function emptyExperience(): RolloutExperienceStats {
  return {
    scoreAt60: 0,
    scoreAt150: 0,
    scoreAt240: 0,
    mediumBurstCount: 0,
    jackpotCount: 0,
    maxStepClearedCells: 0,
    firstMediumBurstAtSec: null,
    lastBurstAtSec: null,
    lateMediumBurstCount: 0,
    reached180: false,
    reached240: false,
    nearDeathRecoverCount: 0,
    earlyClear: false,
  };
}

export function simulateRollout(
  seedId: string,
  rolloutIndex: number,
  opts: SimulateRolloutOptions = {}
): BlockBlastRolloutScript {
  const matchSeconds = opts.matchSeconds ?? DEFAULT_MATCH_TIME_LIMIT_SEC;
  const thinkTimeScale = opts.thinkTimeScale;
  const state = buildInitialState(seedId);
  const ctx = createStochasticPolicyContext(seedId, rolloutIndex);
  const timeCtx = createSimTimeContext(seedId, rolloutIndex, thinkTimeScale);
  const ops: BlockBlastRecordedOp[] = [];
  const replayPacingMs: number[] = [];
  let elapsed = 0;
  const gridSize = state.gridSize;
  const experience = emptyExperience();

  for (let step = 0; step < MAX_SIM_STEPS; step++) {
    if (state.status === BlockBlastGameStatus.LOST) break;
    const next = pickNextOp(state, ctx);
    if (!next) break;

    const cost = simCostForOp(next, timeCtx, rolloutIndex);
    if (wouldExceedTimeLimit(elapsed, cost, matchSeconds)) break;

    const legalBefore = enumeratePlacements(state).length;
    const scoreBefore = state.score ?? 0;
    const res = applyOp(state, next);
    if (!res.ok) break;
    ops.push(next);
    replayPacingMs.push(Math.max(200, Math.round(cost * 1000)));
    elapsed = Math.round((elapsed + cost) * 100) / 100;
    updatePolicyAfterOp(ctx, scoreBefore, state.score ?? 0, next);

    const C = res.clearedCells ?? 0;
    if (C > experience.maxStepClearedCells) experience.maxStepClearedCells = C;
    if (C > 0 && elapsed <= 60) experience.earlyClear = true;
    if (legalBefore <= 3 && C > 0) experience.nearDeathRecoverCount += 1;

    if (isMediumBurst(C, gridSize)) {
      experience.mediumBurstCount += 1;
      if (experience.firstMediumBurstAtSec == null) {
        experience.firstMediumBurstAtSec = elapsed;
      }
      experience.lastBurstAtSec = elapsed;
      if (elapsed >= LATE_GAME_REACH_SEC) experience.lateMediumBurstCount += 1;
    }
    if (isJackpotBurst(C, gridSize)) {
      experience.jackpotCount += 1;
    }

    const scoreNow = state.score ?? 0;
    if (elapsed <= 60) experience.scoreAt60 = scoreNow;
    if (elapsed <= 150) experience.scoreAt150 = scoreNow;
    if (elapsed <= 240) experience.scoreAt240 = scoreNow;
  }

  const elapsedSimSeconds = elapsedForOps(ops, seedId, rolloutIndex, thinkTimeScale);
  const finalState = buildInitialState(seedId);
  for (const op of ops) {
    applyOp(finalState, op);
  }
  const hasNext = enumeratePlacements(finalState).length > 0;
  const finalScore = computeBlockBlastTotalScore(
    finalState.score ?? 0,
    finalState.lines ?? 0,
    finalState.moves ?? 0
  );

  if (elapsedSimSeconds < 60) experience.scoreAt60 = finalScore;
  if (elapsedSimSeconds < 150) experience.scoreAt150 = finalScore;
  if (elapsedSimSeconds < 240) experience.scoreAt240 = finalScore;
  experience.reached180 = elapsedSimSeconds >= LATE_GAME_REACH_SEC;
  experience.reached240 = elapsedSimSeconds >= 240;

  return {
    rolloutIndex,
    policyVersion: resolveBlockBlastPolicyVersion(),
    ops,
    replayPacingMs,
    finalScore,
    moves: finalState.moves ?? 0,
    completed: false,
    terminalReason: resolveTerminalReason(hasNext),
    elapsedSimSeconds,
    experience,
  };
}

export type SimulateSeedRolloutsOptions = {
  matchSeconds?: number;
  thinkTimeScale?: number;
  /** 即使分数/路径全同也保留全部 k 条 rollout（仅研究用）。 */
  keepDuplicateRollouts?: boolean;
};

export function simulateSeedRollouts(
  seedId: string,
  k: number = DEFAULT_LAYOUT_PROBE_ROLLOUTS,
  opts: SimulateSeedRolloutsOptions = {}
): {
  rollouts: BlockBlastRolloutScript[];
  allRollouts: BlockBlastRolloutScript[];
  metrics: RolloutDistributionMetrics;
  rolloutsCollapsed: boolean;
} {
  const matchSeconds = opts.matchSeconds ?? DEFAULT_MATCH_TIME_LIMIT_SEC;
  const thinkTimeScale = opts.thinkTimeScale;
  const initial = buildInitialState(seedId);
  const openingMoves = openingMoveCount(initial);
  const fp = layoutFingerprint(seedId);

  const simulated: BlockBlastRolloutScript[] = [];
  for (let rolloutIndex = 0; rolloutIndex < k; rolloutIndex++) {
    simulated.push(simulateRollout(seedId, rolloutIndex, { matchSeconds, thinkTimeScale }));
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
  return layoutFingerprint(seedId);
}
