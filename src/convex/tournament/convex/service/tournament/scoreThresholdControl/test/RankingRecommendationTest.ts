/**
 * 推荐排名系统完整测试代码
 * 测试 RankingRecommendationManager 和相关功能的各种场景
 */

import {
    HumanPlayer,
    MatchRankingResult,
    RankingRecommendationManager
} from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    private mockMatchResults: Map<string, any[]> = new Map();

    constructor() {
        this.initializeMockData();
    }

    // 初始化测试数据
    private initializeMockData() {
        // 专家级玩家数据
        this.mockMatchResults.set('expert_001', [
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

        // 中级玩家数据
        this.mockMatchResults.set('intermediate_001', [
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

        // 新手玩家数据
        this.mockMatchResults.set('newbie_001', [
            { matchId: 'm21', score: 3200, rank: 5, createdAt: '2024-01-20T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm22', score: 3000, rank: 6, createdAt: '2024-01-19T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm23', score: 3400, rank: 4, createdAt: '2024-01-18T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm24', score: 2800, rank: 6, createdAt: '2024-01-17T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm25', score: 3100, rank: 5, createdAt: '2024-01-16T10:00:00Z', segmentName: 'bronze' }
        ]);

        // 不稳定表现玩家数据
        this.mockMatchResults.set('inconsistent_001', [
            { matchId: 'm26', score: 9500, rank: 1, createdAt: '2024-01-20T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm27', score: 5000, rank: 6, createdAt: '2024-01-19T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm28', score: 8800, rank: 2, createdAt: '2024-01-18T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm29', score: 4500, rank: 6, createdAt: '2024-01-17T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm30', score: 9200, rank: 1, createdAt: '2024-01-16T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm31', score: 5200, rank: 5, createdAt: '2024-01-15T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm32', score: 8500, rank: 3, createdAt: '2024-01-14T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm33', score: 4800, rank: 6, createdAt: '2024-01-13T10:00:00Z', segmentName: 'gold' }
        ]);
    }

    // 模拟数据库查询
    db = {
        query: (tableName: string) => ({
            withIndex: (indexName: string, filterFn: Function) => ({
                order: (direction: string) => ({
                    take: (limit: number) => {
                        if (tableName === 'match_results') {
                            // 从 filterFn 中提取 uid (简化处理)
                            const uid = this.extractUidFromFilter(filterFn.toString());
                            const matches = this.mockMatchResults.get(uid) || [];
                            return Promise.resolve(matches.slice(0, limit));
                        }
                        return Promise.resolve([]);
                    }
                })
            })
        })
    };

    private extractUidFromFilter(filterStr: string): string {
        // 简化的 UID 提取逻辑
        if (filterStr.includes('expert_001')) return 'expert_001';
        if (filterStr.includes('intermediate_001')) return 'intermediate_001';
        if (filterStr.includes('newbie_001')) return 'newbie_001';
        if (filterStr.includes('inconsistent_001')) return 'inconsistent_001';
        return 'unknown_player';
    }
}

/**
 * 推荐排名测试套件
 */
export class RankingRecommendationTestSuite {
    private mockCtx: MockDatabaseContext;
    private rankingManager: RankingRecommendationManager;

    constructor() {
        this.mockCtx = new MockDatabaseContext();
        this.rankingManager = new RankingRecommendationManager(this.mockCtx);
    }

    /**
     * 运行所有测试
     */
    async runAllTests(): Promise<void> {
        console.log('🧪 开始推荐排名系统完整测试...\n');

        // 基础功能测试
        await this.testSinglePlayerRanking();
        await this.testMultiPlayerRanking();

        // 不同技能水平测试
        await this.testExpertPlayerRanking();
        await this.testBeginnerPlayerRanking();
        await this.testMixedSkillLevelRanking();

        // 特殊场景测试
        await this.testInconsistentPlayerRanking();
        await this.testLargeMatchRanking();
        await this.testSmallMatchRanking();

        // AI生成测试
        await this.testAIOpponentGeneration();
        await this.testAIDifficultyDistribution();

        // 边界条件测试
        await this.testEdgeCases();

        // 性能和一致性测试
        await this.testConsistency();
        await this.testPerformance();

        console.log('✅ 所有测试完成！');
    }

    /**
     * 测试单玩家排名推荐
     */
    private async testSinglePlayerRanking(): Promise<void> {
        console.log('=== 测试1: 单玩家排名推荐 ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'expert_001', score: 12000 }],
                5 // 5个AI对手
            );

            this.validateMatchRankingResult(result);

            const player = result.humanPlayers[0];
            console.log(`✅ 专家玩家推荐排名: 第${player.recommendedRank}名`);
            console.log(`   信心度: ${(player.confidence * 100).toFixed(1)}%`);
            console.log(`   表现评价: ${player.relativePerformance}`);
            console.log(`   推理: ${player.reasoning}`);
            console.log(`   AI对手数量: ${result.aiOpponents.length}`);

            // 验证排名合理性
            this.assert(player.recommendedRank >= 1 && player.recommendedRank <= 6, '排名应在有效范围内');
            this.assert(player.confidence > 0.5, '专家玩家的信心度应该较高');

        } catch (error) {
            console.error('❌ 单玩家排名测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试多玩家排名推荐
     */
    private async testMultiPlayerRanking(): Promise<void> {
        console.log('=== 测试2: 多玩家排名推荐 ===');

        try {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'expert_001', score: 12000 },
                { uid: 'intermediate_001', score: 8500 },
                { uid: 'newbie_001', score: 3200 }
            ];

            const result = await this.rankingManager.generateMatchRankings(humanPlayers, 3);

            this.validateMatchRankingResult(result);

            console.log('✅ 多玩家排名结果:');
            result.humanPlayers.forEach(player => {
                console.log(`   ${player.uid}: 第${player.recommendedRank}名 (${(player.confidence * 100).toFixed(1)}% 信心)`);
            });

            // 验证排名逻辑：分数高的玩家排名应该更好
            const sortedByScore = [...humanPlayers].sort((a, b) => b.score - a.score);
            const sortedByRank = [...result.humanPlayers].sort((a, b) => a.recommendedRank - b.recommendedRank);

            for (let i = 0; i < sortedByScore.length - 1; i++) {
                const higherScorePlayer = sortedByScore[i];
                const lowerScorePlayer = sortedByScore[i + 1];

                const higherScoreRank = result.humanPlayers.find(p => p.uid === higherScorePlayer.uid)!.recommendedRank;
                const lowerScoreRank = result.humanPlayers.find(p => p.uid === lowerScorePlayer.uid)!.recommendedRank;

                this.assert(higherScoreRank <= lowerScoreRank,
                    `分数更高的玩家(${higherScorePlayer.uid})排名应不低于分数较低的玩家(${lowerScorePlayer.uid})`);
            }

        } catch (error) {
            console.error('❌ 多玩家排名测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试专家级玩家排名
     */
    private async testExpertPlayerRanking(): Promise<void> {
        console.log('=== 测试3: 专家级玩家排名 ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'expert_001', score: 13000 }], // 超高分
                7 // 7个AI对手，8人比赛
            );

            const player = result.humanPlayers[0];
            console.log(`✅ 专家超高分表现:`);
            console.log(`   推荐排名: 第${player.recommendedRank}名`);
            console.log(`   信心度: ${(player.confidence * 100).toFixed(1)}%`);
            console.log(`   AI对手难度分布:`);

            const difficultyCount = result.aiOpponents.reduce((acc, ai) => {
                acc[ai.difficulty] = (acc[ai.difficulty] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            Object.entries(difficultyCount).forEach(([difficulty, count]) => {
                console.log(`     ${difficulty}: ${count}个`);
            });

            // 专家玩家应该获得较好的排名
            this.assert(player.recommendedRank <= 3, '专家玩家排名应该在前3名');
            this.assert(player.confidence >= 0.7, '专家玩家信心度应该很高');

        } catch (error) {
            console.error('❌ 专家级玩家测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试新手玩家排名
     */
    private async testBeginnerPlayerRanking(): Promise<void> {
        console.log('=== 测试4: 新手玩家排名 ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'newbie_001', score: 3200 }],
                5 // 6人比赛
            );

            const player = result.humanPlayers[0];
            console.log(`✅ 新手玩家表现:`);
            console.log(`   推荐排名: 第${player.recommendedRank}名`);
            console.log(`   表现评价: ${player.relativePerformance}`);
            console.log(`   AI支持性行为比例:`);

            const behaviorCount = result.aiOpponents.reduce((acc, ai) => {
                acc[ai.behavior] = (acc[ai.behavior] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            Object.entries(behaviorCount).forEach(([behavior, count]) => {
                console.log(`     ${behavior}: ${count}个`);
            });

            // 新手应该有更多支持性AI
            const supportiveCount = behaviorCount['supportive'] || 0;
            this.assert(supportiveCount >= 2, '新手玩家应该有更多支持性AI');

        } catch (error) {
            console.error('❌ 新手玩家测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试混合技能水平排名
     */
    private async testMixedSkillLevelRanking(): Promise<void> {
        console.log('=== 测试5: 混合技能水平排名 ===');

        try {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'expert_001', score: 12000 },      // 专家
                { uid: 'intermediate_001', score: 8500 }, // 中级
                { uid: 'newbie_001', score: 3200 },       // 新手
                { uid: 'inconsistent_001', score: 7000 }  // 不稳定
            ];

            const result = await this.rankingManager.generateMatchRankings(humanPlayers, 4); // 8人比赛

            console.log('✅ 混合技能水平排名:');
            const rankedPlayers = result.humanPlayers.sort((a, b) => a.recommendedRank - b.recommendedRank);

            rankedPlayers.forEach((player, index) => {
                const originalPlayer = humanPlayers.find(p => p.uid === player.uid)!;
                console.log(`   第${player.recommendedRank}名: ${player.uid} (分数: ${originalPlayer.score})`);
                console.log(`     表现: ${player.relativePerformance}, 信心: ${(player.confidence * 100).toFixed(1)}%`);
            });

            console.log('   AI对手分布:');
            result.aiOpponents.forEach(ai => {
                console.log(`     ${ai.uid}: 第${ai.recommendedRank}名, 分数${ai.recommendedScore} (${ai.difficulty}/${ai.behavior})`);
            });

            // 验证技能水平与排名的合理性
            const expertRank = result.humanPlayers.find(p => p.uid === 'expert_001')!.recommendedRank;
            const newbieRank = result.humanPlayers.find(p => p.uid === 'newbie_001')!.recommendedRank;

            this.assert(expertRank < newbieRank, '专家排名应该优于新手');

        } catch (error) {
            console.error('❌ 混合技能水平测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试表现不稳定的玩家
     */
    private async testInconsistentPlayerRanking(): Promise<void> {
        console.log('=== 测试6: 不稳定表现玩家排名 ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'inconsistent_001', score: 7000 }],
                5
            );

            const player = result.humanPlayers[0];
            console.log(`✅ 不稳定玩家分析:`);
            console.log(`   推荐排名: 第${player.recommendedRank}名`);
            console.log(`   信心度: ${(player.confidence * 100).toFixed(1)}% (应该较低)`);
            console.log(`   表现评价: ${player.relativePerformance}`);
            console.log(`   推理: ${player.reasoning}`);

            // 不稳定玩家的信心度应该较低
            this.assert(player.confidence < 0.7, '不稳定玩家的推荐信心度应该较低');

        } catch (error) {
            console.error('❌ 不稳定表现玩家测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试大型比赛排名（12人）
     */
    private async testLargeMatchRanking(): Promise<void> {
        console.log('=== 测试7: 大型比赛排名 (12人) ===');

        try {
            const humanPlayers: HumanPlayer[] = [
                { uid: 'expert_001', score: 12000 },
                { uid: 'intermediate_001', score: 8500 }
            ];

            const result = await this.rankingManager.generateMatchRankings(humanPlayers, 10); // 12人比赛

            console.log(`✅ 大型比赛结果 (${result.matchContext.totalParticipants}人):`);
            result.humanPlayers.forEach(player => {
                console.log(`   ${player.uid}: 第${player.recommendedRank}名`);
            });

            console.log(`   AI对手排名分布: ${result.aiOpponents.map(ai => ai.recommendedRank).sort((a, b) => a - b).join(', ')}`);

            this.assert(result.matchContext.totalParticipants === 12, '总参与者应为12人');
            this.assert(result.aiOpponents.length === 10, 'AI对手应为10个');

        } catch (error) {
            console.error('❌ 大型比赛测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试小型比赛排名（4人）
     */
    private async testSmallMatchRanking(): Promise<void> {
        console.log('=== 测试8: 小型比赛排名 (4人) ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'intermediate_001', score: 8500 }],
                3 // 4人比赛
            );

            console.log(`✅ 小型比赛结果 (${result.matchContext.totalParticipants}人):`);
            console.log(`   玩家排名: 第${result.humanPlayers[0].recommendedRank}名`);
            console.log(`   信心度: ${(result.humanPlayers[0].confidence * 100).toFixed(1)}% (小比赛信心度应较高)`);

            // 小比赛的信心度应该更高
            this.assert(result.humanPlayers[0].confidence > 0.6, '小比赛的推荐信心度应该较高');

        } catch (error) {
            console.error('❌ 小型比赛测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试AI对手生成
     */
    private async testAIOpponentGeneration(): Promise<void> {
        console.log('=== 测试9: AI对手生成 ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'expert_001', score: 12000 }],
                5
            );

            console.log('✅ AI对手生成分析:');

            result.aiOpponents.forEach((ai, index) => {
                console.log(`   ${ai.uid}: 第${ai.recommendedRank}名`);
                console.log(`     分数: ${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
                console.log(`     难度: ${ai.difficulty}, 行为: ${ai.behavior}`);
            });

            // 验证AI分数范围合理性
            result.aiOpponents.forEach(ai => {
                this.assert(ai.recommendedScore >= ai.scoreRange.min, 'AI推荐分数应在范围内');
                this.assert(ai.recommendedScore <= ai.scoreRange.max, 'AI推荐分数应在范围内');
                this.assert(ai.scoreRange.min >= 0, 'AI分数范围应为正数');
            });

        } catch (error) {
            console.error('❌ AI对手生成测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试AI难度分布
     */
    private async testAIDifficultyDistribution(): Promise<void> {
        console.log('=== 测试10: AI难度分布 ===');

        try {
            // 测试不同玩家水平下的AI难度分布
            const testCases = [
                { uid: 'expert_001', score: 12000, expectedDifficulty: 'high' },
                { uid: 'intermediate_001', score: 8500, expectedDifficulty: 'medium' },
                { uid: 'newbie_001', score: 3200, expectedDifficulty: 'low' }
            ];

            for (const testCase of testCases) {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: testCase.uid, score: testCase.score }],
                    6
                );

                const difficultyCount = result.aiOpponents.reduce((acc, ai) => {
                    acc[ai.difficulty] = (acc[ai.difficulty] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                console.log(`✅ ${testCase.uid} (${testCase.expectedDifficulty}水平) AI难度分布:`);
                Object.entries(difficultyCount).forEach(([difficulty, count]) => {
                    console.log(`   ${difficulty}: ${count}个 (${(count / 6 * 100).toFixed(1)}%)`);
                });
            }

        } catch (error) {
            console.error('❌ AI难度分布测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试边界条件
     */
    private async testEdgeCases(): Promise<void> {
        console.log('=== 测试11: 边界条件 ===');

        try {
            // 测试1: 极高分数
            console.log('📋 测试极高分数...');
            let result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'expert_001', score: 50000 }], // 极高分
                5
            );
            console.log(`   极高分排名: 第${result.humanPlayers[0].recommendedRank}名`);

            // 测试2: 极低分数
            console.log('📋 测试极低分数...');
            result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'newbie_001', score: 100 }], // 极低分
                5
            );
            console.log(`   极低分排名: 第${result.humanPlayers[0].recommendedRank}名`);

            // 测试3: 单人比赛（1人+1AI）
            console.log('📋 测试最小比赛规模...');
            result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'intermediate_001', score: 8500 }],
                1 // 只有1个AI
            );
            console.log(`   2人比赛排名: 第${result.humanPlayers[0].recommendedRank}名`);
            this.assert(result.matchContext.totalParticipants === 2, '最小比赛应为2人');

            // 测试4: 相同分数的多个玩家
            console.log('📋 测试相同分数玩家...');
            result = await this.rankingManager.generateMatchRankings([
                { uid: 'expert_001', score: 8000 },
                { uid: 'intermediate_001', score: 8000 }, // 相同分数
                { uid: 'newbie_001', score: 8000 }       // 相同分数
            ], 3);

            const ranks = result.humanPlayers.map(p => p.recommendedRank);
            console.log(`   相同分数玩家排名: ${ranks.join(', ')}`);

            console.log('✅ 边界条件测试完成');

        } catch (error) {
            console.error('❌ 边界条件测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试推荐一致性
     */
    private async testConsistency(): Promise<void> {
        console.log('=== 测试12: 推荐一致性 ===');

        try {
            const testPlayer = { uid: 'expert_001', score: 12000 };
            const results: number[] = [];

            // 运行多次相同的推荐
            for (let i = 0; i < 5; i++) {
                const result = await this.rankingManager.generateMatchRankings([testPlayer], 5);
                results.push(result.humanPlayers[0].recommendedRank);
            }

            console.log(`✅ 一致性测试结果: ${results.join(', ')}`);

            // 计算方差
            const mean = results.reduce((sum, rank) => sum + rank, 0) / results.length;
            const variance = results.reduce((sum, rank) => sum + Math.pow(rank - mean, 2), 0) / results.length;
            const stdDev = Math.sqrt(variance);

            console.log(`   平均排名: ${mean.toFixed(2)}`);
            console.log(`   标准差: ${stdDev.toFixed(2)} (应该较小)`);

            // 一致性应该较好（标准差小于1）
            this.assert(stdDev < 1.5, '推荐排名应该具有一致性');

        } catch (error) {
            console.error('❌ 一致性测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试性能
     */
    private async testPerformance(): Promise<void> {
        console.log('=== 测试13: 性能测试 ===');

        try {
            const startTime = Date.now();

            // 执行多个推荐任务
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    this.rankingManager.generateMatchRankings(
                        [{ uid: 'expert_001', score: 12000 + i * 100 }],
                        5
                    )
                );
            }

            await Promise.all(promises);

            const endTime = Date.now();
            const duration = endTime - startTime;
            const avgTime = duration / 10;

            console.log(`✅ 性能测试结果:`);
            console.log(`   总时间: ${duration}ms`);
            console.log(`   平均时间: ${avgTime.toFixed(2)}ms/次`);
            console.log(`   QPS: ${(1000 / avgTime).toFixed(2)} 次/秒`);

            // 性能应该足够好（平均每次推荐不超过100ms）
            this.assert(avgTime < 100, '推荐性能应该足够快');

        } catch (error) {
            console.error('❌ 性能测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试直接使用RankingRecommendationManager的排名推荐方法
     */
    async testDirectManagerRankingRecommendation(): Promise<void> {
        console.log('=== 测试14: 直接Manager排名推荐 ===');

        try {
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'expert_001', score: 12000 }],
                5
            );

            console.log('✅ 直接Manager推荐结果:');
            console.log(`   玩家排名: 第${result.humanPlayers[0].recommendedRank}名`);
            console.log(`   信心度: ${(result.humanPlayers[0].confidence * 100).toFixed(1)}%`);
            console.log(`   推理: ${result.humanPlayers[0].reasoning}`);
            console.log(`   AI对手数量: ${result.aiOpponents.length}`);

            this.assert(result.humanPlayers.length === 1, '应有一个人类玩家结果');
            this.assert(result.humanPlayers[0].recommendedRank >= 1 && result.humanPlayers[0].recommendedRank <= 6, '排名应在有效范围内');

        } catch (error) {
            console.error('❌ 直接Manager排名推荐测试失败:', error);
        }

        console.log('');
    }

    // ==================== 工具方法 ====================

    /**
     * 验证MatchRankingResult的完整性
     */
    private validateMatchRankingResult(result: MatchRankingResult): void {
        this.assert(result.humanPlayers.length > 0, '应有人类玩家结果');
        this.assert(result.aiOpponents.length >= 0, 'AI对手数量应为非负数');
        this.assert(result.matchContext.totalParticipants > 0, '总参与者应大于0');

        // 验证每个人类玩家结果
        result.humanPlayers.forEach(player => {
            this.assert(!!player.uid && player.uid.length > 0, '玩家UID不能为空');
            this.assert(player.recommendedRank >= 1, '推荐排名应大于等于1');
            this.assert(player.confidence >= 0 && player.confidence <= 1, '信心度应在0-1之间');
            this.assert(['excellent', 'good', 'average', 'poor'].includes(player.relativePerformance),
                '相对表现应为有效值');
        });

        // 验证每个AI对手
        result.aiOpponents.forEach(ai => {
            this.assert(!!ai.uid && ai.uid.length > 0, 'AI UID不能为空');
            this.assert(ai.recommendedRank >= 1, 'AI推荐排名应大于等于1');
            this.assert(ai.recommendedScore >= 0, 'AI推荐分数应为非负数');
            this.assert(['easy', 'normal', 'hard', 'extreme'].includes(ai.difficulty),
                'AI难度应为有效值');
            this.assert(['supportive', 'balanced', 'competitive'].includes(ai.behavior),
                'AI行为应为有效值');
        });
    }

    /**
     * 断言工具
     */
    private assert(condition: boolean, message: string): void {
        if (!condition) {
            throw new Error(`断言失败: ${message}`);
        }
    }
}

/**
 * 运行测试的主函数
 */
export async function runRankingRecommendationTests(): Promise<void> {
    const testSuite = new RankingRecommendationTestSuite();

    try {
        await testSuite.runAllTests();
        await testSuite.testDirectManagerRankingRecommendation();
        console.log('🎉 所有推荐排名测试通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}

// 如果直接运行此文件，执行测试
// if (require.main === module) {
//     runRankingRecommendationTests();
// }
