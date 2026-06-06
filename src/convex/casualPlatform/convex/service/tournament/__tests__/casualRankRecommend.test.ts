import { describe, expect, it } from "vitest";

import {
  buildBalancedRankWeights,
  clampTargetRank,
  sampleTargetRank,
} from "../casualBotDifficultyService";
import {
  CASUAL_RANK_RATES_4B,
  CASUAL_RANK_STAT_BUCKET_MAX,
  collapseActualRankToStatBucket,
  expandStatBucketToTargetRank,
  normalizeRankCountsForStats,
} from "../casualRankStatBuckets";
import {
  deriveRankScoreFloorsFromQuantiles,
  recommendTargetRankFromQuantileProximity,
  type ScoreQuantiles,
} from "../casualRankQuantiles";

const BB_QUANTILES_A: ScoreQuantiles = {
  p10: 3_000,
  p25: 4_500,
  p30: 5_500,
  p33: 6_000,
  p50: 7_000,
  p66: 8_500,
  p70: 9_500,
  p75: 10_500,
  p90: 12_000,
};

describe("casualRankStatBuckets", () => {
  it("collapses ranks > 3 into bucket 4", () => {
    expect(collapseActualRankToStatBucket(1)).toBe(1);
    expect(collapseActualRankToStatBucket(3)).toBe(3);
    expect(collapseActualRankToStatBucket(4)).toBe(4);
    expect(collapseActualRankToStatBucket(5)).toBe(4);
  });

  it("normalizes legacy rankCounts keys 5+ into bucket 4", () => {
    expect(normalizeRankCountsForStats({ 1: 2, 5: 3, 4: 1 })).toEqual({
      1: 2,
      4: 4,
    });
  });

  it("expands bucket 4 across ranks 4..maxPlayers when maxPlayers > 4", () => {
    const rank = expandStatBucketToTargetRank(4, 5, 99_001);
    expect(rank).toBeGreaterThanOrEqual(4);
    expect(rank).toBeLessThanOrEqual(5);
  });
});

describe("deriveRankScoreFloorsFromQuantiles", () => {
  it("maps first maxPlayers reverse quantiles to rank floors", () => {
    expect(deriveRankScoreFloorsFromQuantiles(BB_QUANTILES_A, 3)).toEqual({
      1: 12_000,
      2: 10_500,
      3: 9_500,
    });
  });
});

describe("recommendTargetRankFromQuantileProximity", () => {
  it("picks closest tier and caps at maxPlayers", () => {
    const targetRank = recommendTargetRankFromQuantileProximity(
      6_050,
      BB_QUANTILES_A,
      3
    );
    expect(targetRank).toBe(3);
  });

  it("prefers better rank on tie distance", () => {
    const quantiles: ScoreQuantiles = {
      ...BB_QUANTILES_A,
      p66: 6_000,
      p33: 6_000,
    };
    expect(recommendTargetRankFromQuantileProximity(6_000, quantiles, 3)).toBe(3);
  });
});

describe("clampTargetRank with quantile floors", () => {
  it("clamps low score to maxPlayers when below all floors", () => {
    const floors = deriveRankScoreFloorsFromQuantiles(BB_QUANTILES_A, 3);
    const targetRank = recommendTargetRankFromQuantileProximity(
      6_050,
      BB_QUANTILES_A,
      3
    );
    expect(targetRank).toBe(3);
    expect(clampTargetRank(targetRank, 6_050, floors, 3)).toBe(3);
  });
});

describe("buildBalancedRankWeights", () => {
  it("uses 4 stat buckets with default rankRates", () => {
    const weights = buildBalancedRankWeights({
      rankRates: CASUAL_RANK_RATES_4B,
      rankCounts: { 1: 20, 2: 2, 3: 2, 4: 0 },
    });
    expect(Object.keys(weights.weights).map(Number).sort()).toEqual([1, 2, 3, 4]);
    expect(weights.weights[2]! / weights.weights[1]!).toBeGreaterThan(1);
  });

  it("raises relative weights for underrepresented ranks", () => {
    const baseline = buildBalancedRankWeights({
      rankRates: CASUAL_RANK_RATES_4B,
      rankCounts: { 1: 6, 2: 6, 3: 6, 4: 6 },
    });
    const skewed = buildBalancedRankWeights({
      rankRates: CASUAL_RANK_RATES_4B,
      rankCounts: { 1: 20, 2: 2, 3: 2, 4: 0 },
    });
    const baselineRatio =
      (baseline.weights[2] ?? 0) / Math.max(baseline.weights[1] ?? 1, 1);
    const skewedRatio = (skewed.weights[2] ?? 0) / Math.max(skewed.weights[1] ?? 1, 1);
    expect(skewedRatio).toBeGreaterThan(baselineRatio);
  });
});

describe("sampleTargetRank", () => {
  it("is deterministic for fixed session seed", () => {
    const dist = buildBalancedRankWeights({
      rankRates: CASUAL_RANK_RATES_4B,
      rankCounts: {},
    });
    const a = sampleTargetRank(dist, CASUAL_RANK_STAT_BUCKET_MAX, 42_001);
    const b = sampleTargetRank(dist, CASUAL_RANK_STAT_BUCKET_MAX, 42_001);
    expect(a).toBe(b);
  });
});
