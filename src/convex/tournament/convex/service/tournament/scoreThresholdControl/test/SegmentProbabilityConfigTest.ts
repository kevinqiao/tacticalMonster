/**
 * 段位概率配置测试
 * 验证基于段位配置数量key的智能判断逻辑
 */

import { getSupportedParticipantCounts } from '../../../segment/config';
import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    private mockMatchResults: Map<string, any[]> = new Map();

    constructor() {
        this.initializeMockData();
    }

    private initializeMockData() {
        // 黄金段位玩家数据
        this.mockMatchResults.set('gold_player', [
            { matchId: 'm1', score: 5000, rank: 2, createdAt: '2024-01-20T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm2', score: 4800, rank: 1, createdAt: '2024-01-19T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm3', score: 5200, rank: 2, createdAt: '2024-01-18T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm4', score: 4900, rank: 1, createdAt: '2024-01-17T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm5', score: 5100, rank: 2, createdAt: '2024-01-16T10:00:00Z', segmentName: 'gold' }
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
        if (filterStr.includes('gold_player')) return 'gold_player';
        return 'unknown_player';
    }
}

export class SegmentProbabilityConfigTest {
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
        console.log('🧪 段位概率配置测试开始...\n');

        await this.testSupportedParticipantCounts();
        await this.testSinglePlayerWithSupportedCounts();
        await this.testSinglePlayerWithUnsupportedCounts();
        await this.testMultiPlayerScenarios();
        await this.testEdgeCases();

        console.log('✅ 所有段位概率配置测试完成！');
    }

    /**
     * 测试支持的参与者数量
     */
    private async testSupportedParticipantCounts(): Promise<void> {
        console.log('=== 测试1: 支持的参与者数量 ===');

        const supportedCounts = getSupportedParticipantCounts();
        console.log(`✅ 段位配置支持的参与者数量: [${supportedCounts.join(', ')}]`);

        // 验证支持的参与者数量
        const expectedCounts = [4, 6, 8];
        const isCorrect = JSON.stringify(supportedCounts.sort()) === JSON.stringify(expectedCounts.sort());
        console.log(`   配置正确: ${isCorrect ? '✅ 是' : '❌ 否'}`);
        console.log(`   预期: [${expectedCounts.join(', ')}]`);
        console.log(`   实际: [${supportedCounts.join(', ')}]\n`);
    }

    /**
     * 测试单真人玩家 + 支持的参与者数量
     */
    private async testSinglePlayerWithSupportedCounts(): Promise<void> {
        console.log('=== 测试2: 单真人玩家 + 支持的参与者数量 ===');

        const supportedCounts = [4, 6, 8];
        const testPlayer = { uid: 'gold_player', score: 5000 };

        for (const totalParticipants of supportedCounts) {
            const aiCount = totalParticipants - 1; // 1个真人 + (totalParticipants-1)个AI

            const result = await this.rankingManager.generateMatchRankings([testPlayer], aiCount);
            const playerResult = result.humanPlayers[0];
            const usedSegmentProbability = playerResult.reasoning.includes('排名概率');

            console.log(`✅ ${totalParticipants}人比赛 (1真人 + ${aiCount}AI):`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   使用段位概率: ${usedSegmentProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   推理: ${playerResult.reasoning}`);
            console.log(`   预期使用段位概率: ✅ 是`);
            console.log(`   结果: ${usedSegmentProbability ? '✅ 正确' : '❌ 错误'}\n`);
        }
    }

    /**
     * 测试单真人玩家 + 不支持的参与者数量
     */
    private async testSinglePlayerWithUnsupportedCounts(): Promise<void> {
        console.log('=== 测试3: 单真人玩家 + 不支持的参与者数量 ===');

        const unsupportedCounts = [2, 3, 5, 7, 9, 10]; // 不在段位配置中的数量
        const testPlayer = { uid: 'gold_player', score: 5000 };

        for (const totalParticipants of unsupportedCounts) {
            const aiCount = totalParticipants - 1; // 1个真人 + (totalParticipants-1)个AI

            const result = await this.rankingManager.generateMatchRankings([testPlayer], aiCount);
            const playerResult = result.humanPlayers[0];
            const usedSegmentProbability = playerResult.reasoning.includes('排名概率');

            console.log(`✅ ${totalParticipants}人比赛 (1真人 + ${aiCount}AI):`);
            console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
            console.log(`   使用段位概率: ${usedSegmentProbability ? '❌ 是' : '✅ 否'}`);
            console.log(`   推理: ${playerResult.reasoning}`);
            console.log(`   预期使用段位概率: ❌ 否`);
            console.log(`   结果: ${!usedSegmentProbability ? '✅ 正确' : '❌ 错误'}\n`);
        }
    }

    /**
     * 测试多真人玩家场景
     */
    private async testMultiPlayerScenarios(): Promise<void> {
        console.log('=== 测试4: 多真人玩家场景 ===');

        const testCases = [
            { players: [{ uid: 'gold_player', score: 5000 }], aiCount: 3, totalParticipants: 4 },
            { players: [{ uid: 'gold_player', score: 5000 }], aiCount: 5, totalParticipants: 6 },
            { players: [{ uid: 'gold_player', score: 5000 }], aiCount: 7, totalParticipants: 8 }
        ];

        // 添加多真人玩家测试
        testCases.push(
            { players: [{ uid: 'gold_player', score: 5000 }, { uid: 'bronze_player', score: 2000 }], aiCount: 2, totalParticipants: 4 },
            { players: [{ uid: 'gold_player', score: 5000 }, { uid: 'bronze_player', score: 2000 }], aiCount: 4, totalParticipants: 6 },
            { players: [{ uid: 'gold_player', score: 5000 }, { uid: 'bronze_player', score: 2000 }], aiCount: 6, totalParticipants: 8 }
        );

        for (const testCase of testCases) {
            const result = await this.rankingManager.generateMatchRankings(testCase.players, testCase.aiCount);

            const isSinglePlayer = testCase.players.length === 1;
            const isSupportedCount = [4, 6, 8].includes(testCase.totalParticipants);
            const expectedUseProbability = isSinglePlayer && isSupportedCount;

            console.log(`✅ ${testCase.totalParticipants}人比赛 (${testCase.players.length}真人 + ${testCase.aiCount}AI):`);

            result.humanPlayers.forEach((player, index) => {
                const usedSegmentProbability = player.reasoning.includes('排名概率');
                console.log(`   ${player.uid}: 第${player.recommendedRank}名`);
                console.log(`     使用段位概率: ${usedSegmentProbability ? '✅ 是' : '❌ 否'}`);
                console.log(`     推理: ${player.reasoning}`);
            });

            const allUsedProbability = result.humanPlayers.every(player =>
                player.reasoning.includes('排名概率')
            );
            const someUsedProbability = result.humanPlayers.some(player =>
                player.reasoning.includes('排名概率')
            );

            console.log(`   预期使用段位概率: ${expectedUseProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   实际使用段位概率: ${someUsedProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   结果: ${(expectedUseProbability && someUsedProbability) || (!expectedUseProbability && !someUsedProbability) ? '✅ 正确' : '❌ 错误'}\n`);
        }
    }

    /**
     * 测试边界情况
     */
    private async testEdgeCases(): Promise<void> {
        console.log('=== 测试5: 边界情况 ===');

        const testPlayer = { uid: 'gold_player', score: 5000 };

        // 测试最小比赛规模
        console.log('📋 测试最小比赛规模 (2人):');
        let result = await this.rankingManager.generateMatchRankings([testPlayer], 1);
        let usedProbability = result.humanPlayers[0].reasoning.includes('排名概率');
        console.log(`   2人比赛使用段位概率: ${usedProbability ? '❌ 是' : '✅ 否'} (预期: 否)`);

        // 测试最大支持规模
        console.log('\n📋 测试最大支持规模 (8人):');
        result = await this.rankingManager.generateMatchRankings([testPlayer], 7);
        usedProbability = result.humanPlayers[0].reasoning.includes('排名概率');
        console.log(`   8人比赛使用段位概率: ${usedProbability ? '✅ 是' : '❌ 否'} (预期: 是)`);

        // 测试超出支持范围
        console.log('\n📋 测试超出支持范围 (12人):');
        result = await this.rankingManager.generateMatchRankings([testPlayer], 11);
        usedProbability = result.humanPlayers[0].reasoning.includes('排名概率');
        console.log(`   12人比赛使用段位概率: ${usedProbability ? '❌ 是' : '✅ 否'} (预期: 否)`);

        console.log('\n✅ 边界情况测试完成\n');
    }

    /**
     * 测试段位概率的实际效果
     */
    async testSegmentProbabilityEffectiveness(): Promise<void> {
        console.log('=== 测试6: 段位概率实际效果 ===');

        const testPlayer = { uid: 'gold_player', score: 5000 };
        const totalParticipants = 6; // 使用支持的参与者数量
        const aiCount = totalParticipants - 1;
        const iterations = 100;

        console.log(`运行${iterations}次排名推荐，分析段位概率效果:`);

        const rankDistribution = new Map<number, number>();

        for (let i = 0; i < iterations; i++) {
            const result = await this.rankingManager.generateMatchRankings([testPlayer], aiCount);
            const rank = result.humanPlayers[0].recommendedRank;
            rankDistribution.set(rank, (rankDistribution.get(rank) || 0) + 1);
        }

        console.log('排名分布统计:');
        for (let rank = 1; rank <= totalParticipants; rank++) {
            const count = rankDistribution.get(rank) || 0;
            const percentage = (count / iterations * 100).toFixed(1);
            console.log(`   第${rank}名: ${count}次 (${percentage}%)`);
        }

        // 验证段位概率是否生效
        const firstRankCount = rankDistribution.get(1) || 0;
        const firstRankPercentage = firstRankCount / iterations;

        // 黄金段位6人比赛的理论第1名概率应该是0.25
        const expectedFirstRankProbability = 0.25;
        const isCloseToExpected = Math.abs(firstRankPercentage - expectedFirstRankProbability) < 0.1;

        console.log(`\n第1名概率验证:`);
        console.log(`   实际概率: ${(firstRankPercentage * 100).toFixed(1)}%`);
        console.log(`   理论概率: ${(expectedFirstRankProbability * 100).toFixed(1)}%`);
        console.log(`   接近理论值: ${isCloseToExpected ? '✅ 是' : '❌ 否'}\n`);
    }
}

/**
 * 运行段位概率配置测试
 */
export async function runSegmentProbabilityConfigTests(): Promise<void> {
    const test = new SegmentProbabilityConfigTest();

    try {
        await test.runAllTests();
        await test.testSegmentProbabilityEffectiveness();
        console.log('🎉 段位概率配置测试全部通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}
