/**
 * 积分累积段位概率测试的 Convex 函数
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { runIntegralSegmentProbabilityTests } from "../test/IntegralSegmentProbabilityTest";

/**
 * 运行积分累积段位概率测试
 */
export const runIntegralSegmentProbabilityTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 开始运行积分累积段位概率测试...');

        try {
            await runIntegralSegmentProbabilityTests();

            return {
                success: true,
                message: "积分累积段位概率测试完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 积分累积段位概率测试失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试积分累积段位的使用
 */
export const testIntegralSegmentUsage = mutation({
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
            ),
            points: v.number()
        }),
        aiCount: v.number()
    },
    handler: async (ctx, { player, aiCount }) => {
        console.log(`🧪 测试积分累积段位使用: ${player.uid} (${player.segment}段位, ${player.points}积分)`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const humanPlayer = { uid: player.uid, score: player.score };
            const result = await rankingManager.generateMatchRankings([humanPlayer], aiCount);
            const playerResult = result.humanPlayers[0];
            const reasoning = playerResult.reasoning;

            console.log(`✅ 积分累积段位测试结果:`);
            console.log(`   玩家: ${player.uid} (${player.segment}段位, ${player.points}积分)`);
            console.log(`   分数: ${player.score}`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   推理: ${reasoning}`);

            // 验证是否使用了积分累积段位
            const usesIntegralSegment = reasoning.includes('段位') && !reasoning.includes('水平');
            const segmentCorrect = reasoning.includes(`${getSegmentDescription(player.segment)}段位`);

            console.log(`   使用积分累积段位: ${usesIntegralSegment ? '✅ 是' : '❌ 否'}`);
            console.log(`   段位正确: ${segmentCorrect ? '✅ 是' : '❌ 否'}`);

            return {
                success: true,
                player: {
                    uid: player.uid,
                    segment: player.segment,
                    points: player.points,
                    score: player.score
                },
                result: {
                    recommendedRank: playerResult.recommendedRank,
                    confidence: playerResult.confidence,
                    relativePerformance: playerResult.relativePerformance,
                    reasoning: playerResult.reasoning
                },
                analysis: {
                    usesIntegralSegment,
                    segmentCorrect,
                    totalParticipants: 1 + aiCount
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试积分累积段位使用失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试段位概率与积分累积段位的结合
 */
export const testSegmentProbabilityWithIntegralSegment = mutation({
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
            ),
            points: v.number()
        }),
        totalParticipants: v.number()
    },
    handler: async (ctx, { player, totalParticipants }) => {
        console.log(`🧪 测试段位概率与积分累积段位结合: ${player.uid} (${player.segment}段位) - ${totalParticipants}人比赛`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const aiCount = totalParticipants - 1; // 假设只有1个真人玩家
            const humanPlayer = { uid: player.uid, score: player.score };

            const result = await rankingManager.generateMatchRankings([humanPlayer], aiCount);
            const playerResult = result.humanPlayers[0];
            const reasoning = playerResult.reasoning;

            console.log(`✅ 段位概率结合测试结果:`);
            console.log(`   玩家: ${player.uid} (${player.segment}段位, ${player.points}积分)`);
            console.log(`   总参与者: ${totalParticipants}人 (1真人 + ${aiCount}AI)`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   推理: ${reasoning}`);

            // 验证是否使用了段位概率
            const usesSegmentProbability = reasoning.includes('排名概率');
            const basedOnIntegralSegment = reasoning.includes(`${getSegmentDescription(player.segment)}段位`) && !reasoning.includes('水平');
            const configCorrect = usesSegmentProbability && basedOnIntegralSegment;

            console.log(`   使用段位概率: ${usesSegmentProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   基于积分累积段位: ${basedOnIntegralSegment ? '✅ 是' : '❌ 否'}`);
            console.log(`   配置正确: ${configCorrect ? '✅ 是' : '❌ 否'}`);

            return {
                success: true,
                player: {
                    uid: player.uid,
                    segment: player.segment,
                    points: player.points,
                    score: player.score
                },
                result: {
                    recommendedRank: playerResult.recommendedRank,
                    confidence: playerResult.confidence,
                    relativePerformance: playerResult.relativePerformance,
                    reasoning: playerResult.reasoning
                },
                analysis: {
                    usesSegmentProbability,
                    basedOnIntegralSegment,
                    configCorrect,
                    totalParticipants,
                    aiCount
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试段位概率结合失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试不同段位水平的概率效果
 */
export const testDifferentSegmentLevels = mutation({
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
            ),
            points: v.number()
        })),
        totalParticipants: v.number(),
        iterations: v.number()
    },
    handler: async (ctx, { players, totalParticipants, iterations = 50 }) => {
        console.log(`🧪 测试不同段位水平的概率效果: ${players.length}个玩家 - ${totalParticipants}人比赛 - ${iterations}次迭代`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            const results = [];

            for (const player of players) {
                const rankDistribution = new Map<number, number>();

                // 运行多次排名推荐
                for (let i = 0; i < iterations; i++) {
                    const result = await rankingManager.generateMatchRankings([{ uid: player.uid, score: player.score }], totalParticipants - 1);
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

                const firstRankCount = rankDistribution.get(1) || 0;
                const firstRankPercentage = firstRankCount / iterations;

                results.push({
                    player: {
                        uid: player.uid,
                        segment: player.segment,
                        points: player.points,
                        score: player.score
                    },
                    distribution,
                    analysis: {
                        firstRankCount,
                        firstRankPercentage,
                        iterations
                    }
                });

                console.log(`${player.uid} (${player.segment}段位) 排名分布:`);
                distribution.forEach(d => {
                    console.log(`   第${d.rank}名: ${d.count}次 (${d.percentage}%)`);
                });
                console.log(`   第1名概率: ${(firstRankPercentage * 100).toFixed(1)}%\n`);
            }

            // 验证段位优势
            const sortedResults = results.sort((a, b) => b.analysis.firstRankPercentage - a.analysis.firstRankPercentage);
            console.log('段位优势排序 (第1名概率从高到低):');
            sortedResults.forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.player.uid} (${result.player.segment}段位): ${(result.analysis.firstRankPercentage * 100).toFixed(1)}%`);
            });

            return {
                success: true,
                players: results.map(r => r.player),
                results: results.map(r => ({
                    player: r.player,
                    distribution: r.distribution,
                    analysis: r.analysis
                })),
                summary: {
                    totalPlayers: players.length,
                    totalParticipants,
                    iterations,
                    segmentAdvantageOrder: sortedResults.map(r => ({
                        uid: r.player.uid,
                        segment: r.player.segment,
                        firstRankPercentage: r.analysis.firstRankPercentage
                    }))
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试不同段位水平失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 获取段位描述
 */
function getSegmentDescription(segment: string): string {
    const descriptions = {
        'bronze': '青铜',
        'silver': '白银',
        'gold': '黄金',
        'platinum': '铂金',
        'diamond': '钻石',
        'master': '大师',
        'grandmaster': '宗师'
    };
    return descriptions[segment as keyof typeof descriptions] || segment;
}
