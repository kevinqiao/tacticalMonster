import { describe, expect, it } from "vitest";
import { entryFriendlinessScore } from "../seedPoolStore";
import type { SeedPoolEntryDoc } from "../seedPoolStore";

function entry(metrics: Record<string, number>): SeedPoolEntryDoc {
  return {
    seedId: "s1",
    difficultyScore: 100,
    metrics,
  } as unknown as SeedPoolEntryDoc;
}

describe("entryFriendlinessScore", () => {
  it("prefers onboardingScore then legacy ritual fields then playerEase", () => {
    expect(
      entryFriendlinessScore(
        entry({ onboardingScore: 400, clearEaseScore: 900, playerEaseScore: 10 }),
        "onboardingScore"
      )
    ).toBe(400);
    expect(
      entryFriendlinessScore(entry({ clearEaseScore: 900, playerEaseScore: 10 }), "onboardingScore")
    ).toBe(900);
    expect(
      entryFriendlinessScore(entry({ experienceScore: 50, playerEaseScore: 10 }), "onboardingScore")
    ).toBe(50);
    expect(entryFriendlinessScore(entry({ playerEaseScore: 10 }), "onboardingScore")).toBe(10);
  });

  it("playerEase uses playerEaseScore only", () => {
    expect(
      entryFriendlinessScore(entry({ onboardingScore: 400, playerEaseScore: 10 }), "playerEase")
    ).toBe(10);
  });
});
