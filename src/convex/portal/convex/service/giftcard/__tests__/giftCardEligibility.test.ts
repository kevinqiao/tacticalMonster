import { describe, expect, it } from "vitest";

import type { Doc } from "../../../_generated/dataModel";
import {
  assertGiftCardEligibility,
  buildRedemptionProfileView,
  canChangeRedemptionRegion,
  daysSince,
  isValidRedemptionRegion,
} from "../giftCardEligibility";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 7, 12, 0, 0);

function player(partial: Partial<Doc<"portal_players">> & { uid: string }): Doc<"portal_players"> {
  return {
    _id: "players:test" as Doc<"portal_players">["_id"],
    _creationTime: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function mockCtx(opts: { hasLeague?: boolean; hasRun?: boolean }) {
  return {
    db: {
      query: (table: string) => ({
        withIndex: (_name: string, fn: (q: { eq: (k: string, v: string) => unknown }) => unknown) => {
          const builder = {
            eq: () => builder,
            first: async () => {
              if (table === "portal_weekly_league_members") {
                return opts.hasLeague ? { uid: "u1" } : null;
              }
              if (table === "portal_run_player_tournaments") {
                return opts.hasRun ? { uid: "u1" } : null;
              }
              return null;
            },
          };
          fn({ eq: () => builder });
          return builder;
        },
      }),
    },
  } as never;
}

describe("giftCardEligibility", () => {
  it("validates supported regions", () => {
    expect(isValidRedemptionRegion("US")).toBe(true);
    expect(isValidRedemptionRegion("XX")).toBe(false);
  });

  it("computes account age in days", () => {
    expect(daysSince(NOW - 8 * MS_PER_DAY, NOW)).toBe(8);
    expect(daysSince(undefined, NOW)).toBe(0);
  });

  it("blocks when verification missing", async () => {
    const p = player({
      uid: "u1",
      redemptionRegion: "US",
      createdAt: NOW - 10 * MS_PER_DAY,
    });
    const result = await assertGiftCardEligibility(mockCtx({ hasLeague: true }), "u1", p, {}, NOW);
    expect(result).toEqual({ ok: false, error: "verification_required" });
  });

  it("blocks when region missing", async () => {
    const p = player({
      uid: "u1",
      verifiedEmail: "a@b.com",
      createdAt: NOW - 10 * MS_PER_DAY,
    });
    const result = await assertGiftCardEligibility(mockCtx({ hasLeague: true }), "u1", p, {}, NOW);
    expect(result).toEqual({ ok: false, error: "region_required" });
  });

  it("blocks region mismatch", async () => {
    const p = player({
      uid: "u1",
      verifiedEmail: "a@b.com",
      redemptionRegion: "US",
      createdAt: NOW - 10 * MS_PER_DAY,
    });
    const result = await assertGiftCardEligibility(
      mockCtx({ hasLeague: true }),
      "u1",
      p,
      { region: "CA" },
      NOW
    );
    expect(result).toEqual({ ok: false, error: "region_mismatch" });
  });

  it("blocks new accounts", async () => {
    const p = player({
      uid: "u1",
      verifiedEmail: "a@b.com",
      redemptionRegion: "US",
      createdAt: NOW - 2 * MS_PER_DAY,
    });
    const result = await assertGiftCardEligibility(mockCtx({ hasLeague: true }), "u1", p, {}, NOW);
    expect(result).toEqual({ ok: false, error: "account_too_new" });
  });

  it("blocks without engagement", async () => {
    const p = player({
      uid: "u1",
      verifiedEmail: "a@b.com",
      redemptionRegion: "US",
      createdAt: NOW - 10 * MS_PER_DAY,
    });
    const result = await assertGiftCardEligibility(mockCtx({}), "u1", p, {}, NOW);
    expect(result).toEqual({ ok: false, error: "insufficient_engagement" });
  });

  it("passes when all requirements met", async () => {
    const p = player({
      uid: "u1",
      verifiedEmail: "a@b.com",
      redemptionRegion: "US",
      createdAt: NOW - 10 * MS_PER_DAY,
    });
    const result = await assertGiftCardEligibility(
      mockCtx({ hasLeague: true }),
      "u1",
      p,
      { region: "US" },
      NOW
    );
    expect(result).toEqual({ ok: true });
  });

  it("locks region changes within 30 days", () => {
    const p = player({
      uid: "u1",
      redemptionRegion: "US",
      redemptionRegionLockedAt: NOW - 5 * MS_PER_DAY,
    });
    expect(canChangeRedemptionRegion(p, NOW)).toBe(false);
    expect(canChangeRedemptionRegion(p, NOW + 26 * MS_PER_DAY)).toBe(true);
  });

  it("builds redemption profile view", () => {
    const p = player({
      uid: "u1",
      verifiedEmail: "a@b.com",
      redemptionRegion: "US",
      createdAt: NOW - 10 * MS_PER_DAY,
    });
    const view = buildRedemptionProfileView(p, { ok: false, error: "region_required" }, NOW);
    expect(view.hasVerifiedContact).toBe(true);
    expect(view.region).toBe("US");
    expect(view.accountAgeDays).toBe(10);
    expect(view.ineligibleReason).toBe("region_required");
  });
});
