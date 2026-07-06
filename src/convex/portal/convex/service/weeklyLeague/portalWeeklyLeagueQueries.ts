import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { authedMutation, authedQuery } from "../../custom/session";
import { weeklyPeriodKey, weeklyWindowMsShanghai } from "../../utils/casualTaskPeriod";
import {
  ensurePortalWeeklyLeagueMember,
  findUnclaimedPortalWeeklyLeagueRewards,
  getPortalWeeklyLeagueTierViewForUid,
  listPortalWeeklyLeagueCohortBoard,
} from "./portalWeeklyLeagueService";

/** 本周首次登录 Portal（已鉴权）时入 cohort。 */
export const ensurePortalWeeklyLeagueMemberMutation = authedMutation({
  args: {
    gameType: v.string(),
  },
  handler: async (ctx, { gameType }) => {
    const memberId = await ensurePortalWeeklyLeagueMember(ctx, ctx.uid, gameType);
    return { ok: memberId != null, memberId };
  },
});

export const getPortalWeeklyLeagueTierView = authedQuery({
  args: {
    gameType: v.string(),
  },
  handler: async (ctx, { gameType }) => {
    return await getPortalWeeklyLeagueTierViewForUid(ctx, ctx.uid, gameType);
  },
});

export const getPortalWeeklyLeagueCohortLeaderboard = authedQuery({
  args: {
    gameType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, limit }) => {
    const now = Date.now();
    const n = Math.min(Math.max(limit ?? 50, 1), 100);
    const board = await listPortalWeeklyLeagueCohortBoard(ctx, ctx.uid, gameType, n, now);
    const window = weeklyWindowMsShanghai(now);
    if (!board) {
      return { weekEndsAt: window.endsAt, cohortNo: null, rows: [] as const };
    }
    return { weekEndsAt: window.endsAt, cohortNo: board.cohortNo, rows: board.rows };
  },
});

/** 运维/迁移：为已有分模式积分用户批量入组（通常由 ensureMember 在登录时触发）。 */
export const backfillPortalWeeklyLeagueMembersForGame = mutation({
  args: {
    gameType: v.string(),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, weekKey }) => {
    const key = weekKey ?? weeklyPeriodKey(Date.now());
    const rows = await ctx.db
      .query("portal_weekly_total_points")
      .withIndex("by_game_week_points", (q) => q.eq("gameType", gameType).eq("weekKey", key))
      .collect();
    let synced = 0;
    for (const row of rows) {
      await ensurePortalWeeklyLeagueMember(ctx, row.uid, gameType);
      synced += 1;
    }
    return { weekKey: key, synced };
  },
});

export const claimPortalWeeklyLeagueRewards = authedMutation({
  args: {
    gameType: v.string(),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, weekKey: weekKeyArg }) => {
    const uid = ctx.uid;
    let weekKey = weekKeyArg ?? weeklyPeriodKey(Date.now());
    let member = await ctx.db
      .query("portal_weekly_league_members")
      .withIndex("by_week_game_uid", (q) =>
        q.eq("weekKey", weekKey).eq("gameType", gameType).eq("uid", uid)
      )
      .unique();

    if ((!member?.pendingRewards || member.rewardsClaimedAt) && !weekKeyArg) {
      const unclaimed = await findUnclaimedPortalWeeklyLeagueRewards(ctx, uid, gameType);
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
    return { ok: true as const, granted: pr, weekKey };
  },
});

export const dismissPortalWeeklyLeagueClose = authedMutation({
  args: {
    gameType: v.string(),
    weekKey: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, weekKey: weekKeyArg }) => {
    const uid = ctx.uid;
    let member = weekKeyArg
      ? await ctx.db
          .query("portal_weekly_league_members")
          .withIndex("by_week_game_uid", (q) =>
            q.eq("weekKey", weekKeyArg).eq("gameType", gameType).eq("uid", uid)
          )
          .unique()
      : null;

    if (!member) {
      const unread = (
        await ctx.db
          .query("portal_weekly_league_members")
          .withIndex("by_uid_game", (q) => q.eq("uid", uid).eq("gameType", gameType))
          .collect()
      )
        .filter((m) => !m.isBot && m.unreadClose)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (unread) {
        member = unread;
      } else {
        const unclaimed = await findUnclaimedPortalWeeklyLeagueRewards(ctx, uid, gameType);
        if (unclaimed) {
          member = await ctx.db
            .query("portal_weekly_league_members")
            .withIndex("by_week_game_uid", (q) =>
              q.eq("weekKey", unclaimed.weekKey).eq("gameType", gameType).eq("uid", uid)
            )
            .unique();
        }
      }
    }

    if (!member) return { ok: false as const };
    await ctx.db.patch(member._id, { unreadClose: false, updatedAt: Date.now() });
    return { ok: true as const };
  },
});
