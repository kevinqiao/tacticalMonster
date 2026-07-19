import { v } from "convex/values";

import { sessionPartnerIdFromUid } from "../../../../shared/platformAuth/parsePlatformUid";
import { PORTAL_AD_REPLAY_DAILY_CAP } from "../../data/portalAdReplayConfig";
import { internal } from "../../_generated/api";
import { internalMutation, internalQuery } from "../../_generated/server";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

const AD_REPLAY_DAILY_CAP_MAX = 100;
/** Re-pull from SSO when cache is older than this (covers manual SSO DB edits / failed push). */
const CACHE_STALE_MS = 60_000;

function sanitizeCachedCap(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PORTAL_AD_REPLAY_DAILY_CAP;
  }
  const n = Math.floor(value);
  if (n < 0 || n > AD_REPLAY_DAILY_CAP_MAX) {
    return PORTAL_AD_REPLAY_DAILY_CAP;
  }
  return n;
}

export function partnerIdFromUid(uid: string): number {
  return sessionPartnerIdFromUid(uid) ?? 0;
}

async function findPartnerAdSettings(
  ctx: QueryCtx | MutationCtx,
  partnerId: number
) {
  return await ctx.db
    .query("portal_partner_ad_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .first();
}

function isMutationCtx(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  return typeof (ctx as MutationCtx).scheduler?.runAfter === "function";
}

async function scheduleSsoCapSync(ctx: MutationCtx, partnerId: number) {
  await ctx.scheduler.runAfter(
    0,
    internal.service.ads.partnerAdReplayConfigSync.syncPartnerAdReplayCapFromSso,
    { partnerId }
  );
}

/**
 * Resolve per-partner ad-replay daily cap for a session uid.
 * Cache miss / stale → mutations schedule SSO pull (do not seed default into cache).
 * Until cache is warm, fall back to default 5.
 */
export async function resolveAdReplayDailyCap(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<number> {
  const partnerId = partnerIdFromUid(uid);
  const cached = await findPartnerAdSettings(ctx, partnerId);
  const now = Date.now();

  if (cached) {
    const cap = sanitizeCachedCap(cached.adReplayDailyCap);
    if (
      isMutationCtx(ctx) &&
      (typeof cached.updatedAt !== "number" || now - cached.updatedAt >= CACHE_STALE_MS)
    ) {
      await scheduleSsoCapSync(ctx, partnerId);
    }
    return cap;
  }

  if (isMutationCtx(ctx)) {
    await scheduleSsoCapSync(ctx, partnerId);
  }

  return PORTAL_AD_REPLAY_DAILY_CAP;
}

/** SSO → Portal push / sync upsert. */
export const upsertPartnerAdReplayCapInternal = internalMutation({
  args: {
    partnerId: v.number(),
    adReplayDailyCap: v.number(),
  },
  handler: async (ctx, args) => {
    const partnerId = Math.floor(args.partnerId);
    if (!Number.isFinite(partnerId) || partnerId < 0) {
      return { ok: false as const, error: "invalid_partner" };
    }
    const cap = sanitizeCachedCap(args.adReplayDailyCap);
    const now = Date.now();
    const existing = await findPartnerAdSettings(ctx, partnerId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        adReplayDailyCap: cap,
        updatedAt: now,
      });
      // Deduplicate if concurrent inserts created extras.
      const extras = await ctx.db
        .query("portal_partner_ad_settings")
        .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
        .collect();
      for (const row of extras) {
        if (row._id !== existing._id) {
          await ctx.db.delete(row._id);
        }
      }
    } else {
      await ctx.db.insert("portal_partner_ad_settings", {
        partnerId,
        adReplayDailyCap: cap,
        updatedAt: now,
      });
    }
    return { ok: true as const, partnerId, adReplayDailyCap: cap };
  },
});

export const getPartnerAdReplayCapCachedInternal = internalQuery({
  args: { partnerId: v.number() },
  handler: async (ctx, { partnerId }) => {
    const row = await findPartnerAdSettings(ctx, partnerId);
    return row
      ? {
          partnerId,
          adReplayDailyCap: sanitizeCachedCap(row.adReplayDailyCap),
          updatedAt: row.updatedAt,
        }
      : null;
  },
});
