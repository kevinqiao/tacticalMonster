import { generateShapes } from "../BlockBlastGameEngine";
import type {
  BandThresholds,
  BlockBlastRolloutScript,
  BlockBlastSeedTier,
  RolloutDistributionMetrics,
  RolloutSummary,
  ScoreHistogram,
  ScoreQuantiles,
  SeedLayoutOutcome,
  SeedPoolEntry,
  SeedPoolTierQuotas,
  SeedTierReportEntry,
  TierIndex,
} from "./blockBlastRecordedOpTypes";
import { BLOCK_BLAST_POLICY_VERSION as POLICY_VERSION } from "./blockBlastRecordedOpTypes";
import { computeExperienceScore, countSoftPPasses } from "./blockBlastExperienceKpi";
import { DEFAULT_MATCH_TIME_LIMIT_SEC } from "./blockBlastSimTime";

function fnv1a(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fp:${(h >>> 0).toString(16)}`;
}

/** 仅用 seed 的形状序列（前 24 个）做指纹，区分重复 layout（不含 seedId）。 */
export function layoutFingerprint(seedId: string): string {
  const shapes = generateShapes(24, seedId, 0);
  const parts = shapes.map((s) => `${JSON.stringify(s.shape)}:${s.color}`);
  return fnv1a(parts.join("|"));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx] ?? 0;
}

export const PERFORMANCE_BAND_LOW_FRACTION = 0.3;
export const PERFORMANCE_BAND_HIGH_CUMULATIVE_FRACTION = 0.7;

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
  { label: "0-49", min: 0, max: 49 },
  { label: "50-149", min: 50, max: 149 },
  { label: "150-349", min: 150, max: 349 },
  { label: "350-699", min: 350, max: 699 },
  { label: "700+", min: 700, max: Infinity },
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

/** 无完成局；scoreMax 低于阈值视为死局（从未消行）。 */
export const DEAD_LAYOUT_SCORE_MAX = 1;

export function deriveLayoutOutcome(
  metrics: Pick<RolloutDistributionMetrics, "hasAnyCompleted" | "completedRate" | "scoreMax">
): SeedLayoutOutcome {
  if (metrics.hasAnyCompleted) return "winnable";
  if (metrics.completedRate === 0 && metrics.scoreMax < DEAD_LAYOUT_SCORE_MAX) {
    return "likely_dead";
  }
  return "mixed";
}

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
    metrics.openingMoveCount * 0.1 +
    metrics.scoreQuantiles.p25 * 0.5 +
    spread * 0.3 +
    (metrics.layoutOutcome === "likely_dead" ? -1000 : 0)
  );
}

export function computeDistributionMetrics(
  rollouts: BlockBlastRolloutScript[],
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

  const mediumBurstRate =
    rollouts.filter((r) => (r.experience?.mediumBurstCount ?? 0) > 0).length / k;
  const jackpotRate = rollouts.filter((r) => (r.experience?.jackpotCount ?? 0) > 0).length / k;
  const lateGameReachRate = rollouts.filter((r) => r.experience?.reached180).length / k;
  const nearDeathRecoverRate =
    rollouts.filter((r) => (r.experience?.nearDeathRecoverCount ?? 0) > 0).length / k;
  const lateBurstRate =
    rollouts.filter((r) => (r.experience?.lateMediumBurstCount ?? 0) > 0).length / k;
  const earlyClearRate = rollouts.filter((r) => r.experience?.earlyClear).length / k;

  const scoreAt60Sorted = rollouts.map((r) => r.experience?.scoreAt60 ?? 0).sort((a, b) => a - b);
  const scoreAt150Sorted = rollouts.map((r) => r.experience?.scoreAt150 ?? 0).sort((a, b) => a - b);
  const scoreAt240Sorted = rollouts.map((r) => r.experience?.scoreAt240 ?? 0).sort((a, b) => a - b);

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
    mediumBurstRate,
    jackpotRate,
    lateGameReachRate,
    nearDeathRecoverRate,
    lateBurstRate,
    earlyClearRate,
    scoreAt60P50: percentile(scoreAt60Sorted, 0.5),
    scoreAt150P50: percentile(scoreAt150Sorted, 0.5),
    scoreAt240P50: percentile(scoreAt240Sorted, 0.5),
  };

  const layoutOutcome = deriveLayoutOutcome(base);
  const withOutcome = { ...base, layoutOutcome };
  const softPPassCount = countSoftPPasses(withOutcome, "prod");
  const experienceScore = computeExperienceScore({ ...withOutcome, softPPassCount }, "prod");

  return {
    ...withOutcome,
    softPPassCount,
    experienceScore,
    playerEaseScore: computePlayerEaseScore(withOutcome),
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
    let tier: BlockBlastSeedTier;
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
    experienceScore: m.experienceScore,
    mediumBurstRate: m.mediumBurstRate,
    jackpotRate: m.jackpotRate,
    lateGameReachRate: m.lateGameReachRate,
    rolloutCount: m.rolloutCount,
  };
}

export function buildTierIndex(
  entries: SeedPoolEntry[],
  poolVersion: string,
  rolloutCount: number,
  generatedAt: string
): TierIndex {
  const tiers: Record<BlockBlastSeedTier, SeedTierReportEntry[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const entry of entries) {
    tiers[entry.tier].push(entryToTierReport(entry));
  }
  for (const tier of ["easy", "medium", "hard"] as const) {
    tiers[tier].sort((a, b) => b.experienceScore - a.experienceScore);
  }
  return {
    poolVersion,
    rolloutCount,
    matchTimeLimitSec: DEFAULT_MATCH_TIME_LIMIT_SEC,
    generatedAt,
    tiers,
  };
}

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

/** 生产 oversample：按体验分保留尖子 */
export function selectTopCandidatesByExperienceScore(
  candidates: TierCandidate[],
  limit: number
): TierCandidate[] {
  if (limit <= 0 || candidates.length <= limit) {
    return candidates;
  }
  return [...candidates]
    .sort((a, b) => {
      const exp = b.metrics.experienceScore - a.metrics.experienceScore;
      if (exp !== 0) return exp;
      const ease = b.metrics.playerEaseScore - a.metrics.playerEaseScore;
      if (ease !== 0) return ease;
      return a.seedId.localeCompare(b.seedId);
    })
    .slice(0, limit);
}
