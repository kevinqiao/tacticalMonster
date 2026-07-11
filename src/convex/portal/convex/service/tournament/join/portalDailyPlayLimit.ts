import { v } from "convex/values";

import type { QueryCtx } from "../../../_generated/server";
import { internalQuery } from "../../../_generated/server";
import { authedQuery } from "../../../custom/session";
import {
  getPortalDailyPlayLimits,
  type PortalDailyPlayLimits,
} from "../../../data/portalDailyPlayLimits";
import {
  getPortalTournamentDefinition,
  portalTournamentIdForMode,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import {
  CASUAL_TASK_OPS_TIME_ZONE,
  dailyWindowMsForOpsZone,
} from "../../../utils/casualTaskPeriod";

export type PortalDailyPlayMode = "solo" | "multi";

export type PortalModeDailyPlayQuota = {
  playsToday: number;
  maxPlaysPerDay: number;
  remainingPlaysToday: number;
};

export type PortalDailyPlayQuotaView = {
  solo: PortalModeDailyPlayQuota;
  multi: PortalModeDailyPlayQuota;
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
  const nowMs = args.nowMs ?? Date.now();
  const { startsAt, endsAt } = dailyWindowMsForOpsZone(nowMs, args.dayTimezone);

  const rows = await ctx.db
    .query("portal_run_player_tournaments")
    .withIndex("by_uid_template", (q) =>
      q.eq("uid", args.uid).eq("templateId", args.templateId)
    )
    .collect();

  let count = 0;
  for (const row of rows) {
    if (row.createdAt < startsAt || row.createdAt > endsAt) continue;
    const run = await ctx.db.get(row.tournamentId);
    // 仅排除明确的 campaign 桌；run 缺失仍计次（避免漏计导致限次失效）
    if (run?.campaignId) continue;
    count += 1;
  }
  return count;
}

export async function assertPortalDailyPlayLimit(
  ctx: QueryCtx,
  args: {
    uid: string;
    templateId: string;
    nowMs?: number;
    dayTimezone?: string;
    limits?: PortalDailyPlayLimits;
  }
): Promise<{ ok: true } | { ok: false; error: "daily_play_limit_reached" }> {
  const def = getPortalTournamentDefinition(args.templateId);
  if (!def) return { ok: true };
  const mode = portalDailyPlayModeFromDef(def);
  if (!mode) return { ok: true };

  const limits = args.limits ?? getPortalDailyPlayLimits();
  const maxPlaysPerDay = mode === "solo" ? limits.solo : limits.multi;
  if (!Number.isFinite(maxPlaysPerDay) || maxPlaysPerDay < 1) {
    return { ok: true };
  }

  const playsToday = await countPortalPlaysInOpsDay(ctx, {
    uid: args.uid,
    templateId: args.templateId,
    nowMs: args.nowMs,
    dayTimezone: args.dayTimezone,
  });
  if (playsToday >= maxPlaysPerDay) {
    return { ok: false, error: "daily_play_limit_reached" };
  }
  return { ok: true };
}

/** 开桌前校验（action 侧可 runQuery）。 */
export const assertPortalDailyPlayLimitQuery = internalQuery({
  args: {
    uid: v.string(),
    templateId: v.string(),
    dayTimezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await assertPortalDailyPlayLimit(ctx, args);
  },
});

async function quotaForMode(
  ctx: QueryCtx,
  args: {
    uid: string;
    gameType: string;
    mode: PortalDailyPlayMode;
    maxPlaysPerDay: number;
    nowMs: number;
    dayTimezone: string;
  }
): Promise<PortalModeDailyPlayQuota> {
  const templateId = portalTournamentIdForMode(args.gameType, args.mode);
  const playsToday = templateId
    ? await countPortalPlaysInOpsDay(ctx, {
        uid: args.uid,
        templateId,
        nowMs: args.nowMs,
        dayTimezone: args.dayTimezone,
      })
    : 0;
  return {
    playsToday,
    maxPlaysPerDay: args.maxPlaysPerDay,
    remainingPlaysToday: Math.max(0, args.maxPlaysPerDay - playsToday),
  };
}

/** 主页模式卡：单人 / 多人今日已挑战次数。 */
export const getPortalDailyPlayQuota = authedQuery({
  args: {
    gameType: v.string(),
  },
  handler: async (ctx, { gameType }): Promise<PortalDailyPlayQuotaView> => {
    const uid = ctx.uid;
    const nowMs = Date.now();
    const dayTimezone = CASUAL_TASK_OPS_TIME_ZONE;
    const window = dailyWindowMsForOpsZone(nowMs, dayTimezone);
    const limits = getPortalDailyPlayLimits();

    const [solo, multi] = await Promise.all([
      quotaForMode(ctx, {
        uid,
        gameType,
        mode: "solo",
        maxPlaysPerDay: limits.solo,
        nowMs,
        dayTimezone,
      }),
      quotaForMode(ctx, {
        uid,
        gameType,
        mode: "multi",
        maxPlaysPerDay: limits.multi,
        nowMs,
        dayTimezone,
      }),
    ]);

    return {
      solo,
      multi,
      dayResetsAt: window.endsAt + 1,
      dayInstanceKey: window.instanceKey,
      dayTimezone,
    };
  },
});
