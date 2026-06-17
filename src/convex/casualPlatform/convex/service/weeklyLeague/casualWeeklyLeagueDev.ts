/**
 * 周联赛开发/测试辅助（仅 dev 部署手动调用，勿接前端）。
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { CASUAL_WEEKLY_LEAGUE_ENABLED } from "../../data/casualWeeklyLeagueConfig";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import { ensureWeeklyLeagueMember, getWeeklyLeagueSnapshotForUid } from "./casualWeeklyLeagueService";

const MS_PER_DAY = 24 * 3600 * 1000;

/**
 * 快进当前周：抬高真人 XP、拉满 bot 曲线、将 cohort 标为已过期并执行周尾结算。
 * 用于在不等到周日的情况下验证晋级/降级/周奖/周尾弹窗。
 */
export const devSimulateWeekCloseForUid = mutation({
  args: {
    uid: v.string(),
    /** 测试真人本周 XP；默认 500，通常可进晋级区 */
    weeklyLeagueXp: v.optional(v.number()),
    /** bot 周进度 0–1；默认 0.92 */
    botWeekProgress: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!CASUAL_WEEKLY_LEAGUE_ENABLED) {
      return { ok: false as const, error: "weekly_league_disabled" };
    }

    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    let member = await ctx.db
      .query("casual_weekly_league_members")
      .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", args.uid))
      .unique();

    if (!member) {
      await ensureWeeklyLeagueMember(ctx, args.uid, now);
      member = await ctx.db
        .query("casual_weekly_league_members")
        .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", args.uid))
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
        snapshot: await getWeeklyLeagueSnapshotForUid(ctx, args.uid, now),
      };
    }

    const targetXp = Math.max(0, args.weeklyLeagueXp ?? 500);
    const progress = Math.max(0, Math.min(1, args.botWeekProgress ?? 0.92));

    await ctx.db.patch(member._id, {
      weeklyLeagueXp: targetXp,
      updatedAt: now,
    });

    const weekSpan = Math.max(MS_PER_DAY, cohort.endsAt - cohort.startsAt);
    const simulatedStartsAt = now - weekSpan * progress;
    const simulatedEndsAt = now - 60_000;

    await ctx.db.patch(cohort._id, {
      startsAt: simulatedStartsAt,
      endsAt: simulatedEndsAt,
      updatedAt: now,
    });

    const closeResult = await ctx.runMutation(
      internal.service.weeklyLeague.casualWeeklyLeagueClose.closeExpiredWeeks,
      {}
    );

    const closedMember = await ctx.db.get(member._id);
    const profile = await ctx.db
      .query("casual_weekly_league_profile")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
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
      snapshot: await getWeeklyLeagueSnapshotForUid(ctx, args.uid, now),
    };
  },
});

/**
 * 将本周 member 归档到假 weekKey，便于在同一日历周内立刻测「新一周入组」。
 * 应先调用 `devSimulateWeekCloseForUid` 完成周尾。
 */
export const devArchiveCurrentWeekMemberForUid = mutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const weekKey = weeklyPeriodKey(Date.now());
    const member = await ctx.db
      .query("casual_weekly_league_members")
      .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
      .unique();
    if (!member) {
      return { ok: false as const, error: "no_current_week_member" };
    }
    const archiveKey = `w:dev-archived-${Date.now()}`;
    await ctx.db.patch(member._id, {
      weekKey: archiveKey,
      unreadClose: false,
      updatedAt: Date.now(),
    });
    return { ok: true as const, archivedWeekKey: archiveKey };
  },
});

/**
 * 归档本周 member 后，强制进入「新一周」cohort（段位沿用 profile）。
 */
export const devStartNextWeeklyLeagueWeekForUid = mutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    const member = await ctx.db
      .query("casual_weekly_league_members")
      .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
      .unique();
    if (member) {
      await ctx.db.patch(member._id, {
        weekKey: `w:dev-archived-${now}`,
        unreadClose: false,
        updatedAt: now,
      });
    }

    const memberId = await ensureWeeklyLeagueMember(ctx, uid, now);
    const fresh = memberId ? await ctx.db.get(memberId) : null;
    return {
      ok: Boolean(memberId),
      weekKey: weeklyPeriodKey(now),
      cohortId: fresh?.cohortId,
      leagueTierId: fresh?.leagueTierId,
      snapshot: await getWeeklyLeagueSnapshotForUid(ctx, uid, now),
    };
  },
});
