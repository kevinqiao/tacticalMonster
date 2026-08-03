import { describe, expect, it } from "vitest";

import {
  computeLegProfileWeights,
  decomposeTotalToLegTargets,
  fallbackTriathlonLegRollouts,
  legScoreTolerance,
  pickTriathlonRolloutTriple,
  proposeBotTotalForSlot,
  sumLegScoreQuantiles,
} from "../triathlonBotFill";

describe("triathlonBotFill profile", () => {
  const bbQ = {
    p10: 100,
    p25: 200,
    p30: 220,
    p33: 240,
    p50: 380,
    p66: 480,
    p70: 500,
    p75: 520,
    p90: 680,
  };
  const solQ = {
    p10: 200,
    p25: 400,
    p30: 450,
    p33: 480,
    p50: 720,
    p66: 900,
    p70: 950,
    p75: 980,
    p90: 1180,
  };
  const m3Q = {
    p10: 40,
    p25: 80,
    p30: 90,
    p33: 100,
    p50: 140,
    p66: 170,
    p70: 180,
    p75: 195,
    p90: 240,
  };

  it("sumLegScoreQuantiles adds per key", () => {
    const total = sumLegScoreQuantiles([bbQ, solQ, m3Q]);
    expect(total.p50).toBe(380 + 720 + 140);
    expect(total.p90).toBe(680 + 1180 + 240);
  });

  it("computeLegProfileWeights prefers human leg scores", () => {
    const w = computeLegProfileWeights([520, 380, 165], [bbQ, solQ, m3Q]);
    expect(w[0]).toBeCloseTo(520 / 1065, 4);
    expect(w[1]).toBeCloseTo(380 / 1065, 4);
    expect(w[2]).toBeCloseTo(165 / 1065, 4);
  });

  it("decomposeTotalToLegTargets sums to T", () => {
    const w = [0.49, 0.36, 0.15];
    const targets = decomposeTotalToLegTargets(1910, w);
    expect(targets.reduce((a, b) => a + b, 0)).toBe(1910);
  });

  it("pickTriathlonRolloutTriple respects profile and total slot", () => {
    const legPools = [
      {
        gameIndex: 0,
        gameType: "block_blast",
        rollouts: [
          { rolloutIndex: 1, finalScore: 510 },
          { rolloutIndex: 2, finalScore: 480 },
        ],
      },
      {
        gameIndex: 1,
        gameType: "solitaire",
        rollouts: [
          { rolloutIndex: 3, finalScore: 380 },
          { rolloutIndex: 4, finalScore: 350 },
        ],
      },
      {
        gameIndex: 2,
        gameType: "match_3",
        rollouts: [
          { rolloutIndex: 5, finalScore: 165 },
          { rolloutIndex: 6, finalScore: 150 },
        ],
      },
    ];
    const targets = decomposeTotalToLegTargets(1065, [520 / 1065, 380 / 1065, 165 / 1065]);
    const triple = pickTriathlonRolloutTriple({
      legPools,
      slotLow: 1000,
      slotHigh: 1100,
      legTargets: targets,
      sessionSeed: 42,
    });
    expect(triple).not.toBeNull();
    expect(triple!.totalScore).toBe(510 + 380 + 165);
    expect(triple!.legs[1]!.finalScore).toBe(380);
  });

  it("fallbackTriathlonLegRollouts adjusts last leg to bot total", () => {
    const legPools = [
      {
        gameIndex: 0,
        gameType: "block_blast",
        rollouts: [{ rolloutIndex: 1, finalScore: 500 }],
      },
      {
        gameIndex: 1,
        gameType: "solitaire",
        rollouts: [{ rolloutIndex: 2, finalScore: 400 }],
      },
      {
        gameIndex: 2,
        gameType: "match_3",
        rollouts: [{ rolloutIndex: 3, finalScore: 160 }],
      },
    ];
    const targets = [520, 380, 165];
    const triple = fallbackTriathlonLegRollouts({
      legPools,
      legTargets: targets,
      botTotal: 1065,
      slotLow: 1000,
      slotHigh: 1100,
    });
    expect(triple.totalScore).toBe(1065);
  });

  it("proposeBotTotalForSlot stays inside slot", () => {
    const t = proposeBotTotalForSlot({
      slotLow: 1695,
      slotHigh: 2139,
      maxScoreExclusive: 2140,
      sessionSeed: 99,
      rank: 2,
    });
    expect(t).toBeGreaterThanOrEqual(1695);
    expect(t).toBeLessThan(2140);
  });

  it("legScoreTolerance scales with spread", () => {
    expect(legScoreTolerance(bbQ)).toBeGreaterThan(10);
  });
});
