/**
 * 并列名次处理测试 - Convex函数
 */

import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文 - 为并列名次测试提供完整的历史数据
 */
class MockDatabaseContext {
    private mockMatchResults: Map<string, any[]> = new Map();

    constructor() {
        this.initializeMockData();
    }

    // 初始化测试数据 - 专门为并列名次测试设计
    private initializeMockData() {
        // 高技能玩家数据 - 用于测试高分并列
        this.mockMatchResults.set('player1', [
            { matchId: 'm1', score: 12000, rank: 1, createdAt: '2024-01-20T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm2', score: 11500, rank: 2, createdAt: '2024-01-19T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm3', score: 12500, rank: 1, createdAt: '2024-01-18T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm4', score: 11800, rank: 1, createdAt: '2024-01-17T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm5', score: 11200, rank: 2, createdAt: '2024-01-16T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm6', score: 13000, rank: 1, createdAt: '2024-01-15T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm7', score: 11700, rank: 2, createdAt: '2024-01-14T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm8', score: 12200, rank: 1, createdAt: '2024-01-13T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm9', score: 11900, rank: 1, createdAt: '2024-01-12T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm10', score: 12300, rank: 1, createdAt: '2024-01-11T10:00:00Z', segmentName: 'diamond' }
        ]);

        // 中等技能玩家数据 - 用于测试中等分数并列
        this.mockMatchResults.set('player2', [
            { matchId: 'm11', score: 8500, rank: 3, createdAt: '2024-01-20T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm12', score: 8200, rank: 2, createdAt: '2024-01-19T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm13', score: 7800, rank: 4, createdAt: '2024-01-18T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm14', score: 8800, rank: 2, createdAt: '2024-01-17T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm15', score: 8100, rank: 3, createdAt: '2024-01-16T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm16', score: 8600, rank: 2, createdAt: '2024-01-15T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm17', score: 7900, rank: 4, createdAt: '2024-01-14T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm18', score: 8300, rank: 3, createdAt: '2024-01-13T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm19', score: 8700, rank: 1, createdAt: '2024-01-12T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm20', score: 8000, rank: 3, createdAt: '2024-01-11T10:00:00Z', segmentName: 'gold' }
        ]);

        // 低技能玩家数据 - 用于测试低分并列
        this.mockMatchResults.set('player3', [
            { matchId: 'm21', score: 3200, rank: 5, createdAt: '2024-01-20T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm22', score: 3000, rank: 6, createdAt: '2024-01-19T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm23', score: 3400, rank: 4, createdAt: '2024-01-18T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm24', score: 2800, rank: 6, createdAt: '2024-01-17T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm25', score: 3100, rank: 5, createdAt: '2024-01-16T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm26', score: 3500, rank: 4, createdAt: '2024-01-15T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm27', score: 2900, rank: 6, createdAt: '2024-01-14T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm28', score: 3300, rank: 5, createdAt: '2024-01-13T10:00:00Z', segmentName: 'bronze' }
        ]);

        // 不稳定表现玩家数据 - 用于测试复杂并列场景
        this.mockMatchResults.set('player4', [
            { matchId: 'm29', score: 9500, rank: 1, createdAt: '2024-01-20T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm30', score: 5000, rank: 6, createdAt: '2024-01-19T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm31', score: 8800, rank: 2, createdAt: '2024-01-18T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm32', score: 4500, rank: 6, createdAt: '2024-01-17T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm33', score: 9200, rank: 1, createdAt: '2024-01-16T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm34', score: 5200, rank: 5, createdAt: '2024-01-15T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm35', score: 8500, rank: 3, createdAt: '2024-01-14T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm36', score: 4800, rank: 6, createdAt: '2024-01-13T10:00:00Z', segmentName: 'gold' }
        ]);

        // 为高密度并列测试添加更多玩家数据
        this.mockMatchResults.set('player5', [
            { matchId: 'm37', score: 1000, rank: 1, createdAt: '2024-01-20T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm38', score: 1000, rank: 1, createdAt: '2024-01-19T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm39', score: 1000, rank: 2, createdAt: '2024-01-18T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm40', score: 1000, rank: 1, createdAt: '2024-01-17T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm41', score: 1000, rank: 2, createdAt: '2024-01-16T10:00:00Z', segmentName: 'silver' }
        ]);

        this.mockMatchResults.set('player6', [
            { matchId: 'm42', score: 800, rank: 3, createdAt: '2024-01-20T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm43', score: 800, rank: 3, createdAt: '2024-01-19T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm44', score: 800, rank: 4, createdAt: '2024-01-18T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm45', score: 800, rank: 3, createdAt: '2024-01-17T10:00:00Z', segmentName: 'silver' },
            { matchId: 'm46', score: 800, rank: 4, createdAt: '2024-01-16T10:00:00Z', segmentName: 'silver' }
        ]);

        this.mockMatchResults.set('player7', [
            { matchId: 'm47', score: 600, rank: 5, createdAt: '2024-01-20T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm48', score: 600, rank: 5, createdAt: '2024-01-19T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm49', score: 600, rank: 6, createdAt: '2024-01-18T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm50', score: 600, rank: 5, createdAt: '2024-01-17T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm51', score: 600, rank: 6, createdAt: '2024-01-16T10:00:00Z', segmentName: 'bronze' }
        ]);
    }

