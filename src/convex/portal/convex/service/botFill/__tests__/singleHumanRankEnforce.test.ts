import { describe, expect, it } from "vitest";

import { soloRolloutQueryBands } from "../botScoreSlots";
import { pickSoloBotFillsFromTwoBands } from "../rolloutPick";
import {
  enforceSingleHumanBotFillsForEffectiveRank,
  simulateSingleHumanRank,
} from "../singleHumanRankEnforce";

describe("singleHumanRankEnforce", () => {
  it("simulates human rank from bot scores", () => {
    expect(
      simulateSingleHumanRank({
        humanScore: 100,
        effectiveRank: 3,
        botFills: [
          { rank: 1, score: 300 },
          { rank: 2, score: 200 },
          { rank: 4, score: 50 },
          { rank: 5, score: 10 },
        ],
      })
    ).toBe(3);
  });

  it("forces human last place when effectiveRank is maxPlayers", () => {
    const humanScore = 97;
    const effectiveRank = 5;
    const maxPlayers = 5;
    const scoreLow = 0;
    const bands = soloRolloutQueryBands({
      humanScore,
      effectiveRank,
      maxPlayers,
      scoreLow,
      gameType: "block_blast",
    });
    expect(bands).toEqual([{ min: 147, count: 4 }]);

    const enforced = pickSoloBotFillsFromTwoBands({
      humanScore,
      effectiveRank,
      maxPlayers,
      scoreLow,
      gameType: "block_blast",
      sessionSeed: 7,
      bands: [
        {
          min: 147,
          rollouts: [
            { rolloutIndex: 1, finalScore: 148, elapsedTime: 200 },
            { rolloutIndex: 2, finalScore: 148, elapsedTime: 210 },
            { rolloutIndex: 3, finalScore: 148, elapsedTime: 220 },
            { rolloutIndex: 4, finalScore: 148, elapsedTime: 230 },
          ],
        },
      ],
    });
    expect(enforced).toHaveLength(4);
    expect(
      simulateSingleHumanRank({ humanScore, effectiveRank, botFills: enforced })
    ).toBe(5);
    for (const fill of enforced) {
      expect(fill.score).toBeGreaterThan(humanScore);
    }
    expect(new Set(enforced.map((f) => f.score)).size).toBe(4);
  });

  it("forces human middle rank with strict monotonic bot scores", () => {
    const humanScore = 150;
    const effectiveRank = 3;
    const maxPlayers = 5;
    const scoreLow = 10;
    const enforced = enforceSingleHumanBotFillsForEffectiveRank({
      humanScore,
      effectiveRank,
      maxPlayers,
      scoreLow,
      fills: [
        { rank: 1, score: 140, duration: 1 },
        { rank: 2, score: 145, duration: 1 },
        { rank: 4, score: 160, duration: 1 },
        { rank: 5, score: 155, duration: 1 },
      ],
      gameType: "block_blast",
    });
    expect(
      simulateSingleHumanRank({ humanScore, effectiveRank, botFills: enforced })
    ).toBe(3);
    const above = enforced
      .filter((f) => f.rank < effectiveRank)
      .sort((a, b) => a.rank - b.rank);
    const below = enforced
      .filter((f) => f.rank > effectiveRank)
      .sort((a, b) => a.rank - b.rank);
    for (const f of above) expect(f.score).toBeGreaterThan(humanScore);
    for (const f of below) expect(f.score).toBeLessThan(humanScore);
    expect(above[0]!.score).toBeGreaterThan(above[1]!.score);
    expect(below[0]!.score).toBeGreaterThan(below[1]!.score);
  });
});
