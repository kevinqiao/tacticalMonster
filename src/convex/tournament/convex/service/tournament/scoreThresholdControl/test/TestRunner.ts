/**
 * 测试运行器 - 简化版本，适用于实际Convex环境
 */

import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 实际环境测试套件
 */
export class RealEnvironmentTestSuite {
    private rankingManager: RankingRecommendationManager;

    constructor(ctx: any) {
        this.rankingManager = new RankingRecommendationManager(ctx);
    }

    /**
     * 快速验证测试
     */
    async quickValidationTest(): Promise<{
        success: boolean;
        results: any[];
        errors: string[];
    }> {
        const results: any[] = [];
        const errors: string[] = [];

        console.log('🧪 开始快速验证测试...');

        // 测试1: 单玩家推荐 - 多次运行对比
        try {
            console.log("🔄 运行多次单玩家测试，检查AI分数变化...");

            const testPlayerScore = 800;
            const testRuns = [];
            for (let i = 0; i < 3; i++) {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: 'test_player_001', score: testPlayerScore }],
                    5
                );
                testRuns.push(result);
            }

            // 显示多次运行的对比
            this.compareMultipleRuns(testRuns);

            // 使用第一次运行的结果进行后续验证
            const result1 = testRuns[0];
            console.log("=== 修复验证 ===");
            console.log("人类玩家:", {
                uid: result1.humanPlayers[0].uid,
                rank: result1.humanPlayers[0].recommendedRank,
                score: testPlayerScore,
                confidence: result1.humanPlayers[0].confidence
            });
            console.log("AI对手:");
            result1.aiOpponents.forEach(ai => {
                console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 分数${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
            });

            // 🔍 检查AI分数范围是否有重叠
            console.log("\n🎯 AI分数范围重叠检查:");
            const hasOverlap = this.checkScoreRangeOverlaps(result1.aiOpponents);
            if (!hasOverlap) {
                console.log("✅ AI分数范围无重叠");
            }

            // 🔍 显示分数范围间隙
            console.log("\n📏 AI分数范围间隙分析:");
            this.analyzeScoreRangeGaps(result1.aiOpponents);

            // 🔍 详细的排名验证
            console.log("\n📊 排名一致性检查:");
            const allParticipants = [
                { uid: result1.humanPlayers[0].uid, type: 'human', rank: result1.humanPlayers[0].recommendedRank, score: testPlayerScore },
                ...result1.aiOpponents.map(ai => ({ uid: ai.uid, type: 'ai', rank: ai.recommendedRank, score: ai.recommendedScore }))
            ].sort((a, b) => a.rank - b.rank);

            allParticipants.forEach(p => {
                console.log(`  第${p.rank}名: ${p.uid} (${p.type}) - 分数: ${p.score}`);
            });

            // 检查排名是否按分数正确排序
            let hasRankingError = false;
            for (let i = 0; i < allParticipants.length - 1; i++) {
                const current = allParticipants[i];
                const next = allParticipants[i + 1];
                if (current.score < next.score) {
                    console.log(`❌ 排名错误: 第${current.rank}名(${current.score}分) < 第${next.rank}名(${next.score}分)`);
                    hasRankingError = true;
                }
            }

            if (!hasRankingError) {
                console.log("✅ 排名一致性验证通过");
            } else {
                console.log("❌ 发现排名不一致问题，需要修复");

                // 显示正确的排名应该是什么样的
                const correctRanking = [...allParticipants].sort((a, b) => b.score - a.score);
                console.log("\n🔧 正确的排名应该是:");
                correctRanking.forEach((p, index) => {
                    console.log(`  第${index + 1}名: ${p.uid} (${p.type}) - 分数: ${p.score}`);
                });
            }

            console.log("=== 验证结束 ===");

            // 🔍 新增测试：相同分数下排名是否一致
            console.log("\n🎯 测试相同分数下的排名一致性:");
            await this.testRankingConsistencyWithSameScore();

            // 🔍 新增测试：并列名次处理
            await this.testTiedRankingHandling();

            results.push({
                test: '单玩家推荐',
                success: true,
                rank: result1.humanPlayers[0].recommendedRank,
                confidence: result1.humanPlayers[0].confidence,
                aiCount: result1.aiOpponents.length
            });

            console.log(`✅ 单玩家推荐: 第${result1.humanPlayers[0].recommendedRank}名`);

        } catch (error) {
            errors.push(`单玩家推荐失败: ${error}`);
            console.error('❌ 单玩家推荐失败:', error);
        }

        // 测试2: 多玩家推荐
        // try {
        //     const humanPlayers: HumanPlayer[] = [
        //         { uid: 'test_player_001', score: 9000 },
        //         { uid: 'test_player_002', score: 7000 },
        //         { uid: 'test_player_003', score: 5000 }
        //     ];

        //     const result2 = await this.rankingManager.generateMatchRankings(humanPlayers, 3);

        //     results.push({
        //         test: '多玩家推荐',
        //         success: true,
        //         playerRanks: result2.humanPlayers.map(p => ({
        //             uid: p.uid,
        //             rank: p.recommendedRank,
        //             confidence: p.confidence
        //         })),
        //         totalParticipants: result2.matchContext.totalParticipants
        //     });

        //     console.log('✅ 多玩家推荐完成');
        //     result2.humanPlayers.forEach(p => {
        //         console.log(`   ${p.uid}: 第${p.recommendedRank}名`);
        //     });

        // } catch (error) {
        //     errors.push(`多玩家推荐失败: ${error}`);
        //     console.error('❌ 多玩家推荐失败:', error);
        // }

        // 测试3: 单玩家Manager接口
        try {
            const result3 = await this.rankingManager.generateMatchRankings(
                [{ uid: 'test_player_001', score: 8500 }],
                5
            );

            const player = result3.humanPlayers[0];
            results.push({
                test: '单玩家Manager接口',
                success: true,
                rank: player.recommendedRank,
                confidence: player.confidence
            });

            console.log(`✅ 单玩家Manager接口: 第${player.recommendedRank}名`);

        } catch (error) {
            errors.push(`单玩家Manager接口失败: ${error}`);
            console.error('❌ 单玩家Manager接口失败:', error);
        }

        const success = errors.length === 0;

        console.log(`\n📊 测试总结:`);
        console.log(`   成功测试: ${results.filter(r => r.success).length}`);
        console.log(`   失败测试: ${errors.length}`);
        console.log(`   整体状态: ${success ? '✅ 通过' : '❌ 失败'}`);

        return { success, results, errors };
    }

    /**
     * 性能基准测试
     */
    async performanceBenchmark(): Promise<{
        avgTime: number;
        qps: number;
        results: any[];
    }> {
        console.log('⏱️ 开始性能基准测试...');

        const testCount = 5;
        const results: any[] = [];
        const startTime = Date.now();

        for (let i = 0; i < testCount; i++) {
            const iterationStart = Date.now();

            try {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: `perf_test_${i}`, score: 8000 + i * 100 }],
                    5
                );

                const iterationTime = Date.now() - iterationStart;
                results.push({
                    iteration: i + 1,
                    time: iterationTime,
                    success: true,
                    rank: result.humanPlayers[0].recommendedRank
                });

            } catch (error) {
                const iterationTime = Date.now() - iterationStart;
                results.push({
                    iteration: i + 1,
                    time: iterationTime,
                    success: false,
                    error: String(error)
                });
            }
        }

        const totalTime = Date.now() - startTime;
        const avgTime = totalTime / testCount;
        const qps = 1000 / avgTime;

        console.log(`📈 性能测试结果:`);
        console.log(`   总时间: ${totalTime}ms`);
        console.log(`   平均时间: ${avgTime.toFixed(2)}ms`);
        console.log(`   QPS: ${qps.toFixed(2)}`);

        results.forEach(r => {
            const status = r.success ? '✅' : '❌';
            console.log(`   测试${r.iteration}: ${status} ${r.time}ms`);
        });

        return { avgTime, qps, results };
    }

    /**
     * 边界条件测试
     */
    async boundaryConditionTest(): Promise<{
        success: boolean;
        tests: any[];
    }> {
        console.log('🔍 开始边界条件测试...');

        const tests: any[] = [];

        // 测试极端分数
        const extremeScores = [0, 1, 100, 50000, 999999];

        for (const score of extremeScores) {
            try {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: 'boundary_test', score }],
                    5
                );

                tests.push({
                    test: `极端分数 ${score}`,
                    success: true,
                    rank: result.humanPlayers[0].recommendedRank,
                    confidence: result.humanPlayers[0].confidence
                });

                console.log(`✅ 分数 ${score}: 第${result.humanPlayers[0].recommendedRank}名`);

            } catch (error) {
                tests.push({
                    test: `极端分数 ${score}`,
                    success: false,
                    error: String(error)
                });
                console.error(`❌ 分数 ${score} 测试失败:`, error);
            }
        }

        // 测试极端参与者数量
        const extremeCounts = [1, 2, 10, 20];

        for (const aiCount of extremeCounts) {
            try {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: 'boundary_test', score: 8000 }],
                    aiCount
                );

                tests.push({
                    test: `AI数量 ${aiCount}`,
                    success: true,
                    totalParticipants: result.matchContext.totalParticipants,
                    aiCount: result.aiOpponents.length
                });

                console.log(`✅ AI数量 ${aiCount}: 总${result.matchContext.totalParticipants}人`);

            } catch (error) {
                tests.push({
                    test: `AI数量 ${aiCount}`,
                    success: false,
                    error: String(error)
                });
                console.error(`❌ AI数量 ${aiCount} 测试失败:`, error);
            }
        }

        const success = tests.every(t => t.success);
        console.log(`🔍 边界条件测试${success ? '通过' : '失败'}`);

        return { success, tests };
    }

    /**
     * 完整测试套件
     */
    async runFullTestSuite(): Promise<{
        overall: boolean;
        validation: any;
        performance: any;
        boundary: any;
    }> {
        console.log('🎯 运行完整测试套件...\n');

        const validation = await this.quickValidationTest();
        console.log('');

        const performance = await this.performanceBenchmark();
        console.log('');

        const boundary = await this.boundaryConditionTest();
        console.log('');

        const overall = validation.success && boundary.success;

        console.log('📋 完整测试套件结果:');
        console.log(`   验证测试: ${validation.success ? '✅ 通过' : '❌ 失败'}`);
        console.log(`   性能测试: ${performance.avgTime < 1000 ? '✅ 通过' : '⚠️ 较慢'} (${performance.avgTime.toFixed(2)}ms)`);
        console.log(`   边界测试: ${boundary.success ? '✅ 通过' : '❌ 失败'}`);
        console.log(`   整体状态: ${overall ? '🎉 全部通过' : '💥 存在问题'}`);

        return {
            overall,
            validation,
            performance,
            boundary
        };
    }

    /**
     * 检查AI分数范围是否有重叠
     */
    private checkScoreRangeOverlaps(aiOpponents: any[]): boolean {
        if (aiOpponents.length < 2) return false;

        let hasOverlap = false;

        for (let i = 0; i < aiOpponents.length - 1; i++) {
            for (let j = i + 1; j < aiOpponents.length; j++) {
                const ai1 = aiOpponents[i];
                const ai2 = aiOpponents[j];

                // 检查两个范围是否重叠
                const overlap = this.rangesOverlap(
                    ai1.scoreRange.min, ai1.scoreRange.max,
                    ai2.scoreRange.min, ai2.scoreRange.max
                );

                if (overlap) {
                    console.log(`❌ 分数范围重叠: ${ai1.uid}(${ai1.scoreRange.min}-${ai1.scoreRange.max}) 与 ${ai2.uid}(${ai2.scoreRange.min}-${ai2.scoreRange.max})`);
                    hasOverlap = true;
                }
            }
        }

        return hasOverlap;
    }

    /**
     * 判断两个数值范围是否重叠
     */
    private rangesOverlap(min1: number, max1: number, min2: number, max2: number): boolean {
        return !(max1 < min2 || max2 < min1);
    }

    /**
     * 分析AI分数范围间隙
     */
    private analyzeScoreRangeGaps(aiOpponents: any[]): void {
        if (aiOpponents.length < 2) {
            console.log("AI数量不足，无需分析间隙");
            return;
        }

        // 按推荐分数排序
        const sortedAI = [...aiOpponents].sort((a, b) => b.recommendedScore - a.recommendedScore);

        console.log("分数范围间隙详情:");
        for (let i = 0; i < sortedAI.length - 1; i++) {
            const current = sortedAI[i];
            const next = sortedAI[i + 1];

            const gap = current.scoreRange.min - next.scoreRange.max;
            const gapStatus = gap > 0 ? "✅ 有间隙" : gap === 0 ? "⚠️  相邻" : "❌ 重叠";

            console.log(`  ${current.uid}(${current.scoreRange.min}-${current.scoreRange.max}) -> ${next.uid}(${next.scoreRange.min}-${next.scoreRange.max}): 间隙=${gap} ${gapStatus}`);
        }
    }

    /**
     * 测试相同分数下的排名一致性
     */
    private async testRankingConsistencyWithSameScore(): Promise<void> {
        const fixedScore = 800;
        const aiCount = 5;
        const testRuns = 5;

        console.log(`🔄 使用固定分数${fixedScore}进行${testRuns}次测试...`);

        const results = [];
        for (let i = 0; i < testRuns; i++) {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'test_player_fixed', score: fixedScore }],
                aiCount
            );
            results.push({
                run: i + 1,
                playerRank: result.humanPlayers[0].recommendedRank,
                confidence: result.humanPlayers[0].confidence,
                aiScores: result.aiOpponents.map(ai => ai.recommendedScore)
            });
        }

        // 分析排名变化
        const ranks = results.map(r => r.playerRank);
        const uniqueRanks = [...new Set(ranks)];
        const confidences = results.map(r => r.confidence);

        console.log("📊 相同分数下的排名变化分析:");
        results.forEach(result => {
            console.log(`  第${result.run}次: 排名${result.playerRank}, 信心度${(result.confidence * 100).toFixed(1)}%`);
        });

        console.log(`\n📈 统计结果:`);
        console.log(`  排名范围: ${Math.min(...ranks)} - ${Math.max(...ranks)}`);
        console.log(`  不同排名数量: ${uniqueRanks.length}`);
        console.log(`  平均排名: ${(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(2)}`);
        console.log(`  平均信心度: ${(confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length * 100).toFixed(1)}%`);

        // 判断一致性
        if (uniqueRanks.length === 1) {
            console.log(`⚠️  排名完全一致: 所有测试都是第${uniqueRanks[0]}名`);
            console.log(`   这可能表明随机性不够，需要检查算法实现`);
        } else {
            console.log(`✅ 排名有变化: 出现了${uniqueRanks.length}种不同排名 ${uniqueRanks.join(', ')}`);

            // 分析变化原因
            console.log(`\n🔍 变化原因分析:`);
            console.log(`  - AI分数随机变化导致排名调整`);
            console.log(`  - 玩家技能评估中的随机因素`);
            console.log(`  - 单玩家排名预测算法的内在变化`);
        }

        // 显示AI分数变化详情
        console.log(`\n🤖 AI分数变化详情:`);
        for (let aiIndex = 0; aiIndex < aiCount; aiIndex++) {
            const aiScores = results.map(r => r.aiScores[aiIndex]);
            const minScore = Math.min(...aiScores);
            const maxScore = Math.max(...aiScores);
            const variation = maxScore - minScore;
            console.log(`  AI_${aiIndex + 1}: ${minScore}-${maxScore} (变化: ${variation})`);
        }
    }

    /**
     * 测试并列名次处理
     */
    private async testTiedRankingHandling(): Promise<void> {
        console.log('\n🎯 测试并列名次处理...');

        try {
            // 测试场景1：玩家分数与AI分数相同
            console.log('📋 测试场景1: 玩家分数与AI分数相同');
            const result1 = await this.rankingManager.generateMatchRankings(
                [{ uid: 'test_player_tied', score: 800 }], // 玩家分数800
                3 // 3个AI
            );

            // 检查是否有并列名次
            const allParticipants = [
                { uid: result1.humanPlayers[0].uid, type: 'human', rank: result1.humanPlayers[0].recommendedRank, score: 800 },
                ...result1.aiOpponents.map(ai => ({ uid: ai.uid, type: 'ai', rank: ai.recommendedRank, score: ai.recommendedScore }))
            ];

            // 按分数分组，检查相同分数的参与者是否有相同排名
            const scoreGroups = new Map<number, any[]>();
            allParticipants.forEach(p => {
                if (!scoreGroups.has(p.score)) {
                    scoreGroups.set(p.score, []);
                }
                scoreGroups.get(p.score)!.push(p);
            });

            console.log('📊 分数分组分析:');
            let hasTiedRanks = false;
            scoreGroups.forEach((participants, score) => {
                if (participants.length > 1) {
                    const ranks = participants.map(p => p.rank);
                    const uniqueRanks = [...new Set(ranks)];
                    if (uniqueRanks.length === 1) {
                        console.log(`  ✅ 分数${score}: ${participants.length}个参与者并列第${uniqueRanks[0]}名`);
                        hasTiedRanks = true;
                    } else {
                        console.log(`  ❌ 分数${score}: ${participants.length}个参与者排名不一致 ${ranks.join(', ')}`);
                    }
                } else {
                    console.log(`  📋 分数${score}: 1个参与者第${participants[0].rank}名`);
                }
            });

            if (hasTiedRanks) {
                console.log('✅ 并列名次处理正确');
            } else {
                console.log('⚠️  未发现并列名次情况');
            }

            // 测试场景2：多个AI分数相同
            console.log('\n📋 测试场景2: 多个AI分数相同');
            // 这里我们可以通过多次运行来观察AI分数是否会出现相同的情况
            const testRuns = 10;
            let foundTiedAIs = false;

            for (let i = 0; i < testRuns; i++) {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: 'test_player_ai_tied', score: 1000 }],
                    5
                );

                // 检查AI分数是否有相同
                const aiScores = result.aiOpponents.map(ai => ai.recommendedScore);
                const scoreCounts = new Map<number, number>();
                aiScores.forEach(score => {
                    scoreCounts.set(score, (scoreCounts.get(score) || 0) + 1);
                });

                const tiedScores = Array.from(scoreCounts.entries()).filter(([score, count]) => count > 1);
                if (tiedScores.length > 0) {
                    console.log(`  ✅ 第${i + 1}次运行发现AI并列: ${tiedScores.map(([score, count]) => `${count}个AI分数${score}`).join(', ')}`);
                    foundTiedAIs = true;
                    break;
                }
            }

            if (!foundTiedAIs) {
                console.log(`  ⚠️  在${testRuns}次运行中未发现AI分数相同的情况`);
            }

        } catch (error) {
            console.error('❌ 并列名次测试失败:', error);
        }
    }

    /**
     * 比较多次运行结果
     */
    private compareMultipleRuns(testRuns: any[]): void {
        console.log(`\n🔍 ${testRuns.length}次运行结果对比:`);

        // 检查AI分数是否有变化
        let hasVariation = false;
        const aiScoresByRun: number[][] = [];

        testRuns.forEach((run, runIndex) => {
            console.log(`\n第${runIndex + 1}次运行:`);
            const aiScores: number[] = [];

            run.aiOpponents.forEach((ai: any) => {
                console.log(`  ${ai.uid}: ${ai.recommendedScore}`);
                aiScores.push(ai.recommendedScore);
            });

            aiScoresByRun.push(aiScores);
        });

        // 分析变化
        console.log(`\n📊 AI分数变化分析:`);
        for (let aiIndex = 0; aiIndex < aiScoresByRun[0].length; aiIndex++) {
            const scoresForThisAI = aiScoresByRun.map(run => run[aiIndex]);
            const minScore = Math.min(...scoresForThisAI);
            const maxScore = Math.max(...scoresForThisAI);
            const variation = maxScore - minScore;

            if (variation > 0) {
                hasVariation = true;
                console.log(`  ai_${aiIndex + 1}: ${minScore}-${maxScore} (变化范围: ${variation})`);
            } else {
                console.log(`  ai_${aiIndex + 1}: ${minScore} (无变化)`);
            }
        }

        if (hasVariation) {
            console.log("✅ AI分数具有随机变化性");
        } else {
            console.log("❌ AI分数缺乏变化性，每次运行结果相同");
        }
    }
}

/**
 * 导出便捷的测试函数，可在Convex mutation中调用
 */
export async function testRankingRecommendation(ctx: any): Promise<any> {
    const testSuite = new RealEnvironmentTestSuite(ctx);
    return await testSuite.runFullTestSuite();
}

export async function quickTestRankingRecommendation(ctx: any): Promise<any> {
    const testSuite = new RealEnvironmentTestSuite(ctx);
    return await testSuite.quickValidationTest();
}
