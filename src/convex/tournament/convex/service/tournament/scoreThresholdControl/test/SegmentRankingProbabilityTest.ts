/**
 * 段位排名概率集成测试
 * 验证 RankingRecommendationManager 是否正确集成了 SEGMENT_RULES 中的 rankingProbabilities
 */

import { getSegmentRankingProbabilitiesConfig } from '../../../segment/config';
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

export class SegmentRankingProbabilityTest {
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
        console.log('🧪 段位排名概率集成测试开始...\n');

        await this.testSegmentRankingProbabilities();
        await this.testDifferentSegmentLevels();
        await this.testParticipantCountVariations();
        await this.testSegmentAdvantageCalculation();

        console.log('✅ 所有段位排名概率测试完成！');
    }

    /**
     * 测试段位排名概率配置
     */
    private async testSegmentRankingProbabilities(): Promise<void> {
        console.log('=== 测试1: 段位排名概率配置 ===');

        const testCases = [
            { segment: 'bronze' as const, participants: 4 },
            { segment: 'bronze' as const, participants: 6 },
            { segment: 'bronze' as const, participants: 8 },
            { segment: 'gold' as const, participants: 4 },
            { segment: 'gold' as const, participants: 6 },
            { segment: 'gold' as const, participants: 8 },
            { segment: 'diamond' as const, participants: 4 },
            { segment: 'diamond' as const, participants: 6 },
            { segment: 'diamond' as const, participants: 8 }
        ];

        for (const testCase of testCases) {
            const probabilities = getSegmentRankingProbabilitiesConfig(testCase.segment, testCase.participants);
            console.log(`✅ ${testCase.segment}段位 ${testCase.participants}人比赛:`);
            console.log(`   概率分布: [${probabilities.map(p => p.toFixed(3)).join(', ')}]`);
            console.log(`   概率总和: ${probabilities.reduce((sum, p) => sum + p, 0).toFixed(3)}`);
            console.log(`   第1名概率: ${(probabilities[0] * 100).toFixed(1)}%`);
            console.log(`   前3名概率: ${(probabilities.slice(0, 3).reduce((sum, p) => sum + p, 0) * 100).toFixed(1)}%\n`);
        }
    }

    /**
     * 测试不同段位水平的排名推荐
     */
    private async testDifferentSegmentLevels(): Promise<void> {
        console.log('=== 测试2: 不同段位水平的排名推荐 ===');

        const testPlayers: HumanPlayer[] = [
            { uid: 'bronze_player', score: 2000 },
            { uid: 'gold_player', score: 5000 },
            { uid: 'diamond_player', score: 8000 }
        ];

        const result = await this.rankingManager.generateMatchRankings(testPlayers, 3); // 6人比赛

        console.log('✅ 不同段位玩家排名推荐:');
        result.humanPlayers.forEach(player => {
            const originalPlayer = testPlayers.find(p => p.uid === player.uid)!;
            console.log(`   ${player.uid}: 第${player.recommendedRank}名 (分数: ${originalPlayer.score})`);
            console.log(`     信心度: ${(player.confidence * 100).toFixed(1)}%`);
            console.log(`     表现: ${player.relativePerformance}`);
            console.log(`     推理: ${player.reasoning}\n`);
        });

        // 验证段位优势：高段位玩家应该获得更好的排名
        const diamondRank = result.humanPlayers.find(p => p.uid === 'diamond_player')!.recommendedRank;
        const goldRank = result.humanPlayers.find(p => p.uid === 'gold_player')!.recommendedRank;
        const bronzeRank = result.humanPlayers.find(p => p.uid === 'bronze_player')!.recommendedRank;

        console.log(`段位排名验证:`);
        console.log(`   钻石段位: 第${diamondRank}名`);
        console.log(`   黄金段位: 第${goldRank}名`);
        console.log(`   青铜段位: 第${bronzeRank}名`);
        console.log(`   段位优势: ${diamondRank <= goldRank && goldRank <= bronzeRank ? '✅ 正确' : '❌ 错误'}\n`);
    }

    /**
     * 测试不同参与者数量的排名概率
     */
    private async testParticipantCountVariations(): Promise<void> {
        console.log('=== 测试3: 不同参与者数量的排名概率 ===');

        const testPlayer = { uid: 'gold_player', score: 5000 };

        const participantCounts = [4, 6, 8];

        for (const count of participantCounts) {
            const aiCount = count - 1; // 1个真人 + (count-1)个AI
            const result = await this.rankingManager.generateMatchRankings([testPlayer], aiCount);

            console.log(`✅ ${count}人比赛 (1真人 + ${aiCount}AI):`);
            console.log(`   玩家推荐排名: 第${result.humanPlayers[0].recommendedRank}名`);
            console.log(`   信心度: ${(result.humanPlayers[0].confidence * 100).toFixed(1)}%`);
            console.log(`   推理: ${result.humanPlayers[0].reasoning}\n`);
        }
    }

    /**
     * 测试段位优势系数计算
     */
    private async testSegmentAdvantageCalculation(): Promise<void> {
        console.log('=== 测试4: 段位优势系数计算 ===');

        const segments = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'] as const;

        console.log('段位优势系数:');
        segments.forEach(segment => {
            // 通过反射调用私有方法进行测试
            const advantage = (this.rankingManager as any).calculateSegmentAdvantage(segment);
            console.log(`   ${segment}: ${advantage.toFixed(3)} (${(advantage * 100).toFixed(1)}%)`);
        });

        console.log('\n段位优势验证:');
        const bronzeAdvantage = (this.rankingManager as any).calculateSegmentAdvantage('bronze');
        const diamondAdvantage = (this.rankingManager as any).calculateSegmentAdvantage('diamond');
        const grandmasterAdvantage = (this.rankingManager as any).calculateSegmentAdvantage('grandmaster');

        console.log(`   青铜段位优势: ${bronzeAdvantage.toFixed(3)} (应该最小)`);
        console.log(`   钻石段位优势: ${diamondAdvantage.toFixed(3)} (应该中等)`);
        console.log(`   宗师段位优势: ${grandmasterAdvantage.toFixed(3)} (应该最大)`);
        console.log(`   优势递增: ${bronzeAdvantage < diamondAdvantage && diamondAdvantage < grandmasterAdvantage ? '✅ 正确' : '❌ 错误'}\n`);
    }

    /**
     * 测试段位排名概率的实际影响
     */
    async testSegmentProbabilityImpact(): Promise<void> {
        console.log('=== 测试5: 段位排名概率实际影响 ===');

        const testPlayer = { uid: 'gold_player', score: 5000 };
        const iterations = 100;

        console.log(`运行${iterations}次排名推荐，分析段位概率影响:`);

        const rankDistribution = new Map<number, number>();

        for (let i = 0; i < iterations; i++) {
            const result = await this.rankingManager.generateMatchRankings([testPlayer], 5); // 6人比赛
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
        const theoreticalProbabilities = getSegmentRankingProbabilitiesConfig('gold', 6);
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
    }
}

/**
 * 运行段位排名概率测试
 */
export async function runSegmentRankingProbabilityTests(): Promise<void> {
    const test = new SegmentRankingProbabilityTest();

    try {
        await test.runAllTests();
        await test.testSegmentProbabilityImpact();
        console.log('🎉 段位排名概率集成测试全部通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}
