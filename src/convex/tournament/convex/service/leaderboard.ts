import { v } from "convex/values";
import { query } from "../_generated/server";

// 查询赛季排行榜，支持总排行榜和游戏特定子排行榜
export const getLeaderboard = query({
  // 输入参数：赛季ID、游戏类型（可选）、分页限制和偏移
  args: {
    seasonId: v.id("seasons"),
    gameType: v.optional(v.string()), // 如 "rummy"，为空则查总排行榜
    limit: v.number(), // 返回的最大记录数
    offset: v.number(), // 跳过的记录数
  },
  handler: async (ctx, args) => {
    // 验证赛季存在且活跃
    const season = await ctx.db.get(args.seasonId);
    if (!season || !season.isActive) {
      throw new Error("赛季不存在或已结束");
    }

    // 查询玩家赛季数据，使用索引加速排序
    const progresses = await ctx.db
      .query("player_seasons")
      .withIndex("by_season_points", (q) => q.eq("seasonId", args.seasonId))
      .order("desc") // 按 seasonPoints 降序
      .collect()
      .then(results => results.slice(args.offset, args.offset + args.limit));

    // 构建排行榜数据
    const leaderboard = [];
    let rank = args.offset + 1;
    for (const progress of progresses) {
      // 获取玩家信息
      const player = await ctx.db
        .query("players")
        .withIndex("by_uid", (q) => q.eq("uid", progress.uid))
        .first();
      if (!player) continue; // 跳过无效玩家

      // 根据 gameType 选择积分
      const points = args.gameType
        ? progress.gamePoints[args.gameType as keyof typeof progress.gamePoints] || 0
        : progress.seasonPoints;

      leaderboard.push({
        rank, // 当前排名
        uid: progress.uid,
        username: player.displayName, // 使用 displayName 而不是 uid
        points, // 总积分或游戏特定积分
        segmentName: player.segmentName, // 段位：Bronze, Silver, Gold, Platinum
        isSubscribed: player.isSubscribed, // 订阅状态
        lastActive: player.lastActive, // 最后活跃时间
      });
      rank++;
    }

    // 获取总玩家数，用于分页
    const totalPlayers = await ctx.db
      .query("player_seasons")
      .withIndex("by_season_points", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    return {
      leaderboard, // 排行榜数据
      totalPlayers: totalPlayers.length, // 总玩家数
      seasonName: season.name, // 赛季名称，如 "Diwali 2025"
    };
  },
});