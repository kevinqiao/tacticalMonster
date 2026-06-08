import { describe, expect, it } from "vitest";

import {
  assignMixedRanks,
  isLowTierMixedTable,
  type RankedEntity,
} from "../casualBotDifficultyService";
import {
  botSlotsToScoreBands,
  pickScoresFromRolloutBands,
} from "../casualMatchSeedRollouts";
import { casualAsyncVirtualOpponentCount } from "../casualRunSettlementFill";
import {
  deriveRankScoreFloorsFromQuantiles,
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

function rankMapFromEntities(
  entities: RankedEntity[],
  maxPlayers: number
): Record<string, number> {
  const floors = deriveRankScoreFloorsFromQuantiles(BB_QUANTILES_A, maxPlayers);
  const map = assignMixedRanks({ entities, rankFloors: floors, maxPlayers });
  return Object.fromEntries(map);
}

describe("casualAsyncVirtualOpponentCount", () => {
  it("uses humanCountPlanned not actual submit count", () => {
    expect(casualAsyncVirtualOpponentCount(4, 2)).toBe(2);
    expect(casualAsyncVirtualOpponentCount(5, 3)).toBe(2);
    expect(casualAsyncVirtualOpponentCount(4, 1)).toBe(3);
  });
});

describe("assignMixedRanks low-tier mode", () => {
  it("ranks by score desc when all humans below floor[2] (4p example I)", () => {
    const maxPlayers = 4;
    const entities: RankedEntity[] = [
      { uid: "bot", score: 12_500, isBot: true },
      { uid: "alice", score: 9_200, isBot: false },
      { uid: "bob", score: 9_000, isBot: false },
      { uid: "carol", score: 8_700, isBot: false },
    ];
    const floors = deriveRankScoreFloorsFromQuantiles(BB_QUANTILES_A, maxPlayers);
    expect(isLowTierMixedTable(entities, floors, maxPlayers)).toBe(true);
    expect(rankMapFromEntities(entities, maxPlayers)).toEqual({
      bot: 1,
      alice: 2,
      bob: 3,
      carol: 4,
    });
  });

  it("5p three humans low-tier J1", () => {
    const maxPlayers = 5;
    const entities: RankedEntity[] = [
      { uid: "botY", score: 13_000, isBot: true },
      { uid: "botX", score: 12_500, isBot: true },
      { uid: "alice", score: 9_800, isBot: false },
      { uid: "bob", score: 9_200, isBot: false },
      { uid: "carol", score: 8_800, isBot: false },
    ];
    expect(rankMapFromEntities(entities, maxPlayers)).toEqual({
      botY: 1,
      botX: 2,
      alice: 3,
      bob: 4,
      carol: 5,
    });
  });
});

describe("assignMixedRanks normal mode", () => {
  it("floor greedy with jump ranks (4p H)", () => {
    const maxPlayers = 4;
    const entities: RankedEntity[] = [
      { uid: "alice", score: 12_500, isBot: false },
      { uid: "bob", score: 9_600, isBot: false },
      { uid: "carol", score: 8_800, isBot: false },
    ];
    const floors = deriveRankScoreFloorsFromQuantiles(BB_QUANTILES_A, maxPlayers);
    expect(isLowTierMixedTable(entities, floors, maxPlayers)).toBe(false);
    expect(rankMapFromEntities(entities, maxPlayers)).toEqual({
      alice: 1,
      bob: 3,
      carol: 4,
    });
  });

  it("5p normal J3 jump rank2/3 for bots", () => {
    const maxPlayers = 5;
    const entities: RankedEntity[] = [
      { uid: "alice", score: 12_500, isBot: false },
      { uid: "bob", score: 9_200, isBot: false },
      { uid: "carol", score: 8_200, isBot: false },
    ];
    expect(rankMapFromEntities(entities, maxPlayers)).toEqual({
      alice: 1,
      bob: 4,
      carol: 5,
    });
  });
});

describe("botSlotsToScoreBands merge", () => {
  it("merges identical intervals with bot slot count", () => {
    const bands = botSlotsToScoreBands([
      { rank: 1, low: 12_000, high: Number.POSITIVE_INFINITY },
      { rank: 2, low: 12_000, high: Number.POSITIVE_INFINITY },
    ]);
    expect(bands).toEqual([{ min: 0, count: 2 }]);
  });

  it("merges slots with same high and different lows into one band (union min)", () => {
    const bands = botSlotsToScoreBands([
      { rank: 2, low: 1265, high: 1838 },
      { rank: 3, low: 1263, high: 1838 },
      { rank: 4, low: 1262, high: 1838 },
    ]);
    expect(bands).toEqual([{ min: 0, max: 1838, count: 3 }]);
  });

  it("keeps separate bands when high differs", () => {
    const bands = botSlotsToScoreBands([
      { rank: 1, low: 12_000, high: Number.POSITIVE_INFINITY },
      { rank: 4, low: 8_000, high: 10_995 },
    ]);
    expect(bands).toEqual([
      { min: 0, count: 1 },
      { min: 0, max: 10_995, count: 1 },
    ]);
  });
});

describe("pickScoresFromRolloutBands merged bands", () => {
  it("assigns multiple rollouts from one merged band to slots in order", () => {
    const slots = [
      { rank: 1, low: 12_000, high: Number.POSITIVE_INFINITY },
      { rank: 2, low: 12_000, high: Number.POSITIVE_INFINITY },
    ];
    const fills = pickScoresFromRolloutBands({
      slots,
      bands: [{ min: 12_000, rollouts: [{ rolloutIndex: 0, finalScore: 12_100, elapsedTime: 45 }, { rolloutIndex: 1, finalScore: 12_200, elapsedTime: 60 }] }],
      sessionSeed: 42,
      gameType: "solitaire",
    });
    expect(fills[0]).toMatchObject({ rank: 1, score: 12_200, duration: 60_000, rolloutIndex: 1 });
    expect(fills[1]).toMatchObject({ rank: 2, score: 12_100, duration: 45_000, rolloutIndex: 0 });
  });

  it("does not assign duplicate rolloutIndex when band returns fewer rollouts than slots", () => {
    const slots = [
      { rank: 1, low: 12_000, high: Number.POSITIVE_INFINITY },
      { rank: 2, low: 12_000, high: Number.POSITIVE_INFINITY },
      { rank: 3, low: 12_000, high: Number.POSITIVE_INFINITY },
    ];
    const localFills = [
      { rank: 1, score: 12_300, duration: 50_000 },
      { rank: 2, score: 12_050, duration: 55_000 },
      { rank: 3, score: 12_000, duration: 60_000 },
    ];
    const fills = pickScoresFromRolloutBands({
      slots,
      bands: [
        {
          min: 12_000,
          rollouts: [{ rolloutIndex: 7, finalScore: 12_100, elapsedTime: 40 }],
        },
      ],
      sessionSeed: 99,
      gameType: "solitaire",
      localFills,
    });
    const rolloutIndices = fills.map((f) => f.rolloutIndex).filter((x) => x != null);
    expect(rolloutIndices).toEqual([7]);
    expect(fills.find((f) => f.rank === 1)).toMatchObject({
      score: 12_100,
      rolloutIndex: 7,
    });
    expect(fills.find((f) => f.rank === 2)).toMatchObject({
      score: 12_050,
      duration: 55_000,
    });
    expect(fills.find((f) => f.rank === 3)).toMatchObject({
      score: 12_000,
      duration: 60_000,
    });
    expect(fills.find((f) => f.rank === 3)?.rolloutIndex).toBeUndefined();
  });

  it("does not reuse rolloutIndex across separate bands that each return the same rollout", () => {
    const slots = [
      { rank: 1, low: 12_000, high: 12_500 },
      { rank: 3, low: 8_000, high: 10_000 },
      { rank: 4, low: 8_000, high: 10_000 },
    ];
    const fills = pickScoresFromRolloutBands({
      slots,
      bands: [
        {
          min: 12_000,
          max: 12_500,
          rollouts: [{ rolloutIndex: 1, finalScore: 12_100, elapsedTime: 40 }],
        },
        {
          min: 8_000,
          max: 10_000,
          rollouts: [{ rolloutIndex: 1, finalScore: 9_100, elapsedTime: 50 }],
        },
      ],
      sessionSeed: 77,
      gameType: "solitaire",
    });
    const rolloutIndices = fills.map((f) => f.rolloutIndex).filter((x) => x != null);
    expect(new Set(rolloutIndices).size).toBe(rolloutIndices.length);
    expect(rolloutIndices.length).toBeLessThanOrEqual(1);
    expect(new Set(fills.map((f) => f.score)).size).toBe(3);
  });
});
