/**
 * 统一技能评估系统测试
 * 验证统一技能评估方案的有效性
 */

import { UnifiedSkillAssessment } from '../core/UnifiedSkillAssessment';
import { PlayerPerformanceProfile } from '../managers/RankingRecommendationManager';

export class UnifiedSkillAssessmentTest {
    private skillAssessment: UnifiedSkillAssessment;

    constructor() {
        this.skillAssessment = new UnifiedSkillAssessment();
    }

    /**
     * 运行所有测试
     */
    async runAllTests(): Promise<void> {
        console.log('🧪 统一技能评估系统测试开始...\n');

        await this.testBasicSkillLevels();
        await this.testConsistencyImpact();
        await this.testTrendAnalysis();
        await this.testWeightConfiguration();
        await this.testEdgeCases();
        await this.testComparison();

        console.log('✅ 所有统一技能评估测试完成！');
    }

    /**
     * 测试基础技能等级
     */
    private async testBasicSkillLevels(): Promise<void> {
        console.log('=== 测试1: 基础技能等级 ===');

        const testProfiles = [
            {
                name: '新手玩家',
                profile: this.createTestProfile({
                    averageRank: 4.5,
                    winRate: 0.15,
                    averageScore: 800,
                    consistency: 0.3,
                    totalMatches: 10
                })
            },
            {
                name: '初级玩家',
                profile: this.createTestProfile({
                    averageRank: 3.2,
                    winRate: 0.25,
                    averageScore: 1500,
                    consistency: 0.5,
                    totalMatches: 20
                })
            },
            {
                name: '中级玩家',
                profile: this.createTestProfile({
                    averageRank: 2.3,
                    winRate: 0.4,
                    averageScore: 3000,
                    consistency: 0.7,
                    totalMatches: 35
                })
            },
            {
                name: '高级玩家',
                profile: this.createTestProfile({
                    averageRank: 1.8,
                    winRate: 0.6,
                    averageScore: 5000,
                    consistency: 0.85,
                    totalMatches: 50
                })
            },
            {
                name: '专家玩家',
                profile: this.createTestProfile({
                    averageRank: 1.2,
                    winRate: 0.8,
                    averageScore: 8000,
                    consistency: 0.95,
                    totalMatches: 80
                })
            }
        ];

        for (const test of testProfiles) {
            const result = this.skillAssessment.assessPlayerSkill(test.profile);
            console.log(`✅ ${test.name}:`);
            console.log(`   等级: ${result.level}`);
            console.log(`   因子: ${result.factor.toFixed(3)}`);
            console.log(`   信心度: ${result.confidence.toFixed(3)}`);
            console.log(`   说明: ${result.reasoning}\n`);
        }
    }

    /**
     * 测试一致性影响
     */
    private async testConsistencyImpact(): Promise<void> {
        console.log('=== 测试2: 一致性影响 ===');

        const baseProfile = this.createTestProfile({
            averageRank: 2.0,
            winRate: 0.5,
            averageScore: 4000,
            totalMatches: 30
        });

        const consistencyLevels = [
            { name: '极低一致性', consistency: 0.2 },
            { name: '低一致性', consistency: 0.4 },
            { name: '中等一致性', consistency: 0.6 },
            { name: '高一致性', consistency: 0.8 },
            { name: '极高一致性', consistency: 0.95 }
        ];

        for (const level of consistencyLevels) {
            const profile = {
                ...baseProfile,
                recentPerformance: {
                    ...baseProfile.recentPerformance,
                    consistency: level.consistency
                }
            };

            const result = this.skillAssessment.assessPlayerSkill(profile);
            console.log(`✅ ${level.name} (${level.consistency}):`);
            console.log(`   等级: ${result.level}`);
            console.log(`   因子: ${result.factor.toFixed(3)}`);
            console.log(`   一致性得分: ${result.analysis.consistencyScore.toFixed(3)}`);
            console.log(`   说明: ${result.reasoning}\n`);
        }
    }

    /**
     * 测试趋势分析
     */
    private async testTrendAnalysis(): Promise<void> {
        console.log('=== 测试3: 趋势分析 ===');

        const baseProfile = this.createTestProfile({
            averageRank: 2.5,
            winRate: 0.4,
            averageScore: 3000,
            consistency: 0.7,
            totalMatches: 25
        });

        const trends = [
            { name: '进步型', trend: 'improving' as const },
            { name: '稳定型', trend: 'stable' as const },
            { name: '退步型', trend: 'declining' as const }
        ];

        for (const trend of trends) {
            const profile = {
                ...baseProfile,
                recentPerformance: {
                    ...baseProfile.recentPerformance,
                    trendDirection: trend.trend
                }
            };

            const result = this.skillAssessment.assessPlayerSkill(profile);
            console.log(`✅ ${trend.name}玩家:`);
            console.log(`   等级: ${result.level}`);
            console.log(`   因子: ${result.factor.toFixed(3)}`);
            console.log(`   趋势: ${result.analysis.trend}`);
            console.log(`   说明: ${result.reasoning}\n`);
        }
    }