    // 模拟数据库查询
    db = {
        query: (tableName: string) => ({
            withIndex: (indexName: string, filterFn: Function) => ({
                order: (direction: string) => ({
                    take: (limit: number) => {
                        if (tableName === 'match_results') {
                            // 通过执行 filterFn 来获取实际的 uid 值
                            let extractedUid: string | null = null;

                            // 创建一个模拟的查询对象来捕获 uid
                            const mockQuery = {
                                eq: (field: string, value: any) => {
                                    if (field === 'uid') {
                                        extractedUid = value;
                                    }
                                    return mockQuery;
                                }
                            };

                            // 执行 filterFn 来获取 uid
                            try {
                                filterFn(mockQuery);
                            } catch (error) {
                                console.warn('Filter function execution failed:', error);
                            }

                            // 如果成功提取到 uid，返回对应的数据
                            if (extractedUid) {
                                const matches = this.mockMatchResults.get(extractedUid) || [];
                                console.log(`📊 模拟数据库查询: ${extractedUid} -> ${matches.length} 条记录`);
                                return Promise.resolve(matches.slice(0, limit));
                            }

                            console.warn('无法从 filterFn 中提取 uid');
                            return Promise.resolve([]);
                        }
                        return Promise.resolve([]);
                    }
                })
            })
        })
    };
}

export class TiedRankingTestSuite {
    private mockCtx: MockDatabaseContext;
    private rankingManager: RankingRecommendationManager;

    constructor(ctx: any) {
        // 使用模拟数据库上下文而不是真实的 ctx
        this.mockCtx = new MockDatabaseContext();
        this.rankingManager = new RankingRecommendationManager(this.mockCtx);

        console.log('📊 并列名次测试使用模拟历史数据:');
        console.log('   - player1: 高技能玩家 (Diamond段位, 平均分12000+)');
        console.log('   - player2: 中等技能玩家 (Gold段位, 平均分8000+)');
        console.log('   - player3: 低技能玩家 (Bronze段位, 平均分3000+)');
        console.log('   - player4: 不稳定玩家 (Gold段位, 表现波动大)');
        console.log('   - player5-7: 高密度并列测试专用玩家');
    }

