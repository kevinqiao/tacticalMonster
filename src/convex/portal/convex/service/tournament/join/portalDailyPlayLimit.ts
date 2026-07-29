import { v } from "convex/values";

import type { Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { internalQuery } from "../../../_generated/server";
import { authedQuery } from "../../../custom/session";
import { clampAdEntryDailyCap } from "../../../data/portalAdEntryConfig";
import {
  getPortalDailyPlayLimits,
  type PortalDailyPlayLimits,
} from "../../../data/portalDailyPlayLimits";
import type { PortalQuotaScope } from "../../../data/portalQuotaScope";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import {
  CASUAL_TASK_OPS_TIME_ZONE,
  dailyPeriodKey,
  dailyWindowMsForOpsZone,
} from "../../../utils/casualTaskPeriod";
import { partnerIdFromUid } from "../../ads/partnerAdReplayConfig";
import {
  readAdEntryUsedToday,
  readTicketEntryUsedToday,
} from "../../ads/portalEntryDailyUsage";
import { type PlayEntryContext } from "../../ads/portalEntryUsageScope";
import { resolveFreePlayDailyCap } from "../../ads/portalTicketEntryService";
import {
  quotaScopeFromSettings,
  resolvePlayEntrySettings,
  ticketConfigFromSettings,
} from "../../ads/resolvePlayEntrySettings";

/** How this join pays the free→ad→ticket ladder. */
export type PortalPlayEntryLane = "free" | "ad" | "ticket";

export type PortalDailyPlayMode = "solo" | "multi";

export type PortalModeDailyPlayQuota = {
  /** 今日已开桌次数（免费 + 广告入场 + 门票入场，不含 campaign） */
  playsToday: number;
  /** 免费档每日上限（入场阶梯用；广告/门票另计 remaining） */
  maxPlaysPerDay: number;
  remainingPlaysToday: number;
};

export type PortalDailyPlayQuotaView = {
  solo: PortalModeDailyPlayQuota;
  multi: PortalModeDailyPlayQuota;
  /** Effective sharing rule for this lobby/partner. */
  quotaScope: PortalQuotaScope;
  dayResetsAt: number;
  dayInstanceKey: string;
  dayTimezone: string;
};

export function portalDailyPlayModeFromDef(
  def: Pick<PortalTournamentDefinition, "matchType">
): PortalDailyPlayMode | null {
  if (def.matchType === "solo_p75") return "solo";
  if (def.matchType === "multi_ranked") return "multi";
  return null;
}

/** 统计运营日内该 uid 在指定 portal 模板下已开桌次数（排除 campaign 桌）。 */
export async function countPortalPlaysInOpsDay(
  ctx: QueryCtx,
  args: {
    uid: string;
    templateId: string;
    nowMs?: number;
    dayTimezone?: string;
  }
): Promise<number> {
  return await countPortalPlaysForQuotaScope(ctx, {
    uid: args.uid,
    mode: "solo",
    quotaScope: "tournament",
    templateId: args.templateId,
    nowMs: args.nowMs,
    dayTimezone: args.dayTimezone,
  });
}

/**
 * Count plays for the configured quota scope.
 * - mode: matchType pool (optionally filtered to lobbyId)
 * - lobby: all non-campaign plays in lobbyId (any mode)
 * - tournament: templateId only
 */
export async function countPortalPlaysForQuotaScope(
  ctx: QueryCtx,
  args: {
    uid: string;
    mode: PortalDailyPlayMode;
    quotaScope: PortalQuotaScope;
    lobbyId?: Id<"portal_lobbies"> | null;
    templateId?: string | null;
    nowMs?: number;
    dayTimezone?: string;
  }
): Promise<number> {
  const nowMs = args.nowMs ?? Date.now();
  const { startsAt, endsAt } = dailyWindowMsForOpsZone(nowMs, args.dayTimezone);
  const matchType = args.mode === "solo" ? "solo_p75" : "multi_ranked";
  const lobbyId = args.lobbyId ?? null;
  const templateId = args.templateId?.trim() || null;

  if (args.quotaScope === "tournament") {
    if (!templateId) return 0;
    const scopeDef = getPortalTournamentDefinition(templateId);
    // Paid coin/gem tables are outside the free/ad/ticket ladder entirely.
    if (scopeDef && !portalTournamentUsesPlayEntryLadder(scopeDef)) return 0;
    const rows = await ctx.db
      .query("portal_run_player_tournaments")
      .withIndex("by_uid_template", (q) =>
        q.eq("uid", args.uid).eq("templateId", templateId)
      )
      .collect();
    let count = 0;
    for (const row of rows) {
      if (row.createdAt < startsAt || row.createdAt > endsAt) continue;
      const run = await ctx.db.get(row.tournamentId);
      if (run?.campaignId) continue;
      if (lobbyId && run?.lobbyId && run.lobbyId !== lobbyId) continue;
      count += 1;
    }
    return count;
  }

  const rows = await ctx.db
    .query("portal_run_player_tournaments")
    .withIndex("by_uid_template", (q) => q.eq("uid", args.uid))
    .collect();

  let count = 0;
  for (const row of rows) {
    if (row.createdAt < startsAt || row.createdAt > endsAt) continue;
    const def = getPortalTournamentDefinition(row.templateId);
    if (!def || !portalTournamentUsesPlayEntryLadder(def)) continue;
    if (args.quotaScope === "mode" && def.matchType !== matchType) continue;
    // lobby scope: all modes
    const run = await ctx.db.get(row.tournamentId);
    if (run?.campaignId) continue;
    if (lobbyId) {
      if (run?.lobbyId !== lobbyId) continue;
    }
    count += 1;
  }
  return count;
}

/** @deprecated Prefer countPortalPlaysForQuotaScope with quotaScope "mode". */
export async function countPortalModePlaysInOpsDay(
  ctx: QueryCtx,
  args: {
    uid: string;
    mode: PortalDailyPlayMode;
    lobbyId?: Id<"portal_lobbies"> | null;
    nowMs?: number;
    dayTimezone?: string;
  }
): Promise<number> {
  return await countPortalPlaysForQuotaScope(ctx, {
    uid: args.uid,
    mode: args.mode,
    quotaScope: "mode",
    lobbyId: args.lobbyId,
    nowMs: args.nowMs,
    dayTimezone: args.dayTimezone,
  });
}

export async function resolveEntryQuotaContext(
  ctx: QueryCtx,
  args: {
    uid: string;
    templateId: string;
    lobbyId?: Id<"portal_lobbies"> | null;
  }
): Promise<{
  mode: PortalDailyPlayMode | null;
  quotaScope: PortalQuotaScope;
  entryCtx: PlayEntryContext;
}> {
  const def = getPortalTournamentDefinition(args.templateId);
  const mode = def ? portalDailyPlayModeFromDef(def) : null;
  const entryCtx: PlayEntryContext = {
    lobbyId: args.lobbyId ?? null,
    tournamentId: args.templateId,
  };
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(args.uid),
    lobbyId: entryCtx.lobbyId,
    tournamentId: entryCtx.tournamentId,
  });
  return {
    mode,
    quotaScope: quotaScopeFromSettings(settings),
    entryCtx,
  };
}

