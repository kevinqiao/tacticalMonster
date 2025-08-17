/**
 * 分数门槛控制系统配置函数
 * 提供配置管理、验证和优化功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { ScoreThresholdIntegration } from "./scoreThresholdIntegration";
import { HYBRID_SEGMENT_CONFIGS, PlayerScoreThresholdConfig, SEGMENT_CONFIGS } from "./scoreThresholdRankingController";

// ==================== 配置查询函数 ====================

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
                rankingProbabilities: v.array(v.number()),
                priority: v.number()
            })),
            baseRankingProbability: v.array(v.number()),
            maxRank: v.number(),
            adaptiveMode: v.boolean(),
            learningRate: v.number(),
            autoAdjustLearningRate: v.boolean(),
            createdAt: v.string(),
            updatedAt: v.string()
        })
    },
    handler: async (ctx, args) => {
        return ScoreThresholdIntegration.validateScoreThresholdConfig(args.config as any);
    }
});

/**
 * 获取所有可用段位
 */
export const getAvailableSegments = query({
    args: {},
    handler: async (ctx) => {
        return Object.keys(HYBRID_SEGMENT_CONFIGS);
    }
});

/**
 * 获取段位保护配置
 */
export const getSegmentProtectionConfig = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        return SEGMENT_CONFIGS[args.segmentName] || null;
    }
});

/**
 * 获取混合模式配置详情
 */
export const getHybridModeConfigDetails = query({
    args: { segmentName: v.string() },
    handler: async (ctx, args) => {
        const config = HYBRID_SEGMENT_CONFIGS[args.segmentName];
        if (!config) {
            return null;
        }

        // 计算配置统计信息
        const avgRank1Probability = config.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config.scoreThresholds.length;
        const avgRank2Probability = config.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[1], 0) / config.scoreThresholds.length;
        const avgRank3Probability = config.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[2], 0) / config.scoreThresholds.length;
        const avgRank4Probability = config.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[3], 0) / config.scoreThresholds.length;

        return {
            ...config,
            statistics: {
                avgRank1Probability,
                avgRank2Probability,
                avgRank3Probability,
                avgRank4Probability,
                thresholdCount: config.scoreThresholds.length,
                scoreRange: {
                    min: Math.min(...config.scoreThresholds.map(t => t.minScore)),
                    max: Math.max(...config.scoreThresholds.map(t => t.maxScore))
                }
            }
        };
    }
});

/**
 * 获取配置模板
 */