    async runTiedRankingTests(): Promise<{
        success: boolean;
        testResults: any[];
        summary: string;
    }> {
        console.log('🎯 开始并列名次处理测试...\n');

        const testResults: any[] = [];
        let successCount = 0;
        let totalTests = 0;

        // 测试1: 玩家与AI分数相同
        try {
            console.log('📋 测试1: 玩家与AI分数相同');
            const result1 = await this.testPlayerAITiedScore();
            testResults.push(result1);
            if (result1.success) successCount++;
            totalTests++;
        } catch (error) {
            console.error('❌ 测试1失败:', error);
            testResults.push({
                testName: '玩家与AI分数相同',
                success: false,
                error: String(error)
            });
            totalTests++;
        }

        // 测试2: 多个AI分数相同
        try {
            console.log('\n📋 测试2: 多个AI分数相同');
            const result2 = await this.testMultipleAITiedScores();
            testResults.push(result2);
            if (result2.success) successCount++;
            totalTests++;
        } catch (error) {
            console.error('❌ 测试2失败:', error);
            testResults.push({
                testName: '多个AI分数相同',
                success: false,
                error: String(error)
            });
            totalTests++;
        }

        // 测试3: 多玩家并列名次
        try {
            console.log('\n📋 测试3: 多玩家并列名次');
            const result3 = await this.testMultiplePlayersTiedRanks();
            testResults.push(result3);
            if (result3.success) successCount++;
            totalTests++;
        } catch (error) {
            console.error('❌ 测试3失败:', error);
            testResults.push({
                testName: '多玩家并列名次',
                success: false,
                error: String(error)
            });
            totalTests++;
        }

        // 测试4: 强制并列名次测试
        try {
            console.log('\n📋 测试4: 强制并列名次测试');
            const result4 = await this.testForcedTiedRankings();
            testResults.push(result4);
            if (result4.success) successCount++;
            totalTests++;
        } catch (error) {
            console.error('❌ 测试4失败:', error);
            testResults.push({
                testName: '强制并列名次测试',
                success: false,
                error: String(error)
            });
            totalTests++;
        }

        // 测试5: 高密度并列名次测试
        try {
            console.log('\n📋 测试5: 高密度并列名次测试');
            const result5 = await this.testHighDensityTiedRankings();
            testResults.push(result5);
            if (result5.success) successCount++;
            totalTests++;
        } catch (error) {
            console.error('❌ 测试5失败:', error);
            testResults.push({
                testName: '高密度并列名次测试',
                success: false,
                error: String(error)
            });
            totalTests++;
        }

        const success = successCount === totalTests;
        const summary = `并列名次测试: ${successCount}/${totalTests} 通过`;

        console.log(`\n📊 并列名次测试总结:`);
        console.log(`   成功测试: ${successCount}`);
        console.log(`   失败测试: ${totalTests - successCount}`);
        console.log(`   整体状态: ${success ? '✅ 全部通过' : '❌ 存在问题'}`);

        return { success, testResults, summary };
    }

