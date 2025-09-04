/**
 * 一致性优化排名推荐的详细示例
 * 展示一致性如何影响技能因子、信心度和最终排名推荐
 */

import { RankingRecommendationManager } from '../managers/RankingRecommendationManager';

/**
 * 模拟数据库上下文
 */
class MockDatabaseContext {
    db = {
        query: () => ({
            withIndex: () => ({
                order: () => ({
                    take: () => Promise.resolve([])
                })
            })
        })
    };
}

/**
 * 一致性优化示例
 */
export class ConsistencyOptimizationExample {
    private mockCtx: MockDatabaseContext;
    private rankingManager: RankingRecommendationManager;

    constructor() {
        this.mockCtx = new MockDatabaseContext();
        this.rankingManager = new RankingRecommendationManager(this.mockCtx);
    }

    /**
     * 运行所有一致性优化示例
     */
    async runAllExamples(): Promise<void> {
        console.log('🎯 一致性优化排名推荐示例\n');

        await this.example1_StableVsUnstablePlayers();
        await this.example2_ConsistencyImpactOnSkillFactor();
        await this.example3_ConsistencyImpactOnConfidence();
        await this.example4_RealWorldRankingScenario();
        await this.example5_ConsistencyThresholds();

        console.log('✅ 所有一致性优化示例完成！');
    }

    /**
     * 示例1：稳定玩家 vs 不稳定玩家
     */
    private async example1_StableVsUnstablePlayers(): Promise<void> {
        console.log('=== 示例1：稳定玩家 vs 不稳定玩家 ===');

        // 稳定高手玩家
        const stablePlayer = {
            uid: 'stable_expert',
            score: 10000,
            historicalScores: [10000, 10200, 9800, 10100, 9900, 10050, 9950, 10150, 9850, 10080]
        };

        // 不稳定高手玩家
        const unstablePlayer = {
            uid: 'unstable_expert',
            score: 10000,
            historicalScores: [15000, 5000, 13000, 7000, 12000, 8000, 14000, 6000, 11000, 9000]
        };

        console.log('📊 玩家数据对比：');
        console.log(`稳定玩家平均分: ${this.calculateAverage(stablePlayer.historicalScores).toFixed(0)}`);
        console.log(`不稳定玩家平均分: ${this.calculateAverage(unstablePlayer.historicalScores).toFixed(0)}`);

        // 计算一致性
        const stableConsistency = this.calculateConsistency(stablePlayer.historicalScores);
        const unstableConsistency = this.calculateConsistency(unstablePlayer.historicalScores);

        console.log(`稳定玩家一致性: ${stableConsistency.toFixed(3)}`);
        console.log(`不稳定玩家一致性: ${unstableConsistency.toFixed(3)}`);

        // 计算技能因子影响
        const stableSkillImpact = (stableConsistency - 0.5) * 0.2;
        const unstableSkillImpact = (unstableConsistency - 0.5) * 0.2;

        console.log(`稳定玩家技能因子影响: ${stableSkillImpact > 0 ? '+' : ''}${stableSkillImpact.toFixed(3)}`);
        console.log(`不稳定玩家技能因子影响: ${unstableSkillImpact > 0 ? '+' : ''}${unstableSkillImpact.toFixed(3)}`);

        // 计算信心度影响
        const stableConfidenceImpact = stableConsistency * 0.2;
        const unstableConfidenceImpact = unstableConsistency * 0.2;

        console.log(`稳定玩家信心度影响: +${stableConfidenceImpact.toFixed(3)}`);
        console.log(`不稳定玩家信心度影响: +${unstableConfidenceImpact.toFixed(3)}`);

        console.log('🎯 排名推荐结果：');
        console.log('稳定玩家：获得排名奖励，高信心度推荐');
        console.log('不稳定玩家：排名更保守，低信心度推荐\n');
    }

    /**
     * 示例2：一致性对技能因子的影响
     */
    private async example2_ConsistencyImpactOnSkillFactor(): Promise<void> {
        console.log('=== 示例2：一致性对技能因子的影响 ===');

        const consistencyLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
        const skillImpacts = consistencyLevels.map(consistency => (consistency - 0.5) * 0.2);

        console.log('📊 一致性 → 技能因子影响：');
        consistencyLevels.forEach((consistency, index) => {
            const impact = skillImpacts[index];
            const description = this.getConsistencyDescription(consistency);
            console.log(`一致性 ${consistency.toFixed(1)} (${description}): ${impact > 0 ? '+' : ''}${impact.toFixed(3)} 技能因子`);
        });

        console.log('\n🎯 影响分析：');
        console.log('• 高一致性(>0.5)：获得正技能因子，排名提升');
        console.log('• 低一致性(<0.5)：获得负技能因子，排名下降');
        console.log('• 最大影响范围：±0.1 技能因子\n');
    }

