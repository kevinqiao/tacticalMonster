import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
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
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
} from "../../data/portalTournamentConfigs";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import {
  assertPortalDailyPlayLimit,
  countPortalPlaysForQuotaScope,
  portalDailyPlayModeFromDef,
} from "../tournament/join/portalDailyPlayLimit";
import { partnerIdFromUid } from "./partnerAdReplayConfig";
import {
  bumpAdEntryUsedToday,
  readAdEntryUsedToday,
} from "./portalEntryDailyUsage";
import type { PlayEntryContext } from "./portalEntryUsageScope";
import { resolveFreePlayDailyCap } from "./portalTicketEntryService";
import {
  quotaScopeFromSettings,
  resolvePlayEntrySettings,
} from "./resolvePlayEntrySettings";

export type AdEntryModeOffer = {
  enabled: boolean;
  remaining: number;
  cap: number;
  usedToday: number;
  hasReadyGrant: boolean;
};

export { readAdEntryUsedToday };

function randomHexId(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function resolveAdEntryConfig(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  mode: PortalAdEntryMode,
  entryCtx?: PlayEntryContext
) {
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(uid),
    lobbyId: entryCtx?.lobbyId,
    tournamentId: entryCtx?.tournamentId,
  });
  const enabled = resolveAdEntryEnabled(settings.adEntryEnabled, mode);
  const dailyCap = clampAdEntryDailyCap(
    mode === "solo" ? settings.adEntrySoloDailyCap : settings.adEntryMultiDailyCap,
    mode
  );
  return {
    enabled: enabled && dailyCap > 0,
    dailyCap,
    quotaScope: quotaScopeFromSettings(settings),
  };
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
  uid: string,
  entryCtx?: PlayEntryContext
): Promise<{ solo: AdEntryModeOffer; multi: AdEntryModeOffer }> {
  const now = Date.now();
  const key = dailyPeriodKey(now);
  const make = async (mode: PortalAdEntryMode): Promise<AdEntryModeOffer> => {
    const cfg = await resolveAdEntryConfig(ctx, uid, mode, entryCtx);
    const used = await readAdEntryUsedToday(
      ctx,
      uid,
      key,
      mode,
      entryCtx,
      cfg.quotaScope
    );
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
    lobbyId?: Id<"portal_lobbies"> | null;
    now?: number;
  }
) {
  const now = args.now ?? Date.now();
  if (!isPortalAdEntryChannel(args.channel)) {
    return { ok: false as const, error: "invalid_channel" as const };
  }
  const def = getPortalTournamentDefinition(args.templateId);
  if (!def) return { ok: false as const, error: "invalid_mode" as const };
  // Coin/gem tables are outside the free→ad→ticket ladder.
  if (!portalTournamentUsesPlayEntryLadder(def)) {
    return { ok: false as const, error: "disabled" as const };
  }
  const mode = portalDailyPlayModeFromDef(def);
  if (mode !== args.mode) {
    return { ok: false as const, error: "invalid_mode" as const };
  }

  const entryCtx: PlayEntryContext = {
    lobbyId: args.lobbyId ?? null,
    tournamentId: args.templateId,
  };
  const freeCap = await resolveFreePlayDailyCap(ctx, args.uid, mode, entryCtx);
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(args.uid),
    lobbyId: entryCtx.lobbyId,
    tournamentId: entryCtx.tournamentId,
  });
  const quotaScope = quotaScopeFromSettings(settings);
  const playsToday = await countPortalPlaysForQuotaScope(ctx, {
    uid: args.uid,
    mode,
    quotaScope,
    lobbyId: args.lobbyId,
    templateId: args.templateId,
    nowMs: now,
  });
  if (playsToday < freeCap) {
    return { ok: false as const, error: "free_quota_available" as const };
  }

  // Reject before the rewarded ad if even one pending ad entry cannot open a slot.
  const ladder = await assertPortalDailyPlayLimit(ctx, {
    uid: args.uid,
    templateId: args.templateId,
    lobbyId: args.lobbyId,
    nowMs: now,
    pendingAdEntries: 1,
  });
  if (!ladder.ok) {
    return { ok: false as const, error: "daily_play_limit_reached" as const };
  }

  const cfg = await resolveAdEntryConfig(ctx, args.uid, mode, entryCtx);
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
  const used = await readAdEntryUsedToday(
    ctx,
    args.uid,
    dayKey,
    mode,
    entryCtx,
    cfg.quotaScope
  );
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
  const used = await readAdEntryUsedToday(
    ctx,
    args.uid,
    dayKey,
    session.mode,
    null,
    cfg.quotaScope
  );
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
  args: {
    uid: string;
    mode: PortalAdEntryMode;
    templateId: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    now?: number;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = args.now ?? Date.now();
  const entryCtx: PlayEntryContext = {
    lobbyId: args.lobbyId ?? null,
    tournamentId: args.templateId,
  };
  await expireStaleReadyGrants(ctx, args.uid, args.mode, now);
  const grant = await findReadyAdEntryGrant(ctx, args.uid, args.mode, now);
  if (!grant) return { ok: false, error: "ad_entry_grant_missing" };

  const cfg = await resolveAdEntryConfig(ctx, args.uid, args.mode, entryCtx);
  if (!cfg.enabled) return { ok: false, error: "disabled" };
  const dayKey = dailyPeriodKey(now);
  const used = await readAdEntryUsedToday(
    ctx,
    args.uid,
    dayKey,
    args.mode,
    entryCtx,
    cfg.quotaScope
  );
  if (used >= cfg.dailyCap) return { ok: false, error: "daily_cap_reached" };

  await ctx.db.patch(grant._id, { status: "consumed", consumedAt: now });
  await bumpAdEntryUsedToday(ctx, {
    uid: args.uid,
    dayKey,
    mode: args.mode,
    now,
    entryCtx,
    quotaScope: cfg.quotaScope,
  });
  return { ok: true };
}

export const consumeAdEntryForJoin = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
  },
  handler: async (ctx, args) => {
    const def = getPortalTournamentDefinition(args.templateId);
    const mode =
      def?.matchType === "solo_p75"
        ? "solo"
        : def?.matchType === "multi_ranked"
          ? "multi"
          : null;
    if (!mode) return { ok: false as const, error: "invalid_mode" };
    return await useAdEntryGrantForJoin(ctx, {
      uid: args.uid,
      mode,
      templateId: args.templateId,
      lobbyId: args.lobbyId,
    });
  },
});
