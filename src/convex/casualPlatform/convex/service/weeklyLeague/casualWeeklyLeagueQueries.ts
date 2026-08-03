/**
 * 周联赛对外 query / mutation。
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { authedMutation, authedQuery } from "../../custom/session";
import { listCohortMembers } from "./casualWeeklyLeagueCohort";
import {
  ensureWeeklyLeagueMember,
  getWeeklyLeagueSnapshotForUid,
} from "./casualWeeklyLeagueService";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";

export const getWeeklyLeagueSnapshot = authedQuery({
  args: {},
  handler: async (ctx) => {
    return await getWeeklyLeagueSnapshotForUid(ctx, ctx.uid);
  },
});

export const listWeeklyLeagueCohort = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
    const now = Date.now();
    const weekKey = weeklyPeriodKey(now);
    const member = await ctx.db
      .query("casual_weekly_league_members")
      .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
      .unique();
    if (!member) {
      return {
        members: [] as Array<{
          uid: string;
          weeklyLeagueXp: number;
          rank: number;
          isBot?: boolean;
          rowState: "active" | "matching";
        }>,
        matching: { total: 0, bots: 0, humans: 0 },
      };
    }
    const { activeMembers, matching } = await listCohortMembers(
      ctx,
      member.cohortId,
      now,
      { activeOnly: true }
    );
    return {
      members: activeMembers.map((r, i) => ({
        uid: r.uid,
        weeklyLeagueXp: r.weeklyLeagueXp,
        rank: i + 1,
        isBot: r.isBot,
        rowState: r.rowState,
      })),
      matching,
    };
  },
});

export const claimWeeklyLeagueRewards = authedMutation({
  args: { weekKey: v.optional(v.string()) },
  handler: async (ctx, { weekKey: weekKeyArg }) => {
    const uid = ctx.uid;
    const weekKey = weekKeyArg ?? weeklyPeriodKey(Date.now());
    const member = await ctx.db
      .query("casual_weekly_league_members")
      .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
      .unique();
    if (!member?.pendingRewards || member.rewardsClaimedAt) {
      return { ok: false as const, error: "nothing_to_claim" };
    }
    const pr = member.pendingRewards;
    const now = Date.now();
    if ((pr.coins ?? 0) > 0) {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: pr.coins!,
      });
    }
    if ((pr.gems ?? 0) > 0) {
      await ctx.runMutation(internal.service.reward.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: pr.gems!,
      });
    }
    if ((pr.seasonVoucher ?? 0) > 0) {
      await ctx.runMutation(internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta, {
        uid,
        deltaVouchers: pr.seasonVoucher!,
      });
    }
    await ctx.db.patch(member._id, {
      rewardsClaimedAt: now,
      unreadClose: false,
      updatedAt: now,
    });
    return { ok: true as const, granted: pr };
  },
});

export const dismissWeeklyLeagueClose = authedMutation({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
    const weekKey = weeklyPeriodKey(Date.now());
    const member = await ctx.db
      .query("casual_weekly_league_members")
      .withIndex("by_week_uid", (q) => q.eq("weekKey", weekKey).eq("uid", uid))
      .unique();
    if (!member) return { ok: false as const };
    await ctx.db.patch(member._id, { unreadClose: false, updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const ensureWeeklyLeagueMemberMutation = authedMutation({
  args: {},
  handler: async (ctx) => {
    const id = await ensureWeeklyLeagueMember(ctx, ctx.uid);
    return { ok: Boolean(id) };
  },
});