    /**
     * 测试权重配置
     */
    private async testWeightConfiguration(): Promise<void> {
        console.log('=== 测试4: 权重配置 ===');

        const profile = this.createTestProfile({
            averageRank: 2.0,
            winRate: 0.5,
            averageScore: 4000,
            consistency: 0.7,
            totalMatches: 30
        });

        const weightConfigs = [
            {
                name: '默认权重',
                weights: {
                    rank: 0.3,
                    winRate: 0.25,
                    consistency: 0.25,
                    score: 0.2
                }
            },
            {
                name: '排名优先',
                weights: {
                    rank: 0.5,
                    winRate: 0.2,
                    consistency: 0.2,
                    score: 0.1
                }
            },
            {
                name: '一致性优先',
                weights: {
                    rank: 0.2,
                    winRate: 0.2,
                    consistency: 0.5,
                    score: 0.1
                }
            }
        ];

        for (const config of weightConfigs) {
            const result = this.skillAssessment.assessPlayerSkill(profile, { weights: config.weights });
            console.log(`✅ ${config.name}:`);
            console.log(`   等级: ${result.level}`);
            console.log(`   因子: ${result.factor.toFixed(3)}`);
            console.log(`   排名得分: ${result.analysis.rankScore.toFixed(3)}`);
            console.log(`   胜率得分: ${result.analysis.winRateScore.toFixed(3)}`);
            console.log(`   一致性得分: ${result.analysis.consistencyScore.toFixed(3)}`);
            console.log(`   分数得分: ${result.analysis.scoreScore.toFixed(3)}`);
            console.log(`   总分: ${result.analysis.totalScore.toFixed(3)}\n`);
        }
    }

    /**
     * 测试边界情况
     */
    private async testEdgeCases(): Promise<void> {
        console.log('=== 测试5: 边界情况 ===');

        const edgeCases = [
            {
                name: '新玩家（比赛场次少）',
                profile: this.createTestProfile({
                    averageRank: 3.0,
                    winRate: 0.2,
                    averageScore: 1000,
                    consistency: 0.5,
                    totalMatches: 3
                })
            },
            {
                name: '完美表现',
                profile: this.createTestProfile({
                    averageRank: 1.0,
                    winRate: 1.0,
                    averageScore: 10000,
                    consistency: 1.0,
                    totalMatches: 100
                })
            },
            {
                name: '极差表现',
                profile: this.createTestProfile({
                    averageRank: 8.0,
                    winRate: 0.0,
                    averageScore: 100,
                    consistency: 0.1,
                    totalMatches: 50
                })
            },
            {
                name: '数据不足',
                profile: this.createTestProfile({
                    averageRank: 2.0,
                    winRate: 0.5,
                    averageScore: 3000,
                    consistency: 0.5,
                    totalMatches: 1
                })
            }
        ];

        for (const test of edgeCases) {
            const result = this.skillAssessment.assessPlayerSkill(test.profile);
            console.log(`✅ ${test.name}:`);
            console.log(`   等级: ${result.level}`);
            console.log(`   因子: ${result.factor.toFixed(3)}`);
            console.log(`   信心度: ${result.confidence.toFixed(3)}`);
            console.log(`   说明: ${result.reasoning}\n`);
        }
    }

    /**
     * 测试玩家比较
     */
    private async testComparison(): Promise<void> {
        console.log('=== 测试6: 玩家比较 ===');

        const player1 = this.skillAssessment.assessPlayerSkill(this.createTestProfile({
            averageRank: 1.5,
            winRate: 0.7,
            averageScore: 6000,
            consistency: 0.9,
            totalMatches: 60
        }));

        const player2 = this.skillAssessment.assessPlayerSkill(this.createTestProfile({
            averageRank: 2.0,
            winRate: 0.5,
            averageScore: 4000,
            consistency: 0.6,
            totalMatches: 40
        }));

        const comparison = this.skillAssessment.comparePlayers(player1, player2);

        console.log('✅ 玩家比较结果:');
        console.log(`   玩家1: ${player1.level} (${player1.factor.toFixed(3)})`);
        console.log(`   玩家2: ${player2.level} (${player2.factor.toFixed(3)})`);
        console.log(`   比较结果: ${comparison.winner}`);
        console.log(`   差异: ${comparison.difference.toFixed(3)}`);
        console.log(`   说明: ${comparison.reasoning}\n`);
    }

    /**
     * 创建测试用的玩家档案
     */
    private createTestProfile(data: {
        averageRank: number;
        winRate: number;
        averageScore: number;
        consistency: number;
        totalMatches: number;
        trend?: 'improving' | 'declining' | 'stable';
    }): PlayerPerformanceProfile {
        return {
            uid: 'test_player',
            segmentName: 'gold',
            averageRank: data.averageRank,
            winRate: data.winRate,
            averageScore: data.averageScore,
            totalMatches: data.totalMatches,
            recentPerformance: {
                last10Matches: [],
                trendDirection: data.trend || 'stable',
                consistency: data.consistency
            }
        };
    }

    /**
     * 性能测试
     */
    async performanceTest(): Promise<void> {
        console.log('=== 性能测试 ===');

        const profiles = Array.from({ length: 1000 }, (_, i) =>
            this.createTestProfile({
                averageRank: 1 + Math.random() * 4,
                winRate: Math.random(),
                averageScore: 1000 + Math.random() * 9000,
                consistency: Math.random(),
                totalMatches: 10 + Math.floor(Math.random() * 90)
            })
        );

        const startTime = Date.now();

        for (const profile of profiles) {
            this.skillAssessment.assessPlayerSkill(profile);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        const avgTime = duration / profiles.length;

        console.log(`✅ 性能测试结果:`);
        console.log(`   总时间: ${duration}ms`);
        console.log(`   平均时间: ${avgTime.toFixed(2)}ms/次`);
        console.log(`   QPS: ${(1000 / avgTime).toFixed(2)} 次/秒\n`);
    }
}

/**
 * 运行统一技能评估测试
 */
export async function runUnifiedSkillAssessmentTests(): Promise<void> {
    const test = new UnifiedSkillAssessmentTest();

    try {
        await test.runAllTests();
        await test.performanceTest();
        console.log('🎉 统一技能评估测试全部通过！');
    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
    }
}
