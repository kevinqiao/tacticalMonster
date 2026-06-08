import { describe, expect, it } from "vitest";

import {
  assignRanksByScoreDesc,
  computeSoloBotScoreSlots,
  hashSessionSeed,
} from "../casualBotDifficultyService";
import { deriveRankScoreFloorsFromQuantiles } from "../casualRankQuantiles";
import { pickScoresFromRolloutBands } from "../casualMatchSeedRollouts";

/** Regression: match md79944e0yab7dcdeenjpaeh9d8895br (B场 seed 204, human 2117) */
describe("match md799 solo score-based ranks", () => {
  const quantiles = {
    p10: 1162,
    p25: 1262,
    p30: 1264,
    p33: 1280,
    p50: 1282,
    p66: 1286,
    p70: 1286,
    p75: 1287,
    p90: 1305,
  };

  const humanScore = 2117;
  const effectiveRank = 2;
  const sessionSeed = hashSessionSeed(
    "casual_async_b_solitaire|casual_sess:md79944e0yab7dcdeenjpaeh9d8895br"
  );

  it("assigns rollouts without effectiveRank gate; final rank follows score desc", () => {
    const floors = deriveRankScoreFloorsFromQuantiles(quantiles, 4);
    const slots = computeSoloBotScoreSlots({
      humanScore,
      effectiveRank,
      rankFloors: floors,
      maxPlayers: 4,
      gameType: "solitaire",
    });

    const fills = pickScoresFromRolloutBands({
      slots,
      bands: [
        {
          min: 0,
          max: humanScore - 5,
          rollouts: [
            { rolloutIndex: 0, finalScore: 1283, elapsedTime: 299.28 },
            { rolloutIndex: 3, finalScore: 1140, elapsedTime: 299.77 },
          ],
        },
      ],
      sessionSeed,
      gameType: "solitaire",
    });

    const bySlot = [...fills].sort((a, b) => a.rank - b.rank);
    expect(bySlot[0]).toMatchObject({ rank: 1, score: 1283, rolloutIndex: 0 });
    expect(bySlot[1]).toMatchObject({ rank: 3, score: 1140, rolloutIndex: 3 });

    const rankMap = assignRanksByScoreDesc([
      { uid: "human", score: humanScore, isBot: false },
      { uid: "b1", score: 1283, isBot: true },
      { uid: "b3", score: 1140, isBot: true },
      { uid: "b4", score: 1130, isBot: true },
    ]);
    expect(rankMap.get("human")).toBe(1);
    expect(rankMap.get("b1")).toBe(2);
    expect(rankMap.get("b3")).toBe(3);
    expect(rankMap.get("b4")).toBe(4);
  });
});
