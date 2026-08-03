import { describe, expect, it } from "vitest";

import {
  PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT,
  PORTAL_TICKET_REPLAY_PRICE_DEFAULT,
  defaultPortalReplaySettings,
  pickReplaySettingsPartial,
  sparseMergeReplaySettings,
} from "../portalPartnerReplaySettings";

describe("portalPartnerReplaySettings", () => {
  it("defaults maxReplaysPerMatch to 1 and ad daily cap to unlimited", () => {
    const defaults = defaultPortalReplaySettings(1_000_000_000);
    expect(defaults.maxReplaysPerMatch).toBe(PORTAL_MAX_REPLAYS_PER_MATCH_DEFAULT);
    expect(defaults.maxReplaysPerMatch).toBe(1);
    expect(defaults.adReplayDailyCap).toBe(1_000_000_000);
    expect(defaults.ticketReplayPriceTickets).toBe(PORTAL_TICKET_REPLAY_PRICE_DEFAULT);
    expect(defaults.adReplayEnabled).toBe(true);
    expect(defaults.ticketReplayEnabled).toBe(true);
    expect(defaults.coinReplayEnabled).toBe(false);
  });

  it("sparse-merges only provided overlay keys", () => {
    const base = defaultPortalReplaySettings(1_000_000_000);
    const merged = sparseMergeReplaySettings(base, {
      maxReplaysPerMatch: 2,
      adReplayEnabled: false,
    });
    expect(merged.maxReplaysPerMatch).toBe(2);
    expect(merged.adReplayEnabled).toBe(false);
    expect(merged.adReplayDailyCap).toBe(1_000_000_000);
    expect(merged.ticketReplayEnabled).toBe(true);
    expect(merged.ticketReplayPriceTickets).toBe(1);
  });

  it("treats maxReplaysPerMatch 0 as close replays", () => {
    const base = defaultPortalReplaySettings(1_000_000_000);
    const merged = sparseMergeReplaySettings(base, { maxReplaysPerMatch: 0 });
    expect(merged.maxReplaysPerMatch).toBe(0);
  });

  it("preserves unlimited adReplayDailyCap sentinel through sparse merge", () => {
    const base = defaultPortalReplaySettings(1_000_000_000);
    const merged = sparseMergeReplaySettings(base, { ticketReplayEnabled: false });
    expect(merged.adReplayDailyCap).toBe(1_000_000_000);
    const capped = sparseMergeReplaySettings(base, { adReplayDailyCap: 7 });
    expect(capped.adReplayDailyCap).toBe(7);
  });

  it("pickReplaySettingsPartial ignores empty objects", () => {
    expect(pickReplaySettingsPartial({})).toBeUndefined();
    expect(pickReplaySettingsPartial(null)).toBeUndefined();
    expect(
      pickReplaySettingsPartial({ maxReplaysPerMatch: 3, adReplayDailyCap: 10 })
    ).toEqual({ maxReplaysPerMatch: 3, adReplayDailyCap: 10 });
  });
});
