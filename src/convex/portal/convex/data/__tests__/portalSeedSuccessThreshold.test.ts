import { describe, expect, it } from "vitest";

import {
  applySeedSuccessScoreMultiplier,
  BLOCK_BLAST_RITUAL_ONE_LINE_CLEAR_SCORE,
  resolveScoreMultiplierForSuccessQuantile,
  resolveSeedSuccessThresholdFromQuantiles,
  resolveSoloSeedSuccessThreshold,
} from "../portalTournamentConfigs";

describe("seed success threshold multiplier", () => {
  const q = { p25: 64, p50: 100, p75: 184, p90: 192 };

  it("applies scoreMultiplier to quantile", () => {
    expect(resolveSeedSuccessThresholdFromQuantiles(q, "p75", 1.5)).toBe(276);
    expect(resolveSeedSuccessThresholdFromQuantiles(q, "p50", 1.5)).toBe(150);
    expect(resolveSeedSuccessThresholdFromQuantiles(q, "p25", 1.5)).toBe(96);
  });

  it("defaults multiplier to 1", () => {
    expect(resolveSeedSuccessThresholdFromQuantiles(q, "p75")).toBe(184);
    expect(applySeedSuccessScoreMultiplier(184, undefined)).toBe(184);
  });

  it("floors product", () => {
    expect(resolveSeedSuccessThresholdFromQuantiles(q, "p75", 1.33)).toBe(244);
  });

  it("p25/p50 ignore scoreMultiplier unless ritualScoreMultiplier set", () => {
    const bb = { scoreMultiplier: 1.5, ritualScoreMultiplier: 1 as number | undefined };
    expect(resolveScoreMultiplierForSuccessQuantile(bb, "p25")).toBe(1);
    expect(resolveScoreMultiplierForSuccessQuantile(bb, "p50")).toBe(1);
    expect(resolveScoreMultiplierForSuccessQuantile(bb, "p75")).toBe(1.5);
    expect(resolveScoreMultiplierForSuccessQuantile({ scoreMultiplier: 1.5 }, "p50")).toBe(1);
    expect(
      resolveSeedSuccessThresholdFromQuantiles(
        q,
        "p50",
        resolveScoreMultiplierForSuccessQuantile(bb, "p50")
      )
    ).toBe(100);
  });

  it("BB ritual one-line clear overrides quantile", () => {
    expect(
      resolveSoloSeedSuccessThreshold({
        gameType: "block_blast",
        ritualOneLineClear: true,
        quantiles: q,
        successQuantile: "p50",
        seedQuantileSuccess: { scoreMultiplier: 1.5 },
      })
    ).toBe(BLOCK_BLAST_RITUAL_ONE_LINE_CLEAR_SCORE);
  });

  it("BB transition uses naked p25/p50", () => {
    const bb = { scoreMultiplier: 1.5 };
    expect(
      resolveSoloSeedSuccessThreshold({
        gameType: "block_blast",
        quantiles: q,
        successQuantile: "p25",
        seedQuantileSuccess: bb,
      })
    ).toBe(64);
    expect(
      resolveSoloSeedSuccessThreshold({
        gameType: "block_blast",
        quantiles: q,
        successQuantile: "p50",
        seedQuantileSuccess: bb,
      })
    ).toBe(100);
  });

  it("BB merged uses p75 × scoreMultiplier", () => {
    expect(
      resolveSoloSeedSuccessThreshold({
        gameType: "block_blast",
        quantiles: q,
        successQuantile: "p75",
        seedQuantileSuccess: { scoreMultiplier: 1.5 },
      })
    ).toBe(276);
  });
});
