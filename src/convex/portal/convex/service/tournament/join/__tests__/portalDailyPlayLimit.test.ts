import { describe, expect, it } from "vitest";

import { PORTAL_AD_ENTRY_DEFAULTS } from "../../../../data/portalAdEntryConfig";
import { PORTAL_DAILY_PLAY_LIMITS } from "../../../../data/portalDailyPlayLimits";
import { PORTAL_TICKET_ENTRY_DEFAULTS } from "../../../../data/portalTicketEntryConfig";
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

describe("play entry ladder ceilings", () => {
  it("multi hard max is free + ad + ticket caps", () => {
    const free = PORTAL_DAILY_PLAY_LIMITS.multi;
    const ad = PORTAL_AD_ENTRY_DEFAULTS.multi.dailyCap;
    const ticket = PORTAL_TICKET_ENTRY_DEFAULTS.multi.dailyCap;
    // After free is exhausted, ad entry must still fit under this ceiling
    // (not freeCap + adUsed alone — orphan plays used to block ads).
    expect(free + ad + ticket).toBeGreaterThan(free);
    expect(free).toBe(10);
    expect(ad).toBe(10);
  });
});
