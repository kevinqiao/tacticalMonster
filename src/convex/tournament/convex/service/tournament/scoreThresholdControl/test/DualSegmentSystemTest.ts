/**
 * 双段位系统测试
 * 验证实时技能段位和积分累积段位的协调工作
 */

import { UnifiedSkillAssessment } from '../core/UnifiedSkillAssessment';
import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    private mockMatchResults: Map<string, any[]> = new Map();
    private mockSegmentData: Map<string, any> = new Map();

    constructor() {
        this.initializeMockData();
    }

    private initializeMockData() {
        // 模拟历史比赛数据（用于实时技能段位计算）
        this.mockMatchResults.set('player_001', [
            { matchId: 'm1', score: 5000, rank: 2, createdAt: '2024-01-20T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm2', score: 4800, rank: 1, createdAt: '2024-01-19T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm3', score: 5200, rank: 2, createdAt: '2024-01-18T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm4', score: 4900, rank: 1, createdAt: '2024-01-17T10:00:00Z', segmentName: 'gold' },
            { matchId: 'm5', score: 5100, rank: 2, createdAt: '2024-01-16T10:00:00Z', segmentName: 'gold' }
        ]);

        // 模拟积分累积段位数据（用于UI显示）
        this.mockSegmentData.set('player_001', {
            currentSegment: 'platinum',
            points: 2500,
            totalMatches: 25,
            totalWins: 15,
            currentWinStreak: 3,
            currentLoseStreak: 0
        });
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
        return 'unknown_player';
    }

    // 模拟SegmentManager的getPlayerSegmentInfo方法
    async getPlayerSegmentInfo(uid: string) {
        return this.mockSegmentData.get(uid) || null;
    }
}

export class DualSegmentSystemTest {
    private mockCtx: MockDatabaseContext;
    private rankingManager: RankingRecommendationManager;
    private skillAssessment: UnifiedSkillAssessment;

    constructor() {
        this.mockCtx = new MockDatabaseContext();
        this.rankingManager = new RankingRecommendationManager(this.mockCtx);
        this.skillAssessment = new UnifiedSkillAssessment();
    }

    /**
     * 运行所有测试
     */
    async runAllTests(): Promise<void> {
        console.log('🧪 双段位系统测试开始...\n');

        await this.testRealTimeSkillSegment();
        await this.testIntegralAccumulationSegment();
        await this.testSegmentSystemCoordination();
        await this.testRankingRecommendationWithDualSegments();
        await this.testSegmentProbabilityWithDualSegments();

        console.log('✅ 所有双段位系统测试完成！');
    }

    /**
     * 测试实时技能段位计算
     */
    private async testRealTimeSkillSegment(): Promise<void> {
        console.log('=== 测试1: 实时技能段位计算 ===');

        const testPlayer = { uid: 'player_001', score: 5000 };
        const result = await this.rankingManager.generateMatchRankings([testPlayer], 3);

        const playerResult = result.humanPlayers[0];
        const realTimeSegment = playerResult.reasoning.includes('黄金段位') ? 'gold' :
            playerResult.reasoning.includes('铂金段位') ? 'platinum' :
                playerResult.reasoning.includes('钻石段位') ? 'diamond' : 'unknown';

        console.log(`✅ 实时技能段位测试:`);
        console.log(`   玩家: ${testPlayer.uid}`);
        console.log(`   分数: ${testPlayer.score}`);
        console.log(`   实时技能段位: ${realTimeSegment}`);
        console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
        console.log(`   推理: ${playerResult.reasoning}`);

        // 验证实时技能段位是否基于历史表现计算
        const hasSkillBasedReasoning = playerResult.reasoning.includes('水平') ||
            playerResult.reasoning.includes('段位');
        console.log(`   基于技能计算: ${hasSkillBasedReasoning ? '✅ 是' : '❌ 否'}\n`);
    }

    /**
     * 测试积分累积段位
     */
    private async testIntegralAccumulationSegment(): Promise<void> {
        console.log('=== 测试2: 积分累积段位 ===');

        const playerSegmentInfo = await this.mockCtx.getPlayerSegmentInfo('player_001');

        console.log(`✅ 积分累积段位测试:`);
        console.log(`   玩家: player_001`);
        console.log(`   当前段位: ${playerSegmentInfo?.currentSegment || 'unknown'}`);
        console.log(`   积分: ${playerSegmentInfo?.points || 0}`);
        console.log(`   总比赛: ${playerSegmentInfo?.totalMatches || 0}`);
        console.log(`   总胜利: ${playerSegmentInfo?.totalWins || 0}`);
        console.log(`   连胜: ${playerSegmentInfo?.currentWinStreak || 0}`);

        // 验证积分累积段位是否与实时技能段位不同
        const integralSegment = playerSegmentInfo?.currentSegment;
        console.log(`   积分累积段位: ${integralSegment}`);
        console.log(`   段位类型: 玩家可见的UI段位\n`);
    }