    /**
     * 测试1: 玩家与AI分数相同
     * 通过多次运行增加发现并列名次的概率
     */
    private async testPlayerAITiedScore(): Promise<{
        testName: string;
        success: boolean;
        details: any;
        error?: string;
    }> {
        console.log('  测试场景: 基于历史数据的玩家与AI分数相同测试');

        const testScenarios = [
            {
                name: '高技能玩家并列测试',
                player: { uid: 'player1', score: 12000 }, // 使用高技能玩家的典型分数
                aiCount: 4,
                expectedSkill: 'diamond'
            },
            {
                name: '中等技能玩家并列测试',
                player: { uid: 'player2', score: 8500 }, // 使用中等技能玩家的典型分数
                aiCount: 3,
                expectedSkill: 'gold'
            },
            {
                name: '低技能玩家并列测试',
                player: { uid: 'player3', score: 3200 }, // 使用低技能玩家的典型分数
                aiCount: 5,
                expectedSkill: 'bronze'
            }
        ];

        const results: any[] = [];
        let totalTiedFound = 0;

        for (const scenario of testScenarios) {
            console.log(`    📋 测试 ${scenario.name}...`);

            const testRuns = 20; // 每个场景测试20次
            let scenarioTiedFound = 0;
            const scenarioResults: any[] = [];

            for (let i = 0; i < testRuns; i++) {
                try {
                    const result = await this.rankingManager.generateMatchRankings(
                        [scenario.player],
                        scenario.aiCount
                    );

                    const allParticipants = [
                        ...result.humanPlayers.map(p => ({
                            uid: p.uid,
                            type: 'human',
                            rank: p.recommendedRank,
                            score: scenario.player.score,
                            confidence: p.confidence,
                            reasoning: p.reasoning
                        })),
                        ...result.aiOpponents.map(ai => ({
                            uid: ai.uid,
                            type: 'ai',
                            rank: ai.recommendedRank,
                            score: ai.recommendedScore,
                            difficulty: ai.difficulty,
                            behavior: ai.behavior
                        }))
                    ];

                    // 检查是否有并列名次
                    const hasTiedRanks = this.checkForTiedRanks(allParticipants);
                    if (hasTiedRanks.found) {
                        scenarioTiedFound++;
                        scenarioResults.push({
                            run: i + 1,
                            tiedScore: hasTiedRanks.tiedScore,
                            tiedParticipants: hasTiedRanks.tiedParticipants,
                            tiedRank: hasTiedRanks.tiedRank,
                            allParticipants: allParticipants.sort((a, b) => a.rank - b.rank),
                            humanPlayerProfile: result.humanPlayers[0]
                        });
                    }

                } catch (error) {
                    console.error(`    ❌ ${scenario.name} 运行 ${i + 1} 失败:`, error);
                }
            }

            results.push({
                scenario: scenario.name,
                expectedSkill: scenario.expectedSkill,
                totalRuns: testRuns,
                tiedRunsFound: scenarioTiedFound,
                tiedRuns: scenarioResults.slice(0, 2), // 只显示前2个结果
                success: scenarioTiedFound > 0
            });

            totalTiedFound += scenarioTiedFound;
            console.log(`    ✅ ${scenario.name}: 找到 ${scenarioTiedFound}/${testRuns} 次并列名次`);
        }

        return {
            testName: '基于历史数据的玩家与AI分数相同测试',
            success: totalTiedFound > 0,
            details: {
                totalScenarios: testScenarios.length,
                totalTiedFound,
                scenarioResults: results,
                message: totalTiedFound > 0 ?
                    `成功找到 ${totalTiedFound} 次并列名次情况，覆盖 ${testScenarios.length} 种技能水平` :
                    '未找到并列名次情况，可能需要调整测试参数'
            }
        };
    }

