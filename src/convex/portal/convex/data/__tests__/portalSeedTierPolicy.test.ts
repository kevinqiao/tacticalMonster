import { describe, expect, it } from "vitest";

import {
  LEAGUE_SEED_TIER_WEIGHTS,
  NEWBIE_FRIENDLINESS_FRACTION,
  pickWeightedSeedTier,
  resolveNewbieFriendlinessStrategy,
  resolveNewbieSoloSegment,
  resolveSeasonSeedPickPolicy,
  resolveSeedTierForTemplate,
  shiftWeightsTowardEasy,
} from "../portalSeedTierPolicy";
import type { PortalTournamentDefinition } from "../portalTournamentConfigs";

function soloDef(gameType: string): PortalTournamentDefinition {
  return {
    tournamentId: `portal_solo_p75_${gameType}`,
    title: "test",
    gameType,
    matchType: "solo_p75",
    status: "open",
    maxPlayers: 1,
    entry: { kind: "none" },
    seedQuantileSuccess: { quantile: "p75" },
  } as PortalTournamentDefinition;
}

function multiDef(gameType: string): PortalTournamentDefinition {
  return {
    tournamentId: `portal_multi_${gameType}`,
    title: "test",
    gameType,
    matchType: "multi_ranked",
    status: "open",
    maxPlayers: 5,
    entry: { kind: "none" },
  } as PortalTournamentDefinition;
}

describe("portalSeedTierPolicy L3", () => {
  it("maps newbie segments from settled Solo count", () => {
    expect(resolveNewbieSoloSegment(0)).toBe("ritual_a");
    expect(resolveNewbieSoloSegment(2)).toBe("transition_b");
    expect(resolveNewbieSoloSegment(3)).toBe("merged_c");
  });

  it("segment A always uses onboardingScore for all games", () => {
    for (const game of ["solitaire", "match_3", "block_blast", "yatz"] as const) {
      expect(resolveNewbieFriendlinessStrategy(game, "ritual_a")).toEqual({
        metric: "onboardingScore",
        fraction: NEWBIE_FRIENDLINESS_FRACTION.ritual_a,
      });
    }
  });

  it("transition B always uses playerEase with wider slice than A", () => {
    for (const game of ["solitaire", "match_3", "block_blast", "yatz"] as const) {
      const b = resolveNewbieFriendlinessStrategy(game, "transition_b");
      expect(b.metric).toBe("playerEase");
      expect(b.fraction).toBe(NEWBIE_FRIENDLINESS_FRACTION.transition_b);
      expect(b.fraction).toBeGreaterThan(NEWBIE_FRIENDLINESS_FRACTION.ritual_a);
    }
  });

  it("ritual A forces easy + p50 + onboardingScore (non-BB)", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("match_3"),
      sessionKey: "s1",
      settledSoloCount: 0,
      weeklyLeagueTier: "diamond",
    });
    expect(p.segment).toBe("ritual_a");
    expect(p.tier).toBe("easy");
    expect(p.successQuantile).toBe("p50");
    expect(p.ritualOneLineClear).toBeUndefined();
    expect(p.preferHighFriendliness).toBe(true);
    expect(p.friendlinessMetric).toBe("onboardingScore");
    expect(p.friendlinessFraction).toBe(NEWBIE_FRIENDLINESS_FRACTION.ritual_a);
  });

  it("BB ritual A uses one-line clear (no quantile)", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: 0,
    });
    expect(p.segment).toBe("ritual_a");
    expect(p.ritualOneLineClear).toBe(true);
    expect(p.successQuantile).toBeUndefined();
    expect(p.tier).toBe("easy");
  });

  it("BB transition B uses p25 then p50", () => {
    const b1 = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: 1,
    });
    expect(b1.segment).toBe("transition_b");
    expect(b1.successQuantile).toBe("p25");
    expect(b1.ritualOneLineClear).toBeUndefined();

    const b2 = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: 2,
    });
    expect(b2.segment).toBe("transition_b");
    expect(b2.successQuantile).toBe("p50");
  });

  it("solitaire ritual A also consumes onboardingScore (not clearEase key)", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("solitaire"),
      sessionKey: "s1",
      settledSoloCount: 0,
    });
    expect(p.friendlinessMetric).toBe("onboardingScore");
    expect(p.friendlinessFraction).toBe(0.25);
  });

  it("transition B forces easy with p75 and playerEase", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("solitaire"),
      sessionKey: "s1",
      settledSoloCount: 1,
      weeklyLeagueTier: "gold",
    });
    expect(p.segment).toBe("transition_b");
    expect(p.tier).toBe("easy");
    expect(p.successQuantile).toBe("p75");
    expect(p.friendlinessMetric).toBe("playerEase");
    expect(p.friendlinessFraction).toBe(NEWBIE_FRIENDLINESS_FRACTION.transition_b);
  });

  it("merged C uses league weights (bronze prefers easy more than diamond)", () => {
    const bronzeWeights = LEAGUE_SEED_TIER_WEIGHTS.bronze;
    const diamondWeights = LEAGUE_SEED_TIER_WEIGHTS.diamond;
    expect(bronzeWeights.easy).toBeGreaterThan(diamondWeights.easy);
    expect(diamondWeights.hard).toBeGreaterThan(bronzeWeights.hard);

    const keys = Array.from({ length: 200 }, (_, i) => `sess:${i}`);
    const bronzeEasy = keys.filter(
      (k) => pickWeightedSeedTier(k, bronzeWeights) === "easy"
    ).length;
    const diamondEasy = keys.filter(
      (k) => pickWeightedSeedTier(k, diamondWeights) === "easy"
    ).length;
    expect(bronzeEasy).toBeGreaterThan(diamondEasy);
  });

  it("loss streak shifts weight toward easy", () => {
    const base = LEAGUE_SEED_TIER_WEIGHTS.gold;
    const shifted = shiftWeightsTowardEasy(base, 1);
    expect(shifted.easy).toBeGreaterThan(base.easy);
    expect(shifted.hard).toBeLessThan(base.hard);
  });

  it("block_blast ritual uses onboardingScore semantic", () => {
    const ritual = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: 0,
      weeklyLeagueTier: "diamond",
    });
    expect(ritual.segment).toBe("ritual_a");
    expect(ritual.friendlinessMetric).toBe("onboardingScore");
  });

  it("resolveSeedTierForTemplate uses league when provided", () => {
    const bronze = resolveSeedTierForTemplate(multiDef("yatz"), "m1", "bronze");
    expect(["easy", "medium", "hard"]).toContain(bronze);
  });
});
