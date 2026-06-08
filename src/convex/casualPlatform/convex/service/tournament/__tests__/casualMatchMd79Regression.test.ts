import { describe, expect, it } from "vitest";

import { computeSoloBotScoreSlots } from "../casualBotDifficultyService";
import { deriveRankScoreFloorsFromQuantiles } from "../casualRankQuantiles";
import {
  botSlotsToScoreBands,
  pickScoresFromRolloutBands,
} from "../casualMatchSeedRollouts";

/** Regression: match md79ce0n0g9sbpaeb3f124vgms887tmn (B场 seed 442) */
describe("match md79 rollout dedupe regression", () => {
  const quantiles = {
    p10: 838,
    p25: 1219,
    p30: 1233,
    p33: 1243,
    p50: 1258,
    p66: 1262,
    p70: 1263,
    p75: 1265,
    p90: 1270,
  };

  it("does not assign rolloutIndex 1 to all three bots when bands overlap on seed 442", () => {
    const floors = deriveRankScoreFloorsFromQuantiles(quantiles, 4);
    const slots = computeSoloBotScoreSlots({
      humanScore: 1843,
      effectiveRank: 1,
      rankFloors: floors,
      maxPlayers: 4,
      gameType: "solitaire",
    });
    expect(slots).toHaveLength(3);
    const bandsReq = botSlotsToScoreBands(slots);
    expect(bandsReq).toEqual([{ min: 0, max: 1838, count: 3 }]);

    const bands = [
      {
        min: 1262,
        max: 1838,
        rollouts: [{ rolloutIndex: 1, finalScore: 1329, elapsedTime: 30.17 }],
      },
    ];
    const fills = pickScoresFromRolloutBands({
      slots,
      bands,
      sessionSeed: 12345,
      gameType: "solitaire",
    });

    const rolloutIndices = fills.map((f) => f.rolloutIndex).filter((x) => x != null);
    expect(rolloutIndices).toEqual([1]);
    expect(new Set(fills.map((f) => f.score)).size).toBe(3);
    expect(fills.every((f) => f.score !== 1329 || f.rolloutIndex === 1)).toBe(true);

    const byRank = [...fills].sort((a, b) => a.rank - b.rank);
    expect(byRank[0]!.score).toBeGreaterThan(byRank[1]!.score);
    expect(byRank[1]!.score).toBeGreaterThan(byRank[2]!.score);
  });
});
