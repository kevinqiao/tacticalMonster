import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { SegmentSystem } from "./segmentSystem";

// ============================================================================
// 段位系统API接口
// ============================================================================

// 查询接口

/**
 * 获取玩家段位信息
 */
export const getPlayerSegment = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await SegmentSystem.getPlayerSegment(ctx, args.uid);
    },
});

/**
 * 获取段位配置
 */
export const getSegmentConfigs = query({
    args: {},
    handler: async (ctx, args) => {
        return SegmentSystem.getSegmentConfigs();
    },
});

/**
 * 获取段位分布统计
 */
export const getSegmentDistribution = query({
    args: {},
    handler: async (ctx, args) => {
        return await SegmentSystem.getSegmentDistribution(ctx);
    },
});

/**
 * 获取段位排行榜
 */
export const getSegmentLeaderboard = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        return await SegmentSystem.getSegmentLeaderboard(ctx, args.limit || 100);
    },
});

// 修改接口

/**
 * 初始化玩家段位
 */
export const initializePlayerSegment = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await SegmentSystem.initializePlayerSegment(ctx, args.uid);
    },
});

/**
 * 添加段位积分
 */
export const addRankPoints = mutation({
    args: {
        uid: v.string(),
        rankPoints: v.number(),
        source: v.string(), // "tournament", "quick_match", "leaderboard", "task"
        sourceDetails: v.optional(v.object({
            gameType: v.optional(v.string()),
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            taskId: v.optional(v.string()),
            leaderboardType: v.optional(v.string()),
            leaderboardDate: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        return await SegmentSystem.addRankPoints(ctx, args.uid, args.rankPoints, args.source);
    },
});

// ============================================================================
// 集成接口 - 自动添加段位积分
// ============================================================================

/**
 * 锦标赛完成后自动添加段位积分
 */
export const addTournamentRankPoints = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
        gameType: v.string(),
        rank: v.number(),
        totalParticipants: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, tournamentId, gameType, rank, totalParticipants } = args;

        // 计算排名百分比
        const rankPercentage = (rank / totalParticipants) * 100;

        // 根据排名确定段位积分奖励
        let rankPoints = 0;
        if (rankPercentage <= 10) {
            rankPoints = 50; // 前10%
        } else if (rankPercentage <= 20) {
            rankPoints = 30;  // 前11-20%
        } else if (rankPercentage <= 50) {
            rankPoints = 20;  // 前21-50%
        } else {
            rankPoints = 10;  // 后50%
        }

        return await SegmentSystem.addRankPoints(ctx, uid, rankPoints, "tournament");
    },
});

/**
 * 快速对局完成后自动添加段位积分
 */
export const addQuickMatchRankPoints = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        isWin: v.boolean(),
        matchId: v.string()
    },
    handler: async (ctx, args) => {
        const { uid, gameType, isWin, matchId } = args;

        let rankPoints = 0;
        if (isWin) {
            rankPoints = 5; // 胜利获得5段位积分
        }

        return await SegmentSystem.addRankPoints(ctx, uid, rankPoints, "quick_match");
    },
});

/**
 * 排行榜奖励时自动添加段位积分
 */
export const addLeaderboardRankPoints = mutation({
    args: {
        uid: v.string(),
        leaderboardType: v.string(), // "daily" 或 "weekly"
        rank: v.number(),
        rankPointsReward: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, leaderboardType, rank, rankPointsReward } = args;

        return await SegmentSystem.addRankPoints(ctx, uid, rankPointsReward, "leaderboard");
    },
});

/**
 * 任务完成时自动添加段位积分
 */
export const addTaskRankPoints = mutation({
    args: {
        uid: v.string(),
        taskId: v.string(),
        taskType: v.string(),
        rankPointsReward: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, taskId, taskType, rankPointsReward } = args;

        return await SegmentSystem.addRankPoints(ctx, uid, rankPointsReward, "task");
    },
});

// ============================================================================
// 批量操作接口
// ============================================================================

/**
 * 批量添加段位积分
 */
export const batchAddRankPoints = mutation({
    args: {
        rankPointsEntries: v.array(v.object({
            uid: v.string(),
            rankPoints: v.number(),
            source: v.string(),
            sourceDetails: v.optional(v.object({
                gameType: v.optional(v.string()),
                tournamentId: v.optional(v.string()),
                matchId: v.optional(v.string()),
                taskId: v.optional(v.string()),
                leaderboardType: v.optional(v.string()),
                leaderboardDate: v.optional(v.string())
            }))
        }))
    },
    handler: async (ctx, args) => {
        const results = [];

        for (const entry of args.rankPointsEntries) {
            const result = await SegmentSystem.addRankPoints(ctx, entry.uid, entry.rankPoints, entry.source);
            results.push({
                uid: entry.uid,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        const totalRankPoints = args.rankPointsEntries.reduce((sum, entry) => sum + entry.rankPoints, 0);

        return {
            success: true,
            message: `成功为 ${successCount}/${args.rankPointsEntries.length} 个玩家添加段位积分`,
            totalRankPoints,
            results
        };
    },
});

// ============================================================================
// 管理接口
// ============================================================================

/**
 * 重置玩家段位（管理用）
 */
export const resetPlayerSegment = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const now = new Date();
        const currentSeasonId = `season_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;

        // 删除现有段位记录
        const existingSegment = await ctx.db.query("player_segments")
            .withIndex("by_uid_season", (q: any) => q.eq("uid", args.uid).eq("seasonId", currentSeasonId))
            .unique();

        if (existingSegment) {
            await ctx.db.delete(existingSegment._id);
        }

        // 重新初始化
        const newSegment = await SegmentSystem.initializePlayerSegment(ctx, args.uid);

        return {
            success: true,
            message: "段位重置成功",
            segment: newSegment
        };
    },
}); 