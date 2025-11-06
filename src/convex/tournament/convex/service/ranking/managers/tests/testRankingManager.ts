/**
 * RankingRecommendationManagerOptimized 测试
 * 使用 Convex Internal Functions 进行测试
 * 
 * 优势：
 * - 真实环境测试（真实的 ctx.db）
 * - 无需 Mock
 * - 可以测试数据库交互
 * - 更接近生产环境
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../../../_generated/server";
import { RankingRecommendationManagerOptimized } from '../RankingRecommendationManagerOptimized';

/**
 * 测试基本排名生成 - 内部辅助函数
 */
async function testBasicRankingGenerationInternal(
    ctx: any,
    args: { playerScores: { uid: string, score: number }[], aiCount: number }
) {
    const manager = new RankingRecommendationManagerOptimized(ctx);

    const result = await manager.generateMatchRankings(
        args.playerScores,
        args.aiCount
    );

    console.log('测试结果:', {
        humanRankings: result.humanPlayerRankings,
        aiOpponents: result.aiOpponents,
        matchContext: result.matchContext
    });

    return {
        success: true,
        result,
        humanRankingsCount: result.humanPlayerRankings.length,
        aiOpponentsCount: result.aiOpponents.length,
        totalParticipants: result.matchContext.totalParticipants
    };
}

/**
 * 测试基本排名生成 - Convex 函数
 */
export const testBasicRankingGeneration = internalQuery({
    args: {
        playerScores: v.array(v.object({
            uid: v.string(),
            score: v.number()
        })),
        aiCount: v.number()
    },
    handler: async (ctx, args) => {
        return await testBasicRankingGenerationInternal(ctx, args);
    }
});

/**
 * 测试新手策略
 * 注意：internalQuery 不能执行 Mutation 操作（如 delete）
 * 使用内部辅助函数
 */
async function testNewbieStrategyInternal(ctx: any, args: { uid: string, score: number }) {
    const manager = new RankingRecommendationManagerOptimized(ctx);
    const result = await manager.generateMatchRankings(
        [{ uid: args.uid, score: args.score }],
        3
    );

    const isNewbie = result.humanPlayerRankings[0].reasoning.includes('新手');

    return {
        success: true,
        isNewbie,
        recommendedRank: result.humanPlayerRankings[0].recommendedRank,
        reasoning: result.humanPlayerRankings[0].reasoning
    };
}

export const testNewbieStrategy = internalQuery({
    args: {
        uid: v.string(),
        score: v.number()
    },
    handler: async (ctx, args) => {
        return await testNewbieStrategyInternal(ctx, args);
    }
});

/**
 * 测试多个策略 - 内部辅助函数
 * 注意：内部函数不能使用 ctx.db.insert，需要在 Mutation 中创建数据
 */
async function testMultipleStrategiesInternal(ctx: any) {
    const manager = new RankingRecommendationManagerOptimized(ctx);

    // 测试不同经验的玩家（假设历史数据已经存在）
    const players = [
        { uid: 'newbie_001', score: 1200 },    // 新手
        { uid: 'growing_001', score: 1500 },  // 成长
        { uid: 'veteran_001', score: 1800 }   // 成熟
    ];

    const result = await manager.generateMatchRankings(
        players.map(p => ({ uid: p.uid, score: p.score })),
        3
    );

    return {
        success: true,
        strategies: result.humanPlayerRankings.map(r => ({
            uid: r.uid,
            reasoning: r.reasoning
        }))
    };
}

/**
 * 测试多个策略 - Convex 函数
 */
export const testMultipleStrategies = internalQuery({
    handler: async (ctx) => {
        return await testMultipleStrategiesInternal(ctx);
    }
});

/**
 * 测试胜率控制策略 - 内部辅助函数
 */
async function testWinRateControlStrategyInternal(ctx: any, args: { uid: string, currentWinRate: number }) {
    const manager = new RankingRecommendationManagerOptimized(ctx, {
        winRateControl: {
            enabled: true,
            targetWinRate: 0.33,
            adjustmentSensitivity: 10,
            minMatchesForControl: 5,
            maxAdjustmentRange: 0.2
        }
    });

    const result = await manager.generateMatchRankings(
        [{ uid: args.uid, score: 1500 }],
        3
    );

    return {
        success: true,
        currentWinRate: args.currentWinRate,
        recommendedRank: result.humanPlayerRankings[0].recommendedRank,
        reasoning: result.humanPlayerRankings[0].reasoning
    };
}

/**
 * 测试胜率控制策略 - Convex 函数
 * 注意：需要在 Mutation 中创建测试数据
 */
export const testWinRateControlStrategy = internalQuery({
    args: {
        uid: v.string(),
        currentWinRate: v.number()
    },
    handler: async (ctx, args) => {
        return await testWinRateControlStrategyInternal(ctx, args);
    }
});

/**
 * 创建胜率控制测试数据 - Mutation
 */
export const createWinRateTestData = internalMutation({
    args: {
        uid: v.string(),
        currentWinRate: v.number()
    },
    handler: async (ctx, args) => {
        // 创建历史数据来模拟指定胜率
        const totalMatches = 10;
        const wins = Math.round(totalMatches * args.currentWinRate);

        for (let i = 0; i < totalMatches; i++) {
            await ctx.db.insert("player_matches", {
                matchId: `test_match_${args.uid}_${i}`,
                seed: 'test_seed',
                uid: args.uid,
                score: 1500,
                rank: i < wins ? 1 : 2,  // 前 wins 场获胜
                status: 0,
                createdAt: new Date().toISOString()
            });
        }

        return { success: true, created: totalMatches };
    }
});

/**
 * 清理测试数据
 */
export const cleanupTestData = internalMutation({
    args: {
        uidPrefix: v.string()  // 比如 "test_" 或 "newbie_"
    },
    handler: async (ctx, args) => {
        // 清理 match_results
        const matches = await ctx.db
            .query("player_matches")
            .collect();

        let deletedCount = 0;
        for (const match of matches) {
            if ((match.uid as string).startsWith(args.uidPrefix)) {
                await ctx.db.delete(match._id);
                deletedCount++;
            }
        }

        return {
            success: true,
            deletedCount
        };
    }
});

/**
 * 完整测试套件
 * 注意：由于 Convex 的限制，internalQuery 不能直接调用其他 internalQuery
 * 需要使用内部辅助函数
 */
async function runAllTestsInternal(ctx: any) {
    console.log('开始运行所有测试...');

    const results: any[] = [];

    try {
        // 测试 1: 基本排名生成
        console.log('测试 1: 基本排名生成');
        const test1 = await testBasicRankingGenerationInternal(ctx, {
            playerScores: [
                { uid: 'test_player_1', score: 1500 },
                { uid: 'test_player_2', score: 1200 }
            ],
            aiCount: 3
        });
        results.push({ test: '基本排名生成', ...test1 });

        // 测试 2: 新手策略
        console.log('测试 2: 新手策略');
        const test2 = await testNewbieStrategyInternal(ctx, {
            uid: 'test_newbie',
            score: 1500
        });
        results.push({ test: '新手策略', ...test2 });

        return {
            success: true,
            tests: results,
            totalTests: results.length,
            passedTests: results.filter(r => r.success).length
        };

    } catch (error) {
        console.error('测试失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            tests: results
        };
    }
}

