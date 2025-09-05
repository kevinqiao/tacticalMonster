/**
 * 段位概率配置测试的 Convex 函数
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { runSegmentProbabilityConfigTests } from "../test/SegmentProbabilityConfigTest";

/**
 * 运行段位概率配置测试
 */
export const runSegmentProbabilityConfigTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 开始运行段位概率配置测试...');

        try {
            await runSegmentProbabilityConfigTests();

            return {
                success: true,
                message: "段位概率配置测试完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 段位概率配置测试失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试特定参与者数量的段位概率使用
 */
export const testParticipantCountSegmentProbability = mutation({
    args: {
        player: v.object({
            uid: v.string(),
            score: v.number(),
            segment: v.union(
                v.literal("bronze"),
                v.literal("silver"),
                v.literal("gold"),
                v.literal("platinum"),
                v.literal("diamond"),
                v.literal("master"),
                v.literal("grandmaster")
            )
        }),
        totalParticipants: v.number()
    },
    handler: async (ctx, { player, totalParticipants }) => {
        console.log(`🧪 测试${totalParticipants}人比赛的段位概率使用: ${player.uid} (${player.segment}段位)`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const aiCount = totalParticipants - 1; // 假设只有1个真人玩家
            const humanPlayer = { uid: player.uid, score: player.score };

            const result = await rankingManager.generateMatchRankings([humanPlayer], aiCount);
            const playerResult = result.humanPlayers[0];
            const usedSegmentProbability = playerResult.reasoning.includes('排名概率');

            // 检查是否应该使用段位概率
            const supportedCounts = [4, 6, 8]; // 从段位配置中获取
            const shouldUseProbability = supportedCounts.includes(totalParticipants);

            console.log(`✅ ${totalParticipants}人比赛结果:`);
            console.log(`   玩家: ${player.uid} (${player.segment}段位)`);
            console.log(`   分数: ${player.score}`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   信心度: ${(playerResult.confidence * 100).toFixed(1)}%`);
            console.log(`   表现: ${playerResult.relativePerformance}`);
            console.log(`   推理: ${playerResult.reasoning}`);
            console.log(`   使用段位概率: ${usedSegmentProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   预期使用段位概率: ${shouldUseProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   结果: ${usedSegmentProbability === shouldUseProbability ? '✅ 正确' : '❌ 错误'}`);

            return {
                success: true,
                player: {
                    uid: player.uid,
                    segment: player.segment,
                    score: player.score
                },
                result: {
                    recommendedRank: playerResult.recommendedRank,
                    confidence: playerResult.confidence,
                    relativePerformance: playerResult.relativePerformance,
                    reasoning: playerResult.reasoning
                },
                usedSegmentProbability,
                shouldUseProbability,
                isCorrect: usedSegmentProbability === shouldUseProbability,
                totalParticipants,
                aiCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试参与者数量段位概率失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 批量测试不同参与者数量
 */
export const testMultipleParticipantCounts = mutation({
    args: {
        player: v.object({
            uid: v.string(),
            score: v.number(),
            segment: v.union(
                v.literal("bronze"),
                v.literal("silver"),
                v.literal("gold"),
                v.literal("platinum"),
                v.literal("diamond"),
                v.literal("master"),
                v.literal("grandmaster")
            )
        }),
        participantCounts: v.array(v.number())
    },
    handler: async (ctx, { player, participantCounts }) => {
        console.log(`🧪 批量测试不同参与者数量: ${player.uid} (${player.segment}段位)`);
        console.log(`参与者数量: [${participantCounts.join(', ')}]`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const results = [];
            const supportedCounts = [4, 6, 8]; // 从段位配置中获取

            for (const totalParticipants of participantCounts) {
                const aiCount = totalParticipants - 1; // 假设只有1个真人玩家
                const humanPlayer = { uid: player.uid, score: player.score };

                const result = await rankingManager.generateMatchRankings([humanPlayer], aiCount);
                const playerResult = result.humanPlayers[0];
                const usedSegmentProbability = playerResult.reasoning.includes('排名概率');
                const shouldUseProbability = supportedCounts.includes(totalParticipants);

                results.push({
                    totalParticipants,
                    aiCount,
                    recommendedRank: playerResult.recommendedRank,
                    confidence: playerResult.confidence,
                    usedSegmentProbability,
                    shouldUseProbability,
                    isCorrect: usedSegmentProbability === shouldUseProbability,
                    reasoning: playerResult.reasoning
                });

                console.log(`✅ ${totalParticipants}人比赛: 使用段位概率 ${usedSegmentProbability ? '✅ 是' : '❌ 否'} (预期: ${shouldUseProbability ? '是' : '否'}) ${usedSegmentProbability === shouldUseProbability ? '✅' : '❌'}`);
            }

            const correctCount = results.filter(r => r.isCorrect).length;
            const totalCount = results.length;
            const accuracy = (correctCount / totalCount * 100).toFixed(1);

            console.log(`\n总体结果: ${correctCount}/${totalCount} 正确 (${accuracy}%)`);

            return {
                success: true,
                player: {
                    uid: player.uid,
                    segment: player.segment,
                    score: player.score
                },
                results,
                summary: {
                    totalTests: totalCount,
                    correctTests: correctCount,
                    accuracy: parseFloat(accuracy),
                    supportedCounts
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 批量测试参与者数量失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试段位概率的实际效果
 */
export const testSegmentProbabilityEffectiveness = mutation({
    args: {
        player: v.object({
            uid: v.string(),
            score: v.number(),
            segment: v.union(
                v.literal("bronze"),
                v.literal("silver"),
                v.literal("gold"),
                v.literal("platinum"),
                v.literal("diamond"),
                v.literal("master"),
                v.literal("grandmaster")
            )
        }),
        totalParticipants: v.number(),
        iterations: v.number()
    },
    handler: async (ctx, { player, totalParticipants, iterations = 100 }) => {
        console.log(`🧪 测试段位概率实际效果: ${player.uid} (${player.segment}段位) - ${totalParticipants}人比赛 - ${iterations}次迭代`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const aiCount = totalParticipants - 1; // 假设只有1个真人玩家
            const humanPlayer = { uid: player.uid, score: player.score };

            const rankDistribution = new Map<number, number>();

            // 运行多次排名推荐
            for (let i = 0; i < iterations; i++) {
                const result = await rankingManager.generateMatchRankings([humanPlayer], aiCount);
                const rank = result.humanPlayers[0].recommendedRank;
                rankDistribution.set(rank, (rankDistribution.get(rank) || 0) + 1);
            }

            // 分析排名分布
            const distribution = [];
            for (let rank = 1; rank <= totalParticipants; rank++) {
                const count = rankDistribution.get(rank) || 0;
                const percentage = (count / iterations * 100).toFixed(1);
                distribution.push({
                    rank,
                    count,
                    percentage: parseFloat(percentage)
                });
            }

            console.log(`✅ ${totalParticipants}人比赛排名分布 (${iterations}次迭代):`);
            distribution.forEach(d => {
                console.log(`   第${d.rank}名: ${d.count}次 (${d.percentage}%)`);
            });

            // 验证段位概率是否生效
            const firstRankCount = rankDistribution.get(1) || 0;
            const firstRankPercentage = firstRankCount / iterations;

            // 根据段位获取理论概率
            const theoreticalProbabilities = {
                'bronze': { 4: 0.25, 6: 0.20, 8: 0.18 },
                'silver': { 4: 0.30, 6: 0.25, 8: 0.22 },
                'gold': { 4: 0.35, 6: 0.30, 8: 0.28 },
                'platinum': { 4: 0.40, 6: 0.35, 8: 0.32 },
                'diamond': { 4: 0.45, 6: 0.40, 8: 0.38 },
                'master': { 4: 0.50, 6: 0.45, 8: 0.42 },
                'grandmaster': { 4: 0.55, 6: 0.50, 8: 0.48 }
            };

            const expectedFirstRankProbability = theoreticalProbabilities[player.segment]?.[totalParticipants] || 0.25;
            const isCloseToExpected = Math.abs(firstRankPercentage - expectedFirstRankProbability) < 0.1;

            console.log(`\n第1名概率验证:`);
            console.log(`   实际概率: ${(firstRankPercentage * 100).toFixed(1)}%`);
            console.log(`   理论概率: ${(expectedFirstRankProbability * 100).toFixed(1)}%`);
            console.log(`   接近理论值: ${isCloseToExpected ? '✅ 是' : '❌ 否'}`);

            return {
                success: true,
                player: {
                    uid: player.uid,
                    segment: player.segment,
                    score: player.score
                },
                testConfig: {
                    totalParticipants,
                    aiCount,
                    iterations
                },
                distribution,
                analysis: {
                    firstRankCount,
                    firstRankPercentage,
                    expectedFirstRankProbability,
                    isCloseToExpected
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试段位概率效果失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});