    /**
     * 示例3：一致性对信心度的影响
     */
    private async example3_ConsistencyImpactOnConfidence(): Promise<void> {
        console.log('=== 示例3：一致性对信心度的影响 ===');

        const consistencyLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
        const confidenceImpacts = consistencyLevels.map(consistency => consistency * 0.2);

        console.log('📊 一致性 → 信心度影响：');
        consistencyLevels.forEach((consistency, index) => {
            const impact = confidenceImpacts[index];
            const description = this.getConsistencyDescription(consistency);
            console.log(`一致性 ${consistency.toFixed(1)} (${description}): +${impact.toFixed(3)} 信心度`);
        });

        console.log('\n🎯 影响分析：');
        console.log('• 高一致性：高信心度，系统更确信排名准确性');
        console.log('• 低一致性：低信心度，系统对排名更保守');
        console.log('• 最大影响范围：+0.2 信心度\n');
    }

    /**
     * 示例4：真实世界排名场景
     */
    private async example4_RealWorldRankingScenario(): Promise<void> {
        console.log('=== 示例4：真实世界排名场景 ===');

        const players = [
            {
                uid: 'player_1',
                score: 12000,
                historicalScores: [12000, 11800, 12200, 11900, 12100, 12050, 11950, 12150, 11850, 12080],
                description: '稳定高手'
            },
            {
                uid: 'player_2',
                score: 12000,
                historicalScores: [15000, 8000, 13000, 9000, 14000, 7000, 16000, 6000, 11000, 10000],
                description: '不稳定高手'
            },
            {
                uid: 'player_3',
                score: 12000,
                historicalScores: [10000, 11000, 11500, 12000, 12500, 13000, 13500, 14000, 14500, 15000],
                description: '进步型玩家'
            },
            {
                uid: 'player_4',
                score: 12000,
                historicalScores: [12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000],
                description: '完美稳定玩家'
            }
        ];

        console.log('📊 玩家排名分析：');
        players.forEach(player => {
            const consistency = this.calculateConsistency(player.historicalScores);
            const skillImpact = (consistency - 0.5) * 0.2;
            const confidenceImpact = consistency * 0.2;

            console.log(`\n${player.description} (${player.uid}):`);
            console.log(`  一致性: ${consistency.toFixed(3)}`);
            console.log(`  技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
            console.log(`  信心度影响: +${confidenceImpact.toFixed(3)}`);
            console.log(`  排名推荐: ${this.getRankingRecommendation(consistency, skillImpact)}`);
        });

        console.log('\n🎯 排名推荐总结：');
        console.log('1. 完美稳定玩家：最高排名，最高信心度');
        console.log('2. 稳定高手：高排名，高信心度');
        console.log('3. 进步型玩家：中等排名，中等信心度');
        console.log('4. 不稳定高手：保守排名，低信心度\n');
    }

    /**
     * 示例5：一致性阈值分析
     */
    private async example5_ConsistencyThresholds(): Promise<void> {
        console.log('=== 示例5：一致性阈值分析 ===');

        const thresholds = [
            { min: 0.9, max: 1.0, level: '极高一致性', color: '🟢' },
            { min: 0.8, max: 0.9, level: '高一致性', color: '🟡' },
            { min: 0.6, max: 0.8, level: '中等一致性', color: '🟠' },
            { min: 0.4, max: 0.6, level: '低一致性', color: '🔴' },
            { min: 0.0, max: 0.4, level: '极低一致性', color: '⚫' }
        ];

        console.log('📊 一致性阈值分析：');
        thresholds.forEach(threshold => {
            const midValue = (threshold.min + threshold.max) / 2;
            const skillImpact = (midValue - 0.5) * 0.2;
            const confidenceImpact = midValue * 0.2;

            console.log(`${threshold.color} ${threshold.level} (${threshold.min}-${threshold.max}):`);
            console.log(`  技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
            console.log(`  信心度影响: +${confidenceImpact.toFixed(3)}`);
            console.log(`  推荐策略: ${this.getRecommendationStrategy(threshold.level)}\n`);
        });
    }

    // ==================== 辅助方法 ====================

    /**
     * 计算一致性（简化版本）
     */
    private calculateConsistency(scores: number[]): number {
        if (scores.length < 3) return 0.5;

        const validScores = scores.filter(score => score >= 0 && !isNaN(score));
        if (validScores.length < 3) return 0.5;

        const mean = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
        if (mean === 0) return 0.5;

        // 计算加权方差（最近比赛权重更高）
        const timeWeights = this.calculateTimeWeights(validScores.length);
        const weightedVariance = this.calculateWeightedVariance(validScores, timeWeights, mean);
        const weightedStandardDeviation = Math.sqrt(weightedVariance);

        // 基础一致性计算
        const baseConsistency = 1 - (weightedStandardDeviation / mean);

        // 考虑分数范围的调整
        const scoreRange = Math.max(...validScores) - Math.min(...validScores);
        const rangeAdjustment = this.calculateRangeAdjustment(scoreRange, mean);

        // 综合一致性计算
        const finalConsistency = baseConsistency * rangeAdjustment;

        return Math.max(0, Math.min(1, finalConsistency));
    }

    /**
     * 计算时间权重
     */
    private calculateTimeWeights(length: number): number[] {
        const weights: number[] = [];
        for (let i = 0; i < length; i++) {
            const weight = Math.pow(0.9, i);
            weights.push(weight);
        }
        return weights;
    }

    /**
     * 计算加权方差
     */
    private calculateWeightedVariance(scores: number[], weights: number[], mean: number): number {
        let weightedSumSquaredDiffs = 0;
        let totalWeight = 0;

        for (let i = 0; i < scores.length; i++) {
            const diff = scores[i] - mean;
            const weight = weights[i];
            weightedSumSquaredDiffs += weight * diff * diff;
            totalWeight += weight;
        }

        return totalWeight > 0 ? weightedSumSquaredDiffs / totalWeight : 0;
    }

    /**
     * 计算分数范围调整因子
     */
    private calculateRangeAdjustment(scoreRange: number, mean: number): number {
        const rangeRatio = scoreRange / mean;

        if (rangeRatio < 0.1) return 1.1;
        else if (rangeRatio < 0.2) return 1.05;
        else if (rangeRatio > 0.5) return 0.9;
        else if (rangeRatio > 0.3) return 0.95;

        return 1.0;
    }

    /**
     * 计算平均值
     */
    private calculateAverage(scores: number[]): number {
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    /**
     * 获取一致性描述
     */
    private getConsistencyDescription(consistency: number): string {
        if (consistency >= 0.9) return '极高一致性';
        if (consistency >= 0.8) return '高一致性';
        if (consistency >= 0.6) return '中等一致性';
        if (consistency >= 0.4) return '低一致性';
        return '极低一致性';
    }

    /**
     * 获取排名推荐
     */
    private getRankingRecommendation(consistency: number, skillImpact: number): string {
        if (consistency >= 0.8 && skillImpact > 0.05) {
            return '高排名，高信心度';
        } else if (consistency >= 0.6 && skillImpact > 0) {
            return '中等排名，中等信心度';
        } else if (consistency < 0.4 && skillImpact < 0) {
            return '保守排名，低信心度';
        } else {
            return '标准排名，标准信心度';
        }
    }

    /**
     * 获取推荐策略
     */
    private getRecommendationStrategy(level: string): string {
        switch (level) {
            case '极高一致性': return '给予最高排名奖励，最高信心度';
            case '高一致性': return '给予高排名奖励，高信心度';
            case '中等一致性': return '标准排名，中等信心度';
            case '低一致性': return '保守排名，低信心度';
            case '极低一致性': return '最保守排名，最低信心度';
            default: return '标准推荐策略';
        }
    }
}

/**
 * 运行一致性优化示例的主函数
 */
export async function runConsistencyOptimizationExamples(): Promise<void> {
    const example = new ConsistencyOptimizationExample();

    try {
        await example.runAllExamples();
        console.log('🎉 所有一致性优化示例运行完成！');
    } catch (error) {
        console.error('💥 示例运行过程中出现错误:', error);
    }
}

// 如果直接运行此文件，执行示例
// if (require.main === module) {
//     runConsistencyOptimizationExamples();
// }
