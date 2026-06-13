import { mapFingerprint } from "../../shared/towerSeedCatalog";
import type { TowerArenaSeed } from "../../types/TowerArenaSeed";
import type {
  BandThresholds,
  RolloutDistributionMetrics,
  RolloutSummary,
  ScoreHistogram,
  SeedLayoutOutcome,
  SeedPoolEntry,
  SeedPoolTierQuotas,
  ScoreQuantiles,
  SeedTierReportEntry,
  TowerRolloutScript,
  TowerSeedTier,
  TierIndex,
} from "./towerRecordedOpTypes";
import { TOWER_STOCHASTIC_POLICY_VERSION as POLICY_VERSION } from "./towerRecordedOpTypes";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./towerSimTime";

export function mapFingerprintFromSeed(seed: TowerArenaSeed): string {
  return mapFingerprint(seed);
}

function fnv1a(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fp:${(h >>> 0).toString(16)}`;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx] ?? 0;
}

/** Performance-band cut points: bottom 30% low / middle 40% / top 30% high scores */
export const PERFORMANCE_BAND_LOW_FRACTION = 0.3;
export const PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION = 0.7;

/** Ceil indexing for discrete rollout scores at rank boundaries */
export function percentileForBand(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

export function computeBandThresholds(sortedScores: number[]): BandThresholds {
  return {
    lowMax: percentileForBand(sortedScores, PERFORMANCE_BAND_LOW_FRACTION),
    midMax: percentileForBand(sortedScores, PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION),
  };
}

function computeScoreQuantiles(sortedScores: number[]): ScoreQuantiles {
  return {
    p10: percentile(sortedScores, 0.1),
    p25: percentile(sortedScores, 0.25),
    p30: percentileForBand(sortedScores, PERFORMANCE_BAND_LOW_FRACTION),
    p33: percentileForBand(sortedScores, 0.33),
    p50: percentile(sortedScores, 0.5),
    p66: percentileForBand(sortedScores, 0.66),
    p70: percentileForBand(sortedScores, PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION),
    p75: percentile(sortedScores, 0.75),
    p90: percentile(sortedScores, 0.9),
  };
}

const HISTOGRAM_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "<0", min: -Infinity, max: -1 },
  { label: "0-499", min: 0, max: 499 },
  { label: "500-999", min: 500, max: 999 },
  { label: "1000-1999", min: 1000, max: 1999 },
  { label: "2000-3999", min: 2000, max: 3999 },
  { label: "4000+", min: 4000, max: Infinity },
];

export function computeScoreHistogram(scores: number[]): ScoreHistogram {
  const histogram: ScoreHistogram = {};
  for (const bucket of HISTOGRAM_BUCKETS) {
    histogram[bucket.label] = 0;
  }
  for (const score of scores) {
    const bucket = HISTOGRAM_BUCKETS.find((b) => score >= b.min && score <= b.max);
    if (bucket) histogram[bucket.label]!++;
  }
  return histogram;
}

export function deriveLayoutOutcome(
  metrics: Pick<
    RolloutDistributionMetrics,
    "hasAnyCompleted" | "completedRate" | "scoreMax"
  >
): SeedLayoutOutcome {
  if (metrics.hasAnyCompleted) return "winnable";
  if (metrics.completedRate === 0 && metrics.scoreMax < DEAD_LAYOUT_SCORE_MAX) {
    return "likely_dead";
  }
  return "mixed";
}

/** Single histogram bucket holds more than this fraction of rollouts → collapsed scores */
export const COLLAPSED_BUCKET_FRACTION = 0.85;

export function isCollapsedDistribution(
  histogram: ScoreHistogram,
  rolloutCount: number
): boolean {
  if (rolloutCount === 0) return true;
  const maxBucket = Math.max(...Object.values(histogram));
  return maxBucket / rolloutCount > COLLAPSED_BUCKET_FRACTION;
}

export function computePlayerEaseScore(
  metrics: Pick<
    RolloutDistributionMetrics,
    "openingMoveCount" | "scoreQuantiles" | "scoreMin" | "scoreMax" | "layoutOutcome"
  >
): number {
  const spread = metrics.scoreMax - metrics.scoreMin;
  return (
    metrics.openingMoveCount * 10 +
    metrics.scoreQuantiles.p25 * 0.5 +
    spread * 0.3 +
    (metrics.layoutOutcome === "likely_dead" ? -1000 : 0)
  );
}

export function computeDistributionMetrics(
  rollouts: TowerRolloutScript[],
  layout: {
    openingMoveCount: number;
    layoutFingerprint: string;
    matchTimeLimitSec: number;
  }
): RolloutDistributionMetrics {
  const scores = rollouts.map((r) => r.finalScore).sort((a, b) => a - b);
  const completedCount = rollouts.filter((r) => r.completed).length;
  const stuckCount = rollouts.filter((r) => r.terminalReason === "stuck").length;
  const exitedCount = rollouts.filter((r) => r.terminalReason === "exited").length;
  const timeUpCount = rollouts.filter((r) => r.terminalReason === "time_up").length;
  const k = rollouts.length || 1;
  const quantiles = computeScoreQuantiles(scores);
  const bandThresholds = computeBandThresholds(scores);

  const base = {
    rolloutCount: rollouts.length,
    scoreMin: scores[0] ?? 0,
    scoreP50: quantiles.p50,
    scoreP90: quantiles.p90,
    scoreMax: scores[scores.length - 1] ?? 0,
    scoreSpread: (scores[scores.length - 1] ?? 0) - (scores[0] ?? 0),
    scoreQuantiles: quantiles,
    scoreHistogram: computeScoreHistogram(scores),
    bandThresholds,
    completedRate: completedCount / k,
    stuckRate: stuckCount / k,
    exitedRate: exitedCount / k,
    timeUpRate: timeUpCount / k,
    completedCount,
    hasAnyCompleted: completedCount > 0,
    openingMoveCount: layout.openingMoveCount,
    layoutFingerprint: layout.layoutFingerprint,
    policyVersion: POLICY_VERSION,
    matchTimeLimitSec: layout.matchTimeLimitSec,
  };

  const layoutOutcome = deriveLayoutOutcome(base);
  return {
    ...base,
    layoutOutcome,
    playerEaseScore: computePlayerEaseScore({ ...base, layoutOutcome }),
  };
}

export type TierCandidate = {
  seedId: string;
  poolVersion: string;
  difficultyScore: number;
  metrics: RolloutDistributionMetrics;
  rolloutSummaries?: RolloutSummary[];
};

export function assignTiers(
  candidates: TierCandidate[],
  quotas: SeedPoolTierQuotas = { easy: 0.3, medium: 0.4 }
): SeedPoolEntry[] {
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
    let tier: TowerSeedTier;
    if (i < easyCut) tier = "easy";
    else if (i < mediumCut) tier = "medium";
    else tier = "hard";

    return {
      seedId: c.seedId,
      poolVersion: c.poolVersion,
      tier,
      difficultyScore: c.difficultyScore,
      metrics: c.metrics,
      rolloutSummaries: c.rolloutSummaries,
    };
  });
}

function entryToTierReport(entry: SeedPoolEntry): SeedTierReportEntry {
  const m = entry.metrics;
  return {
    seedId: entry.seedId,
    layoutTier: entry.tier,
    difficultyScore: entry.difficultyScore,
    scoreDistribution: {
      min: m.scoreMin,
      max: m.scoreMax,
      quantiles: m.scoreQuantiles,
      histogram: m.scoreHistogram,
      bandThresholds: m.bandThresholds,
    },
    completedRate: m.completedRate,
    stuckRate: m.stuckRate,
    exitedRate: m.exitedRate,
    timeUpRate: m.timeUpRate,
    layoutOutcome: m.layoutOutcome,
    openingMoveCount: m.openingMoveCount,
    scoreSpread: m.scoreSpread,
    playerEaseScore: m.playerEaseScore,
    rolloutCount: m.rolloutCount,
  };
}

export function buildTierIndex(
  entries: SeedPoolEntry[],
  poolVersion: string,
  rolloutCount: number,
  generatedAt: string
): TierIndex {
  const tiers: Record<TowerSeedTier, SeedTierReportEntry[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const entry of entries) {
    tiers[entry.tier].push(entryToTierReport(entry));
  }
  for (const tier of ["easy", "medium", "hard"] as const) {
    tiers[tier].sort((a, b) => b.playerEaseScore - a.playerEaseScore);
  }
  return {
    poolVersion,
    rolloutCount,
    matchTimeLimitSec: DEFAULT_MATCH_TIME_LIMIT_SEC,
    generatedAt,
    tiers,
  };
}

/**
 * No completion and every rollout total below this → dead (Cash: recycle-only stuck is negative).
 * Use scoreMax (best rollout), not scoreP50 — p50 can be negative while a few rollouts still progress.
 */
export const DEAD_LAYOUT_SCORE_MAX = 0;

export function isDeadLayout(metrics: RolloutDistributionMetrics): boolean {
  if (metrics.hasAnyCompleted) return false;
  return metrics.scoreMax < DEAD_LAYOUT_SCORE_MAX;
}

export function selectTopCandidatesByPlayerEase(
  candidates: TierCandidate[],
  limit: number
): TierCandidate[] {
  if (limit <= 0 || candidates.length <= limit) {
    return candidates;
  }
  return [...candidates]
    .sort((a, b) => {
      const ease = b.metrics.playerEaseScore - a.metrics.playerEaseScore;
      if (ease !== 0) return ease;
      return a.seedId.localeCompare(b.seedId);
    })
    .slice(0, limit);
}

