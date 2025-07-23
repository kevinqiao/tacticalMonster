// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { SegmentSystem } from "../service/segment/segmentSystem";

// ============================================================================
// 段位系统 API 接口
// ============================================================================

/**
 * 初始化玩家段位
 */
export const initializePlayerSegment = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        seasonId: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.initializePlayerSegment(ctx, args.uid, args.gameType, args.seasonId);
    }
});

/**
 * 更新玩家段位分数
 */
export const updatePlayerSegmentScore = mutation({
    args: {
        uid: v.string(),
        gameType: v.string(),
        scoreChange: v.number(),
        tournamentType: v.optional(v.string()),
        tournamentId: v.optional(v.string()),
        matchId: v.optional(v.string()),
        rank: v.optional(v.number()),
        totalPlayers: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.updatePlayerSegmentScore(ctx, args);
    }
});

/**
 * 获取玩家段位信息
 */
export const getPlayerSegment = query({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.getPlayerSegment(ctx, args.uid, args.gameType);
    }
});

/**
 * 获取段位排行榜
 */
export const getSegmentLeaderboard = query({
    args: {
        gameType: v.string(),
        segmentName: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.getSegmentLeaderboard(ctx, args.gameType, args.segmentName, args.limit);
    }
});

/**
 * 赛季结束段位重置
 */
export const resetSeasonSegments = mutation({
    args: {
        seasonId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await SegmentSystem.resetSeasonSegments(ctx, args.seasonId);
    }
});

/**
 * 获取段位定义配置
 */
export const getSegmentLevels = query({
    args: {},
    handler: async (ctx: any, args: any) => {
        return {
            success: true,
            segmentLevels: SegmentSystem.SEGMENT_LEVELS,
            tournamentRewards: SegmentSystem.TOURNAMENT_SEGMENT_REWARDS
        };
    }
});

/**
 * 计算锦标赛段位分数奖励
 */
export const calculateTournamentSegmentReward = query({
    args: {
        tournamentType: v.string(),
        rank: v.number(),
        totalPlayers: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
            args.tournamentType,
            args.rank,
            args.totalPlayers
        );

        return {
            success: true,
            tournamentType: args.tournamentType,
            rank: args.rank,
            totalPlayers: args.totalPlayers,
            scoreChange,
            description: SegmentSystem.TOURNAMENT_SEGMENT_REWARDS[args.tournamentType]?.[args.rank]?.description || "排名奖励"
        };
    }
});

/**
 * 获取玩家段位历史
 */
export const getPlayerSegmentHistory = query({
    args: {
        uid: v.string(),
        gameType: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, limit = 20 } = args;

        const segmentChanges = await ctx.db
            .query("segment_changes")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .order("desc")
            .take(limit)
            .collect();

        return {
            success: true,
            history: segmentChanges,
            totalCount: segmentChanges.length
        };
    }
});

/**
 * 获取段位统计信息
 */
export const getSegmentStatistics = query({
    args: {
        gameType: v.string(),
        segmentName: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { gameType, segmentName } = args;

        let query = ctx.db.query("player_segments");

        if (segmentName) {
            query = query.withIndex("by_segment", (q: any) => q.eq("segmentName", segmentName));
        }

        const players = await query
            .filter((q: any) => q.eq(q.field("gameType"), gameType))
            .collect();

        // 计算统计信息
        const totalPlayers = players.length;
        const totalPoints = players.reduce((sum: number, p: any) => sum + p.currentPoints, 0);
        const averagePoints = totalPlayers > 0 ? totalPoints / totalPlayers : 0;

        // 段位分布
        const segmentDistribution: any = {};
        for (const player of players) {
            const segment = player.segmentName;
            segmentDistribution[segment] = (segmentDistribution[segment] || 0) + 1;
        }

        // 最高分数玩家
        const topPlayers = players
            .sort((a: any, b: any) => b.currentPoints - a.currentPoints)
            .slice(0, 10)
            .map((p: any) => ({
                uid: p.uid,
                segmentName: p.segmentName,
                currentPoints: p.currentPoints,
                highestPoints: p.highestPoints
            }));

        return {
            success: true,
            statistics: {
                totalPlayers,
                totalPoints,
                averagePoints,
                segmentDistribution,
                topPlayers
            },
            gameType,
            segmentName
        };
    }
});

/**
 * 检查段位要求
 */
export const checkSegmentRequirement = query({
    args: {
        uid: v.string(),
        gameType: v.string(),
        requiredSegment: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, requiredSegment } = args;

        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            return {
                success: true,
                eligible: false,
                reason: "玩家段位不存在",
                currentSegment: "Bronze",
                requiredSegment,
                needsInitialization: true
            };
        }

        const playerSegmentTier = SegmentSystem.getSegmentTier(playerSegment.segmentName);
        const requiredSegmentTier = SegmentSystem.getSegmentTier(requiredSegment);
        const eligible = playerSegmentTier >= requiredSegmentTier;

        return {
            success: true,
            eligible,
            reason: eligible ? "段位满足要求" : "段位不足",
            currentSegment: playerSegment.segmentName,
            requiredSegment,
            currentTier: playerSegmentTier,
            requiredTier: requiredSegmentTier,
            needsInitialization: false
        };
    }
});

/**
 * 批量更新玩家段位分数（用于锦标赛结算）
 */
export const batchUpdateSegmentScores = mutation({
    args: {
        updates: v.array(v.object({
            uid: v.string(),
            gameType: v.string(),
            scoreChange: v.number(),
            tournamentType: v.optional(v.string()),
            tournamentId: v.optional(v.string()),
            rank: v.optional(v.number()),
            totalPlayers: v.optional(v.number())
        }))
    },
    handler: async (ctx: any, args: any) => {
        const results = [];

        for (const update of args.updates) {
            try {
                const result = await SegmentSystem.updatePlayerSegmentScore(ctx, update);
                results.push({
                    uid: update.uid,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    uid: update.uid,
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        return {
            success: true,
            results,
            totalCount: args.updates.length,
            successCount: results.filter(r => r.success).length,
            errorCount: results.filter(r => !r.success).length
        };
    }
});

/**
 * 获取段位奖励配置
 */
export const getSegmentRewards = query({
    args: {
        segmentName: v.string(),
        rewardType: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        const { segmentName, rewardType } = args;

        let query = ctx.db.query("segment_rewards")
            .withIndex("by_segment", (q: any) => q.eq("segmentName", segmentName));

        if (rewardType) {
            query = query.filter((q: any) => q.eq(q.field("rewardType"), rewardType));
        }

        const rewards = await query.collect();

        return {
            success: true,
            segmentName,
            rewardType,
            rewards
        };
    }
});

/**
 * 创建段位奖励配置
 */
export const createSegmentReward = mutation({
    args: {
        segmentName: v.string(),
        rewardType: v.string(),
        rewards: v.array(v.object({
            type: v.string(),
            itemId: v.string(),
            quantity: v.number()
        }))
    },
    handler: async (ctx: any, args: any) => {
        const now = new Date().toISOString();

        const rewardId = await ctx.db.insert("segment_rewards", {
            segmentName: args.segmentName,
            rewardType: args.rewardType,
            rewards: args.rewards,
            createdAt: now,
            updatedAt: now
        });

        return {
            success: true,
            rewardId,
            message: "段位奖励配置创建成功"
        };
    }
}); 