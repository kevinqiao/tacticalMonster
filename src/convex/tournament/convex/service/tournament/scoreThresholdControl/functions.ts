/**
 * 分数门槛控制系统 Convex 函数
 * 暴露系统功能给前端和其他 Convex 函数
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { ScoreThresholdIntegration } from "./scoreThresholdIntegration";

// ==================== 玩家管理函数 ====================

/**
 * 初始化玩家
 */
export const initializePlayer = mutation({
    args: {
        uid: v.string(),
        segmentName: v.string(),
        useHybridMode: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        return await ScoreThresholdIntegration.initializePlayer(ctx, args);
    }
});

/**
 * 获取玩家统计信息
 */
export const getPlayerStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await ScoreThresholdIntegration.getPlayerStats(ctx, args.uid);
    }
});

/**
 * 调整分数门槛配置
 */
export const adjustScoreThresholds = mutation({
    args: {
        uid: v.string(),
        scoreThresholds: v.array(v.object({
            minScore: v.number(),
            maxScore: v.number(),
            rankingProbabilities: v.array(v.number()), // 动态长度数组
            priority: v.number()
        })),
        adaptiveMode: v.optional(v.boolean()),
        learningRate: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        await ScoreThresholdIntegration.adjustScoreThresholds(ctx, args);
    }
});

/**
 * 切换自适应模式
 */
export const toggleAdaptiveMode = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        await ScoreThresholdIntegration.toggleAdaptiveMode(ctx, args.uid);
    }
});

// ==================== 比赛管理函数 ====================

/**
 * 记录比赛结果
 */
export const recordMatchResult = mutation({
    args: {
        matchId: v.string(),
        uid: v.string(),
        score: v.number(),
        rank: v.number(),
        points: v.number()
    },
    handler: async (ctx, args) => {
        await ScoreThresholdIntegration.recordMatchResult(ctx, args);
    }
});

/**
 * 结束比赛并生成AI分数
 */
export const endMatch = mutation({
    args: {
        matchId: v.string(),
        humanPlayerUid: v.string(),
        humanScore: v.number(),
        targetRank: v.number(),
        aiPlayerCount: v.number()
    },
    handler: async (ctx, args) => {
        return await ScoreThresholdIntegration.endMatch(ctx, args);
    }
});

/**
 * 获取活跃比赛
 */
export const getActiveMatches = query({
    args: {},
    handler: async (ctx) => {
        return await ScoreThresholdIntegration.getActiveMatches(ctx);
    }
});

// ==================== 系统管理函数 ====================

/**
 * 获取所有玩家
 */
export const getAllPlayers = query({
    args: {},
    handler: async (ctx) => {
        return await ScoreThresholdIntegration.getAllPlayers(ctx);
    }
});

/**
 * 获取系统状态概览
 */
export const getSystemStatus = query({
    args: {},
    handler: async (ctx) => {
        return await ScoreThresholdIntegration.getSystemStatus(ctx);
    }
});

/**
 * 重置系统
 */
export const resetSystem = mutation({
    args: {},
    handler: async (ctx) => {
        await ScoreThresholdIntegration.reset(ctx);
    }
});

// ==================== 批量操作函数 ====================

/**
 * 批量更新玩家配置
 */
export const batchUpdatePlayerConfigs = mutation({
    args: {
        updates: v.array(v.object({
            uid: v.string(),
            scoreThresholds: v.optional(v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()), // 动态长度数组
                priority: v.number()
            }))),
            adaptiveMode: v.optional(v.boolean()),
            learningRate: v.optional(v.number())
        }))
    },
    handler: async (ctx, args) => {
        return await ScoreThresholdIntegration.batchUpdatePlayerConfigs(ctx, args.updates);
    }
});

// ==================== 配置管理函数 ====================

/**
 * 创建混合模式配置
 */
export const createHybridModeConfig = query({
    args: {
        playerUid: v.string(),
        segmentName: v.string()
    },
    handler: async (ctx, args) => {
        return ScoreThresholdIntegration.createHybridModeConfig(args.playerUid, args.segmentName);
    }
});

/**
 * 创建段位升级配置
 */
export const createSegmentUpgradeConfig = query({
    args: {
        playerUid: v.string(),
        oldSegment: v.string(),
        newSegment: v.string()
    },
    handler: async (ctx, args) => {
        return ScoreThresholdIntegration.createSegmentUpgradeConfig(
            args.playerUid,
            args.oldSegment,
            args.newSegment
        );
    }
});

/**
 * 获取段位配置信息
 */
export const getSegmentConfigInfo = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return ScoreThresholdIntegration.getSegmentConfigInfo(args.segmentName);
    }
});

