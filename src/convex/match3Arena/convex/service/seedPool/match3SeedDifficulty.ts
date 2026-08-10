import { buildInitialState } from "./match3OpCodec";
import { findValidMoves } from "../Match3GameEngine";
import type {
  Match3RolloutScript,
  RolloutDistributionMetrics,
  RolloutSummary,
  ScoreHistogram,
  ScoreQuantiles,
} from "./match3RecordedOpTypes";
import { HUMAN_STOCHASTIC_POLICY_VERSION } from "./match3RecordedOpTypes";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./match3SimTime";

export function layoutFingerprint(seedId: string): string {
  let h = 0;
  for (let i = 0; i < seedId.length; i++) {
    h = (h * 31 + seedId.charCodeAt(i)) | 0;
  }
  return `m3fp-${Math.abs(h).toString(16)}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx] ?? 0;
}

function computeScoreQuantiles(sortedScores: number[]): ScoreQuantiles {
  return {
    p10: percentile(sortedScores, 0.1),
    p25: percentile(sortedScores, 0.25),
    p30: percentile(sortedScores, 0.3),
    p33: percentile(sortedScores, 0.33),
    p50: percentile(sortedScores, 0.5),
    p66: percentile(sortedScores, 0.66),
    p70: percentile(sortedScores, 0.7),
    p75: percentile(sortedScores, 0.75),
    p90: percentile(sortedScores, 0.9),
  };
}

function buildHistogram(scores: number[]): ScoreHistogram {
  const hist: ScoreHistogram = {};
  for (const s of scores) {
    const bucket = Math.floor(s / 100) * 100;
    const key = String(bucket);
    hist[key] = (hist[key] ?? 0) + 1;
  }
  return hist;
}

export function deriveLayoutOutcome(input: {
  openingMoveCount: number;
  earlyStuckRate: number;
}): RolloutDistributionMetrics["layoutOutcome"] {
  if (input.openingMoveCount < 3) return "likely_dead";
  if (input.earlyStuckRate >= 0.5) return "likely_dead";
  if (input.earlyStuckRate >= 0.25 || input.openingMoveCount < 5) return "mixed";
  return "winnable";
}

/**
 * Opening / early-survival ease (higher = friendlier).
 * Deliberately not a p50 alias — mid-game skill deaths should not define "上手".
 */
export function computePlayerEaseScore(input: {
  openingMoveCount: number;
  scoreP25: number;
  earlyStuckRate: number;
  meanEarlyClearWaveSum: number;
  layoutOutcome: RolloutDistributionMetrics["layoutOutcome"];
}): number {
  return (
    input.openingMoveCount * 12 +
    input.scoreP25 * 0.25 +
    (1 - input.earlyStuckRate) * 220 +
    input.meanEarlyClearWaveSum * 40 +
    (input.layoutOutcome === "likely_dead" ? -1000 : 0)
  );
}

/** Ritual / first-wave highlight axis for novice segment A. */
export function computeOnboardingScore(input: {
  openingMoveCount: number;
  meanEarlyClearWaveSum: number;
  earlyCascadeHitRate: number;
  earlyStuckRate: number;
}): number {
  return Math.round(
    input.meanEarlyClearWaveSum * 120 +
      input.earlyCascadeHitRate * 250 +
      input.openingMoveCount * 8 +
      (1 - input.earlyStuckRate) * 100
  );
}

export function computeDistributionMetrics(
  rollouts: Match3RolloutScript[],
  seedId: string,
  rolloutCount: number,
  matchSeconds: number = DEFAULT_MATCH_TIME_LIMIT_SEC
): RolloutDistributionMetrics {
  const scores = rollouts.map((r) => r.finalScore);
  const sorted = [...scores].sort((a, b) => a - b);
  const quantiles = computeScoreQuantiles(sorted) as ScoreQuantiles;
  const openingMoveCount = findValidMoves(buildInitialState(seedId).grid).length;

  const completedCount = rollouts.filter((r) => r.completed).length;
  const stuckCount = rollouts.filter((r) => r.terminalReason === "stuck").length;
  const exitedCount = rollouts.filter((r) => r.terminalReason === "exited").length;
  const timeUpCount = rollouts.filter((r) => r.terminalReason === "time_up").length;
  const scoreSpread = (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0);

  const k = rollouts.length || 1;
  const earlyStuckRate =
    rollouts.filter((r) => r.earlyStuck === true).length / k;
  const meanEarlyClearWaveSum =
    rollouts.reduce((sum, r) => sum + (r.earlyClearWaveSum ?? 0), 0) / k;
  const earlyCascadeHitRate =
    rollouts.filter((r) => (r.earlyClearWaveSum ?? 0) >= 2).length / k;

  const layoutOutcome = deriveLayoutOutcome({ openingMoveCount, earlyStuckRate });
  const playerEaseScore = computePlayerEaseScore({
    openingMoveCount,
    scoreP25: quantiles.p25,
    earlyStuckRate,
    meanEarlyClearWaveSum,
    layoutOutcome,
  });
  const onboardingScore = computeOnboardingScore({
    openingMoveCount,
    meanEarlyClearWaveSum,
    earlyCascadeHitRate,
    earlyStuckRate,
  });

  return {
    rolloutCount,
    scoreMin: sorted[0] ?? 0,
    scoreP50: quantiles.p50,
    scoreP90: quantiles.p90,
    scoreMax: sorted[sorted.length - 1] ?? 0,
    scoreQuantiles: quantiles,
    bandThresholds: { lowMax: quantiles.p30, midMax: quantiles.p70 },
    scoreHistogram: buildHistogram(scores),
    completedRate: rollouts.length ? completedCount / rollouts.length : 0,
    stuckRate: rollouts.length ? stuckCount / rollouts.length : 0,
    exitedRate: rollouts.length ? exitedCount / rollouts.length : 0,
    timeUpRate: rollouts.length ? timeUpCount / rollouts.length : 0,
    completedCount,
    hasAnyCompleted: completedCount > 0,
    layoutOutcome,
    openingMoveCount,
    scoreSpread,
    playerEaseScore,
    onboardingScore,
    earlyStuckRate,
    meanEarlyClearWaveSum,
    earlyCascadeHitRate,
    layoutFingerprint: layoutFingerprint(seedId),
    policyVersion: HUMAN_STOCHASTIC_POLICY_VERSION,
    matchTimeLimitSec: matchSeconds,
  };
}

export function tierFromDifficultyScore(p50: number): "easy" | "medium" | "hard" {
  if (p50 < 800) return "easy";
  if (p50 < 1500) return "medium";
  return "hard";
}

export type Match3TierCandidate = {
  seedId: string;
  poolVersion: string;
  difficultyScore: number;
  metrics: RolloutDistributionMetrics;
  rolloutSummaries: RolloutSummary[];
};

export type SeedPoolTierQuotas = { easy: number; medium: number };

/** 按 difficultyScore 分位切 easy/medium/hard（与 solitaire 一致：高分 = easy）。 */
export function assignTiers(
  candidates: Match3TierCandidate[],
  quotas: SeedPoolTierQuotas = { easy: 0.3, medium: 0.4 }
): Array<Match3TierCandidate & { tier: "easy" | "medium" | "hard" }> {
  const sorted = [...candidates].sort((a, b) => {
    if (b.difficultyScore !== a.difficultyScore) {
      return b.difficultyScore - a.difficultyScore;
    }
    return a.seedId.localeCompare(b.seedId);
  });

  const n = sorted.length;
  const easyCut = Math.floor(n * quotas.easy);
  const mediumCut = Math.floor(n * (quotas.easy + quotas.medium));

  return sorted.map((c, i) => {
    let tier: "easy" | "medium" | "hard";
    if (i < easyCut) tier = "easy";
    else if (i < mediumCut) tier = "medium";
    else tier = "hard";
    return { ...c, tier };
  });
}
