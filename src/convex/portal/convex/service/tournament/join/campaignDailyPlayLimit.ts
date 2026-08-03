import { v } from "convex/values";

import { query } from "../../../_generated/server";
import { authedQuery } from "../../../custom/session";

import type { QueryCtx } from "../../../_generated/server";

import {

  CASUAL_TASK_OPS_TIME_ZONE,

  dailyWindowMsForOpsZone,

  normalizeOpsTimeZone,

} from "../../../utils/casualTaskPeriod";



/** 统计运营日内该 uid 在 campaign 下已开桌次数（portal_run_tournaments SSOT）。 */

export async function countCampaignPlaysInOpsDay(

  ctx: QueryCtx,

  args: {

    uid: string;

    campaignId: string;

    nowMs?: number;

    dayTimezone?: string;

  }

): Promise<number> {

  const nowMs = args.nowMs ?? Date.now();

  const { startsAt, endsAt } = dailyWindowMsForOpsZone(nowMs, args.dayTimezone);



  const runs = await ctx.db

    .query("portal_run_tournaments")

    .withIndex("by_campaignId_createdAt", (q) =>

      q.eq("campaignId", args.campaignId).gte("createdAt", startsAt)

    )

    .collect();



  let count = 0;

  for (const run of runs) {

    if (run.createdAt > endsAt) continue;

    const pt = await ctx.db

      .query("portal_run_player_tournaments")

      .withIndex("by_tournament_uid", (q) =>

        q.eq("tournamentId", run._id).eq("uid", args.uid)

      )

      .unique();

    if (pt) count += 1;

  }

  return count;

}



export async function assertCampaignDailyPlayLimit(

  ctx: QueryCtx,

  args: {

    uid: string;

    campaignId: string;

    maxPlaysPerDay: number;

    nowMs?: number;

    dayTimezone?: string;

  }

): Promise<{ ok: true } | { ok: false; error: "daily_play_limit_reached" }> {

  if (!Number.isFinite(args.maxPlaysPerDay) || args.maxPlaysPerDay < 1) {

    return { ok: true };

  }

  const count = await countCampaignPlaysInOpsDay(ctx, args);

  if (count >= args.maxPlaysPerDay) {

    return { ok: false, error: "daily_play_limit_reached" };

  }

  return { ok: true };

}



export const getCampaignDailyPlayQuota = authedQuery({

  args: {

    campaignId: v.string(),

    maxPlaysPerDay: v.optional(v.number()),

    dayTimezone: v.optional(v.string()),

  },

  handler: async (ctx, { campaignId, maxPlaysPerDay, dayTimezone }) => {
    const uid = ctx.uid;

    const nowMs = Date.now();

    const tz = normalizeOpsTimeZone(dayTimezone);

    const window = dailyWindowMsForOpsZone(nowMs, tz);

    const playsToday = await countCampaignPlaysInOpsDay(ctx, {

      uid,

      campaignId,

      nowMs,

      dayTimezone: tz,

    });

    const hasDailyCap =

      maxPlaysPerDay != null && Number.isFinite(maxPlaysPerDay) && maxPlaysPerDay >= 1;

    return {

      playsToday,

      remainingPlaysToday: hasDailyCap

        ? Math.max(0, maxPlaysPerDay! - playsToday)

        : undefined,

      dayResetsAt: window.endsAt + 1,

      dayInstanceKey: window.instanceKey,

      dayTimezone: tz,

    };

  },

});



export { CASUAL_TASK_OPS_TIME_ZONE as DEFAULT_CAMPAIGN_DAY_TIMEZONE };


