import { describe, expect, it } from "vitest";
import { pickScoresFromRolloutBands } from "../casualBotFill/rolloutPick";

describe("tower bot fill", () => {
  it("picks descending scores from rollout bands for tower_arena", () => {
    const fills = pickScoresFromRolloutBands({
      gameType: "tower_arena",
      sessionSeed: 42,
      slots: [
        { rank: 0, low: 500, high: 2000 },
        { rank: 1, low: 200, high: 1500 },
      ],
      bands: [
        {
          min: 500,
          max: 2000,
          rollouts: [
            { rolloutIndex: 1, finalScore: 1800, elapsedTime: 240 },
            { rolloutIndex: 2, finalScore: 1200, elapsedTime: 300 },
          ],
        },
        {
          min: 200,
          max: 1500,
          rollouts: [{ rolloutIndex: 3, finalScore: 900, elapsedTime: 360 }],
        },
      ],
    });

    expect(fills).toHaveLength(2);
    expect(fills[0]!.score).toBeGreaterThan(fills[1]!.score);
    expect(fills[0]!.rolloutIndex).toBe(1);
  });
});
