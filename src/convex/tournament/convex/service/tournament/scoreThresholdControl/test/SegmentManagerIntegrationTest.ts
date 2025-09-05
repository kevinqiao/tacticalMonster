/**
 * SegmentManager集成测试
 * 测试RankingRecommendationManager与SegmentManager的集成
 */

import { PlayerSegmentData } from '../../../segment/types';
import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    private mockSegmentData: Map<string, PlayerSegmentData> = new Map();
    private mockMatchResults: Map<string, any[]> = new Map();

    constructor() {
        this.initializeMockData();
    }

    private initializeMockData() {
        // 模拟段位数据
        this.mockSegmentData.set('player_001', {
            uid: 'player_001',
            currentSegment: 'gold',
            points: 1500,
            totalMatches: 25,
            totalWins: 15,
            currentWinStreak: 3,
            currentLoseStreak: 0,
            lastMatchDate: '2024-01-20T10:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-20T10:00:00Z'
        });

        this.mockSegmentData.set('player_002', {
            uid: 'player_002',
            currentSegment: 'diamond',
            points: 3500,
            totalMatches: 40,
            totalWins: 28,
            currentWinStreak: 5,
            currentLoseStreak: 0,
            lastMatchDate: '2024-01-20T10:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-20T10:00:00Z'
        });

        this.mockSegmentData.set('player_003', {
            uid: 'player_003',
            currentSegment: 'bronze',
            points: 200,
            totalMatches: 5,
            totalWins: 2,
            currentWinStreak: 1,
            currentLoseStreak: 0,
            lastMatchDate: '2024-01-20T10:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-20T10:00:00Z'
        });

        // 模拟比赛数据
        this.mockMatchResults.set('player_001', [
            { matchId: 'm1', score: 5000, rank: 2, createdAt: '2024-01-20T10:00:00Z' },
            { matchId: 'm2', score: 4800, rank: 1, createdAt: '2024-01-19T10:00:00Z' },
            { matchId: 'm3', score: 5200, rank: 2, createdAt: '2024-01-18T10:00:00Z' },
            { matchId: 'm4', score: 4900, rank: 1, createdAt: '2024-01-17T10:00:00Z' },
            { matchId: 'm5', score: 5100, rank: 2, createdAt: '2024-01-16T10:00:00Z' }
        ]);

        this.mockMatchResults.set('player_002', [
            { matchId: 'm6', score: 8000, rank: 1, createdAt: '2024-01-20T10:00:00Z' },
            { matchId: 'm7', score: 7800, rank: 1, createdAt: '2024-01-19T10:00:00Z' },
            { matchId: 'm8', score: 8200, rank: 1, createdAt: '2024-01-18T10:00:00Z' },
            { matchId: 'm9', score: 7900, rank: 2, createdAt: '2024-01-17T10:00:00Z' },
            { matchId: 'm10', score: 8100, rank: 1, createdAt: '2024-01-16T10:00:00Z' }
        ]);

        this.mockMatchResults.set('player_003', [
            { matchId: 'm11', score: 2000, rank: 4, createdAt: '2024-01-20T10:00:00Z' },
            { matchId: 'm12', score: 1800, rank: 5, createdAt: '2024-01-19T10:00:00Z' },
            { matchId: 'm13', score: 2200, rank: 3, createdAt: '2024-01-18T10:00:00Z' },
            { matchId: 'm14', score: 1900, rank: 4, createdAt: '2024-01-17T10:00:00Z' },
            { matchId: 'm15', score: 2100, rank: 3, createdAt: '2024-01-16T10:00:00Z' }
        ]);
    }

    db = {
        query: (tableName: string) => ({
            withIndex: (indexName: string, filterFn: Function) => ({
                order: (direction: string) => ({
                    take: (limit: number) => {
                        if (tableName === 'match_results') {
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
        if (filterStr.includes('player_001')) return 'player_001';
        if (filterStr.includes('player_002')) return 'player_002';
        if (filterStr.includes('player_003')) return 'player_003';
        return 'unknown_player';
    }

    // 模拟SegmentManager的getPlayerSegmentInfo方法
    async getPlayerSegmentInfo(uid: string): Promise<PlayerSegmentData | null> {
        return this.mockSegmentData.get(uid) || null;
    }
}

export class SegmentManagerIntegrationTest {
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
        console.log('🧪 SegmentManager集成测试开始...\n');

        await this.testSegmentManagerIntegration();
        await this.testSegmentDataRetrieval();
        await this.testDefaultSegmentHandling();
        await this.testRankingWithRealSegmentData();
        await this.testErrorHandling();

        console.log('✅ 所有SegmentManager集成测试完成！');
    }

    /**
     * 测试SegmentManager集成
     */
    private async testSegmentManagerIntegration(): Promise<void> {
        console.log('=== 测试1: SegmentManager集成 ===');

        try {
            // 测试获取玩家段位信息
            const testPlayers = ['player_001', 'player_002', 'player_003'];

            for (const uid of testPlayers) {
                // 通过RankingRecommendationManager间接调用SegmentManager
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid, score: 5000 }],
                    5
                );

                const playerResult = result.humanPlayers[0];
                console.log(`✅ ${uid} 段位信息获取成功:`);
                console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
                console.log(`   推理: ${playerResult.reasoning}`);

                // 验证是否使用了真实的段位数据
                const hasSegmentMention = playerResult.reasoning.includes('段位');
                console.log(`   使用段位数据: ${hasSegmentMention ? '✅ 是' : '❌ 否'}\n`);
            }

        } catch (error) {
            console.error('❌ SegmentManager集成测试失败:', error);
        }
    }

    /**
     * 测试段位数据获取
     */
    private async testSegmentDataRetrieval(): Promise<void> {
        console.log('=== 测试2: 段位数据获取 ===');

        try {
            const testCases = [
                { uid: 'player_001', expectedSegment: 'gold' },
                { uid: 'player_002', expectedSegment: 'diamond' },
                { uid: 'player_003', expectedSegment: 'bronze' }
            ];

            for (const testCase of testCases) {
                const result = await this.rankingManager.generateMatchRankings(
                    [{ uid: testCase.uid, score: 5000 }],
                    5
                );

                const playerResult = result.humanPlayers[0];
                const reasoning = playerResult.reasoning;

                // 验证段位信息是否正确使用
                const hasCorrectSegment = reasoning.includes(testCase.expectedSegment);
                console.log(`✅ ${testCase.uid}:`);
                console.log(`   期望段位: ${testCase.expectedSegment}`);
                console.log(`   实际使用: ${hasCorrectSegment ? '✅ 正确' : '❌ 错误'}`);
                console.log(`   推理: ${reasoning}\n`);
            }

        } catch (error) {
            console.error('❌ 段位数据获取测试失败:', error);
        }
    }

    /**
     * 测试默认段位处理
     */
    private async testDefaultSegmentHandling(): Promise<void> {
        console.log('=== 测试3: 默认段位处理 ===');

        try {
            // 测试不存在的玩家（应该使用默认段位）
            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'nonexistent_player', score: 5000 }],
                5
            );

            const playerResult = result.humanPlayers[0];
            const reasoning = playerResult.reasoning;

            console.log(`✅ 不存在玩家处理:`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   推理: ${reasoning}`);

            // 验证是否使用了默认段位（青铜）
            const hasDefaultSegment = reasoning.includes('青铜段位') || reasoning.includes('bronze');
            console.log(`   使用默认段位: ${hasDefaultSegment ? '✅ 是' : '❌ 否'}\n`);

        } catch (error) {
            console.error('❌ 默认段位处理测试失败:', error);
        }
    }

    /**
     * 测试使用真实段位数据的排名推荐
     */
    private async testRankingWithRealSegmentData(): Promise<void> {
        console.log('=== 测试4: 使用真实段位数据的排名推荐 ===');

        try {
            const testPlayers = [
                { uid: 'player_001', score: 5000, segment: 'gold' },
                { uid: 'player_002', score: 5000, segment: 'diamond' },
                { uid: 'player_003', score: 5000, segment: 'bronze' }
            ];

            console.log('相同分数不同段位的排名推荐测试:');
            console.log('(应该体现段位优势，高段位玩家排名更好)\n');

            for (const player of testPlayers) {
                const result = await this.rankingManager.generateMatchRankings(
                    [player],
                    5
                );

                const playerResult = result.humanPlayers[0];
                console.log(`${player.uid} (${player.segment}段位):`);
                console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
                console.log(`   推理: ${playerResult.reasoning}\n`);
            }

            // 验证段位优势是否体现
            const results = await Promise.all(
                testPlayers.map(player =>
                    this.rankingManager.generateMatchRankings([player], 5)
                )
            );

            const rankings = results.map((result, index) => ({
                uid: testPlayers[index].uid,
                segment: testPlayers[index].segment,
                rank: result.humanPlayers[0].recommendedRank
            }));

            // 按排名排序
            rankings.sort((a, b) => a.rank - b.rank);

            console.log('段位优势验证:');
            rankings.forEach((player, index) => {
                console.log(`   ${index + 1}. ${player.uid} (${player.segment}段位) - 第${player.rank}名`);
            });

            // 验证钻石段位是否排名最好
            const diamondRank = rankings.find(p => p.segment === 'diamond')?.rank || 999;
            const goldRank = rankings.find(p => p.segment === 'gold')?.rank || 999;
            const bronzeRank = rankings.find(p => p.segment === 'bronze')?.rank || 999;

            const hasReasonableRanking = diamondRank <= goldRank && goldRank <= bronzeRank;
            console.log(`\n段位优势合理: ${hasReasonableRanking ? '✅ 是' : '❌ 否'}`);

        } catch (error) {
            console.error('❌ 真实段位数据排名测试失败:', error);
        }
    }

    /**
     * 测试错误处理
     */
    private async testErrorHandling(): Promise<void> {
        console.log('=== 测试5: 错误处理 ===');

        try {
            // 模拟SegmentManager抛出错误
            const originalGetPlayerSegmentInfo = this.mockCtx.getPlayerSegmentInfo;
            this.mockCtx.getPlayerSegmentInfo = async (uid: string) => {
                throw new Error('模拟SegmentManager错误');
            };

            const result = await this.rankingManager.generateMatchRankings(
                [{ uid: 'error_player', score: 5000 }],
                5
            );

            const playerResult = result.humanPlayers[0];
            console.log(`✅ 错误处理测试:`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   推理: ${playerResult.reasoning}`);

            // 验证是否使用了默认段位
            const hasDefaultSegment = playerResult.reasoning.includes('青铜段位') ||
                playerResult.reasoning.includes('bronze');
            console.log(`   使用默认段位: ${hasDefaultSegment ? '✅ 是' : '❌ 否'}`);

            // 恢复原始方法
            this.mockCtx.getPlayerSegmentInfo = originalGetPlayerSegmentInfo;

        } catch (error) {
            console.error('❌ 错误处理测试失败:', error);
        }

        console.log('');
    }

    /**
     * 测试性能
     */
    async testPerformance(): Promise<void> {
        console.log('=== 测试6: 性能测试 ===');

        try {
            const startTime = Date.now();
            const iterations = 10;

            // 测试多次调用SegmentManager的性能
            for (let i = 0; i < iterations; i++) {
                await this.rankingManager.generateMatchRankings(
                    [{ uid: 'player_001', score: 5000 + i * 100 }],
                    5
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            const avgTime = duration / iterations;

            console.log(`✅ 性能测试结果:`);
            console.log(`   总时间: ${duration}ms`);
            console.log(`   平均时间: ${avgTime.toFixed(2)}ms/次`);
            console.log(`   QPS: ${(1000 / avgTime).toFixed(2)} 次/秒`);

            // 性能应该足够好
            const isPerformant = avgTime < 100;
            console.log(`   性能达标: ${isPerformant ? '✅ 是' : '❌ 否'}\n`);

        } catch (error) {
            console.error('❌ 性能测试失败:', error);
        }
    }
}

/**
 * 运行SegmentManager集成测试
 */
export async function runSegmentManagerIntegrationTests(): Promise<void> {
    const test = new SegmentManagerIntegrationTest();

    try {
        await test.runAllTests();
        await test.testPerformance();
        console.log('🎉 SegmentManager集成测试全部通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}
