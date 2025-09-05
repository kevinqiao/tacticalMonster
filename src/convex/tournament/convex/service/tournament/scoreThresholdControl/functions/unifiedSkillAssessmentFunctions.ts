/**
 * 统一技能评估系统的 Convex 函数
 * 提供统一的技能评估服务
 */

import { v } from "convex/values";
import { mutation, query } from "../../../../_generated/server";
import { UnifiedSkillAssessment } from "../core/UnifiedSkillAssessment";
import { PlayerPerformanceProfile } from "../managers/RankingRecommendationManager";

/**
 * 评估单个玩家技能
 */
export const assessPlayerSkill = mutation({
    args: {
        uid: v.string(),
        averageRank: v.number(),
        winRate: v.number(),
        averageScore: v.number(),
        totalMatches: v.number(),
        consistency: v.number(),
        trend: v.optional(v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")))
    },
    handler: async (ctx, { uid, averageRank, winRate, averageScore, totalMatches, consistency, trend = "stable" }) => {
        console.log(`🧪 评估玩家技能: ${uid}`);

        try {
            const skillAssessment = new UnifiedSkillAssessment();

            const profile: PlayerPerformanceProfile = {
                uid,
                segmentName: 'gold', // 默认段位
                averageRank,
                winRate,
                averageScore,
                totalMatches,
                recentPerformance: {
                    last10Matches: [],
                    trendDirection: trend,
                    consistency
                }
            };

            const result = skillAssessment.assessPlayerSkill(profile);

            console.log(`✅ 技能评估完成: ${uid}`);
            console.log(`   等级: ${result.level}`);
            console.log(`   因子: ${result.factor.toFixed(3)}`);
            console.log(`   信心度: ${result.confidence.toFixed(3)}`);

            return {
                success: true,
                result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ 技能评估失败: ${uid}`, error);
            return {
                success: false,
                message: `评估失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 批量评估多个玩家技能
 */
export const assessMultiplePlayers = mutation({
    args: {
        players: v.array(v.object({
            uid: v.string(),
            averageRank: v.number(),
            winRate: v.number(),
            averageScore: v.number(),
            totalMatches: v.number(),
            consistency: v.number(),
            trend: v.optional(v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")))
        }))
    },
    handler: async (ctx, { players }) => {
        console.log(`🧪 批量评估 ${players.length} 个玩家技能`);

        try {
            const skillAssessment = new UnifiedSkillAssessment();
            const results = new Map();

            for (const playerData of players) {
                const profile: PlayerPerformanceProfile = {
                    uid: playerData.uid,
                    segmentName: 'gold',
                    averageRank: playerData.averageRank,
                    winRate: playerData.winRate,
                    averageScore: playerData.averageScore,
                    totalMatches: playerData.totalMatches,
                    recentPerformance: {
                        last10Matches: [],
                        trendDirection: playerData.trend || 'stable',
                        consistency: playerData.consistency
                    }
                };

                const result = skillAssessment.assessPlayerSkill(profile);
                results.set(playerData.uid, result);
            }

            // 按技能因子排序
            const sortedResults = Array.from(results.entries())
                .sort(([, a], [, b]) => b.factor - a.factor);

            console.log(`✅ 批量评估完成，按技能排序:`);
            sortedResults.forEach(([uid, result], index) => {
                console.log(`第${index + 1}名: ${uid} - ${result.level} (${result.factor.toFixed(3)})`);
            });

            return {
                success: true,
                results: Object.fromEntries(results),
                sortedResults: sortedResults.map(([uid, result]) => ({ uid, ...result })),
                distribution: skillAssessment.getSkillDistribution(results),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 批量技能评估失败:', error);
            return {
                success: false,
                message: `批量评估失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 比较两个玩家技能
 */
export const comparePlayers = mutation({
    args: {
        player1: v.object({
            uid: v.string(),
            averageRank: v.number(),
            winRate: v.number(),
            averageScore: v.number(),
            totalMatches: v.number(),
            consistency: v.number(),
            trend: v.optional(v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")))
        }),
        player2: v.object({
            uid: v.string(),
            averageRank: v.number(),
            winRate: v.number(),
            averageScore: v.number(),
            totalMatches: v.number(),
            consistency: v.number(),
            trend: v.optional(v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")))
        })
    },
    handler: async (ctx, { player1, player2 }) => {
        console.log(`🧪 比较玩家技能: ${player1.uid} vs ${player2.uid}`);

        try {
            const skillAssessment = new UnifiedSkillAssessment();

            const profile1: PlayerPerformanceProfile = {
                uid: player1.uid,
                segmentName: 'gold',
                averageRank: player1.averageRank,
                winRate: player1.winRate,
                averageScore: player1.averageScore,
                totalMatches: player1.totalMatches,
                recentPerformance: {
                    last10Matches: [],
                    trendDirection: player1.trend || 'stable',
                    consistency: player1.consistency
                }
            };

            const profile2: PlayerPerformanceProfile = {
                uid: player2.uid,
                segmentName: 'gold',
                averageRank: player2.averageRank,
                winRate: player2.winRate,
                averageScore: player2.averageScore,
                totalMatches: player2.totalMatches,
                recentPerformance: {
                    last10Matches: [],
                    trendDirection: player2.trend || 'stable',
                    consistency: player2.consistency
                }
            };

            const result1 = skillAssessment.assessPlayerSkill(profile1);
            const result2 = skillAssessment.assessPlayerSkill(profile2);
            const comparison = skillAssessment.comparePlayers(result1, result2);

            console.log(`✅ 玩家比较完成:`);
            console.log(`   ${player1.uid}: ${result1.level} (${result1.factor.toFixed(3)})`);
            console.log(`   ${player2.uid}: ${result2.level} (${result2.factor.toFixed(3)})`);
            console.log(`   比较结果: ${comparison.winner}`);

            return {
                success: true,
                player1: { uid: player1.uid, ...result1 },
                player2: { uid: player2.uid, ...result2 },
                comparison,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 玩家比较失败:', error);
            return {
                success: false,
                message: `比较失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 运行统一技能评估测试
 */
export const runUnifiedSkillAssessmentTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 运行统一技能评估测试...');

        try {
            const skillAssessment = new UnifiedSkillAssessment();

            // 测试数据
            const testProfiles = [
                {
                    uid: 'expert_player',
                    averageRank: 1.2,
                    winRate: 0.8,
                    averageScore: 8000,
                    totalMatches: 80,
                    consistency: 0.95,
                    trend: 'stable' as const
                },
                {
                    uid: 'intermediate_player',
                    averageRank: 2.3,
                    winRate: 0.4,
                    averageScore: 3000,
                    totalMatches: 35,
                    consistency: 0.7,
                    trend: 'improving' as const
                },
                {
                    uid: 'beginner_player',
                    averageRank: 4.5,
                    winRate: 0.15,
                    averageScore: 800,
                    totalMatches: 10,
                    consistency: 0.3,
                    trend: 'declining' as const
                },
                {
                    uid: 'inconsistent_player',
                    averageRank: 2.0,
                    winRate: 0.5,
                    averageScore: 4000,
                    totalMatches: 30,
                    consistency: 0.2,
                    trend: 'stable' as const
                }
            ];

            const results = new Map();

            for (const playerData of testProfiles) {
                const profile: PlayerPerformanceProfile = {
                    uid: playerData.uid,
                    segmentName: 'gold',
                    averageRank: playerData.averageRank,
                    winRate: playerData.winRate,
                    averageScore: playerData.averageScore,
                    totalMatches: playerData.totalMatches,
                    recentPerformance: {
                        last10Matches: [],
                        trendDirection: playerData.trend,
                        consistency: playerData.consistency
                    }
                };

                const result = skillAssessment.assessPlayerSkill(profile);
                results.set(playerData.uid, result);
            }

            // 按技能因子排序
            const sortedResults = Array.from(results.entries())
                .sort(([, a], [, b]) => b.factor - a.factor);

            console.log('✅ 统一技能评估测试完成:');
            sortedResults.forEach(([uid, result], index) => {
                console.log(`第${index + 1}名: ${uid} - ${result.level} (${result.factor.toFixed(3)})`);
                console.log(`   信心度: ${result.confidence.toFixed(3)}`);
                console.log(`   说明: ${result.reasoning}`);
            });

            return {
                success: true,
                message: "统一技能评估测试完成",
                results: Object.fromEntries(results),
                sortedResults: sortedResults.map(([uid, result]) => ({ uid, ...result })),
                distribution: skillAssessment.getSkillDistribution(results),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 统一技能评估测试失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 获取技能评估配置
 */
export const getSkillAssessmentConfig = query({
    args: {},
    handler: async (ctx) => {
        return {
            defaultWeights: {
                rank: 0.3,
                winRate: 0.25,
                consistency: 0.25,
                score: 0.2
            },
            levelThresholds: {
                diamond: 0.9,
                platinum: 0.75,
                gold: 0.6,
                silver: 0.4
            },
            matchCount: 50,
            includeTrend: true
        };
    }
});
