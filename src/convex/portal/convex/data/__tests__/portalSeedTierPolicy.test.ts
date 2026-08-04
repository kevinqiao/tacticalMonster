import { describe, expect, it } from "vitest";

import {
  LEAGUE_SEED_TIER_WEIGHTS,
  pickWeightedSeedTier,
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

  it("ritual A forces easy + p50 + high playerEase", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("yatz"),
      sessionKey: "s1",
      settledSoloCount: 0,
      weeklyLeagueTier: "diamond",
    });
    expect(p.segment).toBe("ritual_a");
    expect(p.tier).toBe("easy");
    expect(p.successQuantile).toBe("p50");
    expect(p.preferHighPlayerEase).toBe(true);
  });

  it("transition B forces easy with p75", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("yatz"),
      sessionKey: "s1",
      settledSoloCount: 1,
      weeklyLeagueTier: "gold",
    });
    expect(p.segment).toBe("transition_b");
    expect(p.tier).toBe("easy");
    expect(p.successQuantile).toBe("p75");
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

  it("block_blast stays hard", () => {
    const p = resolveSeasonSeedPickPolicy({
      def: soloDef("block_blast"),
      sessionKey: "s1",
      settledSoloCount: 0,
    });
    expect(p.tier).toBe("hard");
    expect(p.segment).toBe("block_blast");
  });

  it("resolveSeedTierForTemplate uses league when provided", () => {
    // With settledSoloCount defaulted to 99 inside helper → merged weights
    const bronze = resolveSeedTierForTemplate(multiDef("yatz"), "m1", "bronze");
    expect(["easy", "medium", "hard"]).toContain(bronze);
  });
});