/**
 * 比较段位配置
 */
export const compareSegmentConfigs = query({
    args: {
        segment1: v.string(),
        segment2: v.string()
    },
    handler: async (ctx, args) => {
        return ScoreThresholdIntegration.compareSegmentConfigs(args.segment1, args.segment2);
    }
});

/**
 * 验证分数门槛配置
 */
export const validateScoreThresholdConfig = query({
    args: {
        config: v.object({
            uid: v.string(),
            segmentName: v.string(),
            scoreThresholds: v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()), // 动态长度数组
                priority: v.number()
            })),
            baseRankingProbability: v.array(v.number()), // 动态长度数组
            maxRank: v.number(), // 新增字段
            adaptiveMode: v.boolean(),
            learningRate: v.number(),
            autoAdjustLearningRate: v.boolean(),
            createdAt: v.string(),
            updatedAt: v.string()
        })
    },
    handler: async (ctx, args) => {
        return ScoreThresholdIntegration.validateScoreThresholdConfig(args.config);
    }
});

// ==================== 高级查询函数 ====================

/**
 * 获取玩家段位历史
 */
export const getPlayerSegmentHistory = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const history = await ctx.db
            .query("segment_change_history")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .order("desc")
            .collect();

        return history;
    }
});

/**
 * 获取玩家比赛历史
 */
export const getPlayerMatchHistory = query({
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        const history = await ctx.db
            .query("player_match_records")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .order("desc")
            .take(limit);

        return history;
    }
});

/**
 * 获取段位统计信息
 */
export const getSegmentStats = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        const players = await ctx.db
            .query("score_threshold_configs")
            .withIndex("by_segment", (q) => q.eq("segmentName", args.segmentName))
            .collect();

        const metrics = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q) => q.eq("uid", players[0].uid))
            .collect();

        if (metrics.length === 0) {
            return {
                totalPlayers: 0,
                averageMatches: 0,
                averageWinRate: 0,
                averageLearningRate: 0
            };
        }

        const totalMatches = metrics.reduce((sum, m) => sum + m.totalMatches, 0);
        const totalWins = metrics.reduce((sum, m) => sum + m.totalWins, 0);
        const totalMatchesForWinRate = metrics.reduce((sum, m) => sum + m.totalMatches, 0);
        const averageLearningRate = players.reduce((sum, p) => sum + p.learningRate, 0) / players.length;

        return {
            totalPlayers: players.length,
            averageMatches: totalMatches / players.length,
            averageWinRate: totalMatchesForWinRate > 0 ? totalWins / totalMatchesForWinRate : 0,
            averageLearningRate
        };
    }
});

/**
 * 搜索玩家
 */
export const searchPlayers = query({
    args: {
        query: v.string(),
        segmentName: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        // 基础查询
        let playersQuery: any = ctx.db.query("score_threshold_configs");

        // 如果指定了段位，添加段位过滤
        if (args.segmentName) {
            playersQuery = playersQuery.withIndex("by_segment", (q: any) => q.eq("segmentName", args.segmentName!));
        }

        const players = await playersQuery.take(limit);

        // 如果提供了搜索查询，进行文本过滤
        if (args.query) {
            const filteredPlayers = players.filter((player: any) =>
                player.uid.toLowerCase().includes(args.query.toLowerCase()) ||
                player.segmentName.toLowerCase().includes(args.query.toLowerCase())
            );
            return filteredPlayers.slice(0, limit);
        }

        return players;
    }
});

/**
 * 获取排行榜
 */
export const getLeaderboard = query({
    args: {
        segmentName: v.optional(v.string()),
        sortBy: v.union(v.literal("totalPoints"), v.literal("totalWins"), v.literal("bestScore")),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 100;

        let metricsQuery: any = ctx.db.query("player_performance_metrics");

        // 如果指定了段位，需要关联查询
        if (args.segmentName) {
            const segmentPlayers = await ctx.db
                .query("score_threshold_configs")
                .withIndex("by_segment", (q) => q.eq("segmentName", args.segmentName!))
                .collect();

            const uids = segmentPlayers.map(p => p.uid);
            metricsQuery = metricsQuery.withIndex("by_uid", (q: any) => q.in("uid", uids));
        }

        const metrics = await metricsQuery.collect();

        // 排序
        const sortedMetrics = metrics.sort((a: any, b: any) => {
            switch (args.sortBy) {
                case "totalPoints":
                    return b.totalPoints - a.totalPoints;
                case "totalWins":
                    return b.totalWins - a.totalWins;
                case "bestScore":
                    return b.bestScore - a.bestScore;
                default:
                    return 0;
            }
        });

        return sortedMetrics.slice(0, limit);
    }
});
