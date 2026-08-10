import { describe, expect, it } from "vitest";

import { ZoneType, type Card } from "../../types/SoloTypes";
import {
  hasReachedTargetScore,
  isLegitimateCompleted,
} from "../solitaireTargetWin";

function stubCard(zone: ZoneType, zoneId: string): Card {
  return {
    id: `${zoneId}-1`,
    zone,
    zoneId,
    zoneIndex: 0,
    isRevealed: true,
  };
}

describe("solitaire target win", () => {
  it("marks target reached when score >= targetScore", () => {
    expect(hasReachedTargetScore(100, 100)).toBe(true);
    expect(hasReachedTargetScore(101, 100)).toBe(true);
    expect(hasReachedTargetScore(99, 100)).toBe(false);
    expect(hasReachedTargetScore(100, undefined)).toBe(false);
  });

  it("does not treat unfinished board as legitimate COMPLETED when target is met", () => {
    const cards = [
      stubCard(ZoneType.TABLEAU, "tableau-0"),
      stubCard(ZoneType.FOUNDATION, "foundation-hearts"),
    ];
    expect(
      isLegitimateCompleted({ cards, score: 250, targetScore: 200 })
    ).toBe(false);
    expect(
      isLegitimateCompleted({ cards, score: 150, targetScore: 200 })
    ).toBe(false);
  });

  it("treats full foundation clear as legitimate COMPLETED without target", () => {
    const cards = [
      stubCard(ZoneType.FOUNDATION, "foundation-hearts"),
      stubCard(ZoneType.FOUNDATION, "foundation-spades"),
    ];
    expect(isLegitimateCompleted({ cards, score: 0 })).toBe(true);
  });
});
