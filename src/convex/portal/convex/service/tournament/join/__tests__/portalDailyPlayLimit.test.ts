import { describe, expect, it } from "vitest";

import { PORTAL_AD_ENTRY_DEFAULTS } from "../../../../data/portalAdEntryConfig";
import { PORTAL_DAILY_PLAY_LIMITS } from "../../../../data/portalDailyPlayLimits";
import { PORTAL_TICKET_ENTRY_DEFAULTS } from "../../../../data/portalTicketEntryConfig";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
} from "../../../../data/portalTournamentConfigs";
import { playCountsTowardEntryScope } from "../../../ads/portalEntryUsageScope";
import {
  applyTownPlayEntryOverlay,
  freePlayCapFromSettings,
  ticketConfigFromSettings,
} from "../../../ads/resolvePlayEntrySettings";
import { portalDailyPlayModeFromDef } from "../portalDailyPlayLimit";

describe("portalDailyPlayModeFromDef", () => {
  it("maps solo_p75 and multi_ranked", () => {
    expect(portalDailyPlayModeFromDef({ matchType: "solo_p75" })).toBe("solo");
    expect(portalDailyPlayModeFromDef({ matchType: "multi_ranked" })).toBe("multi");
  });
});

describe("PORTAL_DAILY_PLAY_LIMITS", () => {
  it("defaults to solo 3 / multi 5 (shared across gameTypes)", () => {
    expect(PORTAL_DAILY_PLAY_LIMITS.solo).toBe(3);
    expect(PORTAL_DAILY_PLAY_LIMITS.multi).toBe(5);
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
  it("multi free/ad caps leave room for ad after free is exhausted", () => {
    const free = PORTAL_DAILY_PLAY_LIMITS.multi;
    const ad = PORTAL_AD_ENTRY_DEFAULTS.multi.dailyCap;
    // Ad lane is gated by adUsed vs adCap (not playsToday >= free+ad),
    // so orphan ladder rows cannot fake a hard daily_play_limit.
    expect(ad).toBeGreaterThan(0);
    expect(free).toBe(5);
    expect(ad).toBe(10);
    expect(PORTAL_TICKET_ENTRY_DEFAULTS.multi.dailyCap).toBeGreaterThanOrEqual(0);
  });
});

describe("town play entry overlay", () => {
  it("does not change lobby defaults", () => {
    const settings = applyTownPlayEntryOverlay({}, "lobby:abc");
    expect(freePlayCapFromSettings(settings, "solo")).toBe(PORTAL_DAILY_PLAY_LIMITS.solo);
    expect(freePlayCapFromSettings(settings, "multi")).toBe(PORTAL_DAILY_PLAY_LIMITS.multi);
  });

  it("gives Mayfield 5 free solo, ticket-only unpaid multi, no ads", () => {
    const settings = applyTownPlayEntryOverlay({}, "town:mayfield");
    expect(freePlayCapFromSettings(settings, "solo")).toBe(5);
    expect(freePlayCapFromSettings(settings, "multi")).toBe(0);
    expect(ticketConfigFromSettings(settings, "solo")).toMatchObject({
      enabled: true,
      dailyCap: 0,
    });
    expect(ticketConfigFromSettings(settings, "multi")).toMatchObject({
      enabled: true,
      priceTickets: 1,
      dailyCap: 100,
    });
  });

  it("counts town opens only against the town pool", () => {
    expect(playCountsTowardEntryScope("town:mayfield", "town:mayfield")).toBe(true);
    expect(playCountsTowardEntryScope("lobby:abc", "town:mayfield")).toBe(false);
    expect(playCountsTowardEntryScope("town:mayfield", null)).toBe(false);
    expect(playCountsTowardEntryScope("lobby:abc", null)).toBe(true);
    expect(playCountsTowardEntryScope(undefined, null)).toBe(true);
  });
});