export const getConfigTemplates = query({
    args: {},
    handler: async (ctx) => {
        const templates: Record<string, {
            name: string;
            description: string;
            config: Partial<PlayerScoreThresholdConfig>;
        }> = {
            "balanced": {
                name: "平衡型配置",
                description: "各名次概率相对均衡，适合新手玩家",
                config: {
                    scoreThresholds: [
                        { minScore: 0, maxScore: 1000, rankingProbabilities: [0.25, 0.25, 0.25, 0.25], priority: 1 },
                        { minScore: 1001, maxScore: 2000, rankingProbabilities: [0.30, 0.30, 0.25, 0.15], priority: 2 }
                    ],
                    adaptiveMode: true,
                    learningRate: 0.1
                }
            },
            "aggressive": {
                name: "激进型配置",
                description: "高名次概率，适合有经验的玩家",
                config: {
                    scoreThresholds: [
                        { minScore: 0, maxScore: 1000, rankingProbabilities: [0.40, 0.35, 0.20, 0.05], priority: 1 },
                        { minScore: 1001, maxScore: 2000, rankingProbabilities: [0.45, 0.30, 0.20, 0.05], priority: 2 }
                    ],
                    adaptiveMode: true,
                    learningRate: 0.15
                }
            },
            "conservative": {
                name: "保守型配置",
                description: "稳定名次，适合追求稳定性的玩家",
                config: {
                    scoreThresholds: [
                        { minScore: 0, maxScore: 1000, rankingProbabilities: [0.15, 0.35, 0.35, 0.15], priority: 1 },
                        { minScore: 1001, maxScore: 2000, rankingProbabilities: [0.20, 0.40, 0.30, 0.10], priority: 2 }
                    ],
                    adaptiveMode: false,
                    learningRate: 0.05
                }
            }
        };

        return templates;
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
 * 创建自定义配置
 */
export const createCustomConfig = mutation({
    args: {
        uid: v.string(),
        segmentName: v.string(),
        scoreThresholds: v.array(v.object({
            minScore: v.number(),
            maxScore: v.number(),
            rankingProbabilities: v.array(v.number()),
            priority: v.number()
        })),
        adaptiveMode: v.boolean(),
        learningRate: v.number(),
        autoAdjustLearningRate: v.boolean()
    },
    handler: async (ctx, args) => {
        const nowISO = new Date().toISOString();

        // 计算基础概率
        const sortedThresholds = [...args.scoreThresholds].sort((a, b) => b.priority - a.priority);
        const baseThreshold = sortedThresholds[0];

        const config: PlayerScoreThresholdConfig = {
            uid: args.uid,
            segmentName: args.segmentName,
            scoreThresholds: args.scoreThresholds,
            baseRankingProbability: baseThreshold.rankingProbabilities,
            maxRank: baseThreshold.rankingProbabilities.length,
            adaptiveMode: args.adaptiveMode,
            learningRate: Math.max(0.01, Math.min(0.3, args.learningRate)),
            autoAdjustLearningRate: args.autoAdjustLearningRate,
            createdAt: nowISO,
            updatedAt: nowISO
        };

        // 验证配置
        const validation = ScoreThresholdIntegration.validateScoreThresholdConfig(config);
        if (!validation.isValid) {
            throw new Error(`配置验证失败: ${validation.errors.join(", ")}`);
        }

        // 保存到数据库
        const existing = await ctx.db
            .query("score_threshold_configs")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, config);
        } else {
            await ctx.db.insert("score_threshold_configs", config);
        }

        return { success: true, config };
    }
});

/**
 * 批量创建配置
 */
export const batchCreateConfigs = mutation({
    args: {
        configs: v.array(v.object({
            uid: v.string(),
            segmentName: v.string(),
            scoreThresholds: v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()),
                priority: v.number()
            })),
            adaptiveMode: v.boolean(),
            learningRate: v.number(),
            autoAdjustLearningRate: v.boolean()
        }))
    },
    handler: async (ctx, args) => {
        const results = [];
        const nowISO = new Date().toISOString();

        for (const configData of args.configs) {
            try {
                // 计算基础概率
                const sortedThresholds = [...configData.scoreThresholds].sort((a, b) => b.priority - a.priority);
                const baseThreshold = sortedThresholds[0];

                const config: PlayerScoreThresholdConfig = {
                    uid: configData.uid,
                    segmentName: configData.segmentName,
                    scoreThresholds: configData.scoreThresholds,
                    baseRankingProbability: baseThreshold.rankingProbabilities,
                    maxRank: baseThreshold.rankingProbabilities.length,
                    adaptiveMode: configData.adaptiveMode,
                    learningRate: Math.max(0.01, Math.min(0.3, configData.learningRate)),
                    autoAdjustLearningRate: configData.autoAdjustLearningRate,
                    createdAt: nowISO,
                    updatedAt: nowISO
                };

                // 验证配置
                const validation = ScoreThresholdIntegration.validateScoreThresholdConfig(config);
                if (!validation.isValid) {
                    results.push({
                        uid: configData.uid,
                        success: false,
                        error: `配置验证失败: ${validation.errors.join(", ")}`
                    });
                    continue;
                }

                // 保存到数据库
                const existing = await ctx.db
                    .query("score_threshold_configs")
                    .withIndex("by_uid", (q) => q.eq("uid", configData.uid))
                    .unique();

                if (existing) {
                    await ctx.db.patch(existing._id, config);
                } else {
                    await ctx.db.insert("score_threshold_configs", config);
                }

                results.push({
                    uid: configData.uid,
                    success: true,
                    config
                });

            } catch (error) {
                results.push({
                    uid: configData.uid,
                    success: false,
                    error: error instanceof Error ? error.message : "未知错误"
                });
            }
        }

        return results;
    }
});

