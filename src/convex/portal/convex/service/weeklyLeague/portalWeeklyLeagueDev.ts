/**
 * Portal 周联赛开发/测试辅助（手动 convex run，勿接生产前端）。
 */
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { PORTAL_WEEKLY_LEAGUE_ENABLED } from "../../data/portalWeeklyLeagueConfig";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import {
  ensurePortalWeeklyLeagueMember,
  findUnclaimedPortalWeeklyLeagueRewards,
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

/**
 * 开发用：在已有 member 上写入待领奖励（本周 cohort 已 closed 时无法用 devSimulatePortalWeekCloseForUid）。
 */
export const devSeedUnclaimedWeeklyRewardsForUid = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    coins: v.optional(v.number()),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!PORTAL_WEEKLY_LEAGUE_ENABLED) {
      return { ok: false as const, error: "weekly_league_disabled" };
    }

    const now = Date.now();
    const coins = Math.max(1, Math.floor(args.coins ?? 200));
    let member = args.weekKey
      ? await ctx.db
          .query("portal_weekly_league_members")
          .withIndex("by_week_game_uid", (q) =>
            q.eq("weekKey", args.weekKey!).eq("gameType", args.gameType).eq("uid", args.uid)
          )
          .unique()
      : null;

    if (!member) {
      const weekKey = weeklyPeriodKey(now);
      member =
        (await ctx.db
          .query("portal_weekly_league_members")
          .withIndex("by_week_game_uid", (q) =>
            q.eq("weekKey", weekKey).eq("gameType", args.gameType).eq("uid", args.uid)
          )
          .unique()) ??
        null;
    }

    if (!member) {
      await ensurePortalWeeklyLeagueMember(ctx, args.uid, args.gameType, now);
      const weekKey = weeklyPeriodKey(now);
      member = await ctx.db
        .query("portal_weekly_league_members")
        .withIndex("by_week_game_uid", (q) =>
          q.eq("weekKey", weekKey).eq("gameType", args.gameType).eq("uid", args.uid)
        )
        .unique();
    }

    if (!member || member.isBot) {
      return { ok: false as const, error: "member_missing" };
    }

    await ctx.db.patch(member._id, {
      pendingRewards: { coins },
      rewardsClaimedAt: undefined,
      unreadClose: true,
      finalRank: member.finalRank ?? 1,
      outcome: member.outcome ?? "safe",
      updatedAt: now,
    });

    return {
      ok: true as const,
      weekKey: member.weekKey,
      pendingRewards: { coins },
      tierView: await getPortalWeeklyLeagueTierViewForUid(
        ctx,
        args.uid,
        args.gameType,
        now
      ),
    };
  },
});

/** 开发用：为指定 uid 领取周联赛 pendingRewards（绕过 authed claim）。 */
export const devClaimPortalWeeklyLeagueRewardsForUid = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { uid, gameType, weekKey: weekKeyArg }) => {
    let weekKey = weekKeyArg ?? weeklyPeriodKey(Date.now());
    let member = await ctx.db
      .query("portal_weekly_league_members")
      .withIndex("by_week_game_uid", (q) =>
        q.eq("weekKey", weekKey).eq("gameType", gameType).eq("uid", uid)
      )
      .unique();

    if ((!member?.pendingRewards || member.rewardsClaimedAt) && !weekKeyArg) {
      const unclaimed = await findUnclaimedPortalWeeklyLeagueRewards(ctx, uid, { gameType });
      if (unclaimed) {
        member = await ctx.db
          .query("portal_weekly_league_members")
          .withIndex("by_week_game_uid", (q) =>
            q.eq("weekKey", unclaimed.weekKey).eq("gameType", gameType).eq("uid", uid)
          )
          .unique();
        weekKey = unclaimed.weekKey;
      }
    }

    if (!member?.pendingRewards || member.rewardsClaimedAt) {
      return { ok: false as const, error: "nothing_to_claim" as const };
    }

    const pr = member.pendingRewards;
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      const gr = await ctx.runMutation(
        internal.service.reward.casualRewardRegistry.grantCasualReward,
        {
          uid,
          kind: "coins",
          amount: pr.coins!,
          reason: "weekly_league",
          gameType,
          sourceWeekKey: weekKey,
        }
      );
      if (!gr.ok) {
        return { ok: false as const, error: "grant_failed" as const };
      }
    }

    await ctx.db.patch(member._id, {
      rewardsClaimedAt: now,
      unreadClose: false,
      updatedAt: now,
    });

    const wallet = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    return {
      ok: true as const,
      granted: pr,
      weekKey,
      coinsAfter: wallet?.coins ?? 0,
    };
  },
});

/** 开发用：准备联赛+礼品卡 E2E 测试账号（老账号、已验证、已选地区）。 */
export const devSetupLeagueGiftCardPlayer = mutation({
  args: {
    uid: v.optional(v.string()),
    gameType: v.optional(v.string()),
    verifiedEmail: v.optional(v.string()),
    redemptionRegion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const uid = args.uid ?? `e2e_league_gc_${now}`;
    const gameType = args.gameType ?? "solitaire";
    const email = args.verifiedEmail ?? `${uid}@e2e.test`;
    const region = (args.redemptionRegion ?? "US").toUpperCase();

    const existing = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        createdAt: existing.createdAt ?? now - 10 * MS_PER_DAY,
        verifiedEmail: email,
        redemptionRegion: region,
        redemptionRegionLockedAt: existing.redemptionRegionLockedAt ?? now - MS_PER_DAY,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("portal_players", {
        uid,
        coins: 0,
        createdAt: now - 10 * MS_PER_DAY,
        updatedAt: now,
        verifiedEmail: email,
        redemptionRegion: region,
        redemptionRegionLockedAt: now - MS_PER_DAY,
      });
    }

    await ensurePortalWeeklyLeagueMember(ctx, uid, gameType, now);

    return { ok: true as const, uid, gameType, verifiedEmail: email, redemptionRegion: region };
  },
});
