import { describe, expect, it } from "vitest";
import { soloRolloutQueryBands } from "../botScoreSlots";
import {
  botSlotsToScoreBands,
  pickScoresFromRolloutBands,
  pickSoloBotFillsFromTwoBands,
} from "../rolloutPick";
import { simulateSoloHumanRank } from "../soloRankEnforce";

describe("rolloutPick", () => {
  it("soloRolloutQueryBands uses at most two bands", () => {
    expect(
      soloRolloutQueryBands({
        humanScore: 200,
        effectiveRank: 2,
        maxPlayers: 5,
        scoreLow: 10,
        gameType: "block_blast",
      })
    ).toEqual([
      { min: 250, count: 1 },
      { min: 10, max: 150, count: 3 },
    ]);
    expect(
      soloRolloutQueryBands({
        humanScore: 200,
        effectiveRank: 1,
        maxPlayers: 5,
        scoreLow: 10,
        gameType: "block_blast",
      })
    ).toEqual([{ min: 10, max: 150, count: 4 }]);
  });

  it("pickSoloBotFillsFromTwoBands assigns ranks by sorted rollout scores", () => {
    const humanScore = 200;
    const effectiveRank = 2;
    const fills = pickSoloBotFillsFromTwoBands({
      humanScore,
      effectiveRank,
      maxPlayers: 5,
      scoreLow: 10,
      gameType: "block_blast",
      sessionSeed: 42,
      bands: [
        {
          min: 250,
          rollouts: [{ rolloutIndex: 1, finalScore: 320, elapsedTime: 200 }],
        },
        {
          min: 10,
          max: 150,
          rollouts: [
            { rolloutIndex: 2, finalScore: 120, elapsedTime: 210 },
            { rolloutIndex: 3, finalScore: 80, elapsedTime: 220 },
            { rolloutIndex: 4, finalScore: 40, elapsedTime: 230 },
          ],
        },
      ],
    });
    expect(fills).toHaveLength(4);
    expect(fills.find((f) => f.rank === 1)?.rolloutIndex).toBe(1);
    expect(fills.find((f) => f.rank === 3)?.score).toBeGreaterThan(
      fills.find((f) => f.rank === 4)!.score
    );
    expect(
      simulateSoloHumanRank({ humanScore, effectiveRank, botFills: fills })
    ).toBe(2);
  });

  it("maps each mixed slot to band with min=slot.low", () => {
    const bands = botSlotsToScoreBands([
      { rank: 1, low: 452, high: Number.POSITIVE_INFINITY },
      { rank: 2, low: 294, high: 402 },
    ]);
    expect(bands).toEqual([
      { min: 452, count: 1 },
      { min: 294, max: 402, count: 1 },
    ]);
  });

  it("picks rollouts within slot bounds descending", () => {
    const fills = pickScoresFromRolloutBands({
      gameType: "block_blast",
      sessionSeed: 42,
      slots: [
        { rank: 1, low: 452, high: Number.POSITIVE_INFINITY },
        { rank: 2, low: 294, high: 402 },
      ],
      bands: [
        {
          min: 452,
          rollouts: [
            { rolloutIndex: 1, finalScore: 466, elapsedTime: 240 },
            { rolloutIndex: 2, finalScore: 430, elapsedTime: 260 },
          ],
        },
        {
          min: 294,
          max: 402,
          rollouts: [
            { rolloutIndex: 3, finalScore: 340, elapsedTime: 300 },
            { rolloutIndex: 4, finalScore: 281, elapsedTime: 320 },
          ],
        },
      ],
    });

    expect(fills).toHaveLength(2);
    expect(fills[0]!.score).toBeGreaterThan(fills[1]!.score);
    expect(fills[0]!.rolloutIndex).toBe(1);
    expect(fills[1]!.rolloutIndex).toBe(3);
  });

  it("falls back to nearest rolloutIndex when no candidate in slot", () => {
    const fills = pickScoresFromRolloutBands({
      gameType: "block_blast",
      sessionSeed: 99,
      slots: [{ rank: 1, low: 9800, high: 9900 }],
      bands: [{ min: 9800, max: 9900, rollouts: [{ rolloutIndex: 1, finalScore: 466 }] }],
    });
    expect(fills[0]!.rolloutIndex).toBe(1);
    expect(fills[0]!.score).toBeGreaterThanOrEqual(9800);
  });

  it("does not hang when solo slots share rollout bands (human last place)", () => {
    const slots = [
      { rank: 1, low: 98, high: 197 },
      { rank: 2, low: 198, high: 297 },
      { rank: 3, low: 298, high: 397 },
      { rank: 4, low: 398, high: 498 },
    ];
    const band = {
      min: 98,
      max: 1098,
      rollouts: [
        { rolloutIndex: 1, finalScore: 148, elapsedTime: 200 },
        { rolloutIndex: 2, finalScore: 148, elapsedTime: 210 },
        { rolloutIndex: 3, finalScore: 148, elapsedTime: 220 },
        { rolloutIndex: 4, finalScore: 148, elapsedTime: 230 },
      ],
    };
    const fills = pickScoresFromRolloutBands({
      gameType: "block_blast",
      sessionSeed: 7,
      slots,
      bands: [band, band, band, band],
    });
    expect(fills).toHaveLength(4);
    expect(new Set(fills.map((f) => f.score)).size).toBeGreaterThan(1);
  });
});
