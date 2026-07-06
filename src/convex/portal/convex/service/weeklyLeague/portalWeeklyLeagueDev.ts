/**
 * Portal 周联赛开发/测试辅助（手动 convex run，勿接生产前端）。
 */
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { PORTAL_WEEKLY_LEAGUE_ENABLED } from "../../data/portalWeeklyLeagueConfig";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import {
  ensurePortalWeeklyLeagueMember,
  getPortalWeeklyLeagueTierViewForUid,
} from "./portalWeeklyLeagueService";

const MS_PER_DAY = 24 * 3600 * 1000;

/** 快进当前周并执行周尾结算（验证升降级与 pendingRewards）。 */
export const devSimulatePortalWeekCloseForUid = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    weeklyPoints: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!PORTAL_WEEKLY_LEAGUE_ENABLED) {
      return { ok: false as const, error: "weekly_league_disabled" };
    }

    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    let member = await ctx.db
      .query("portal_weekly_league_members")
      .withIndex("by_week_game_uid", (q) =>
        q.eq("weekKey", weekKey).eq("gameType", args.gameType).eq("uid", args.uid)
      )
      .unique();

    if (!member) {
      await ensurePortalWeeklyLeagueMember(ctx, args.uid, args.gameType, now);
      member = await ctx.db
        .query("portal_weekly_league_members")
        .withIndex("by_week_game_uid", (q) =>
          q.eq("weekKey", weekKey).eq("gameType", args.gameType).eq("uid", args.uid)
        )
        .unique();
    }
    if (!member) {
      return { ok: false as const, error: "member_missing" };
    }

    const cohort = await ctx.db.get(member.cohortId);
    if (!cohort) {
      return { ok: false as const, error: "cohort_missing" };
    }
    if (cohort.status === "closed") {
      return {
        ok: false as const,
        error: "cohort_already_closed",
        tierView: await getPortalWeeklyLeagueTierViewForUid(
          ctx,
          args.uid,
          args.gameType,
          now
        ),
      };
    }

    const targetPoints = Math.max(0, args.weeklyPoints ?? member.weeklyPoints);
    await ctx.db.patch(member._id, {
      weeklyPoints: targetPoints,
      updatedAt: now,
    });

    const weekSpan = Math.max(MS_PER_DAY, cohort.endsAt - cohort.startsAt);
    await ctx.db.patch(cohort._id, {
      startsAt: now - weekSpan,
      endsAt: now - 60_000,
      updatedAt: now,
    });

    const closeResult = await ctx.runMutation(
      internal.service.weeklyLeague.portalWeeklyLeagueClose.closeExpiredPortalWeeklyLeagueWeeks,
      {}
    );

    const closedMember = await ctx.db.get(member._id);
    const profile = await ctx.db
      .query("portal_weekly_league_profile")
      .withIndex("by_uid_game", (q) =>
        q.eq("uid", args.uid).eq("gameType", args.gameType)
      )
      .unique();

    return {
      ok: true as const,
      weekKey,
      closedCohorts: closeResult.closedCohorts,
      finalRank: closedMember?.finalRank,
      outcome: closedMember?.outcome,
      pendingRewards: closedMember?.pendingRewards,
      unreadClose: closedMember?.unreadClose,
      weeklyLeagueTier: profile?.weeklyLeagueTier,
      peakLeagueTier: profile?.peakLeagueTier,
      tierView: await getPortalWeeklyLeagueTierViewForUid(
        ctx,
        args.uid,
        args.gameType,
        now
      ),
    };
  },
});
