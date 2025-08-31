/**
 * 测试运行器 - 简化版本，适用于实际Convex环境
 */

import { HumanPlayer, RankingRecommendationManager } from '../managers/RankingRecommendationManager';

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

        // 测试1: 单玩家推荐
        try {
            const result1 = await this.rankingManager.generateMatchRankings(
                [{ uid: 'test_player_001', score: 8500 }],
                5
            );

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
        try {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'test_player_001', score: 9000 },
                { uid: 'test_player_002', score: 7000 },
                { uid: 'test_player_003', score: 5000 }
            ];

            const result2 = await this.rankingManager.generateMatchRankings(humanPlayers, 3);

            results.push({
                test: '多玩家推荐',
                success: true,
                playerRanks: result2.humanPlayers.map(p => ({
                    uid: p.uid,
                    rank: p.recommendedRank,
                    confidence: p.confidence
                })),
                totalParticipants: result2.matchContext.totalParticipants
            });

            console.log('✅ 多玩家推荐完成');
            result2.humanPlayers.forEach(p => {
                console.log(`   ${p.uid}: 第${p.recommendedRank}名`);
            });

        } catch (error) {
            errors.push(`多玩家推荐失败: ${error}`);
            console.error('❌ 多玩家推荐失败:', error);
        }

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
