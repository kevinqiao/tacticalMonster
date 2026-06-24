import { describe, expect, it } from "vitest";

import {
  buildBalancedRankWeights,
  sampleTargetRank,
} from "../../../shared/rankSampling";
import {
  CASUAL_RANK_RATES_4B,
  CASUAL_RANK_STAT_BUCKET_MAX,
  collapseActualRankToStatBucket,
  expandStatBucketToTargetRank,
  normalizeRankCountsForStats,
} from "../shared/casualRankStatBuckets";
import {
  deriveRankScoreFloorsFromQuantiles,
  type ScoreQuantiles,
} from "../../../shared/scoreQuantiles";

const BB_QUANTILES_A: ScoreQuantiles = {
  p10: 24,
  p25: 48,
  p30: 64,
  p33: 72,
  p50: 104,
  p66: 152,
  p70: 168,
  p75: 203,
  p90: 304,
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

/** ingest ???:????? floors,?? solo ???? */
describe("deriveRankScoreFloorsFromQuantiles", () => {
  it("maps first maxPlayers reverse quantiles to rank floors", () => {
    expect(deriveRankScoreFloorsFromQuantiles(BB_QUANTILES_A, 3)).toEqual({
      1: 304,
      2: 203,
      3: 168,
    });
  });

  it("skips tied quantiles so worse ranks have strictly lower floors", () => {
    expect(
      deriveRankScoreFloorsFromQuantiles(
        {
          p10: 1065,
          p25: 1300,
          p30: 1300,
          p33: 1304,
          p50: 1342,
          p66: 1349,
          p70: 1349,
          p75: 1382,
          p90: 2988,
        },
        4
      )
    ).toEqual({
      1: 2988,
      2: 1382,
      3: 1349,
      4: 1342,
    });
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
