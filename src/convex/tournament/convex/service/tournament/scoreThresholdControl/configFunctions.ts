/**
 * 分数门槛控制系统配置函数
 * 提供配置管理、验证和优化功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { getAllSegmentNames, getSegmentRule } from "../../segment/config";
import {
    getAdaptiveMode,
    getDefaultRankingProbabilities,
    getDefaultScoreThresholds,
    getHybridSegmentConfig,
    getLearningRate,
    getRankingMode,
    validateRankingProbabilities,
    validateScoreThresholds
} from "./config";
import { ScoreThresholdIntegration } from "./scoreThresholdIntegration";
import {
    ScoreThreshold,
    ScoreThresholdConfig
} from "./types";

// 定义段位验证器
const segmentNameValidator = v.union(
    v.literal("bronze"),
    v.literal("silver"),
    v.literal("gold"),
    v.literal("platinum"),
    v.literal("diamond"),
    v.literal("master"),
    v.literal("grandmaster")
);

// ==================== 配置查询函数 ====================

/**
 * 获取段位配置信息
 */
export const getSegmentConfigInfo = query({
    args: { segmentName: segmentNameValidator },
    handler: async (ctx, args) => {
        try {
            const hybridConfig = getHybridSegmentConfig(args.segmentName);
            const defaultThresholds = getDefaultScoreThresholds(args.segmentName);
            const defaultProbabilities = getDefaultRankingProbabilities(args.segmentName);
            const adaptiveMode = getAdaptiveMode(args.segmentName);
            const learningRate = getLearningRate(args.segmentName);
            const rankingMode = getRankingMode(args.segmentName);

            return {
                segmentName: args.segmentName,
                hybridConfig,
                defaultThresholds,
                defaultProbabilities,
                adaptiveMode,
                learningRate,
                rankingMode
            };
        } catch (error) {
            console.error(`获取段位配置信息失败: ${args.segmentName}`, error);
            return null;
        }
    }
});

/**
 * 比较段位配置
 */
export const compareSegmentConfigs = query({
    args: {
        segment1: segmentNameValidator,
        segment2: segmentNameValidator
    },
    handler: async (ctx, args) => {
        try {
            const config1 = getHybridSegmentConfig(args.segment1);
            const config2 = getHybridSegmentConfig(args.segment2);

            return {
                segment1: {
                    name: args.segment1,
                    config: config1
                },
                segment2: {
                    name: args.segment2,
                    config: config2
                },
                differences: {
                    maxRank: config1.maxRank !== config2.maxRank,
                    learningRate: config1.learningRate !== config2.learningRate,
                    adaptiveMode: config1.adaptiveMode !== config2.adaptiveMode,
                    scoreThresholdsCount: config1.scoreThresholds.length !== config2.scoreThresholds.length
                }
            };
        } catch (error) {
            console.error('比较段位配置失败:', error);
            return null;
        }
    }
});

/**
 * 验证分数门槛配置
 */
