import { v } from "convex/values";

import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation } from "../../_generated/server";
import {
  clampAdEntryDailyCap,
  isPortalAdEntryChannel,
  PORTAL_AD_ENTRY_GRANT_TTL_MS,
  PORTAL_AD_ENTRY_SESSION_TTL_MS,
  resolveAdEntryEnabled,
  type PortalAdEntryChannel,
  type PortalAdEntryMode,
} from "../../data/portalAdEntryConfig";
import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { partnerIdFromUid } from "./partnerAdReplayConfig";
import {
  countPortalPlaysInOpsDay,
  portalDailyPlayModeFromDef,
} from "../tournament/join/portalDailyPlayLimit";
import { resolveFreePlayDailyCap } from "./portalTicketEntryService";

export type AdEntryModeOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  usedToday: number;
  hasReadyGrant: boolean;
};

function randomHexId(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function resolveAdEntryConfig(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  mode: PortalAdEntryMode
) {
  const row = await ctx.db
    .query("portal_partner_play_entry_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerIdFromUid(uid)))
    .first();
  const enabled = resolveAdEntryEnabled(row?.adEntryEnabled, mode);
  const dailyCap = clampAdEntryDailyCap(
    mode === "solo" ? row?.adEntrySoloDailyCap : row?.adEntryMultiDailyCap,
    mode
  );
  return { enabled: enabled && dailyCap > 0, dailyCap };
}

export async function readAdEntryUsedToday(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  dayKey: string,
  mode: PortalAdEntryMode
) {
  const row = await ctx.db
    .query("portal_ad_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", uid).eq("dayKey", dayKey).eq("mode", mode)
    )
    .unique();
  return Math.max(0, Math.floor(row?.usedCount ?? 0));
}

async function findReadyAdEntryGrant(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  mode: PortalAdEntryMode,
  now: number
) {
  const rows = await ctx.db
    .query("portal_ad_entry_grants")
    .withIndex("by_uid_mode_status", (q) =>
      q.eq("uid", uid).eq("mode", mode).eq("status", "ready")
    )
    .collect();
  for (const row of rows) {
    if (row.expiresAt < now) continue;
    return row;
  }
  return null;
}

async function expireStaleReadyGrants(
  ctx: MutationCtx,
  uid: string,
  mode: PortalAdEntryMode,
  now: number
) {
  const rows = await ctx.db
    .query("portal_ad_entry_grants")
    .withIndex("by_uid_mode_status", (q) =>
      q.eq("uid", uid).eq("mode", mode).eq("status", "ready")
    )
    .collect();
  for (const row of rows) {
    if (row.expiresAt < now) {
      await ctx.db.patch(row._id, { status: "expired" });
    }
  }
}

export async function getPortalAdEntryOfferCore(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<{ solo: AdEntryModeOffer; multi: AdEntryModeOffer }> {
  const now = Date.now();
  const key = dailyPeriodKey(now);
  const make = async (mode: PortalAdEntryMode): Promise<AdEntryModeOffer> => {
    const cfg = await resolveAdEntryConfig(ctx, uid, mode);
    const used = await readAdEntryUsedToday(ctx, uid, key, mode);
    const ready = await findReadyAdEntryGrant(ctx, uid, mode, now);
    const remaining = cfg.enabled ? Math.max(0, cfg.dailyCap - used) : 0;
    return {
      enabled: cfg.enabled,
      cap: cfg.dailyCap,
      usedToday: used,
      remaining,
      hasReadyGrant: ready != null,
    };
  };
  const [solo, multi] = await Promise.all([make("solo"), make("multi")]);
  return { solo, multi };
}

export async function beginPortalAdEntrySessionCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    mode: PortalAdEntryMode;
    channel: string;
    templateId: string;
    now?: number;
  }
) {
  const now = args.now ?? Date.now();
  if (!isPortalAdEntryChannel(args.channel)) {
    return { ok: false as const, error: "invalid_channel" as const };
  }
  const def = getPortalTournamentDefinition(args.templateId);
  if (!def) return { ok: false as const, error: "invalid_mode" as const };
  const mode = portalDailyPlayModeFromDef(def);
  if (mode !== args.mode) {
    return { ok: false as const, error: "invalid_mode" as const };
  }

  const freeCap = await resolveFreePlayDailyCap(ctx, args.uid, mode);
  const playsToday = await countPortalPlaysInOpsDay(ctx, {
    uid: args.uid,
    templateId: args.templateId,
    nowMs: now,
  });
  if (playsToday < freeCap) {
    return { ok: false as const, error: "free_quota_available" as const };
  }

  const cfg = await resolveAdEntryConfig(ctx, args.uid, mode);
  if (!cfg.enabled) return { ok: false as const, error: "disabled" as const };

  await expireStaleReadyGrants(ctx, args.uid, mode, now);
  const ready = await findReadyAdEntryGrant(ctx, args.uid, mode, now);
  if (ready) {
    return {
      ok: true as const,
      sessionId: ready.sessionId,
      grantId: ready.grantId,
      alreadyGranted: true as const,
    };
  }

  const dayKey = dailyPeriodKey(now);
  const used = await readAdEntryUsedToday(ctx, args.uid, dayKey, mode);
  if (used >= cfg.dailyCap) {
    return { ok: false as const, error: "daily_cap_reached" as const };
  }

  const pending = await ctx.db
    .query("portal_ad_entry_sessions")
    .withIndex("by_uid_mode_status", (q) =>
      q.eq("uid", args.uid).eq("mode", mode).eq("status", "pending")
    )
    .collect();
  for (const row of pending) {
    await ctx.db.patch(row._id, { status: "cancelled", updatedAt: now });
  }

  const sessionId = randomHexId(16);
  await ctx.db.insert("portal_ad_entry_sessions", {
    sessionId,
    uid: args.uid,
    mode,
    channel: args.channel as PortalAdEntryChannel,
    status: "pending",
    createdAt: now,
    expiresAt: now + PORTAL_AD_ENTRY_SESSION_TTL_MS,
  });

  return {
    ok: true as const,
    sessionId,
    alreadyGranted: false as const,
    adEntryDailyRemaining: cfg.dailyCap - used,
  };
}

export async function completePortalAdEntrySessionCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    sessionId: string;
    clientProof?: string;
    now?: number;
  }
) {
  const now = args.now ?? Date.now();
  const session = await ctx.db
    .query("portal_ad_entry_sessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
    .unique();
  if (!session) return { ok: false as const, error: "session_not_found" as const };
  if (session.uid !== args.uid) return { ok: false as const, error: "forbidden" as const };
  if (session.status !== "pending") {
    return { ok: false as const, error: "session_not_pending" as const };
  }
  if (session.expiresAt < now) {
    await ctx.db.patch(session._id, { status: "expired", updatedAt: now });
    return { ok: false as const, error: "session_expired" as const };
  }

  const cfg = await resolveAdEntryConfig(ctx, args.uid, session.mode);
  if (!cfg.enabled) return { ok: false as const, error: "disabled" as const };
  const dayKey = dailyPeriodKey(now);
  const used = await readAdEntryUsedToday(ctx, args.uid, dayKey, session.mode);
  if (used >= cfg.dailyCap) {
    return { ok: false as const, error: "daily_cap_reached" as const };
  }

  await expireStaleReadyGrants(ctx, args.uid, session.mode, now);
  const existing = await findReadyAdEntryGrant(ctx, args.uid, session.mode, now);
  if (existing) {
    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      ...(args.clientProof ? { clientProof: args.clientProof } : {}),
    });
    return { ok: true as const, grantId: existing.grantId };
  }

  const grantId = randomHexId(16);
  await ctx.db.insert("portal_ad_entry_grants", {
    grantId,
    uid: args.uid,
    mode: session.mode,
    sessionId: session.sessionId,
    dayKey,
    status: "ready",
    createdAt: now,
    expiresAt: now + PORTAL_AD_ENTRY_GRANT_TTL_MS,
  });
  await ctx.db.patch(session._id, {
    status: "completed",
    completedAt: now,
    updatedAt: now,
    ...(args.clientProof ? { clientProof: args.clientProof } : {}),
  });
  return { ok: true as const, grantId };
}

/** Consume a ready ad-entry grant at join time and bump daily usage. */
export async function useAdEntryGrantForJoin(
  ctx: MutationCtx,
  args: { uid: string; mode: PortalAdEntryMode; now?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = args.now ?? Date.now();
  await expireStaleReadyGrants(ctx, args.uid, args.mode, now);
  const grant = await findReadyAdEntryGrant(ctx, args.uid, args.mode, now);
  if (!grant) return { ok: false, error: "ad_entry_grant_missing" };

  const cfg = await resolveAdEntryConfig(ctx, args.uid, args.mode);
  if (!cfg.enabled) return { ok: false, error: "disabled" };
  const dayKey = dailyPeriodKey(now);
  const used = await readAdEntryUsedToday(ctx, args.uid, dayKey, args.mode);
  if (used >= cfg.dailyCap) return { ok: false, error: "daily_cap_reached" };

  await ctx.db.patch(grant._id, { status: "consumed", consumedAt: now });
  const usage = await ctx.db
    .query("portal_ad_entry_daily_usage")
    .withIndex("by_uid_dayKey_mode", (q) =>
      q.eq("uid", args.uid).eq("dayKey", dayKey).eq("mode", args.mode)
    )
    .unique();
  if (usage) {
    await ctx.db.patch(usage._id, { usedCount: usage.usedCount + 1, updatedAt: now });
  } else {
    await ctx.db.insert("portal_ad_entry_daily_usage", {
      uid: args.uid,
      dayKey,
      mode: args.mode,
      usedCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { ok: true };
}

export const consumeAdEntryForJoin = internalMutation({
  args: { uid: v.string(), templateId: v.string() },
  handler: async (ctx, args) => {
    const def = getPortalTournamentDefinition(args.templateId);
    const mode =
      def?.matchType === "solo_p75"
        ? "solo"
        : def?.matchType === "multi_ranked"
          ? "multi"
          : null;
    if (!mode) return { ok: false as const, error: "invalid_mode" };
    return await useAdEntryGrantForJoin(ctx, { uid: args.uid, mode });
  },
});

