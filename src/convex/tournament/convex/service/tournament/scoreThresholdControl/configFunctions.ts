/**
 * 分数门槛控制系统配置函数
 * 提供配置管理、验证和优化功能
 */

import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { getAllSegmentNames, getSegmentRule } from "../../segment/config";
import { ScoreThresholdIntegration } from "./scoreThresholdIntegration";
import { PlayerScoreThresholdConfig } from "./scoreThresholdRankingController";

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
        return ScoreThresholdIntegration.getSegmentConfigInfo(args.segmentName);
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
            segmentName: segmentNameValidator,
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
        const segmentInfo = getSegmentRule(args.segmentName);
        if (!segmentInfo) {
            return null;
        }

        // 返回段位基本信息
        return {
            segmentName: args.segmentName,
            tier: segmentInfo.tier,
            color: segmentInfo.color,
            icon: segmentInfo.icon,
            promotion: segmentInfo.promotion,
            demotion: segmentInfo.demotion,
            nextSegment: segmentInfo.nextSegment,
            previousSegment: segmentInfo.previousSegment
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
            segmentName: segmentNameValidator,
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
            segmentName: segmentNameValidator,
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
