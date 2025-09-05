/**
 * 单真人玩家段位概率测试的 Convex 函数
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { runSinglePlayerSegmentProbabilityTests } from "../test/SinglePlayerSegmentProbabilityTest";

/**
 * 运行单真人玩家段位概率测试
 */
export const runSinglePlayerSegmentProbabilityTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 开始运行单真人玩家段位概率测试...');

        try {
            await runSinglePlayerSegmentProbabilityTests();

            return {
                success: true,
                message: "单真人玩家段位概率测试完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 单真人玩家段位概率测试失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试单真人玩家场景的段位概率使用
 */
export const testSinglePlayerScenario = mutation({
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
        aiCount: v.number()
    },
    handler: async (ctx, { player, aiCount }) => {
        console.log(`🧪 测试单真人玩家场景: ${player.uid} (${player.segment}段位) + ${aiCount}个AI`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const humanPlayer = { uid: player.uid, score: player.score };
            const result = await rankingManager.generateMatchRankings([humanPlayer], aiCount);

            const playerResult = result.humanPlayers[0];
            const usedSegmentProbability = playerResult.reasoning.includes('排名概率');

            console.log(`✅ 单真人玩家排名推荐:`);
            console.log(`   玩家: ${player.uid} (${player.segment}段位)`);
            console.log(`   分数: ${player.score}`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   信心度: ${(playerResult.confidence * 100).toFixed(1)}%`);
            console.log(`   表现: ${playerResult.relativePerformance}`);
            console.log(`   推理: ${playerResult.reasoning}`);
            console.log(`   使用段位概率: ${usedSegmentProbability ? '✅ 是' : '❌ 否'}`);

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
                aiCount,
                totalParticipants: 1 + aiCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试单真人玩家场景失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试多真人玩家场景不使用段位概率
 */
export const testMultiPlayerScenario = mutation({
    args: {
        players: v.array(v.object({
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
        })),
        aiCount: v.number()
    },
    handler: async (ctx, { players, aiCount }) => {
        console.log(`🧪 测试多真人玩家场景: ${players.length}个真人 + ${aiCount}个AI`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const humanPlayers = players.map(p => ({ uid: p.uid, score: p.score }));
            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

            console.log(`✅ 多真人玩家排名推荐:`);
            result.humanPlayers.forEach((player, index) => {
                const originalPlayer = players[index];
                const usedSegmentProbability = player.reasoning.includes('排名概率');

                console.log(`   ${player.uid} (${originalPlayer.segment}段位): 第${player.recommendedRank}名`);
                console.log(`     分数: ${originalPlayer.score}`);
                console.log(`     信心度: ${(player.confidence * 100).toFixed(1)}%`);
                console.log(`     表现: ${player.relativePerformance}`);
                console.log(`     推理: ${player.reasoning}`);
                console.log(`     使用段位概率: ${usedSegmentProbability ? '❌ 是' : '✅ 否'}`);
            });

            // 检查是否所有玩家都使用了段位概率
            const allUsedSegmentProbability = result.humanPlayers.every(player =>
                player.reasoning.includes('排名概率')
            );

            return {
                success: true,
                players: players.map((p, index) => ({
                    uid: p.uid,
                    segment: p.segment,
                    score: p.score,
                    recommendedRank: result.humanPlayers[index].recommendedRank,
                    usedSegmentProbability: result.humanPlayers[index].reasoning.includes('排名概率')
                })),
                allUsedSegmentProbability,
                expectedBehavior: !allUsedSegmentProbability, // 多真人玩家场景不应该使用段位概率
                aiCount,
                totalParticipants: players.length + aiCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试多真人玩家场景失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 对比单真人玩家和多真人玩家场景
 */
export const compareSingleVsMultiPlayerScenarios = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 对比单真人玩家和多真人玩家场景...');

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            // 测试单真人玩家场景
            const singlePlayerResult = await rankingManager.generateMatchRankings(
                [{ uid: 'gold_player', score: 5000 }],
                5 // 6人比赛
            );

            // 测试多真人玩家场景
            const multiPlayerResult = await rankingManager.generateMatchRankings(
                [
                    { uid: 'bronze_player', score: 2000 },
                    { uid: 'gold_player', score: 5000 }
                ],
                4 // 6人比赛
            );

            console.log('✅ 场景对比结果:');

            console.log('\n单真人玩家场景 (1真人 + 5AI):');
            singlePlayerResult.humanPlayers.forEach(player => {
                const usedSegmentProbability = player.reasoning.includes('排名概率');
                console.log(`   ${player.uid}: 第${player.recommendedRank}名`);
                console.log(`     使用段位概率: ${usedSegmentProbability ? '✅ 是' : '❌ 否'}`);
                console.log(`     推理: ${player.reasoning}`);
            });

            console.log('\n多真人玩家场景 (2真人 + 4AI):');
            multiPlayerResult.humanPlayers.forEach(player => {
                const usedSegmentProbability = player.reasoning.includes('排名概率');
                console.log(`   ${player.uid}: 第${player.recommendedRank}名`);
                console.log(`     使用段位概率: ${usedSegmentProbability ? '❌ 是' : '✅ 否'}`);
                console.log(`     推理: ${player.reasoning}`);
            });

            // 验证行为差异
            const singlePlayerUsedProbability = singlePlayerResult.humanPlayers[0].reasoning.includes('排名概率');
            const multiPlayerUsedProbability = multiPlayerResult.humanPlayers.some(player =>
                player.reasoning.includes('排名概率')
            );

            console.log('\n行为验证:');
            console.log(`   单真人玩家使用段位概率: ${singlePlayerUsedProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   多真人玩家使用段位概率: ${multiPlayerUsedProbability ? '❌ 是' : '✅ 否'}`);
            console.log(`   行为差异正确: ${singlePlayerUsedProbability && !multiPlayerUsedProbability ? '✅ 是' : '❌ 否'}`);

            return {
                success: true,
                singlePlayerScenario: {
                    usedSegmentProbability: singlePlayerUsedProbability,
                    players: singlePlayerResult.humanPlayers.map(p => ({
                        uid: p.uid,
                        recommendedRank: p.recommendedRank,
                        reasoning: p.reasoning
                    }))
                },
                multiPlayerScenario: {
                    usedSegmentProbability: multiPlayerUsedProbability,
                    players: multiPlayerResult.humanPlayers.map(p => ({
                        uid: p.uid,
                        recommendedRank: p.recommendedRank,
                        reasoning: p.reasoning
                    }))
                },
                behaviorCorrect: singlePlayerUsedProbability && !multiPlayerUsedProbability,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 对比场景失败:', error);
            return {
                success: false,
                message: `对比失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});
