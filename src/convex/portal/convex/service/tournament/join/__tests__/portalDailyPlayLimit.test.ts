import { describe, expect, it } from "vitest";

import { PORTAL_DAILY_PLAY_LIMITS } from "../../../../data/portalDailyPlayLimits";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
} from "../../../../data/portalTournamentConfigs";
import { portalDailyPlayModeFromDef } from "../portalDailyPlayLimit";

describe("portalDailyPlayModeFromDef", () => {
  it("maps solo_p75 and multi_ranked", () => {
    expect(portalDailyPlayModeFromDef({ matchType: "solo_p75" })).toBe("solo");
    expect(portalDailyPlayModeFromDef({ matchType: "multi_ranked" })).toBe("multi");
  });
});

describe("PORTAL_DAILY_PLAY_LIMITS", () => {
  it("defaults to solo 3 / multi 10 (shared across gameTypes)", () => {
    expect(PORTAL_DAILY_PLAY_LIMITS.solo).toBe(3);
    expect(PORTAL_DAILY_PLAY_LIMITS.multi).toBe(10);
  });
});

describe("portalTournamentUsesPlayEntryLadder", () => {
  it("only unpaid templates use free/ad/ticket daily ladder", () => {
    const free = getPortalTournamentDefinition("portal_multi_solitaire");
    const coin = getPortalTournamentDefinition("portal_multi_coin_solitaire");
    expect(free && portalTournamentUsesPlayEntryLadder(free)).toBe(true);
    expect(coin && portalTournamentUsesPlayEntryLadder(coin)).toBe(false);
  });
});
