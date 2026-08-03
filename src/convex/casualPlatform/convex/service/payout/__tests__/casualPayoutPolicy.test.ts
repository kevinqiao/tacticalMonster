import { describe, expect, it } from "vitest";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import {
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
} from "../../../data/casualTournamentConfigs";
import { payoutBucketFromDef, usesXpOrdinalDecay } from "../../../data/casualPayoutPolicy";

describe("payoutBucketFromDef", () => {
  it("maps modes to three buckets", () => {
    const a = getTournamentDefinition("casual_async_a_solitaire");
    const spotlight = getTournamentDefinition(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
    const p75 = getTournamentDefinition("casual_solo_p75_solitaire");
    expect(a && payoutBucketFromDef(a)).toBe("async");
    expect(spotlight && payoutBucketFromDef(spotlight)).toBe("season_challenge");
    expect(p75 && payoutBucketFromDef(p75)).toBe("solo_p75");
  });

  it("spotlight skips ordinal decay", () => {
    const spotlight = getTournamentDefinition(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
    expect(spotlight && usesXpOrdinalDecay(spotlight)).toBe(false);
    const a = getTournamentDefinition("casual_async_a_solitaire");
    expect(a && usesXpOrdinalDecay(a)).toBe(true);
  });
});
