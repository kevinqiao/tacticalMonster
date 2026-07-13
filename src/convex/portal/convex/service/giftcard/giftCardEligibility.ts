import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import {
  PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS,
  PORTAL_REDEMPTION_REGION_LOCK_MS,
  PORTAL_REDEMPTION_REGIONS,
} from "../../data/portalGiftCardEconomy";

export type GiftCardEligibilityError =
  | "verification_required"
  | "region_required"
  | "region_mismatch"
  | "region_locked"
  | "account_too_new"
  | "insufficient_engagement"
  | "invalid_region";

export type GiftCardEligibilityResult =
  | { ok: true }
  | { ok: false; error: GiftCardEligibilityError };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSince(ts: number | undefined, now = Date.now()): number {
  if (ts == null || !Number.isFinite(ts)) return 0;
  return Math.floor((now - ts) / MS_PER_DAY);
}

export async function hasPortalEngagement(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<boolean> {
  const league = await ctx.db
    .query("portal_weekly_league_members")
    .withIndex("by_uid_game", (q) => q.eq("uid", uid))
    .first();
  if (league) return true;

  const run = await ctx.db
    .query("portal_run_player_tournaments")
    .withIndex("by_uid_updatedAt", (q) => q.eq("uid", uid))
    .first();
  return run != null;
}

export function isValidRedemptionRegion(region: string): boolean {
  return (PORTAL_REDEMPTION_REGIONS as readonly string[]).includes(region);
}

export async function assertGiftCardEligibility(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  player: Doc<"portal_players"> | null,
  sku: {
    region?: string;
    minAccountAgeDays?: number;
    requiresVerifiedContact?: boolean;
  },
  now = Date.now()
): Promise<GiftCardEligibilityResult> {
  if (!player) {
    return { ok: false, error: "verification_required" };
  }

  const requiresContact = sku.requiresVerifiedContact !== false;
  if (requiresContact && !player.verifiedEmail && !player.verifiedPhone) {
    return { ok: false, error: "verification_required" };
  }

  if (!player.redemptionRegion) {
    return { ok: false, error: "region_required" };
  }

  if (sku.region && sku.region !== player.redemptionRegion) {
    return { ok: false, error: "region_mismatch" };
  }

  const minDays = sku.minAccountAgeDays ?? PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS;
  const createdAt = player.createdAt ?? player.updatedAt ?? now;
  if (daysSince(createdAt, now) < minDays) {
    return { ok: false, error: "account_too_new" };
  }

  const engaged = await hasPortalEngagement(ctx, uid);
  if (!engaged) {
    return { ok: false, error: "insufficient_engagement" };
  }

  return { ok: true };
}

export function canChangeRedemptionRegion(
  player: Doc<"portal_players">,
  now = Date.now()
): boolean {
  if (!player.redemptionRegion || !player.redemptionRegionLockedAt) return true;
  return now - player.redemptionRegionLockedAt >= PORTAL_REDEMPTION_REGION_LOCK_MS;
}

export function buildRedemptionProfileView(
  player: Doc<"portal_players"> | null,
  eligibility: GiftCardEligibilityResult,
  now = Date.now()
) {
  const createdAt = player?.createdAt ?? player?.updatedAt ?? now;
  return {
    region: player?.redemptionRegion ?? null,
    verifiedEmail: player?.verifiedEmail ?? null,
    verifiedPhone: player?.verifiedPhone ?? null,
    hasVerifiedContact: Boolean(player?.verifiedEmail || player?.verifiedPhone),
    accountAgeDays: daysSince(createdAt, now),
    canChangeRegion: player ? canChangeRedemptionRegion(player, now) : true,
    eligible: eligibility.ok,
    ineligibleReason: eligibility.ok ? null : eligibility.error,
  };
}
