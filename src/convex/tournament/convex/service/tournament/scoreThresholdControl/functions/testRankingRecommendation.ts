/**
 * Convex函数：推荐排名系统测试
 * 可以直接在Convex环境中调用进行测试
 */

import { v } from "convex/values";
import { mutation, query } from "../../../../_generated/server";
import { quickTestRankingRecommendation, testRankingRecommendation } from '../test/TestRunner';

/**
 * 完整的推荐排名测试
 */
export const runFullRankingTest = mutation({
    args: {},
    handler: async (ctx) => {
        try {
            console.log('🧪 开始完整推荐排名测试...');
            const result = await testRankingRecommendation(ctx);

            return {
                success: true,
                timestamp: new Date().toISOString(),
                testResults: result,
                summary: {
                    validationPassed: result.validation.success,
                    performanceMs: result.performance.avgTime,
                    boundaryPassed: result.boundary.success,
                    overallPassed: result.overall
                }
            };

        } catch (error) {
            console.error('测试执行失败:', error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 快速验证测试
 */
export const runQuickRankingTest = mutation({
    args: {},
    handler: async (ctx) => {
        try {
            console.log('⚡ 开始快速推荐排名测试...');
            const result = await quickTestRankingRecommendation(ctx);

            return {
                success: result.success,
                timestamp: new Date().toISOString(),
                testsRun: result.results.length,
                errors: result.errors,
                results: result.results
            };

        } catch (error) {
            console.error('快速测试执行失败:', error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试单个玩家排名推荐
 */
export const testSinglePlayerRanking = mutation({
    args: {
        uid: v.string(),
        score: v.number(),
        aiCount: v.optional(v.number())
    },
    handler: async (ctx, { uid, score, aiCount = 5 }) => {
        try {
            const { RankingRecommendationManager } = await import('../managers/RankingRecommendationManager');
            const rankingManager = new RankingRecommendationManager(ctx);

            const result = await rankingManager.generateMatchRankings(
                [{ uid, score }],
                aiCount
            );

            const player = result.humanPlayers[0];

            return {
                success: true,
                player: {
                    uid: player.uid,
                    score,
                    recommendedRank: player.recommendedRank,
                    confidence: player.confidence,
                    relativePerformance: player.relativePerformance,
                    reasoning: player.reasoning
                },
                aiOpponents: result.aiOpponents.map(ai => ({
                    uid: ai.uid,
                    rank: ai.recommendedRank,
                    score: ai.recommendedScore,
                    difficulty: ai.difficulty,
                    behavior: ai.behavior
                })),
                matchContext: result.matchContext,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('单玩家测试失败:', error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试多玩家排名推荐
 */
export const testMultiPlayerRanking = mutation({
    args: {
        players: v.array(v.object({
            uid: v.string(),
            score: v.number()
        })),
        aiCount: v.optional(v.number())
    },
    handler: async (ctx, { players, aiCount = 3 }) => {
        try {
            const { RankingRecommendationManager } = await import('../managers/RankingRecommendationManager');
            const rankingManager = new RankingRecommendationManager(ctx);

            const result = await rankingManager.generateMatchRankings(players, aiCount);

            return {
                success: true,
                humanPlayers: result.humanPlayers.map(player => ({
                    uid: player.uid,
                    originalScore: players.find(p => p.uid === player.uid)?.score,
                    recommendedRank: player.recommendedRank,
                    confidence: player.confidence,
                    relativePerformance: player.relativePerformance,
                    reasoning: player.reasoning
                })),
                aiOpponents: result.aiOpponents.map(ai => ({
                    uid: ai.uid,
                    rank: ai.recommendedRank,
                    score: ai.recommendedScore,
                    scoreRange: ai.scoreRange,
                    difficulty: ai.difficulty,
                    behavior: ai.behavior
                })),
                matchContext: result.matchContext,
                analysis: {
                    totalParticipants: result.matchContext.totalParticipants,
                    humanCount: result.matchContext.humanPlayersCount,
                    aiCount: result.matchContext.aiPlayersCount,
                    averageHumanScore: result.matchContext.averageHumanScore,
                    scoreSpread: result.matchContext.scoreDistribution.highest - result.matchContext.scoreDistribution.lowest
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('多玩家测试失败:', error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试Manager的推荐接口
 */
export const testManagerRanking = mutation({
    args: {
        uid: v.string(),
        score: v.number(),
        aiCount: v.optional(v.number())
    },
    handler: async (ctx, { uid, score, aiCount = 5 }) => {
        try {
            const { RankingRecommendationManager } = await import('../managers/RankingRecommendationManager');
            const rankingManager = new RankingRecommendationManager(ctx);

            const result = await rankingManager.generateMatchRankings(
                [{ uid, score }],
                aiCount
            );

            const player = result.humanPlayers[0];
            return {
                success: true,
                recommendedRank: player.recommendedRank,
                confidence: player.confidence,
                reasoning: player.reasoning,
                relativePerformance: player.relativePerformance,
                aiOpponents: result.aiOpponents.length,
                timestamp: new Date().toISOString(),
                input: { uid, score, aiCount }
            };

        } catch (error) {
            console.error('Manager测试失败:', error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 比较不同技能水平的排名推荐
 */
export const compareSkillLevelRankings = mutation({
    args: {
        testScores: v.optional(v.array(v.number())),
        aiCount: v.optional(v.number())
    },
    handler: async (ctx, { testScores = [3000, 6000, 9000, 12000], aiCount = 5 }) => {
        try {
            const { RankingRecommendationManager } = await import('../managers/RankingRecommendationManager');
            const rankingManager = new RankingRecommendationManager(ctx);

            const results = [];

            for (let i = 0; i < testScores.length; i++) {
                const score = testScores[i];
                const uid = `test_player_${i + 1}`;

                const result = await rankingManager.generateMatchRankings(
                    [{ uid, score }],
                    aiCount
                );

                const player = result.humanPlayers[0];

                results.push({
                    uid,
                    score,
                    recommendedRank: player.recommendedRank,
                    confidence: player.confidence,
                    relativePerformance: player.relativePerformance,
                    aiDifficultyDistribution: result.aiOpponents.reduce((acc, ai) => {
                        acc[ai.difficulty] = (acc[ai.difficulty] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                    aiBehaviorDistribution: result.aiOpponents.reduce((acc, ai) => {
                        acc[ai.behavior] = (acc[ai.behavior] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                });
            }

            return {
                success: true,
                comparisons: results,
                analysis: {
                    rankProgression: results.map(r => r.recommendedRank),
                    confidenceProgression: results.map(r => r.confidence),
                    averageRank: results.reduce((sum, r) => sum + r.recommendedRank, 0) / results.length,
                    rankRange: Math.max(...results.map(r => r.recommendedRank)) - Math.min(...results.map(r => r.recommendedRank))
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('技能水平比较测试失败:', error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 获取测试状态和历史
 */
export const getTestStatus = query({
    args: {},
    handler: async (ctx) => {
        return {
            systemStatus: 'ready',
            availableTests: [
                'runFullRankingTest - 完整测试套件',
                'runQuickRankingTest - 快速验证测试',
                'testSinglePlayerRanking - 单玩家排名测试',
                'testMultiPlayerRanking - 多玩家排名测试',
                'testManagerRanking - Manager接口测试',
                'compareSkillLevelRankings - 技能水平比较测试'
            ],
            lastUpdate: new Date().toISOString(),
            recommendations: [
                '建议先运行 runQuickRankingTest 进行快速验证',
                '使用 testSinglePlayerRanking 测试特定场景',
                '使用 compareSkillLevelRankings 分析不同技能水平的推荐差异'
            ]
        };
    }
});