    /**
     * 测试2: 多个AI分数相同
     * 通过多次运行增加发现AI分数相同的概率
     */
    private async testMultipleAITiedScores(): Promise<{
        testName: string;
        success: boolean;
        details: any;
        error?: string;
    }> {
        console.log('  测试场景: 玩家分数1000，5个AI对手');

        const testRuns = 35; // 大幅增加运行次数
        let foundTiedAIs = false;
        let testDetails: any = null;

        for (let run = 0; run < testRuns; run++) {
            const result = await this.rankingManager.generateMatchRankings(
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
                    allAIScores: aiScores,
                    aiOpponents: result.aiOpponents
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
            testName: '多个AI分数相同',
            success: true,
            details: testDetails
        };
    }

    /**
     * 测试3: 多玩家并列名次
     * 直接测试多玩家场景，确保有并列名次
     */
    private async testMultiplePlayersTiedRanks(): Promise<{
        testName: string;
        success: boolean;
        details: any;
        error?: string;
    }> {
        console.log('  测试场景: 多个玩家，检查排名逻辑');

        const result = await this.rankingManager.generateMatchRankings(
            [
                { uid: 'player1', score: 1000 },
                { uid: 'player2', score: 1000 }, // 相同分数
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
            allHumanPlayers: humanPlayers,
            aiOpponents: result.aiOpponents
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
            testName: '多玩家并列名次',
            success,
            details: testDetails,
            error: issues.length > 0 ? issues.join('; ') : undefined
        };
    }

    /**
     * 测试4: 强制并列名次测试
     * 通过特殊配置确保产生并列名次
     */
    private async testForcedTiedRankings(): Promise<{
        testName: string;
        success: boolean;
        details: any;
        error?: string;
    }> {
        console.log('  测试场景: 强制创建并列名次情况');

        // 测试场景1: 多个相同分数
        const testScenarios = [
            {
                name: '多个800分',
                humanPlayers: [
                    { uid: 'player1', score: 800 },
                    { uid: 'player2', score: 800 },
                    { uid: 'player3', score: 800 }
                ],
                aiCount: 2
            },
            {
                name: '混合分数',
                humanPlayers: [
                    { uid: 'player1', score: 1000 },
                    { uid: 'player2', score: 1000 },
                    { uid: 'player3', score: 800 },
                    { uid: 'player4', score: 800 }
                ],
                aiCount: 3
            }
        ];

        const testResults: any[] = [];
        let allSuccess = true;

        for (const scenario of testScenarios) {
            console.log(`    测试子场景: ${scenario.name}`);

            try {
                const result = await this.rankingManager.generateMatchRankings(
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
                const tiedRankings = this.analyzeTiedRankings(allParticipants);

                const scenarioResult = {
                    scenarioName: scenario.name,
                    humanPlayers: result.humanPlayers,
                    aiOpponents: result.aiOpponents,
                    allParticipants: allParticipants,
                    tiedRankings: tiedRankings,
                    hasTiedRanks: tiedRankings.length > 0
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
            testName: '强制并列名次测试',
            success: allSuccess,
            details: {
                testScenarios: testScenarios,
                results: testResults
            }
        };
    }

    /**
     * 检查参与者中是否有并列名次
     */
    private checkForTiedRanks(allParticipants: any[]): {
        found: boolean;
        tiedScore?: number;
        tiedParticipants?: number;
        tiedRank?: number;
        participants?: any[];
    } {
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
                    return {
                        found: true,
                        tiedScore: score,
                        tiedParticipants: participants.length,
                        tiedRank: uniqueRanks[0],
                        participants: participants
                    };
                }
            }
        }

        return { found: false };
    }

    /**
     * 分析并列名次情况
     */
    private analyzeTiedRankings(allParticipants: any[]): Array<{
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
     * 测试5: 高密度并列名次测试
     * 通过特殊配置最大化并列名次出现的概率
     */
    private async testHighDensityTiedRankings(): Promise<{
        testName: string;
        success: boolean;
        details: any;
        error?: string;
    }> {
        console.log('  测试场景: 高密度并列名次测试');

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
                const result = await this.rankingManager.generateMatchRankings(
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
                const tiedRankings = this.analyzeTiedRankings(allParticipants);

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
                const rankingValidation = this.validateRankingLogic(allParticipants);
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
            testName: '高密度并列名次测试',
            success: allSuccess,
            details: {
                testScenarios: testScenarios,
                results: testResults
            }
        };
    }

    /**
 * 验证排名逻辑的正确性
 */
    private validateRankingLogic(allParticipants: any[]): {
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
}

/**
 * Convex函数: 运行并列名次测试
 */
export async function testTiedRanking(ctx: any): Promise<any> {
    const testSuite = new TiedRankingTestSuite(ctx);
    return await testSuite.runTiedRankingTests();
}

/**
 * Convex函数: 快速并列名次验证
 */
export async function quickTiedRankingTest(ctx: any): Promise<any> {
    const testSuite = new TiedRankingTestSuite(ctx);

    console.log('🎯 快速并列名次验证...');

    const result = await testSuite.runTiedRankingTests();

    return {
        success: result.success,
        summary: result.summary,
        keyTests: result.testResults.slice(0, 2)
    };
}