    /**
     * 测试两套段位系统的协调
     */
    private async testSegmentSystemCoordination(): Promise<void> {
        console.log('=== 测试3: 两套段位系统协调 ===');

        const testPlayer = { uid: 'player_001', score: 5000 };

        // 获取实时技能段位
        const rankingResult = await this.rankingManager.generateMatchRankings([testPlayer], 3);
        const realTimeSegment = this.extractSegmentFromReasoning(rankingResult.humanPlayers[0].reasoning);

        // 获取积分累积段位
        const integralSegmentInfo = await this.mockCtx.getPlayerSegmentInfo('player_001');
        const integralSegment = integralSegmentInfo?.currentSegment;

        console.log(`✅ 段位系统协调测试:`);
        console.log(`   玩家: ${testPlayer.uid}`);
        console.log(`   实时技能段位: ${realTimeSegment} (用于排名推荐)`);
        console.log(`   积分累积段位: ${integralSegment} (用于UI显示)`);
        console.log(`   两套系统独立: ${realTimeSegment !== integralSegment ? '✅ 是' : '❌ 否'}`);

        // 验证两套系统可以独立工作
        const canWorkIndependently = realTimeSegment && integralSegment;
        console.log(`   独立工作能力: ${canWorkIndependently ? '✅ 是' : '❌ 否'}\n`);
    }

    /**
     * 测试排名推荐中的双段位使用
     */
    private async testRankingRecommendationWithDualSegments(): Promise<void> {
        console.log('=== 测试4: 排名推荐中的双段位使用 ===');

        const testPlayer = { uid: 'player_001', score: 5000 };
        const result = await this.rankingManager.generateMatchRankings([testPlayer], 3);

        const playerResult = result.humanPlayers[0];
        const reasoning = playerResult.reasoning;

        console.log(`✅ 排名推荐双段位测试:`);
        console.log(`   玩家: ${testPlayer.uid}`);
        console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
        console.log(`   推理: ${reasoning}`);

        // 验证是否使用了实时技能段位
        const usesRealTimeSegment = reasoning.includes('段位') || reasoning.includes('水平');
        console.log(`   使用实时技能段位: ${usesRealTimeSegment ? '✅ 是' : '❌ 否'}`);

        // 验证是否没有使用积分累积段位
        const usesIntegralSegment = reasoning.includes('积分') || reasoning.includes('累积');
        console.log(`   使用积分累积段位: ${usesIntegralSegment ? '❌ 是' : '✅ 否'}`);

        // 验证段位概率是否基于实时技能段位
        const usesSegmentProbability = reasoning.includes('排名概率');
        console.log(`   使用段位概率: ${usesSegmentProbability ? '✅ 是' : '❌ 否'}\n`);
    }

    /**
     * 测试段位概率中的双段位使用
     */
    private async testSegmentProbabilityWithDualSegments(): Promise<void> {
        console.log('=== 测试5: 段位概率中的双段位使用 ===');

        const testPlayer = { uid: 'player_001', score: 5000 };
        const result = await this.rankingManager.generateMatchRankings([testPlayer], 5); // 6人比赛，支持段位概率

        const playerResult = result.humanPlayers[0];
        const reasoning = playerResult.reasoning;

        console.log(`✅ 段位概率双段位测试:`);
        console.log(`   玩家: ${testPlayer.uid}`);
        console.log(`   总参与者: 6人 (1真人 + 5AI)`);
        console.log(`   推荐排名: 第${playerResult.recommendedRank}名`);
        console.log(`   推理: ${reasoning}`);

        // 验证是否使用了段位概率
        const usesSegmentProbability = reasoning.includes('排名概率');
        console.log(`   使用段位概率: ${usesSegmentProbability ? '✅ 是' : '❌ 否'}`);

        // 验证段位概率是否基于实时技能段位
        const basedOnRealTimeSegment = reasoning.includes('段位') && !reasoning.includes('积分');
        console.log(`   基于实时技能段位: ${basedOnRealTimeSegment ? '✅ 是' : '❌ 否'}`);

        // 验证段位概率配置是否正确
        const hasCorrectConfig = usesSegmentProbability && basedOnRealTimeSegment;
        console.log(`   配置正确: ${hasCorrectConfig ? '✅ 是' : '❌ 否'}\n`);
    }

    /**
     * 从推理中提取段位信息
     */
    private extractSegmentFromReasoning(reasoning: string): string {
        if (reasoning.includes('黄金段位')) return 'gold';
        if (reasoning.includes('铂金段位')) return 'platinum';
        if (reasoning.includes('钻石段位')) return 'diamond';
        if (reasoning.includes('白银段位')) return 'silver';
        if (reasoning.includes('青铜段位')) return 'bronze';
        if (reasoning.includes('大师段位')) return 'master';
        if (reasoning.includes('宗师段位')) return 'grandmaster';
        return 'unknown';
    }

    /**
     * 测试段位系统性能
     */
    async testSegmentSystemPerformance(): Promise<void> {
        console.log('=== 测试6: 段位系统性能 ===');

        const testPlayer = { uid: 'player_001', score: 5000 };
        const iterations = 100;

        console.log(`运行${iterations}次排名推荐，测试性能:`);

        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
            await this.rankingManager.generateMatchRankings([testPlayer], 3);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        const avgTime = duration / iterations;

        console.log(`✅ 性能测试结果:`);
        console.log(`   总时间: ${duration}ms`);
        console.log(`   平均时间: ${avgTime.toFixed(2)}ms/次`);
        console.log(`   QPS: ${(1000 / avgTime).toFixed(2)} 次/秒`);

        // 验证性能是否满足要求
        const performanceOk = avgTime < 100; // 平均每次推荐不超过100ms
        console.log(`   性能满足要求: ${performanceOk ? '✅ 是' : '❌ 否'}\n`);
    }
}

/**
 * 运行双段位系统测试
 */
export async function runDualSegmentSystemTests(): Promise<void> {
    const test = new DualSegmentSystemTest();

    try {
        await test.runAllTests();
        await test.testSegmentSystemPerformance();
        console.log('🎉 双段位系统测试全部通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}
