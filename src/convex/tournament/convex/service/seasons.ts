import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

import { distributeSeasonRewards } from "./tournament/ruleEngine";
import { getTorontoDate } from "./utils";
export const hi = query({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return args.text;
  },
});
export const createSeason = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const now = getTorontoDate();
    // 禁用当前活跃赛季
    const activeSeason = await ctx.db
      .query("seasons")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (activeSeason) {
      await ctx.db.patch(activeSeason._id, { isActive: false, updatedAt: now.iso });
    }

    // 创建新赛季
    const seasonId = await ctx.db.insert("seasons", {
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true,
      createdAt: now.iso,
      updatedAt: now.iso,
    });

    // 初始化玩家积分
    const players = await ctx.db.query("players").collect();
    for (const player of players) {
      const userPref = await ctx.db.query("user_preferences").withIndex("by_uid", q => q.eq("uid", player.uid)).first();
      await ctx.db.insert("player_seasons", {
        uid: player.uid,
        seasonId,
        seasonPoints: 0,
        gamePoints: { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
        matchesPlayed: 0,
        matchesWon: 0,
        winRate: 0,
        lastMatchAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
      });
    }

    return {
      seasonId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true,
      createdAt: now.iso,
      updatedAt: now.iso,
    };
  },
});

export const endSeason = mutation({
  args: {},
  handler: async (ctx) => {
    const now = getTorontoDate();
    const season = await ctx.db
      .query("seasons")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (!season) throw new Error("无活跃赛季");

    await ctx.db.patch(season._id, { isActive: false, updatedAt: now.iso });
    const rewardedPlayers = await distributeSeasonRewards(ctx, season._id);

    return { seasonId: season._id, rewardsDistributed: rewardedPlayers };
  },
});

export const getCurrentSeason = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登录");
    const uid = identity.subject;

    const season = await ctx.db
      .query("seasons")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (!season) throw new Error("无活跃赛季");

    const playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season._id))
      .first();
    const rank = await getPlayerRank(ctx, season._id, uid);

    return {
      seasonId: season._id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
      playerPoints: {
        seasonPoints: playerSeason?.seasonPoints || 0,
        gamePoints: playerSeason?.gamePoints || { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
        rank,
      },
    };
  },
});

export const getHistorySeasons = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登录");
    const uid = identity.subject;

    const seasons = await ctx.db
      .query("seasons")
      .filter((q) => q.eq(q.field("isActive"), false))
      .collect();
    const results = [];

    for (const season of seasons) {
      const playerSeason = await ctx.db
        .query("player_seasons")
        .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season._id))
        .first();
      const rank = await getPlayerRank(ctx, season._id, uid);
      results.push({
        seasonId: season._id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        isActive: season.isActive,
        playerPoints: {
          seasonPoints: playerSeason?.seasonPoints || 0,
          gamePoints: playerSeason?.gamePoints || { solitaire: 0, uno: 0, ludo: 0, rummy: 0 },
          rank,
        },
      });
    }

    return results;
  },
});

export const getSeasonLeaderboard = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const season = await ctx.db
      .query("seasons")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (!season) throw new Error("无活跃赛季");

    const playerSeasons = await ctx.db
      .query("player_seasons")
      .filter((q) => q.eq(q.field("seasonId"), season._id))
      .order("desc")
      .take(args.limit || 10);
    const results = [];

    for (const ps of playerSeasons) {
      const player = await ctx.db
        .query("players")
        .withIndex("by_uid", (q) => q.eq("uid", ps.uid))
        .first();
      const userPref = await ctx.db.query("user_preferences").withIndex("by_uid", q => q.eq("uid", ps.uid)).first();
      results.push({
        uid: ps.uid,
        seasonPoints: ps.seasonPoints,
        rank: await getPlayerRank(ctx, season._id, ps.uid),
        segmentName: player?.segmentName || "Bronze",
      });
    }

    return results;
  },
});

async function getPlayerRank(ctx: any, seasonId: string, uid: string): Promise<number> {
  const playerSeasons = await ctx.db
    .query("player_seasons")
    .filter((q: any) => q.eq(q.field("seasonId"), seasonId))
    .order("desc")
    .collect();
  const sorted = playerSeasons
    .map((ps: any, index: number) => ({ uid: ps.uid, seasonPoints: ps.seasonPoints, rank: index + 1 }))
    .sort((a: any, b: any) => b.seasonPoints - a.seasonPoints);
  return sorted.find((p: any) => p.uid === uid)?.rank || sorted.length + 1;
}