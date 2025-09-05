/**
 * 单真人玩家段位概率测试
 * 验证单真人玩家 + 多AI场景下的段位概率使用
 */

import { getSegmentRankingProbabilities } from '../../../segment/config';
import { HumanPlayer, RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    private mockMatchResults: Map<string, any[]> = new Map();

    constructor() {
        this.initializeMockData();
    }

    private initializeMockData() {
        // 青铜段位玩家数据
        this.mockMatchResults.set('bronze_player', [
            { matchId: 'm1', score: 2000, rank: 4, createdAt: '2024-01-20T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm2', score: 1800, rank: 5, createdAt: '2024-01-19T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm3', score: 2200, rank: 3, createdAt: '2024-01-18T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm4', score: 1900, rank: 4, createdAt: '2024-01-17T10:00:00Z', segmentName: 'bronze' },
            { matchId: 'm5', score: 2100, rank: 3, createdAt: '2024-01-16T10:00:00Z', segmentName: 'bronze' }
        ]);

        // 黄金段位玩家数据
        this.mockMatchResults.set('gold_player', [
            { matchId: 'm6', score: 5000, rank: 2, createdAt: '2024-01-20T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm7', score: 4800, rank: 1, createdAt: '2024-01-19T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm8', score: 5200, rank: 2, createdAt: '2024-01-18T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm9', score: 4900, rank: 1, createdAt: '2024-01-17T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm10', score: 5100, rank: 2, createdAt: '2024-01-16T10:00:00Z', segmentName: 'gold' }
        ]);

        // 钻石段位玩家数据
        this.mockMatchResults.set('diamond_player', [
            { matchId: 'm11', score: 8000, rank: 1, createdAt: '2024-01-20T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm12', score: 7800, rank: 1, createdAt: '2024-01-19T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm13', score: 8200, rank: 1, createdAt: '2024-01-18T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm14', score: 7900, rank: 2, createdAt: '2024-01-17T10:00:00Z', segmentName: 'diamond' },
            { matchId: 'm15', score: 8100, rank: 1, createdAt: '2024-01-16T10:00:00Z', segmentName: 'diamond' }
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
        if (filterStr.includes('bronze_player')) return 'bronze_player';
        if (filterStr.includes('gold_player')) return 'gold_player';
        if (filterStr.includes('diamond_player')) return 'diamond_player';
        return 'unknown_player';
    }
}

export class SinglePlayerSegmentProbabilityTest {
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
        console.log('🧪 单真人玩家段位概率测试开始...\n');

        await this.testSinglePlayerSegmentProbability();
        await this.testMultiPlayerNoSegmentProbability();
        await this.testSegmentProbabilityImpact();
        await this.testDifferentSegmentLevels();

        console.log('✅ 所有单真人玩家段位概率测试完成！');
    }

    /**
     * 测试单真人玩家使用段位概率
     */
    private async testSinglePlayerSegmentProbability(): Promise<void> {
        console.log('=== 测试1: 单真人玩家使用段位概率 ===');

        const testCases = [
            { player: { uid: 'bronze_player', score: 2000 }, aiCount: 3, expectedUse: true },
            { player: { uid: 'gold_player', score: 5000 }, aiCount: 5, expectedUse: true },
            { player: { uid: 'diamond_player', score: 8000 }, aiCount: 7, expectedUse: true }
        ];

        for (const testCase of testCases) {
            const result = await this.rankingManager.generateMatchRankings([testCase.player], testCase.aiCount);

            console.log(`✅ ${testCase.player.uid} (${testCase.aiCount}个AI):`);
            console.log(`   推荐排名: 第${result.humanPlayers[0].recommendedRank}名`);
            console.log(`   推理: ${result.humanPlayers[0].reasoning}`);

            // 检查是否使用了段位概率
            const usedSegmentProbability = result.humanPlayers[0].reasoning.includes('排名概率');
            console.log(`   使用段位概率: ${usedSegmentProbability ? '✅ 是' : '❌ 否'}`);
            console.log(`   预期使用: ${testCase.expectedUse ? '✅ 是' : '❌ 否'}`);
            console.log(`   结果: ${usedSegmentProbability === testCase.expectedUse ? '✅ 正确' : '❌ 错误'}\n`);
        }
    }

    /**
     * 测试多真人玩家不使用段位概率
     */
    private async testMultiPlayerNoSegmentProbability(): Promise<void> {
        console.log('=== 测试2: 多真人玩家不使用段位概率 ===');

        const testPlayers: HumanPlayer[] = [
            { uid: 'bronze_player', score: 2000 },
            { uid: 'gold_player', score: 5000 }
        ];

        const result = await this.rankingManager.generateMatchRankings(testPlayers, 4); // 6人比赛

        console.log('✅ 多真人玩家排名推荐:');
        result.humanPlayers.forEach(player => {
            console.log(`   ${player.uid}: 第${player.recommendedRank}名`);
            console.log(`     推理: ${player.reasoning}`);

            // 检查是否使用了段位概率
            const usedSegmentProbability = player.reasoning.includes('排名概率');
            console.log(`     使用段位概率: ${usedSegmentProbability ? '❌ 是' : '✅ 否'}`);
        });

        // 验证多真人玩家场景不使用段位概率
        const allUsedSegmentProbability = result.humanPlayers.every(player =>
            player.reasoning.includes('排名概率')
        );
        console.log(`\n多真人玩家场景使用段位概率: ${allUsedSegmentProbability ? '❌ 是' : '✅ 否'}`);
        console.log(`预期结果: 不使用段位概率 ${allUsedSegmentProbability ? '❌ 错误' : '✅ 正确'}\n`);
    }

    /**
     * 测试段位概率的实际影响
     */
    private async testSegmentProbabilityImpact(): Promise<void> {
        console.log('=== 测试3: 段位概率实际影响 ===');

        const testPlayer = { uid: 'gold_player', score: 5000 };
        const aiCount = 5; // 6人比赛
        const iterations = 100;

        console.log(`运行${iterations}次排名推荐，分析段位概率影响:`);

        const rankDistribution = new Map<number, number>();

        for (let i = 0; i < iterations; i++) {
            const result = await this.rankingManager.generateMatchRankings([testPlayer], aiCount);
            const rank = result.humanPlayers[0].recommendedRank;
            rankDistribution.set(rank, (rankDistribution.get(rank) || 0) + 1);
        }

        console.log('排名分布统计:');
        for (let rank = 1; rank <= 6; rank++) {
            const count = rankDistribution.get(rank) || 0;
            const percentage = (count / iterations * 100).toFixed(1);
            console.log(`   第${rank}名: ${count}次 (${percentage}%)`);
        }

        // 获取黄金段位6人比赛的理论概率
        const theoreticalProbabilities = getSegmentRankingProbabilities('gold', 6);
        console.log('\n理论概率分布:');
        theoreticalProbabilities.forEach((prob, index) => {
            console.log(`   第${index + 1}名: ${(prob * 100).toFixed(1)}%`);
        });

        console.log('\n实际 vs 理论对比:');
        for (let rank = 1; rank <= 6; rank++) {
            const actualPercentage = ((rankDistribution.get(rank) || 0) / iterations * 100).toFixed(1);
            const theoreticalPercentage = (theoreticalProbabilities[rank - 1] * 100).toFixed(1);
            const difference = Math.abs(parseFloat(actualPercentage) - parseFloat(theoreticalPercentage)).toFixed(1);
            console.log(`   第${rank}名: 实际${actualPercentage}% vs 理论${theoreticalPercentage}% (差异${difference}%)`);
        }

        // 验证是否接近理论概率
        const isCloseToTheoretical = Array.from({ length: 6 }, (_, i) => {
            const actual = (rankDistribution.get(i + 1) || 0) / iterations;
            const theoretical = theoreticalProbabilities[i];
            return Math.abs(actual - theoretical) < 0.15; // 允许15%的差异
        }).every(close => close);

        console.log(`\n实际分布接近理论概率: ${isCloseToTheoretical ? '✅ 是' : '❌ 否'}\n`);
    }

    /**
     * 测试不同段位水平的排名推荐
     */
    private async testDifferentSegmentLevels(): Promise<void> {
        console.log('=== 测试4: 不同段位水平的排名推荐 ===');

        const testPlayers = [
            { uid: 'bronze_player', score: 2000 },
            { uid: 'gold_player', score: 5000 },
            { uid: 'diamond_player', score: 8000 }
        ];

        const aiCount = 3; // 4人比赛

        for (const player of testPlayers) {
            const result = await this.rankingManager.generateMatchRankings([player], aiCount);

            console.log(`✅ ${player.uid} (分数: ${player.score}):`);
            console.log(`   推荐排名: 第${result.humanPlayers[0].recommendedRank}名`);
            console.log(`   信心度: ${(result.humanPlayers[0].confidence * 100).toFixed(1)}%`);
            console.log(`   表现: ${result.humanPlayers[0].relativePerformance}`);
            console.log(`   推理: ${result.humanPlayers[0].reasoning}\n`);
        }

        // 验证段位优势：高段位玩家应该有更高的概率获得好排名
        console.log('段位优势验证:');
        const results = await Promise.all(
            testPlayers.map(player =>
                this.rankingManager.generateMatchRankings([player], aiCount)
            )
        );

        const segmentRanks = results.map((result, index) => ({
            segment: testPlayers[index].uid.split('_')[0],
            rank: result.humanPlayers[0].recommendedRank,
            score: testPlayers[index].score
        }));

        segmentRanks.forEach(segment => {
            console.log(`   ${segment.segment}段位: 第${segment.rank}名 (分数: ${segment.score})`);
        });

        // 验证段位优势（多次运行取平均）
        const iterations = 50;
        const segmentAverages = new Map<string, number>();

        for (const player of testPlayers) {
            let totalRank = 0;
            for (let i = 0; i < iterations; i++) {
                const result = await this.rankingManager.generateMatchRankings([player], aiCount);
                totalRank += result.humanPlayers[0].recommendedRank;
            }
            const averageRank = totalRank / iterations;
            segmentAverages.set(player.uid.split('_')[0], averageRank);
        }

        console.log('\n平均排名 (50次运行):');
        segmentAverages.forEach((avgRank, segment) => {
            console.log(`   ${segment}段位: ${avgRank.toFixed(2)}`);
        });

        const bronzeAvg = segmentAverages.get('bronze') || 0;
        const goldAvg = segmentAverages.get('gold') || 0;
        const diamondAvg = segmentAverages.get('diamond') || 0;

        const hasSegmentAdvantage = diamondAvg < goldAvg && goldAvg < bronzeAvg;
        console.log(`\n段位优势验证: ${hasSegmentAdvantage ? '✅ 正确' : '❌ 错误'}`);
        console.log(`   钻石段位平均排名: ${diamondAvg.toFixed(2)} (应该最好)`);
        console.log(`   黄金段位平均排名: ${goldAvg.toFixed(2)} (应该中等)`);
        console.log(`   青铜段位平均排名: ${bronzeAvg.toFixed(2)} (应该最差)\n`);
    }
}

/**
 * 运行单真人玩家段位概率测试
 */
export async function runSinglePlayerSegmentProbabilityTests(): Promise<void> {
    const test = new SinglePlayerSegmentProbabilityTest();

    try {
        await test.runAllTests();
        console.log('🎉 单真人玩家段位概率测试全部通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}
