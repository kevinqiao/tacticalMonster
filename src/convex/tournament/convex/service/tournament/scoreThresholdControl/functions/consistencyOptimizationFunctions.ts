/**
 * 一致性优化排名推荐的 Convex 函数
 * 用于在 Convex 环境中演示一致性如何优化排名推荐
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { ConsistencyOptimizationExample } from "../test/ConsistencyOptimizationExample";

/**
 * 运行所有一致性优化示例
 */
export const runConsistencyOptimizationExamples = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎯 开始一致性优化排名推荐示例...");

        try {
            const example = new ConsistencyOptimizationExample();
            await example.runAllExamples();

            console.log("✅ 所有一致性优化示例运行完成！");
            return {
                success: true,
                message: "所有一致性优化示例运行完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 一致性优化示例运行失败:", error);
            return {
                success: false,
                message: `示例运行失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 分析特定玩家的一致性对排名推荐的影响
 */
export const analyzePlayerConsistencyImpact = mutation({
    args: {
        playerId: v.string(),
        historicalScores: v.array(v.number()),
        currentScore: v.number()
    },
    handler: async (ctx, { playerId, historicalScores, currentScore }) => {
        console.log(`🧪 分析玩家 ${playerId} 的一致性影响...`);
        console.log(`📊 历史分数: [${historicalScores.join(', ')}]`);
        console.log(`🎯 当前分数: ${currentScore}`);

        try {
            const example = new ConsistencyOptimizationExample();

            // 计算一致性
            const consistency = (example as any).calculateConsistency(historicalScores);

            // 计算技能因子影响
            const skillImpact = (consistency - 0.5) * 0.2;

            // 计算信心度影响
            const confidenceImpact = consistency * 0.2;

            // 获取一致性描述
            const description = (example as any).getConsistencyDescription(consistency);

            // 获取排名推荐
            const rankingRecommendation = (example as any).getRankingRecommendation(consistency, skillImpact);

            console.log(`✅ 一致性分析完成:`);
            console.log(`   一致性分数: ${consistency.toFixed(3)}`);
            console.log(`   一致性描述: ${description}`);
            console.log(`   技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
            console.log(`   信心度影响: +${confidenceImpact.toFixed(3)}`);
            console.log(`   排名推荐: ${rankingRecommendation}`);

            return {
                success: true,
                playerId,
                currentScore,
                historicalScores,
                analysis: {
                    consistency: consistency,
                    consistencyDescription: description,
                    skillFactorImpact: skillImpact,
                    confidenceImpact: confidenceImpact,
                    rankingRecommendation: rankingRecommendation
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 玩家一致性分析失败:", error);
            return {
                success: false,
                message: `分析失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 比较不同一致性水平对排名推荐的影响
 */
export const compareConsistencyLevels = mutation({
    args: {
        consistencyLevels: v.array(v.number())
    },
    handler: async (ctx, { consistencyLevels }) => {
        console.log("🧪 比较不同一致性水平对排名推荐的影响...");
        console.log(`📊 一致性水平: [${consistencyLevels.join(', ')}]`);

        try {
            const example = new ConsistencyOptimizationExample();

            const comparisons = consistencyLevels.map(consistency => {
                const skillImpact = (consistency - 0.5) * 0.2;
                const confidenceImpact = consistency * 0.2;
                const description = (example as any).getConsistencyDescription(consistency);
                const rankingRecommendation = (example as any).getRankingRecommendation(consistency, skillImpact);

                return {
                    consistency: consistency,
                    consistencyDescription: description,
                    skillFactorImpact: skillImpact,
                    confidenceImpact: confidenceImpact,
                    rankingRecommendation: rankingRecommendation
                };
            });

            console.log(`✅ 一致性水平比较完成:`);
            comparisons.forEach(comp => {
                console.log(`   一致性 ${comp.consistency.toFixed(1)} (${comp.consistencyDescription}):`);
                console.log(`     技能因子影响: ${comp.skillFactorImpact > 0 ? '+' : ''}${comp.skillFactorImpact.toFixed(3)}`);
                console.log(`     信心度影响: +${comp.confidenceImpact.toFixed(3)}`);
                console.log(`     排名推荐: ${comp.rankingRecommendation}`);
            });

            return {
                success: true,
                consistencyLevels,
                comparisons,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 一致性水平比较失败:", error);
            return {
                success: false,
                message: `比较失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 分析一致性阈值对排名推荐的影响
 */
export const analyzeConsistencyThresholds = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 分析一致性阈值对排名推荐的影响...");

        try {
            const example = new ConsistencyOptimizationExample();

            const thresholds = [
                { min: 0.9, max: 1.0, level: '极高一致性', color: '🟢' },
                { min: 0.8, max: 0.9, level: '高一致性', color: '🟡' },
                { min: 0.6, max: 0.8, level: '中等一致性', color: '🟠' },
                { min: 0.4, max: 0.6, level: '低一致性', color: '🔴' },
                { min: 0.0, max: 0.4, level: '极低一致性', color: '⚫' }
            ];

            const thresholdAnalysis = thresholds.map(threshold => {
                const midValue = (threshold.min + threshold.max) / 2;
                const skillImpact = (midValue - 0.5) * 0.2;
                const confidenceImpact = midValue * 0.2;
                const recommendationStrategy = (example as any).getRecommendationStrategy(threshold.level);

                return {
                    ...threshold,
                    midValue: midValue,
                    skillFactorImpact: skillImpact,
                    confidenceImpact: confidenceImpact,
                    recommendationStrategy: recommendationStrategy
                };
            });

            console.log(`✅ 一致性阈值分析完成:`);
            thresholdAnalysis.forEach(threshold => {
                console.log(`${threshold.color} ${threshold.level} (${threshold.min}-${threshold.max}):`);
                console.log(`  技能因子影响: ${threshold.skillFactorImpact > 0 ? '+' : ''}${threshold.skillFactorImpact.toFixed(3)}`);
                console.log(`  信心度影响: +${threshold.confidenceImpact.toFixed(3)}`);
                console.log(`  推荐策略: ${threshold.recommendationStrategy}`);
            });

            return {
                success: true,
                thresholdAnalysis,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 一致性阈值分析失败:", error);
            return {
                success: false,
                message: `分析失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 模拟真实世界排名场景
 */
export const simulateRealWorldRankingScenario = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🧪 模拟真实世界排名场景...");

        try {
            const example = new ConsistencyOptimizationExample();

            const players = [
                {
                    uid: 'player_1',
                    score: 12000,
                    historicalScores: [12000, 11800, 12200, 11900, 12100, 12050, 11950, 12150, 11850, 12080],
                    description: '稳定高手'
                },
                {
                    uid: 'player_2',
                    score: 12000,
                    historicalScores: [15000, 8000, 13000, 9000, 14000, 7000, 16000, 6000, 11000, 10000],
                    description: '不稳定高手'
                },
                {
                    uid: 'player_3',
                    score: 12000,
                    historicalScores: [10000, 11000, 11500, 12000, 12500, 13000, 13500, 14000, 14500, 15000],
                    description: '进步型玩家'
                },
                {
                    uid: 'player_4',
                    score: 12000,
                    historicalScores: [12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000],
                    description: '完美稳定玩家'
                }
            ];

            const playerAnalysis = players.map(player => {
                const consistency = (example as any).calculateConsistency(player.historicalScores);
                const skillImpact = (consistency - 0.5) * 0.2;
                const confidenceImpact = consistency * 0.2;
                const rankingRecommendation = (example as any).getRankingRecommendation(consistency, skillImpact);

                return {
                    ...player,
                    consistency: consistency,
                    skillFactorImpact: skillImpact,
                    confidenceImpact: confidenceImpact,
                    rankingRecommendation: rankingRecommendation
                };
            });

            // 按一致性排序
            const sortedPlayers = playerAnalysis.sort((a, b) => b.consistency - a.consistency);

            console.log(`✅ 真实世界排名场景模拟完成:`);
            sortedPlayers.forEach((player, index) => {
                console.log(`第${index + 1}名: ${player.description} (${player.uid})`);
                console.log(`  一致性: ${player.consistency.toFixed(3)}`);
                console.log(`  技能因子影响: ${player.skillFactorImpact > 0 ? '+' : ''}${player.skillFactorImpact.toFixed(3)}`);
                console.log(`  信心度影响: +${player.confidenceImpact.toFixed(3)}`);
                console.log(`  排名推荐: ${player.rankingRecommendation}`);
            });

            return {
                success: true,
                players: playerAnalysis,
                sortedPlayers: sortedPlayers,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 真实世界排名场景模拟失败:", error);
            return {
                success: false,
                message: `模拟失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});