export async function assertPortalDailyPlayLimit(
  ctx: QueryCtx,
  args: {
    uid: string;
    templateId: string;
    lobbyId?: Id<"portal_lobbies"> | null;
    nowMs?: number;
    dayTimezone?: string;
    limits?: PortalDailyPlayLimits;
    /**
     * Ad/ticket entries that will be consumed for this join but are not bumped
     * yet (begin-ad / pre-consume checks). After consume, prefer entryLane.
     */
    pendingAdEntries?: number;
    pendingTicketEntries?: number;
    /**
     * Join payment lane. After ad/ticket consume (usage already bumped, play row
     * not inserted yet), pass "ad"/"ticket" so open-table rechecks use the hard
     * ladder ceiling instead of treating the join as free.
     */
    entryLane?: PortalPlayEntryLane;
  }
): Promise<{ ok: true } | { ok: false; error: "daily_play_limit_reached" }> {
  const def = getPortalTournamentDefinition(args.templateId);
  if (!def) return { ok: true };
  // Coin / gem entry: charge wallet only; ignore free/ad/ticket daily ceiling.
  if (!portalTournamentUsesPlayEntryLadder(def)) return { ok: true };
  const mode = portalDailyPlayModeFromDef(def);
  if (!mode) return { ok: true };

  const entryCtx: PlayEntryContext = {
    lobbyId: args.lobbyId ?? null,
    tournamentId: args.templateId,
  };
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(args.uid),
    lobbyId: entryCtx.lobbyId,
    tournamentId: entryCtx.tournamentId,
  });
  const quotaScope = quotaScopeFromSettings(settings);

  const limits = args.limits ?? getPortalDailyPlayLimits();
  const freeCap = args.limits
    ? (mode === "solo" ? limits.solo : limits.multi)
    : await resolveFreePlayDailyCap(ctx, args.uid, mode, entryCtx);
  const adCap = clampAdEntryDailyCap(
    mode === "solo" ? settings.adEntrySoloDailyCap : settings.adEntryMultiDailyCap,
    mode
  );
  const ticketCap = ticketConfigFromSettings(settings, mode).dailyCap;
  const dayKey = dailyPeriodKey(args.nowMs ?? Date.now());
  const [adUsed, ticketUsed] = await Promise.all([
    readAdEntryUsedToday(ctx, args.uid, dayKey, mode, entryCtx, quotaScope),
    readTicketEntryUsedToday(ctx, args.uid, dayKey, mode, entryCtx, quotaScope),
  ]);
  const pendingAd = Math.max(0, Math.floor(args.pendingAdEntries ?? 0));
  const pendingTicket = Math.max(0, Math.floor(args.pendingTicketEntries ?? 0));
  const entryLane: PortalPlayEntryLane =
    args.entryLane ??
    (pendingAd > 0 ? "ad" : pendingTicket > 0 ? "ticket" : "free");

  const playsToday = await countPortalPlaysForQuotaScope(ctx, {
    uid: args.uid,
    mode,
    quotaScope,
    lobbyId: args.lobbyId,
    templateId: args.templateId,
    nowMs: args.nowMs,
    dayTimezone: args.dayTimezone,
  });

  // Absolute ladder ceiling (free + ad + ticket caps).
  const hardMax = freeCap + adCap + ticketCap;
  if (playsToday >= hardMax) {
    return { ok: false, error: "daily_play_limit_reached" };
  }

  if (entryLane === "free") {
    // Strict free lane: do not let prior ad/ticket usage unlock extra free joins.
    if (playsToday >= freeCap) {
      return { ok: false, error: "daily_play_limit_reached" };
    }
    return { ok: true };
  }

  // Ad/ticket lane (begin before consume, or open-table after consume).
  if (entryLane === "ad") {
    if (adUsed + pendingAd > adCap) {
      return { ok: false, error: "daily_play_limit_reached" };
    }
    return { ok: true };
  }

  if (ticketUsed + pendingTicket > ticketCap) {
    return { ok: false, error: "daily_play_limit_reached" };
  }
  return { ok: true };
}

