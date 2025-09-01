/**
 * 并列名次处理测试 - Convex函数
 * 提供测试并列名次处理功能的Convex接口
 */

import { v } from "convex/values";
import { mutation } from "../../../../_generated/server";
import { RankingRecommendationManager } from "../managers/RankingRecommendationManager";
import { quickTiedRankingTest, testTiedRanking } from "../test/tiedRankingTest";

/**
 * 运行完整的并列名次测试
 * 测试包括：
 * 1. 玩家与AI分数相同的情况
 * 2. 多个AI分数相同的情况  
 * 3. 多玩家并列名次的情况
 */
export const runTiedRankingTests = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎯 开始运行并列名次处理测试...");

        try {
            const result = await testTiedRanking(ctx);

            console.log("📊 并列名次测试完成");
            console.log(`   成功: ${result.success}`);
            console.log(`   总结: ${result.summary}`);

            return {
                success: result.success,
                summary: result.summary,
                testResults: result.testResults,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("❌ 并列名次测试失败:", error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 快速并列名次验证
 * 运行核心测试，返回简化结果
 */
export const runQuickTiedRankingTest = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎯 开始快速并列名次验证...");

        try {
            const result = await quickTiedRankingTest(ctx);

            console.log("📊 快速并列名次验证完成");
            console.log(`   成功: ${result.success}`);
            console.log(`   总结: ${result.summary}`);

            return {
                success: result.success,
                summary: result.summary,
                keyTests: result.keyTests,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("❌ 快速并列名次验证失败:", error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试特定场景的并列名次处理
 * 可以针对特定情况进行测试
 */
export const testSpecificTiedRankingScenario = mutation({
    args: {
        scenario: v.union(v.literal('player_ai_tied'), v.literal('multiple_ai_tied'), v.literal('multi_player_tied'), v.literal('high_density_tied'))
    },
    handler: async (ctx, args) => {
        console.log(`🎯 测试特定场景: ${args.scenario}`);

        try {
            // 根据场景选择测试
            let result;

            switch (args.scenario) {
                case 'player_ai_tied':
                    result = await testPlayerAITiedScenario(ctx);
                    break;
                case 'multiple_ai_tied':
                    result = await testMultipleAITiedScenario(ctx);
                    break;
                case 'multi_player_tied':
                    result = await testMultiPlayerTiedScenario(ctx);
                    break;
                case 'high_density_tied':
                    result = await testHighDensityTiedScenario(ctx);
                    break;
                default:
                    return {
                        success: false,
                        error: `未知测试场景: ${args.scenario}`,
                        timestamp: new Date().toISOString()
                    };
            }

            return {
                success: result.success,
                scenario: args.scenario,
                details: result.details,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ 特定场景测试失败:`, error);
            return {
                success: false,
                scenario: args.scenario,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 辅助函数：测试玩家与AI分数相同的场景
 */
async function testPlayerAITiedScenario(ctx: any) {
    const rankingManager = new RankingRecommendationManager(ctx);

    console.log("  测试场景: 玩家与AI分数相同");

    const testRuns = 5;
    let foundTiedRanks = false;
    let testDetails: any = null;

    for (let run = 0; run < testRuns; run++) {
        const result = await rankingManager.generateMatchRankings(
            [{ uid: 'test_player_tied', score: 800 }],
            3
        );

        const allParticipants = [
            { uid: result.humanPlayers[0].uid, type: 'human', rank: result.humanPlayers[0].recommendedRank, score: 800 },
            ...result.aiOpponents.map(ai => ({ uid: ai.uid, type: 'ai', rank: ai.recommendedRank, score: ai.recommendedScore }))
        ];

        const scoreGroups = new Map<number, any[]>();
        allParticipants.forEach(p => {
            if (!scoreGroups.has(p.score)) {
                scoreGroups.set(p.score, []);
            }
            scoreGroups.get(p.score)!.push(p);
        });

        for (const [score, participants] of scoreGroups) {
            if (participants.length > 1) {
                const ranks = participants.map(p => p.rank);
                const uniqueRanks = [...new Set(ranks)];
                if (uniqueRanks.length === 1) {
                    foundTiedRanks = true;
                    testDetails = {
                        run: run + 1,
                        tiedScore: score,
                        tiedParticipants: participants.length,
                        tiedRank: uniqueRanks[0],
                        participants: participants
                    };
                    console.log(`  ✅ 第${run + 1}次运行发现并列名次: ${participants.length}个参与者分数${score}并列第${uniqueRanks[0]}名`);
                    break;
                }
            }
        }

        if (foundTiedRanks) break;
    }

    if (!foundTiedRanks) {
        console.log(`  ⚠️  在${testRuns}次运行中未发现并列名次`);
        testDetails = { runs: testRuns, message: '未发现并列名次情况' };
    }

    return {
        success: true,
        details: testDetails
    };
}

/**
 * 辅助函数：测试多个AI分数相同的场景
 */
async function testMultipleAITiedScenario(ctx: any) {
    const rankingManager = new RankingRecommendationManager(ctx);

    console.log("  测试场景: 多个AI分数相同");

    const testRuns = 10;
    let foundTiedAIs = false;
    let testDetails: any = null;

    for (let run = 0; run < testRuns; run++) {
        const result = await rankingManager.generateMatchRankings(
            [{ uid: 'test_player_ai_tied', score: 1000 }],
            5
        );

        const aiScores = result.aiOpponents.map(ai => ai.recommendedScore);
        const scoreCounts = new Map<number, number>();
        aiScores.forEach(score => {
            scoreCounts.set(score, (scoreCounts.get(score) || 0) + 1);
        });

        const tiedScores = Array.from(scoreCounts.entries()).filter(([score, count]) => count > 1);
        if (tiedScores.length > 0) {
            foundTiedAIs = true;
            testDetails = {
                run: run + 1,
                tiedScores: tiedScores.map(([score, count]) => ({ score, count })),
                allAIScores: aiScores
            };
            console.log(`  ✅ 第${run + 1}次运行发现AI并列: ${tiedScores.map(([score, count]) => `${count}个AI分数${score}`).join(', ')}`);
            break;
        }
    }

    if (!foundTiedAIs) {
        console.log(`  ⚠️  在${testRuns}次运行中未发现AI分数相同`);
        testDetails = { runs: testRuns, message: '未发现AI分数相同情况' };
    }

    return {
        success: true,
        details: testDetails
    };
}

/**
 * 辅助函数：测试多玩家并列名次的场景
 */
async function testMultiPlayerTiedScenario(ctx: any) {
    const rankingManager = new RankingRecommendationManager(ctx);

    console.log("  测试场景: 多玩家并列名次");

    const result = await rankingManager.generateMatchRankings(
        [
            { uid: 'player1', score: 1000 },
            { uid: 'player2', score: 1000 },
            { uid: 'player3', score: 800 }
        ],
        3
    );

    const humanPlayers = result.humanPlayers;
    const player1 = humanPlayers.find(p => p.uid === 'player1');
    const player2 = humanPlayers.find(p => p.uid === 'player2');
    const player3 = humanPlayers.find(p => p.uid === 'player3');

    const testDetails = {
        player1: { uid: player1?.uid, score: 1000, rank: player1?.recommendedRank },
        player2: { uid: player2?.uid, score: 1000, rank: player2?.recommendedRank },
        player3: { uid: player3?.uid, score: 800, rank: player3?.recommendedRank },
        allHumanPlayers: humanPlayers
    };

    let success = true;
    let issues: string[] = [];

    if (player1 && player2) {
        if (player1.recommendedRank !== player2.recommendedRank) {
            success = false;
            issues.push(`相同分数玩家排名不同: ${player1.recommendedRank} vs ${player2.recommendedRank}`);
        } else {
            console.log(`  ✅ 相同分数玩家获得相同排名: 第${player1.recommendedRank}名`);
        }
    }

    if (player3 && player1 && player2) {
        if (player3.recommendedRank <= Math.min(player1.recommendedRank, player2.recommendedRank)) {
            success = false;
            issues.push(`低分玩家排名不应高于高分玩家`);
        } else {
            console.log(`  ✅ 低分玩家排名正确: 第${player3.recommendedRank}名`);
        }
    }

    if (issues.length > 0) {
        console.log(`  ❌ 发现问题: ${issues.join(', ')}`);
    }

    return {
        success,
        details: testDetails,
        error: issues.length > 0 ? issues.join('; ') : undefined
    };
}

/**
 * 辅助函数：测试高密度并列名次场景
 */
async function testHighDensityTiedScenario(ctx: any) {
    const rankingManager = new RankingRecommendationManager(ctx);

    console.log("  测试场景: 高密度并列名次测试");

    // 使用更容易产生并列名次的配置
    const testScenarios = [
        {
            name: '大量相同分数玩家',
            humanPlayers: [
                { uid: 'player1', score: 1000 },
                { uid: 'player2', score: 1000 },
                { uid: 'player3', score: 1000 },
                { uid: 'player4', score: 800 },
                { uid: 'player5', score: 800 },
                { uid: 'player6', score: 600 },
                { uid: 'player7', score: 600 }
            ],
            aiCount: 4
        },
        {
            name: '分数阶梯',
            humanPlayers: [
                { uid: 'player1', score: 1200 },
                { uid: 'player2', score: 1200 },
                { uid: 'player3', score: 1000 },
                { uid: 'player4', score: 1000 },
                { uid: 'player5', score: 800 },
                { uid: 'player6', score: 800 }
            ],
            aiCount: 5
        }
    ];

    const testResults: any[] = [];
    let allSuccess = true;

    for (const scenario of testScenarios) {
        console.log(`    测试子场景: ${scenario.name}`);

        try {
            const result = await rankingManager.generateMatchRankings(
                scenario.humanPlayers,
                scenario.aiCount
            );

            const allParticipants = [
                ...result.humanPlayers.map(p => ({
                    uid: p.uid,
                    type: 'human' as const,
                    rank: p.recommendedRank,
                    score: scenario.humanPlayers.find(hp => hp.uid === p.uid)?.score || 0
                })),
                ...result.aiOpponents.map(ai => ({
                    uid: ai.uid,
                    type: 'ai' as const,
                    rank: ai.recommendedRank,
                    score: ai.recommendedScore
                }))
            ];

            // 检查并列名次
            const tiedRankings = analyzeTiedRankings(allParticipants);

            const scenarioResult = {
                scenarioName: scenario.name,
                humanPlayers: result.humanPlayers,
                aiOpponents: result.aiOpponents,
                allParticipants: allParticipants,
                tiedRankings: tiedRankings,
                hasTiedRanks: tiedRankings.length > 0,
                tiedRankCount: tiedRankings.length
            };

            testResults.push(scenarioResult);

            if (tiedRankings.length > 0) {
                console.log(`      ✅ 发现${tiedRankings.length}组并列名次`);
                tiedRankings.forEach(tied => {
                    console.log(`        第${tied.rank}名: ${tied.participants.length}个参与者 (${tied.participants.map(p => `${p.uid}:${p.score}`).join(', ')})`);
                });
            } else {
                console.log(`      ⚠️  未发现并列名次`);
            }

            // 验证排名逻辑
            const rankingValidation = validateRankingLogic(allParticipants);
            if (!rankingValidation.isValid) {
                console.log(`      ❌ 排名逻辑验证失败: ${rankingValidation.issues.join(', ')}`);
                allSuccess = false;
            } else {
                console.log(`      ✅ 排名逻辑验证通过`);
            }

        } catch (error) {
            console.error(`      ❌ 子场景测试失败:`, error);
            allSuccess = false;
            testResults.push({
                scenarioName: scenario.name,
                error: String(error)
            });
        }
    }

    return {
        success: allSuccess,
        details: {
            testScenarios: testScenarios,
            results: testResults
        }
    };
}

/**
 * 分析并列名次情况
 */
function analyzeTiedRankings(allParticipants: any[]): Array<{
    rank: number;
    participants: any[];
    score: number;
}> {
    const rankGroups = new Map<number, any[]>();

    allParticipants.forEach(p => {
        if (!rankGroups.has(p.rank)) {
            rankGroups.set(p.rank, []);
        }
        rankGroups.get(p.rank)!.push(p);
    });

    const tiedRankings: Array<{
        rank: number;
        participants: any[];
        score: number;
    }> = [];

    for (const [rank, participants] of rankGroups) {
        if (participants.length > 1) {
            // 检查是否真的是并列名次（分数相同）
            const scores = participants.map(p => p.score);
            const uniqueScores = [...new Set(scores)];

            if (uniqueScores.length === 1) {
                tiedRankings.push({
                    rank,
                    participants,
                    score: uniqueScores[0]
                });
            }
        }
    }

    return tiedRankings;
}

/**
 * 验证排名逻辑的正确性
 */
function validateRankingLogic(allParticipants: any[]): {
    isValid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    // 1. 检查排名连续性（支持并列名次）
    const ranks = allParticipants.map(p => p.rank).sort((a, b) => a - b);
    const uniqueRanks = [...new Set(ranks)];

    // 在并列名次系统中，唯一排名应该从1开始且递增，但不需要连续
    // 例如：如果有排名 1,1,3,3,5，那么唯一排名应该是 1,3,5
    // 检查唯一排名是否从1开始且递增
    if (uniqueRanks[0] !== 1) {
        issues.push(`排名应从1开始，实际从${uniqueRanks[0]}开始`);
    }

    for (let i = 1; i < uniqueRanks.length; i++) {
        if (uniqueRanks[i] <= uniqueRanks[i - 1]) {
            issues.push(`唯一排名应递增: 第${i}个排名${uniqueRanks[i - 1]}应小于第${i + 1}个排名${uniqueRanks[i]}`);
            break;
        }
    }

    // 检查排名范围是否合理
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    if (minRank !== 1) {
        issues.push(`最小排名应为1，实际为${minRank}`);
    }
    if (maxRank > allParticipants.length) {
        issues.push(`最大排名${maxRank}超过参与者数量${allParticipants.length}`);
    }

    // 2. 检查分数与排名的关系
    const sortedByScore = [...allParticipants].sort((a, b) => b.score - a.score);
    for (let i = 0; i < sortedByScore.length - 1; i++) {
        const current = sortedByScore[i];
        const next = sortedByScore[i + 1];

        if (current.score > next.score && current.rank > next.rank) {
            issues.push(`高分参与者排名不应低于低分参与者: ${current.uid}(${current.score}分)第${current.rank}名 vs ${next.uid}(${next.score}分)第${next.rank}名`);
        }
    }

    // 3. 检查并列名次的合理性
    const rankGroups = new Map<number, any[]>();
    allParticipants.forEach(p => {
        if (!rankGroups.has(p.rank)) {
            rankGroups.set(p.rank, []);
        }
        rankGroups.get(p.rank)!.push(p);
    });

    for (const [rank, participants] of rankGroups) {
        if (participants.length > 1) {
            const scores = participants.map(p => p.score);
            const uniqueScores = [...new Set(scores)];

            if (uniqueScores.length > 1) {
                issues.push(`第${rank}名参与者分数不同但排名相同: ${participants.map(p => `${p.uid}:${p.score}`).join(', ')}`);
            }
        }
    }

    return {
        isValid: issues.length === 0,
        issues
    };
}

/**
 * 专门测试高密度并列名次的Convex函数
 * 通过特殊配置最大化并列名次出现的概率
 */
export const testHighDensityTiedRankings = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎯 开始高密度并列名次测试...");

        try {
            const result = await testHighDensityTiedScenario(ctx);

            console.log("📊 高密度并列名次测试完成");
            console.log(`   成功: ${result.success}`);

            return {
                success: result.success,
                details: result.details,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("❌ 高密度并列名次测试失败:", error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 测试排名逻辑的Convex函数
 * 专门用于调试排名分配问题
 */
export const testRankingLogic = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("🎯 开始排名逻辑测试...");

        try {
            const rankingManager = new RankingRecommendationManager(ctx);

            // 创建一个简单的测试场景
            const testScenario = {
                humanPlayers: [
                    { uid: 'player1', score: 1000 },
                    { uid: 'player2', score: 1000 },
                    { uid: 'player3', score: 800 },
                    { uid: 'player4', score: 800 },
                    { uid: 'player5', score: 600 }
                ],
                aiCount: 3
            };

            console.log("📋 测试场景:", testScenario);

            const result = await rankingManager.generateMatchRankings(
                testScenario.humanPlayers,
                testScenario.aiCount
            );

            // 收集所有参与者的排名信息
            const allParticipants = [
                ...result.humanPlayers.map(p => ({
                    uid: p.uid,
                    type: 'human',
                    rank: p.recommendedRank,
                    score: testScenario.humanPlayers.find(hp => hp.uid === p.uid)?.score || 0
                })),
                ...result.aiOpponents.map(ai => ({
                    uid: ai.uid,
                    type: 'ai',
                    rank: ai.recommendedRank,
                    score: ai.recommendedScore
                }))
            ];

            // 按分数排序显示
            const sortedByScore = [...allParticipants].sort((a, b) => b.score - a.score);
            console.log("📊 按分数排序的参与者:");
            sortedByScore.forEach((p, index) => {
                console.log(`  ${index + 1}. ${p.uid} (${p.type}) - 分数: ${p.score}, 排名: ${p.rank}`);
            });

            // 验证排名逻辑
            const rankingValidation = validateRankingLogic(allParticipants);
            console.log("🔍 排名逻辑验证结果:", rankingValidation);

            return {
                success: rankingValidation.isValid,
                testScenario,
                allParticipants: sortedByScore,
                rankingValidation,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("❌ 排名逻辑测试失败:", error);
            return {
                success: false,
                error: String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});