// ==================== 配置优化函数 ====================

/**
 * 优化分数门槛配置
 */
export const optimizeScoreThresholds = query({
    args: {
        currentConfig: v.object({
            uid: v.string(),
            segmentName: v.string(),
            scoreThresholds: v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()),
                priority: v.number()
            })),
            adaptiveMode: v.boolean(),
            learningRate: v.number(),
            autoAdjustLearningRate: v.boolean(),
            createdAt: v.string(),
            updatedAt: v.string()
        }),
        targetRank: v.number(),
        performanceData: v.object({
            totalMatches: v.number(),
            totalWins: v.number(),
            averageScore: v.number(),
            currentWinStreak: v.number()
        })
    },
    handler: async (ctx, args) => {
        const { currentConfig, targetRank, performanceData } = args;

        // 基于性能数据优化配置
        const winRate = performanceData.totalMatches > 0 ? performanceData.totalWins / performanceData.totalMatches : 0;
        const avgScore = performanceData.averageScore;

        let optimizedThresholds = [...currentConfig.scoreThresholds];

        // 根据目标名次调整概率
        if (targetRank === 1) {
            // 提高第1名概率
            optimizedThresholds = optimizedThresholds.map(threshold => ({
                ...threshold,
                rankingProbabilities: [
                    Math.min(0.5, threshold.rankingProbabilities[0] * 1.2),
                    threshold.rankingProbabilities[1],
                    threshold.rankingProbabilities[2],
                    Math.max(0.05, threshold.rankingProbabilities[3] * 0.8)
                ]
            }));
        } else if (targetRank === 2) {
            // 提高第2名概率
            optimizedThresholds = optimizedThresholds.map(threshold => ({
                ...threshold,
                rankingProbabilities: [
                    threshold.rankingProbabilities[0],
                    Math.min(0.4, threshold.rankingProbabilities[1] * 1.2),
                    threshold.rankingProbabilities[2],
                    Math.max(0.05, threshold.rankingProbabilities[3] * 0.8)
                ]
            }));
        }

        // 根据胜率调整学习率
        let optimizedLearningRate = currentConfig.learningRate;
        if (winRate < 0.3) {
            optimizedLearningRate = Math.min(0.3, currentConfig.learningRate * 1.3);
        } else if (winRate > 0.7) {
            optimizedLearningRate = Math.max(0.02, currentConfig.learningRate * 0.8);
        }

        // 根据连胜调整
        if (performanceData.currentWinStreak >= 5) {
            optimizedLearningRate = Math.max(0.02, optimizedLearningRate * 0.9);
        }

        // 重新计算基础概率
        const sortedThresholds = [...optimizedThresholds].sort((a, b) => b.priority - a.priority);
        const baseThreshold = sortedThresholds[0];

        const optimizedConfig: PlayerScoreThresholdConfig = {
            ...currentConfig,
            scoreThresholds: optimizedThresholds,
            baseRankingProbability: baseThreshold.rankingProbabilities,
            maxRank: baseThreshold.rankingProbabilities.length,
            learningRate: optimizedLearningRate,
            updatedAt: new Date().toISOString()
        };

        return {
            originalConfig: currentConfig,
            optimizedConfig,
            changes: {
                learningRateChange: optimizedLearningRate - currentConfig.learningRate,
                thresholdChanges: optimizedThresholds.map((opt, index) => ({
                    index,
                    original: currentConfig.scoreThresholds[index],
                    optimized: opt,
                    changes: {
                        rank1Probability: opt.rankingProbabilities[0] - currentConfig.scoreThresholds[index].rankingProbabilities[0],
                        rank2Probability: opt.rankingProbabilities[1] - currentConfig.scoreThresholds[index].rankingProbabilities[1],
                        rank3Probability: opt.rankingProbabilities[2] - currentConfig.scoreThresholds[index].rankingProbabilities[2],
                        rank4Probability: opt.rankingProbabilities[3] - currentConfig.scoreThresholds[index].rankingProbabilities[3]
                    }
                }))
            }
        };
    }
});

