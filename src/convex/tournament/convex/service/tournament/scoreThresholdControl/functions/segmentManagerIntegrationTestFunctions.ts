/**
 * SegmentManager集成测试函数
 * 用于在Convex中运行SegmentManager集成测试
 */

import { mutation } from "../../../../_generated/server";
import { runSegmentManagerIntegrationTests } from "../test/SegmentManagerIntegrationTest";

/**
 * 运行SegmentManager集成测试
 */
export const runSegmentManagerIntegrationTest = mutation({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🚀 开始运行SegmentManager集成测试...");

            await runSegmentManagerIntegrationTests();

            return {
                success: true,
                message: "SegmentManager集成测试完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ SegmentManager集成测试失败:", error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试单个玩家的段位信息获取
 */
export const testSinglePlayerSegmentInfo = mutation({
    args: {
        uid: v.string(),
        score: v.number(),
        aiCount: v.number()
    },
    handler: async (ctx, { uid, score, aiCount }) => {
        try {
            console.log(`🧪 测试玩家 ${uid} 的段位信息获取...`);

            // 这里需要导入RankingRecommendationManager
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const result = await rankingManager.generateMatchRankings(
                [{ uid, score }],
                aiCount
            );

            const playerResult = result.humanPlayers[0];

            return {
                success: true,
                playerResult: {
                    uid: playerResult.uid,
                    recommendedRank: playerResult.recommendedRank,
                    confidence: playerResult.confidence,
                    reasoning: playerResult.reasoning,
                    relativePerformance: playerResult.relativePerformance
                },
                aiOpponents: result.aiOpponents.map(ai => ({
                    uid: ai.uid,
                    recommendedRank: ai.recommendedRank,
                    recommendedScore: ai.recommendedScore,
                    difficulty: ai.difficulty,
                    behavior: ai.behavior
                })),
                matchContext: result.matchContext,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ 测试玩家 ${uid} 失败:`, error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试多玩家的段位信息获取
 */
export const testMultiPlayerSegmentInfo = mutation({
    args: {
        players: v.array(v.object({
            uid: v.string(),
            score: v.number()
        })),
        aiCount: v.number()
    },
    handler: async (ctx, { players, aiCount }) => {
        try {
            console.log(`🧪 测试多玩家段位信息获取 (${players.length}个玩家)...`);

            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const result = await rankingManager.generateMatchRankings(players, aiCount);

            return {
                success: true,
                humanPlayers: result.humanPlayers.map(player => ({
                    uid: player.uid,
                    recommendedRank: player.recommendedRank,
                    confidence: player.confidence,
                    reasoning: player.reasoning,
                    relativePerformance: player.relativePerformance
                })),
                aiOpponents: result.aiOpponents.map(ai => ({
                    uid: ai.uid,
                    recommendedRank: ai.recommendedRank,
                    recommendedScore: ai.recommendedScore,
                    difficulty: ai.difficulty,
                    behavior: ai.behavior
                })),
                matchContext: result.matchContext,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 多玩家段位信息测试失败:", error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 验证段位概率配置是否生效
 */
export const verifySegmentProbabilityConfig = mutation({
    args: {
        uid: v.string(),
        score: v.number(),
        totalParticipants: v.number(),
        iterations: v.number()
    },
    handler: async (ctx, { uid, score, totalParticipants, iterations = 100 }) => {
        try {
            console.log(`🧪 验证玩家 ${uid} 的段位概率配置 (${iterations}次迭代)...`);

            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const aiCount = totalParticipants - 1;
            const results = [];

            // 运行多次排名推荐
            for (let i = 0; i < iterations; i++) {
                const result = await rankingManager.generateMatchRankings([{ uid, score }], aiCount);
                results.push(result.humanPlayers[0].recommendedRank);
            }

            // 分析排名分布
            const rankDistribution = new Map<number, number>();
            results.forEach(rank => {
                rankDistribution.set(rank, (rankDistribution.get(rank) || 0) + 1);
            });

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

            return {
                success: true,
                uid,
                totalParticipants,
                iterations,
                rankDistribution: distribution,
                averageRank: results.reduce((sum, rank) => sum + rank, 0) / results.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("❌ 段位概率配置验证失败:", error);
            return {
                success: false,
                message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});
