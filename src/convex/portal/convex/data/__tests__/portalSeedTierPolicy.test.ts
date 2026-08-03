import { describe, expect, it } from "vitest";
import {
  MULTI_SEED_TIER_WEIGHTS,
  pickWeightedSeedTier,
  resolveSeedTierForTemplate,
  type PortalSeedTier,
} from "../portalSeedTierPolicy";
import {
  getPortalTournamentDefinition,
  type PortalTournamentDefinition,
} from "../portalTournamentConfigs";

function def(
  matchType: PortalTournamentDefinition["matchType"],
  gameType: PortalTournamentDefinition["gameType"] = "solitaire"
): PortalTournamentDefinition {
  return { matchType, gameType } as PortalTournamentDefinition;
}

describe("portalSeedTierPolicy", () => {
  it("block_blast always prefers hard (solo and multi)", () => {
    expect(resolveSeedTierForTemplate(def("solo_p75", "block_blast"))).toBe("hard");
    expect(
      resolveSeedTierForTemplate(def("multi_ranked", "block_blast"), "casual_sess:m1")
    ).toBe("hard");
  });

  it("block_blast solo success uses p90", () => {
    const bb = getPortalTournamentDefinition("portal_solo_p75_block_blast");
    expect(bb?.seedQuantileSuccess?.quantile).toBe("p90");
    const sol = getPortalTournamentDefinition("portal_solo_p75_solitaire");
    expect(sol?.seedQuantileSuccess?.quantile).toBe("p75");
  });

  it("other solo prefers medium", () => {
    expect(resolveSeedTierForTemplate(def("solo_p75", "solitaire"))).toBe("medium");
  });

  it("other multi picks weighted tier deterministically", () => {
    const a = resolveSeedTierForTemplate(def("multi_ranked", "solitaire"), "casual_sess:m1");
    const b = resolveSeedTierForTemplate(def("multi_ranked", "solitaire"), "casual_sess:m1");
    expect(a).toBe(b);
    expect(["easy", "medium", "hard"]).toContain(a);
  });

  it("multi weights favor medium/hard over many keys", () => {
    const counts: Record<PortalSeedTier, number> = { easy: 0, medium: 0, hard: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[pickWeightedSeedTier(`sess:${i}`, MULTI_SEED_TIER_WEIGHTS)] += 1;
    }
    expect(counts.easy / 1000).toBeLessThan(0.25);
    expect((counts.medium + counts.hard) / 1000).toBeGreaterThan(0.7);
  });
});