/**
 * 获取配置建议
 */
export const getConfigRecommendations = query({
    args: {
        segmentName: v.string(),
        playerLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        playStyle: v.union(v.literal("aggressive"), v.literal("balanced"), v.literal("conservative"))
    },
    handler: async (ctx, args) => {
        const { segmentName, playerLevel, playStyle } = args;

        const baseConfig = HYBRID_SEGMENT_CONFIGS[segmentName];
        if (!baseConfig) {
            return null;
        }

        const recommendations = {
            segmentName,
            playerLevel,
            playStyle,
            recommendedConfig: { ...baseConfig },
            reasoning: [] as string[],
            alternatives: [] as Array<{
                name: string;
                description: string;
                config: typeof baseConfig;
            }>
        };

        // 基于玩家等级调整
        if (playerLevel === "beginner") {
            recommendations.recommendedConfig.learningRate = Math.min(0.1, baseConfig.learningRate);
            recommendations.reasoning.push("新手玩家建议使用较低的学习率，避免配置变化过快");
        } else if (playerLevel === "advanced") {
            recommendations.recommendedConfig.learningRate = Math.min(0.25, baseConfig.learningRate * 1.2);
            recommendations.reasoning.push("高级玩家可以使用较高的学习率，快速适应游戏变化");
        }

        // 基于游戏风格调整
        if (playStyle === "aggressive") {
            recommendations.recommendedConfig.scoreThresholds = baseConfig.scoreThresholds.map(threshold => ({
                ...threshold,
                rankingProbabilities: [
                    Math.min(0.5, threshold.rankingProbabilities[0] * 1.1),
                    threshold.rankingProbabilities[1],
                    threshold.rankingProbabilities[2],
                    Math.max(0.05, threshold.rankingProbabilities[3] * 0.9)
                ]
            }));
            recommendations.reasoning.push("激进风格玩家建议提高高名次概率");
        } else if (playStyle === "conservative") {
            recommendations.recommendedConfig.scoreThresholds = baseConfig.scoreThresholds.map(threshold => ({
                ...threshold,
                rankingProbabilities: [
                    Math.max(0.1, threshold.rankingProbabilities[0] * 0.9),
                    Math.min(0.4, threshold.rankingProbabilities[1] * 1.1),
                    threshold.rankingProbabilities[2],
                    threshold.rankingProbabilities[3]
                ]
            }));
            recommendations.reasoning.push("保守风格玩家建议提高稳定名次概率");
        }

        // 提供替代配置
        if (playStyle === "balanced") {
            recommendations.alternatives.push({
                name: "激进替代方案",
                description: "适合想要挑战高名次的玩家",
                config: {
                    ...baseConfig,
                    scoreThresholds: baseConfig.scoreThresholds.map(threshold => ({
                        ...threshold,
                        rankingProbabilities: [
                            Math.min(0.5, threshold.rankingProbabilities[0] * 1.2),
                            threshold.rankingProbabilities[1],
                            threshold.rankingProbabilities[2],
                            Math.max(0.05, threshold.rankingProbabilities[3] * 0.8)
                        ]
                    }))
                }
            });

            recommendations.alternatives.push({
                name: "保守替代方案",
                description: "适合追求稳定性的玩家",
                config: {
                    ...baseConfig,
                    scoreThresholds: baseConfig.scoreThresholds.map(threshold => ({
                        ...threshold,
                        rankingProbabilities: [
                            Math.max(0.1, threshold.rankingProbabilities[0] * 0.8),
                            Math.min(0.4, threshold.rankingProbabilities[1] * 1.2),
                            threshold.rankingProbabilities[2],
                            threshold.rankingProbabilities[3]
                        ]
                    }))
                }
            });
        }

        return recommendations;
    }
});
