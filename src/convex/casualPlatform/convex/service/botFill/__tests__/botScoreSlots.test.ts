import { describe, expect, it } from "vitest";
import { computeFixedTopBotScoreSlots, computeSoloBotScoreSlots } from "../botScoreSlots";

describe("computeSoloBotScoreSlots", () => {
  it("v3: above bots use humanScore+eps, below bots use p10..humanScore-eps", () => {
    const slots = computeSoloBotScoreSlots({
      humanScore: 200,
      effectiveRank: 2,
      scoreLow: 32,
      maxPlayers: 5,
      gameType: "block_blast",
    });
    expect(slots).toHaveLength(4);
    expect(slots.find((s) => s.rank === 1)).toMatchObject({ low: 250, high: 1250 });
    expect(slots.find((s) => s.rank === 3)).toMatchObject({ low: 32, high: 150 });
    expect(slots.find((s) => s.rank === 5)).toMatchObject({ low: 32, high: 150 });
  });
});

describe("computeFixedTopBotScoreSlots", () => {
  const rankFloors = { 1: 452, 2: 294, 3: 179, 4: 140 };

  it("uses [floor[r], floor[r-1]) semantics for mixed D", () => {
    const slots = computeFixedTopBotScoreSlots({
      botCount: 2,
      rankFloors,
      gameType: "block_blast",
    });
    expect(slots[0]).toMatchObject({ rank: 1, low: 452 });
    expect(slots[0]!.high).toBe(Number.POSITIVE_INFINITY);
    expect(slots[1]).toMatchObject({ rank: 2, low: 294, high: 452 - 50 });
  });

  it("does not collapse to narrow 50pt bands", () => {
    const slots = computeFixedTopBotScoreSlots({
      botCount: 2,
      rankFloors,
      gameType: "block_blast",
    });
    expect(slots[1]!.high - slots[1]!.low).toBeGreaterThan(100);
  });
});