export const validateScoreThresholdConfig = query({
    args: {
        config: v.object({
            uid: v.string(),
            segmentName: segmentNameValidator,
            scoreThresholds: v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()),
                priority: v.number(),
                segmentName: v.optional(segmentNameValidator)
            })),
            baseRankingProbability: v.array(v.number()),
            maxRank: v.number(),
            adaptiveMode: v.union(
                v.literal("static"),
                v.literal("dynamic"),
                v.literal("learning")
            ),
            learningRate: v.number(),
            autoAdjustLearningRate: v.boolean(),
            rankingMode: v.union(
                v.literal("score_based"),
                v.literal("segment_based"),
                v.literal("hybrid")
            ),
            createdAt: v.string(),
            updatedAt: v.string()
        })
    },
    handler: async (ctx, args) => {
        try {
            const isValidThresholds = validateScoreThresholds(args.config.scoreThresholds);
            const isValidProbabilities = validateRankingProbabilities(args.config.baseRankingProbability);

            return {
                isValid: isValidThresholds && isValidProbabilities,
                thresholdValidation: isValidThresholds,
                probabilityValidation: isValidProbabilities,
                errors: []
            };
        } catch (error) {
            console.error('验证分数门槛配置失败:', error);
            return {
                isValid: false,
                thresholdValidation: false,
                probabilityValidation: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
});

/**
 * 获取所有可用段位
 */
export const getAvailableSegments = query({
    args: {},
    handler: async (ctx) => {
        return getAllSegmentNames();
    }
});

/**
 * 获取段位保护配置
 */
export const getSegmentProtectionConfig = query({
    args: { segmentName: segmentNameValidator },
    handler: async (ctx, args) => {
        return getSegmentRule(args.segmentName);
    }
});

/**
 * 获取混合模式配置详情
 */
export const getHybridModeConfigDetails = query({
    args: { segmentName: segmentNameValidator },
    handler: async (ctx, args) => {
        try {
            const config = getHybridSegmentConfig(args.segmentName);
            return {
                segmentName: args.segmentName,
                maxRank: config.maxRank,
                adaptiveMode: config.adaptiveMode,
                learningRate: config.learningRate,
                scoreThresholds: config.scoreThresholds
            };
        } catch (error) {
            console.error(`获取混合模式配置详情失败: ${args.segmentName}`, error);
            return null;
        }
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
            config: Partial<ScoreThresholdConfig>;
        }> = {
            "balanced": {
                name: "平衡型配置",
                description: "各名次概率相对均衡，适合新手玩家",
                config: {
                    scoreThresholds: [
                        { minScore: 0, maxScore: 1000, rankingProbabilities: [0.25, 0.25, 0.25, 0.25], priority: 1 },
                        { minScore: 1001, maxScore: 2000, rankingProbabilities: [0.30, 0.30, 0.25, 0.15], priority: 2 }
                    ],
                    adaptiveMode: "dynamic",
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
                    adaptiveMode: "dynamic",
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
                    adaptiveMode: "static",
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
        segmentName: segmentNameValidator
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
        oldSegment: segmentNameValidator,
        newSegment: segmentNameValidator
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
        segmentName: segmentNameValidator,
        scoreThresholds: v.array(v.object({
            minScore: v.number(),
            maxScore: v.number(),
            rankingProbabilities: v.array(v.number()),
            priority: v.number()
        })),
        adaptiveMode: v.union(
            v.literal("static"),
            v.literal("dynamic"),
            v.literal("learning")
        ),
        learningRate: v.number(),
        autoAdjustLearningRate: v.boolean()
    },
    handler: async (ctx, args) => {
        const nowISO = new Date().toISOString();

        // 计算基础概率
        const sortedThresholds = [...args.scoreThresholds].sort((a, b) => b.priority - a.priority);
        const baseThreshold = sortedThresholds[0];

        const config: ScoreThresholdConfig = {
            uid: args.uid,
            segmentName: args.segmentName,
            scoreThresholds: args.scoreThresholds,
            baseRankingProbability: baseThreshold.rankingProbabilities,
            maxRank: baseThreshold.rankingProbabilities.length,
            adaptiveMode: args.adaptiveMode,
            learningRate: Math.max(0.01, Math.min(0.3, args.learningRate)),
            autoAdjustLearningRate: args.autoAdjustLearningRate,
            rankingMode: "hybrid", // 默认混合模式
            createdAt: nowISO,
            updatedAt: nowISO
        };

        // 验证配置
        const isValidThresholds = validateScoreThresholds(config.scoreThresholds);
        if (!isValidThresholds) {
            throw new Error(`配置验证失败: 分数门槛配置无效`);
        }

        // 保存到数据库
        const existing = await ctx.db
            .query("score_threshold_configs")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, config as any);
        } else {
            await ctx.db.insert("score_threshold_configs", config as any);
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
            segmentName: segmentNameValidator,
            scoreThresholds: v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()),
                priority: v.number()
            })),
            adaptiveMode: v.union(
                v.literal("static"),
                v.literal("dynamic"),
                v.literal("learning")
            ),
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

                const config: ScoreThresholdConfig = {
                    uid: configData.uid,
                    segmentName: configData.segmentName,
                    scoreThresholds: configData.scoreThresholds,
                    baseRankingProbability: baseThreshold.rankingProbabilities,
                    maxRank: baseThreshold.rankingProbabilities.length,
                    adaptiveMode: configData.adaptiveMode,
                    learningRate: Math.max(0.01, Math.min(0.3, configData.learningRate)),
                    autoAdjustLearningRate: configData.autoAdjustLearningRate,
                    rankingMode: "hybrid", // 默认混合模式
                    createdAt: nowISO,
                    updatedAt: nowISO
                };

                // 验证配置
                const isValidThresholds = validateScoreThresholds(config.scoreThresholds);
                if (!isValidThresholds) {
                    results.push({
                        uid: configData.uid,
                        success: false,
                        error: `配置验证失败: 分数门槛配置无效`
                    });
                    continue;
                }

                // 保存到数据库
                const existing = await ctx.db
                    .query("score_threshold_configs")
                    .withIndex("by_uid", (q) => q.eq("uid", configData.uid))
                    .unique();

                if (existing) {
                    await ctx.db.patch(existing._id, config as any);
                } else {
                    await ctx.db.insert("score_threshold_configs", config as any);
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

/**
 * 优化配置
 */
export const optimizeConfig = mutation({
    args: {
        uid: v.string(),
        optimizationType: v.union(
            v.literal("performance"),
            v.literal("balance"),
            v.literal("aggressive")
        )
    },
    handler: async (ctx, args) => {
        try {
            // 获取当前配置
            const currentConfig = await ctx.db
                .query("score_threshold_configs")
                .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
                .unique();

            if (!currentConfig) {
                throw new Error('配置未找到');
            }

            // 根据优化类型调整配置
            let optimizedThresholds: ScoreThreshold[];
            let optimizedLearningRate: number;

            switch (args.optimizationType) {
                case "performance":
                    // 性能优化：提高高分概率
                    optimizedThresholds = currentConfig.scoreThresholds.map(threshold => ({
                        ...threshold,
                        rankingProbabilities: threshold.rankingProbabilities.map((prob, index) =>
                            index === 0 ? Math.min(0.9, prob * 1.2) : prob * 0.9
                        )
                    }));
                    optimizedLearningRate = Math.min(0.3, currentConfig.learningRate * 1.1);
                    break;

                case "balance":
                    // 平衡优化：平均分配概率
                    optimizedThresholds = currentConfig.scoreThresholds.map(threshold => ({
                        ...threshold,
                        rankingProbabilities: threshold.rankingProbabilities.map(() =>
                            1 / threshold.rankingProbabilities.length
                        )
                    }));
                    optimizedLearningRate = currentConfig.learningRate;
                    break;

                case "aggressive":
                    // 激进优化：提高学习率
                    optimizedThresholds = currentConfig.scoreThresholds;
                    optimizedLearningRate = Math.min(0.3, currentConfig.learningRate * 1.3);
                    break;

                default:
                    throw new Error('未知的优化类型');
            }

            // 重新归一化概率
            optimizedThresholds = optimizedThresholds.map(threshold => ({
                ...threshold,
                rankingProbabilities: threshold.rankingProbabilities.map(prob =>
                    prob / threshold.rankingProbabilities.reduce((sum, p) => sum + p, 0)
                )
            }));

            const optimizedConfig: ScoreThresholdConfig = {
                ...currentConfig,
                segmentName: currentConfig.segmentName as any,
                scoreThresholds: optimizedThresholds,
                learningRate: optimizedLearningRate,
                rankingMode: "hybrid" as any,
                adaptiveMode: "dynamic" as any,
                updatedAt: currentConfig.updatedAt // Use existing updatedAt
            };

            // 验证优化后的配置
            const isValidThresholds = validateScoreThresholds(optimizedConfig.scoreThresholds);
            if (!isValidThresholds) {
                throw new Error('优化后的配置验证失败');
            }

            // 更新配置
            await ctx.db.patch(currentConfig._id, {
                scoreThresholds: optimizedConfig.scoreThresholds,
                learningRate: optimizedConfig.learningRate,
                updatedAt: optimizedConfig.updatedAt
            });

            return {
                success: true,
                message: `配置优化成功: ${args.optimizationType}`,
                changes: {
                    thresholdsOptimized: true,
                    learningRateChanged: optimizedLearningRate !== currentConfig.learningRate
                }
            };
        } catch (error) {
            console.error('优化配置失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
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
            segmentName: segmentNameValidator,
            scoreThresholds: v.array(v.object({
                minScore: v.number(),
                maxScore: v.number(),
                rankingProbabilities: v.array(v.number()),
                priority: v.number()
            })),
            adaptiveMode: v.union(
                v.literal("static"),
                v.literal("dynamic"),
                v.literal("learning")
            ),
            learningRate: v.number(),
            autoAdjustLearningRate: v.boolean(),
            rankingMode: v.union(
                v.literal("score_based"),
                v.literal("segment_based"),
                v.literal("hybrid")
            ),
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

        const optimizedConfig: ScoreThresholdConfig = {
            ...currentConfig,
            segmentName: currentConfig.segmentName,
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
                thresholdChanges: optimizedThresholds.map((opt: any, index: number) => ({
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
        segmentName: segmentNameValidator,
        playerLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        playStyle: v.union(v.literal("aggressive"), v.literal("balanced"), v.literal("conservative"))
    },
    handler: async (ctx, args) => {
        const { segmentName, playerLevel, playStyle } = args;

        const segmentInfo = getSegmentRule(segmentName);
        if (!segmentInfo) {
            return null;
        }

        const recommendations = {
            segmentName,
            playerLevel,
            playStyle,
            segmentInfo,
            reasoning: [] as string[],
            alternatives: [] as Array<{
                name: string;
                description: string;
                segmentInfo: typeof segmentInfo;
            }>
        };

        // 基于玩家等级调整建议
        if (playerLevel === "beginner") {
            recommendations.reasoning.push("新手玩家建议从青铜段位开始，逐步提升");
        } else if (playerLevel === "advanced") {
            recommendations.reasoning.push("高级玩家可以挑战更高段位，注意保持稳定性");
        }

        // 基于游戏风格调整建议
        if (playStyle === "aggressive") {
            recommendations.reasoning.push("激进风格玩家建议关注连胜要求，保持高胜率");
        } else if (playStyle === "conservative") {
            recommendations.reasoning.push("保守风格玩家建议稳定积累积分，避免连续失败");
        }

        // 提供替代建议
        if (playStyle === "balanced") {
            recommendations.alternatives.push({
                name: "激进替代方案",
                description: "适合想要挑战高名次的玩家",
                segmentInfo: segmentInfo
            });

            recommendations.alternatives.push({
                name: "保守替代方案",
                description: "适合追求稳定性的玩家",
                segmentInfo: segmentInfo
            });
        }

        return recommendations;
    }
});
