import { internal } from "../../_generated/api";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  isPortalAdCoinChannel,
  isPortalAdCoinMockEnabled,
  PORTAL_AD_COIN_DAILY_CAP,
  PORTAL_AD_COIN_ENABLED,
  PORTAL_AD_COIN_REWARD_AMOUNT,
  PORTAL_AD_COIN_SESSION_TTL_MS,
  type PortalAdCoinChannel,
} from "../../data/portalAdCoinConfig";
import { isPartnerShopAdCoinEnabled } from "../../data/portalPartnerShopSettings";
import { resolvePortalShopSessionPartnerId } from "../../data/portalShopPartner";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { loadPartnerShopSettings } from "../shop/partnerShopSettings";

function randomHexSessionId(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type AdCoinSessionError =
  | "disabled"
  | "invalid_channel"
  | "daily_cap_reached"
  | "session_not_found"
  | "session_expired"
  | "session_not_pending"
  | "forbidden"
  | "grant_failed"
  | "pending_exists";

/** Watch-ad-for-coins requires the feature flag AND the partner shop to allow it. */
async function partnerAllowsAdCoin(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<boolean> {
  if (!PORTAL_AD_COIN_ENABLED) return false;
  const partnerId = resolvePortalShopSessionPartnerId(uid);
  const settings = await loadPartnerShopSettings(ctx, partnerId);
  return isPartnerShopAdCoinEnabled(settings);
}

async function findAdCoinDailyUsageRow(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  dayKey: string
) {
  return await ctx.db
    .query("portal_ad_coin_daily_usage")
    .withIndex("by_uid_dayKey", (q) => q.eq("uid", uid).eq("dayKey", dayKey))
    .unique();
}

export async function readAdCoinUsedToday(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  dayKey: string
): Promise<number> {
  const row = await findAdCoinDailyUsageRow(ctx, uid, dayKey);
  if (row && typeof row.usedCount === "number" && Number.isFinite(row.usedCount)) {
    return Math.max(0, Math.floor(row.usedCount));
  }
  const claims = await ctx.db
    .query("portal_ad_coin_claims")
    .withIndex("by_uid_dayKey", (q) => q.eq("uid", uid).eq("dayKey", dayKey))
    .collect();
  return claims.length;
}

async function consumeAdCoinDailySlot(
  ctx: MutationCtx,
  args: { uid: string; dayKey: string; now: number; cap: number }
): Promise<{ ok: true; usedAfter: number } | { ok: false; error: "daily_cap_reached" }> {
  const cap = Math.max(0, Math.floor(args.cap));
  const row = await findAdCoinDailyUsageRow(ctx, args.uid, args.dayKey);
  const used = row
    ? Math.max(0, Math.floor(row.usedCount))
    : await readAdCoinUsedToday(ctx, args.uid, args.dayKey);
  if (used >= cap) {
    return { ok: false, error: "daily_cap_reached" };
  }
  const usedAfter = used + 1;
  if (row) {
    await ctx.db.patch(row._id, { usedCount: usedAfter, updatedAt: args.now });
  } else {
    await ctx.db.insert("portal_ad_coin_daily_usage", {
      uid: args.uid,
      dayKey: args.dayKey,
      usedCount: usedAfter,
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
  return { ok: true, usedAfter };
}

async function cancelPendingAdCoinSessionsForUid(
  ctx: MutationCtx,
  uid: string,
  now: number
): Promise<void> {
  const rows = await ctx.db
    .query("portal_ad_coin_sessions")
    .withIndex("by_uid_status", (q) => q.eq("uid", uid).eq("status", "pending"))
    .collect();
  for (const row of rows) {
    await ctx.db.patch(row._id, { status: "cancelled", updatedAt: now });
  }
}

export async function getPortalAdCoinOfferCore(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  now = Date.now()
) {
  const cap = PORTAL_AD_COIN_DAILY_CAP;
  const rewardAmount = PORTAL_AD_COIN_REWARD_AMOUNT;
  if (!(await partnerAllowsAdCoin(ctx, uid))) {
    return {
      enabled: false as const,
      remaining: 0,
      cap,
      rewardAmount,
      watchedToday: 0,
    };
  }
  const dayKey = dailyPeriodKey(now);
  const used = await readAdCoinUsedToday(ctx, uid, dayKey);
  return {
    enabled: true as const,
    remaining: Math.max(0, cap - used),
    cap,
    rewardAmount,
    watchedToday: used,
  };
}

export async function beginPortalAdCoinSessionCore(
  ctx: MutationCtx,
  args: { uid: string; channel: string; now?: number }
) {
  const now = args.now ?? Date.now();
  if (!(await partnerAllowsAdCoin(ctx, args.uid))) {
    return { ok: false as const, error: "disabled" as const };
  }
  if (!isPortalAdCoinChannel(args.channel)) {
    return { ok: false as const, error: "invalid_channel" as const };
  }
  if (args.channel === "dev" && !isPortalAdCoinMockEnabled()) {
    return { ok: false as const, error: "invalid_channel" as const };
  }

  const dayKey = dailyPeriodKey(now);
  const cap = PORTAL_AD_COIN_DAILY_CAP;
  const usedToday = await readAdCoinUsedToday(ctx, args.uid, dayKey);
  if (usedToday >= cap) {
    return { ok: false as const, error: "daily_cap_reached" as const };
  }

  await cancelPendingAdCoinSessionsForUid(ctx, args.uid, now);

  const sessionId = randomHexSessionId(16);
  const expiresAt = now + PORTAL_AD_COIN_SESSION_TTL_MS;
  await ctx.db.insert("portal_ad_coin_sessions", {
    sessionId,
    uid: args.uid,
    channel: args.channel as PortalAdCoinChannel,
    status: "pending",
    createdAt: now,
    expiresAt,
  });

  return {
    ok: true as const,
    sessionId,
    expiresAt,
    rewardAmount: PORTAL_AD_COIN_REWARD_AMOUNT,
    remaining: cap - usedToday,
  };
}

export async function completePortalAdCoinSessionCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    sessionId: string;
    clientProof?: string;
    now?: number;
  }
) {
  const now = args.now ?? Date.now();
  if (!(await partnerAllowsAdCoin(ctx, args.uid))) {
    return { ok: false as const, error: "disabled" as const };
  }

  const session = await ctx.db
    .query("portal_ad_coin_sessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
    .unique();

  if (!session) {
    return { ok: false as const, error: "session_not_found" as const };
  }
  if (session.uid !== args.uid) {
    return { ok: false as const, error: "forbidden" as const };
  }
  if (session.status === "completed") {
    const existing = await ctx.db
      .query("portal_ad_coin_claims")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session.sessionId))
      .unique();
    if (existing) {
      const offer = await getPortalAdCoinOfferCore(ctx, args.uid, now);
      return {
        ok: true as const,
        coinsGranted: existing.coinsGranted,
        remaining: offer.remaining,
        rewardAmount: PORTAL_AD_COIN_REWARD_AMOUNT,
      };
    }
  }
  if (session.status !== "pending") {
    return { ok: false as const, error: "session_not_pending" as const };
  }
  if (session.expiresAt < now) {
    await ctx.db.patch(session._id, { status: "expired", updatedAt: now });
    return { ok: false as const, error: "session_expired" as const };
  }
  if (!isPortalAdCoinMockEnabled() && session.channel === "dev") {
    return { ok: false as const, error: "invalid_channel" as const };
  }

  const dayKey = dailyPeriodKey(now);
  const slot = await consumeAdCoinDailySlot(ctx, {
    uid: args.uid,
    dayKey,
    now,
    cap: PORTAL_AD_COIN_DAILY_CAP,
  });
  if (!slot.ok) {
    await ctx.db.patch(session._id, { status: "cancelled", updatedAt: now });
    return { ok: false as const, error: "daily_cap_reached" as const };
  }

  const coinsGranted = PORTAL_AD_COIN_REWARD_AMOUNT;
  const grant = await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
    uid: args.uid,
    kind: "coins",
    amount: coinsGranted,
    reason: "ad_watch_coins",
  });
  if (!grant.ok) {
    const usage = await findAdCoinDailyUsageRow(ctx, args.uid, dayKey);
    if (usage) {
      await ctx.db.patch(usage._id, {
        usedCount: Math.max(0, Math.floor(usage.usedCount) - 1),
        updatedAt: now,
      });
    }
    await ctx.db.patch(session._id, { status: "cancelled", updatedAt: now });
    return { ok: false as const, error: "grant_failed" as const };
  }

  await ctx.db.insert("portal_ad_coin_claims", {
    uid: args.uid,
    sessionId: session.sessionId,
    channel: session.channel,
    dayKey,
    coinsGranted,
    clientProof: args.clientProof,
    createdAt: now,
  });
  await ctx.db.patch(session._id, {
    status: "completed",
    completedAt: now,
    updatedAt: now,
    clientProof: args.clientProof,
  });

  return {
    ok: true as const,
    coinsGranted,
    remaining: Math.max(0, PORTAL_AD_COIN_DAILY_CAP - slot.usedAfter),
    rewardAmount: PORTAL_AD_COIN_REWARD_AMOUNT,
  };
}
