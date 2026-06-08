import { describe, expect, it } from "vitest";

import {
  computeSoloBotScoreSlots,
  hashSessionSeed,
} from "../casualBotDifficultyService";
import { deriveRankScoreFloorsFromQuantiles } from "../casualRankQuantiles";
import {
  botSlotsToScoreBands,
  pickScoresFromRolloutBands,
} from "../casualMatchSeedRollouts";

/** Regression: match md788an6jsg4hmefgdcn5fg3gx888v83 (B场 seed 394) */
describe("match md788 bot score monotonicity", () => {
  const quantiles = {
    p10: 1065,
    p25: 1300,
    p30: 1300,
    p33: 1304,
    p50: 1342,
    p66: 1349,
    p70: 1349,
    p75: 1382,
    p90: 2988,
  };

  const humanScore = 1934;
  const sessionSeed = hashSessionSeed(
    "casual_async_b_solitaire|casual_sess:md788an6jsg4hmefgdcn5fg3gx888v83"
  );

  it("HTTP band rollouts from seed 394 stay strictly decreasing by rank slot", () => {
    const floors = deriveRankScoreFloorsFromQuantiles(quantiles, 4);
    const slots = computeSoloBotScoreSlots({
      humanScore,
      effectiveRank: 1,
      rankFloors: floors,
      maxPlayers: 4,
      gameType: "solitaire",
    });
    expect(floors[3]).toBe(1349);
    expect(floors[4]).toBe(1342);
    expect(botSlotsToScoreBands(slots)).toEqual([
      { min: 0, max: 1929, count: 3 },
    ]);

    const bands = [
      {
        min: 0,
        max: 1929,
        rollouts: [
          { rolloutIndex: 0, finalScore: 1349, elapsedTime: 297.87 },
          { rolloutIndex: 12, finalScore: 1142, elapsedTime: 299.35 },
          { rolloutIndex: 28, finalScore: 1185, elapsedTime: 298.53 },
        ],
      },
    ];
    const fills = pickScoresFromRolloutBands({
      slots,
      bands,
      sessionSeed,
      gameType: "solitaire",
    });

    const byRank = [...fills].sort((a, b) => a.rank - b.rank);
    expect(byRank).toEqual([
      { rank: 2, score: 1349, duration: 297870, rolloutIndex: 0 },
      { rank: 3, score: 1185, duration: 298530, rolloutIndex: 28 },
      { rank: 4, score: 1142, duration: 299350, rolloutIndex: 12 },
    ]);
  });
});
