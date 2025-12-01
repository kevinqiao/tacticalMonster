import { v } from "convex/values";
import { internalMutation, mutation, query } from "../../_generated/server";
import { LeaderboardSystem } from "./leaderboardSystem";

// ============================================================================
// 排行榜API接口 - 基于快速对局积分累积
// ============================================================================

// 查询接口

/**
 * 获取每日排行榜
 */
export const getDailyLeaderboard = query({
    args: {
        date: v.optional(v.string()),
        gameType: v.string(),
        limit: v.optional(v.number()),
        offset: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.getDailyLeaderboard(ctx, {
            date: args.date,
            gameType: args.gameType,
            limit: args.limit || 100,
            offset: args.offset || 0
        });
    },
});

/**
 * 获取每周排行榜
 */
export const getWeeklyLeaderboard = query({
    args: {
        weekStart: v.optional(v.string()),
        gameType: v.string(),
        limit: v.optional(v.number()),
        offset: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.getWeeklyLeaderboard(ctx, {
            weekStart: args.weekStart,
            gameType: args.gameType,
            limit: args.limit || 100,
            offset: args.offset || 0
        });
    },
});

/**
 * 获取赛季排行榜
 */
export const getSeasonalLeaderboard = query({
    args: {
        seasonId: v.optional(v.string()),
        gameType: v.string(),
        limit: v.optional(v.number()),
        offset: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.getSeasonalLeaderboard(ctx, {
            seasonId: args.seasonId,
            gameType: args.gameType,
            limit: args.limit || 100,
            offset: args.offset || 0
        });
    },
});




// 修改接口

/**
 * 累积每日积分
 */
export const accumulateDailyPoints = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateDailyPoints(ctx, args);
    },
});

/**
 * 累积每周积分
 */
export const accumulateWeeklyPoints = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateWeeklyPoints(ctx, args);
    },
});

/**
 * 快速对局完成后累积积分
 */
export const accumulatePointsAfterQuickMatch = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        const { uid, gameType, tournamentType, score } = args;
        const results = [];

        // 累积每日积分
        const dailyResult = await LeaderboardSystem.accumulateDailyPoints(ctx, {
            uid,
            gameType,
            tournamentType,
            score
        });
        results.push({ type: "daily", ...dailyResult });

        // 累积每周积分
        const weeklyResult = await LeaderboardSystem.accumulateWeeklyPoints(ctx, {
            uid,
            gameType,
            tournamentType,
            score
        });
        results.push({ type: "weekly", ...weeklyResult });

        const successCount = results.filter(r => r.success).length;

        return {
            success: successCount > 0,
            message: `积分累积完成：${successCount}/2 个排行榜积分累积成功`,
            results
        };
    },
});

/**
 * 领取排行榜奖励
 */
export const claimLeaderboardReward = mutation({
    args: {
        uid: v.string(),
        leaderboardType: v.string(), // "daily", "weekly" 或 "seasonal"
        date: v.string(),
        gameType: v.string()
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.claimLeaderboardReward(ctx, {
            uid: args.uid,
            leaderboardType: args.leaderboardType as "daily" | "weekly" | "seasonal",
            date: args.date,
            gameType: args.gameType
        });
    },
});



/**
 * 累积每日综合积分（所有游戏）
 */
export const accumulateDailyPointsOverall = mutation({
    args: {
        uid: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateDailyPointsOverall(ctx, args);
    },
});

/**
 * 累积每日游戏特定积分
 */
export const accumulateDailyPointsByGame = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateDailyPointsByGame(ctx, args);
    },
});

/**
 * 累积每周综合积分（所有游戏）
 */
export const accumulateWeeklyPointsOverall = mutation({
    args: {
        uid: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateWeeklyPointsOverall(ctx, args);
    },
});

/**
 * 累积每周游戏特定积分
 */
export const accumulateWeeklyPointsByGame = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateWeeklyPointsByGame(ctx, args);
    },
});

/**
 * 累积赛季综合积分（所有游戏）
 */
export const accumulateSeasonalPointsOverall = mutation({
    args: {
        uid: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateSeasonalPointsOverall(ctx, args);
    },
});

/**
 * 累积赛季游戏特定积分
 */
export const accumulateSeasonalPointsByGame = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        score: v.number(), // 要累积的积分
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.accumulateSeasonalPointsByGame(ctx, args);
    },
});

// ============================================================================
// 管理接口
// ============================================================================

/**
 * 结算每日排行榜
 */
export const settleDailyLeaderboard = mutation({
    args: {
        date: v.string(),
        gameType: v.string()
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.settleDailyLeaderboard(ctx, {
            date: args.date,
            gameType: args.gameType
        });
    },
});

/**
 * 结算每周排行榜
 */
export const settleWeeklyLeaderboard = mutation({
    args: {
        weekStart: v.string(),
        gameType: v.string()
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.settleWeeklyLeaderboard(ctx, {
            weekStart: args.weekStart,
            gameType: args.gameType
        });
    },
});

/**
 * 结算赛季排行榜
 */
export const settleSeasonalLeaderboard = mutation({
    args: {
        seasonId: v.string(),
        gameType: v.string()
    },
    handler: async (ctx, args) => {
        return await LeaderboardSystem.settleSeasonalLeaderboard(ctx, {
            seasonId: args.seasonId,
            gameType: args.gameType
        });
    },
});

// ============================================================================
// 自动重置接口（定时任务用）
// ============================================================================

/**
 * 自动重置每日排行榜（定时任务用）
 * 每日凌晨00:10执行，重置昨日排行榜
 */
export const resetDailyLeaderboard = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await LeaderboardSystem.resetDailyLeaderboard(ctx, {});
    },
});

/**
 * 自动重置每周排行榜（定时任务用）
 * 每周一凌晨00:10执行，重置上周排行榜
 */
export const resetWeeklyLeaderboard = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await LeaderboardSystem.resetWeeklyLeaderboard(ctx, {});
    },
});

/**
 * 自动重置赛季排行榜（定时任务用）
 * 每月1日凌晨00:10执行，重置上赛季排行榜
 */
export const resetSeasonalLeaderboard = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await LeaderboardSystem.resetSeasonalLeaderboard(ctx, {});
    },
});


/**
 * 获取排行榜配置
 */
export const getLeaderboardConfigs = query({
    args: {},
    handler: async (ctx, args) => {
        return {
            success: true,
            configs: LeaderboardSystem.getLeaderboardConfigs()
        };
    },
}); 