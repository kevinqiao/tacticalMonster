import { describe, expect, it } from "vitest";
import { computeFixedTopBotScoreSlots } from "../botScoreSlots";

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
