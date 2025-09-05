/**
 * 段位排名概率集成测试的 Convex 函数
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { runSegmentRankingProbabilityTests } from "../test/SegmentRankingProbabilityTest";

/**
 * 运行段位排名概率集成测试
 */
export const runSegmentRankingProbabilityTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 开始运行段位排名概率集成测试...');

        try {
            await runSegmentRankingProbabilityTests();

            return {
                success: true,
                message: "段位排名概率集成测试完成",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 段位排名概率集成测试失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试段位排名概率配置
 */
export const testSegmentRankingProbabilities = mutation({
    args: {
        segment: v.union(
            v.literal("bronze"),
            v.literal("silver"),
            v.literal("gold"),
            v.literal("platinum"),
            v.literal("diamond"),
            v.literal("master"),
            v.literal("grandmaster")
        ),
        participantCount: v.number()
    },
    handler: async (ctx, { segment, participantCount }) => {
        console.log(`🧪 测试段位排名概率: ${segment}段位 ${participantCount}人比赛`);

        try {
            const { getSegmentRankingProbabilities } = await import("../../../segment/config");
            const probabilities = getSegmentRankingProbabilities(segment, participantCount);

            console.log(`✅ ${segment}段位 ${participantCount}人比赛概率分布:`);
            probabilities.forEach((prob, index) => {
                console.log(`   第${index + 1}名: ${(prob * 100).toFixed(1)}%`);
            });

            return {
                success: true,
                segment,
                participantCount,
                probabilities,
                totalProbability: probabilities.reduce((sum, p) => sum + p, 0),
                firstPlaceProbability: probabilities[0],
                topThreeProbability: probabilities.slice(0, 3).reduce((sum, p) => sum + p, 0),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ 测试段位排名概率失败: ${segment}`, error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试不同段位玩家的排名推荐
 */
export const testDifferentSegmentRankings = mutation({
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
        console.log(`🧪 测试不同段位玩家排名推荐: ${players.length}个玩家 + ${aiCount}个AI`);

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            // 转换玩家数据格式
            const humanPlayers = players.map(p => ({
                uid: p.uid,
                score: p.score
            }));

            const result = await rankingManager.generateMatchRankings(humanPlayers, aiCount);

            console.log('✅ 不同段位玩家排名推荐结果:');
            result.humanPlayers.forEach((player, index) => {
                const originalPlayer = players[index];
                console.log(`   ${player.uid} (${originalPlayer.segment}段位): 第${player.recommendedRank}名`);
                console.log(`     分数: ${originalPlayer.score}`);
                console.log(`     信心度: ${(player.confidence * 100).toFixed(1)}%`);
                console.log(`     表现: ${player.relativePerformance}`);
                console.log(`     推理: ${player.reasoning}\n`);
            });

            // 分析段位优势
            const segmentRanks = result.humanPlayers.map(player => {
                const originalPlayer = players.find(p => p.uid === player.uid)!;
                return {
                    uid: player.uid,
                    segment: originalPlayer.segment,
                    rank: player.recommendedRank,
                    score: originalPlayer.score
                };
            });

            // 按段位等级排序
            const segmentTiers = {
                'bronze': 1,
                'silver': 2,
                'gold': 3,
                'platinum': 4,
                'diamond': 5,
                'master': 6,
                'grandmaster': 7
            };

            const sortedBySegment = segmentRanks.sort((a, b) =>
                segmentTiers[a.segment] - segmentTiers[b.segment]
            );

            console.log('段位优势分析:');
            sortedBySegment.forEach(player => {
                console.log(`   ${player.segment}段位: 第${player.rank}名 (分数: ${player.score})`);
            });

            return {
                success: true,
                result,
                segmentAnalysis: sortedBySegment,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 测试不同段位玩家排名推荐失败:', error);
            return {
                success: false,
                message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 验证段位排名概率集成
 */
export const verifySegmentRankingIntegration = mutation({
    args: {},
    handler: async (ctx) => {
        console.log('🧪 验证段位排名概率集成...');

        try {
            const { RankingRecommendationManager } = await import("../managers/RankingRecommendationManager");
            const rankingManager = new RankingRecommendationManager(ctx);

            // 测试数据：不同段位的玩家
            const testPlayers = [
                { uid: 'bronze_test', score: 2000 },
                { uid: 'gold_test', score: 5000 },
                { uid: 'diamond_test', score: 8000 }
            ];

            const result = await rankingManager.generateMatchRankings(testPlayers, 3); // 6人比赛

            console.log('✅ 段位排名概率集成验证:');
            result.humanPlayers.forEach(player => {
                console.log(`   ${player.uid}: 第${player.recommendedRank}名`);
                console.log(`     推理: ${player.reasoning}`);
            });

            // 检查推理中是否包含段位信息
            const hasSegmentInfo = result.humanPlayers.some(player =>
                player.reasoning.includes('段位') || player.reasoning.includes('排名概率')
            );

            console.log(`段位信息集成: ${hasSegmentInfo ? '✅ 已集成' : '❌ 未集成'}`);

            return {
                success: true,
                hasSegmentIntegration: hasSegmentInfo,
                result,
                message: hasSegmentInfo ? "段位排名概率已正确集成" : "段位排名概率集成可能有问题",
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 验证段位排名概率集成失败:', error);
            return {
                success: false,
                message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
            };
        }
    }
});