/** 开桌前校验（action 侧可 runQuery）。 */
export const assertPortalDailyPlayLimitQuery = internalQuery({
  args: {
    uid: v.string(),
    templateId: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    dayTimezone: v.optional(v.string()),
    pendingAdEntries: v.optional(v.number()),
    pendingTicketEntries: v.optional(v.number()),
    entryLane: v.optional(
      v.union(v.literal("free"), v.literal("ad"), v.literal("ticket"))
    ),
  },
  handler: async (ctx, args) => {
    return await assertPortalDailyPlayLimit(ctx, args);
  },
});

async function quotaForMode(
  ctx: QueryCtx,
  args: {
    uid: string;
    mode: PortalDailyPlayMode;
    quotaScope: PortalQuotaScope;
    lobbyId?: Id<"portal_lobbies"> | null;
    templateId?: string | null;
    maxPlaysPerDay: number;
    nowMs: number;
    dayTimezone: string;
  }
): Promise<PortalModeDailyPlayQuota> {
  const playsToday = await countPortalPlaysForQuotaScope(ctx, {
    uid: args.uid,
    mode: args.mode,
    quotaScope: args.quotaScope,
    lobbyId: args.lobbyId,
    templateId: args.templateId,
    nowMs: args.nowMs,
    dayTimezone: args.dayTimezone,
  });
  return {
    playsToday,
    maxPlaysPerDay: args.maxPlaysPerDay,
    remainingPlaysToday: Math.max(0, args.maxPlaysPerDay - playsToday),
  };
}

