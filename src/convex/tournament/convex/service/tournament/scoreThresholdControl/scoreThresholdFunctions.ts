/**
 * 分数门槛控制系统Convex函数
 * 整合段位系统和分数门槛系统
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { ScoreThresholdController } from "./ScoreThresholdController";
import {
    getAdaptiveMode,
    getDefaultRankingProbabilities,
    getDefaultScoreThresholds,
    getLearningRate,
    getRankingMode,
    getSegmentProtectionConfig,
    validateRankingProbabilities,
    validateScoreThresholds
} from "./config";

// ==================== 比赛处理函数 ====================

/**
 * 处理比赛结束
 */
export const processMatchEnd = mutation({
    args: {
        matchId: v.string(),
        playerScores: v.array(v.object({
            uid: v.string(),
            score: v.number(),
            points: v.number()
        }))
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdController(ctx);
            return await controller.processMatchEnd(args.matchId, args.playerScores);
        } catch (error) {
            console.error("处理比赛结束失败:", error);
            throw new Error(`比赛处理失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
});

/**
 * 批量处理比赛结束
 */
export const batchProcessMatches = mutation({
    args: {
        matches: v.array(v.object({
            matchId: v.string(),
            playerScores: v.array(v.object({
                uid: v.string(),
                score: v.number(),
                points: v.number()
            }))
        }))
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdController(ctx);
            const results = [];

            for (const match of args.matches) {
                try {
                    const result = await controller.processMatchEnd(match.matchId, match.playerScores);
                    results.push({ matchId: match.matchId, success: true, result });
                } catch (error) {
                    results.push({
                        matchId: match.matchId,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            return results;
        } catch (error) {
            console.error("批量处理比赛失败:", error);
            throw new Error(`批量处理失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
});

// ==================== 配置管理函数 ====================

/**
 * 更新玩家配置
 */
export const updatePlayerConfig = mutation({
    args: {
        uid: v.string(),
        updates: v.object({
            scoreThresholds: v.optional(v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()),
                priority: v.number(),
                segmentName: v.optional(v.string())
            }))),
            baseRankingProbability: v.optional(v.array(v.number())),
            adaptiveMode: v.optional(v.union(v.literal("static"), v.literal("dynamic"), v.literal("learning"))),
            learningRate: v.optional(v.number()),
            rankingMode: v.optional(v.union(v.literal("score_based"), v.literal("segment_based"), v.literal("hybrid")))
        })
    },
    handler: async (ctx, args) => {
        try {
            // 验证配置
            if (args.updates.scoreThresholds && !validateScoreThresholds(args.updates.scoreThresholds)) {
                throw new Error("分数门槛配置无效");
            }

            if (args.updates.baseRankingProbability && !validateRankingProbabilities(args.updates.baseRankingProbability)) {
                throw new Error("排名概率配置无效");
            }

            const controller = new ScoreThresholdController(ctx);
            const success = await controller.updatePlayerConfig(args.uid, args.updates);

            return { success, message: success ? "配置更新成功" : "配置更新失败" };
        } catch (error) {
            console.error("更新玩家配置失败:", error);
            return {
                success: false,
                error: `更新失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 重置玩家配置
 */
export const resetPlayerConfig = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdController(ctx);
            const success = await controller.resetPlayerConfig(args.uid);

            return { success, message: success ? "配置重置成功" : "配置重置失败" };
        } catch (error) {
            console.error("重置玩家配置失败:", error);
            return {
                success: false,
                error: `重置失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

/**
 * 创建玩家默认配置
 */
export const createPlayerDefaultConfig = mutation({
    args: {
        uid: v.string(),
        segmentName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        try {
            const controller = new ScoreThresholdController(ctx);

            // 如果没有指定段位，获取玩家当前段位
            let segmentName = args.segmentName as any;
            if (!segmentName) {
                const segmentInfo = await controller.getPlayerSegmentInfo(args.uid);
                segmentName = segmentInfo?.currentSegment || 'bronze';
            }

            const defaultConfig = {
                uid: args.uid,
                segmentName,
                scoreThresholds: getDefaultScoreThresholds(segmentName),
                baseRankingProbability: getDefaultRankingProbabilities(segmentName),
                maxRank: 4,
                adaptiveMode: getAdaptiveMode(segmentName),
                learningRate: getLearningRate(segmentName),
                autoAdjustLearningRate: true,
                rankingMode: getRankingMode(segmentName),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await ctx.db.insert("player_score_threshold_configs", defaultConfig);
            return { success: true, message: "默认配置创建成功", config: defaultConfig };
        } catch (error) {
            console.error("创建玩家默认配置失败:", error);
            return {
                success: false,
                error: `创建失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

// ==================== 查询函数 ====================

/**
 * 获取玩家配置
 */
export const getPlayerConfig = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const config = await ctx.db
                .query("player_score_threshold_configs")
                .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
                .unique();

            return config;
        } catch (error) {
            console.error("获取玩家配置失败:", error);
            return null;
        }
    }
});

/**
 * 获取玩家性能指标
 */
export const getPlayerPerformanceMetrics = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const metrics = await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
                .unique();

            return metrics;
        } catch (error) {
            console.error("获取玩家性能指标失败:", error);
            return null;
        }
    }
});

/**
 * 获取玩家保护状态
 */
export const getPlayerProtectionStatus = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        try {
            const status = await ctx.db
                .query("player_protection_status")
                .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
                .unique();

            return status;
        } catch (error) {
            console.error("获取玩家保护状态失败:", error);
            return null;
        }
    }
});

/**
 * 获取玩家比赛记录
 */
export const getPlayerMatchRecords = query({
    args: {
        uid: v.string(),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        try {
            const records = await ctx.db
                .query("player_match_records")
                .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
                .order("desc")
                .take(args.limit || 20);

            return records;
        } catch (error) {
            console.error("获取玩家比赛记录失败:", error);
            return [];
        }
    }
});

// ==================== 配置查询函数 ====================

/**
 * 获取段位保护配置
 */
export const getSegmentProtectionConfig = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getSegmentProtectionConfig(args.segmentName as any);
    }
});

/**
 * 获取默认分数门槛
 */
export const getDefaultScoreThresholds = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getDefaultScoreThresholds(args.segmentName as any);
    }
});

/**
 * 获取默认排名概率
 */
export const getDefaultRankingProbabilities = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getDefaultRankingProbabilities(args.segmentName as any);
    }
});

/**
 * 获取学习率
 */
export const getLearningRate = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getLearningRate(args.segmentName as any);
    }
});

/**
 * 获取排名模式
 */
export const getRankingMode = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getRankingMode(args.segmentName as any);
    }
});

/**
 * 获取自适应模式
 */
export const getAdaptiveMode = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return getAdaptiveMode(args.segmentName as any);
    }
});

// ==================== 统计查询函数 ====================

/**
 * 获取系统统计信息
 */
export const getSystemStatistics = query({
    args: {},
    handler: async (ctx) => {
        try {
            const controller = new ScoreThresholdController(ctx);
            return await controller.getSystemStatistics();
        } catch (error) {
            console.error("获取系统统计信息失败:", error);
            return null;
        }
    }
});

/**
 * 获取段位分布统计
 */
export const getSegmentDistribution = query({
    args: {},
    handler: async (ctx) => {
        try {
            const players = await ctx.db
                .query("player_performance_metrics")
                .collect();

            const distribution: Record<string, number> = {
                bronze: 0, silver: 0, gold: 0, platinum: 0,
                diamond: 0, master: 0, grandmaster: 0
            };

            players.forEach((player: any) => {
                if (distribution[player.segmentName]) {
                    distribution[player.segmentName]++;
                }
            });

            return distribution;
        } catch (error) {
            console.error("获取段位分布统计失败:", error);
            return null;
        }
    }
});

/**
 * 获取最近的段位变化记录
 */
export const getRecentSegmentChanges = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        try {
            const changes = await ctx.db
                .query("segment_change_history")
                .order("desc")
                .take(args.limit || 20);

            return changes;
        } catch (error) {
            console.error("获取最近段位变化记录失败:", error);
            return [];
        }
    }
});

// ==================== 验证函数 ====================

/**
 * 验证分数门槛配置
 */
export const validateScoreThresholds = query({
    args: {
        thresholds: v.array(v.object({
            minScore: v.number(),
            maxScore: v.number(),
            rankingProbabilities: v.array(v.number()),
            priority: v.number(),
            segmentName: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        return validateScoreThresholds(args.thresholds);
    }
});

/**
 * 验证排名概率数组
 */
export const validateRankingProbabilities = query({
    args: { probabilities: v.array(v.number()) },
    handler: async (ctx, args) => {
        return validateRankingProbabilities(args.probabilities);
    }
});

// ==================== 工具函数 ====================

/**
 * 计算排名概率
 */
export const calculateRankingProbability = query({
    args: {
        score: v.number(),
        segmentName: v.string(),
        rankingMode: v.union(v.literal("score_based"), v.literal("segment_based"), v.literal("hybrid"))
    },
    handler: async (ctx, args) => {
        try {
            // 这里可以添加更复杂的概率计算逻辑
            const segmentName = args.segmentName as any;

            if (args.rankingMode === 'segment_based') {
                // 基于段位的概率计算
                if (args.score >= 50000) return 0.9;      // Grandmaster
                if (args.score >= 20000) return 0.8;      // Master
                if (args.score >= 10000) return 0.7;      // Diamond
                if (args.score >= 5000) return 0.6;       // Platinum
                if (args.score >= 2500) return 0.5;       // Gold
                if (args.score >= 1000) return 0.4;       // Silver
                return 0.3;                               // Bronze
            } else {
                // 基于分数的概率计算
                return Math.min(0.9, Math.max(0.1, args.score / 100000));
            }
        } catch (error) {
            console.error("计算排名概率失败:", error);
            return 0.5;
        }
    }
});

/**
 * 获取推荐配置
 */
export const getRecommendedConfig = query({
    args: {
        uid: v.string(),
        segmentName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        try {
            let segmentName = args.segmentName as any;
            if (!segmentName) {
                const metrics = await ctx.db
                    .query("player_performance_metrics")
                    .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
                    .unique();
                segmentName = metrics?.segmentName || 'bronze';
            }

            return {
                scoreThresholds: getDefaultScoreThresholds(segmentName),
                baseRankingProbability: getDefaultRankingProbabilities(segmentName),
                adaptiveMode: getAdaptiveMode(segmentName),
                learningRate: getLearningRate(segmentName),
                rankingMode: getRankingMode(segmentName)
            };
        } catch (error) {
            console.error("获取推荐配置失败:", error);
            return null;
        }
    }
});