/**
 * 主页模式卡：单人 / 多人今日已挑战次数。
 * `quotaScope` 决定跨 tournament / mode 如何共享。
 */
export const getPortalDailyPlayQuota = authedQuery({
  args: {
    gameType: v.string(),
    lobbyId: v.optional(v.id("portal_lobbies")),
    /** When quotaScope=tournament, pass to get that template's solo/multi view. */
    tournamentId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PortalDailyPlayQuotaView> => {
    const uid = ctx.uid;
    const nowMs = Date.now();
    const dayTimezone = CASUAL_TASK_OPS_TIME_ZONE;
    const window = dailyWindowMsForOpsZone(nowMs, dayTimezone);
    const entryCtx: PlayEntryContext = {
      lobbyId: args.lobbyId ?? null,
      tournamentId: args.tournamentId ?? null,
    };
    const { settings } = await resolvePlayEntrySettings(ctx, {
      partnerId: partnerIdFromUid(uid),
      lobbyId: entryCtx.lobbyId,
      tournamentId: entryCtx.tournamentId,
    });
    const quotaScope = quotaScopeFromSettings(settings);
    const [soloCap, multiCap] = await Promise.all([
      resolveFreePlayDailyCap(ctx, uid, "solo", entryCtx),
      resolveFreePlayDailyCap(ctx, uid, "multi", entryCtx),
    ]);
    const [solo, multi] = await Promise.all([
      quotaForMode(ctx, {
        uid,
        mode: "solo",
        quotaScope,
        lobbyId: args.lobbyId,
        templateId: args.tournamentId,
        maxPlaysPerDay: soloCap,
        nowMs,
        dayTimezone,
      }),
      quotaForMode(ctx, {
        uid,
        mode: "multi",
        quotaScope,
        lobbyId: args.lobbyId,
        templateId: args.tournamentId,
        maxPlaysPerDay: multiCap,
        nowMs,
        dayTimezone,
      }),
    ]);

    return {
      solo,
      multi,
      quotaScope,
      dayResetsAt: window.endsAt + 1,
      dayInstanceKey: window.instanceKey,
      dayTimezone,
    };
  },
});

/** Per-tournament free quota (for quotaScope=tournament picker tickets). */
export const getPortalTournamentDailyPlayQuotas = authedQuery({
  args: {
    lobbyId: v.optional(v.id("portal_lobbies")),
    tournamentIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const uid = ctx.uid;
    const nowMs = Date.now();
    const dayTimezone = CASUAL_TASK_OPS_TIME_ZONE;
    const ids = [...new Set(args.tournamentIds.map((t) => t.trim()).filter(Boolean))].slice(
      0,
      24
    );
    const out: Record<
      string,
      { mode: PortalDailyPlayMode; playsToday: number; maxPlaysPerDay: number }
    > = {};
    for (const tournamentId of ids) {
      const def = getPortalTournamentDefinition(tournamentId);
      const mode = def ? portalDailyPlayModeFromDef(def) : null;
      if (!mode) continue;
      const entryCtx: PlayEntryContext = {
        lobbyId: args.lobbyId ?? null,
        tournamentId,
      };
      const { settings } = await resolvePlayEntrySettings(ctx, {
        partnerId: partnerIdFromUid(uid),
        lobbyId: entryCtx.lobbyId,
        tournamentId,
      });
      const quotaScope = quotaScopeFromSettings(settings);
      const maxPlaysPerDay = await resolveFreePlayDailyCap(
        ctx,
        uid,
        mode,
        entryCtx
      );
      const playsToday = await countPortalPlaysForQuotaScope(ctx, {
        uid,
        mode,
        quotaScope,
        lobbyId: args.lobbyId,
        templateId: tournamentId,
        nowMs,
        dayTimezone,
      });
      out[tournamentId] = { mode, playsToday, maxPlaysPerDay };
    }
    return out;
  },
});
