/**
 * 一致性玩家历史数据模拟测试
 * 展示不同一致性水平玩家的历史数据如何影响排名推荐
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
 * 玩家历史数据模拟器
 */
export class ConsistencyPlayerSimulation {
    private mockCtx: MockDatabaseContext;
    private rankingManager: RankingRecommendationManager;

    constructor() {
        this.mockCtx = new MockDatabaseContext();
        this.rankingManager = new RankingRecommendationManager(this.mockCtx);
    }

    /**
     * 运行所有一致性玩家模拟测试
     */
    async runAllSimulations(): Promise<void> {
        console.log('🎯 一致性玩家历史数据模拟测试\n');

        await this.simulation1_PerfectConsistencyPlayer();
        await this.simulation2_HighConsistencyPlayer();
        await this.simulation3_MediumConsistencyPlayer();
        await this.simulation4_LowConsistencyPlayer();
        await this.simulation5_ExtremeInconsistencyPlayer();
        await this.simulation6_ImprovingPlayer();
        await this.simulation7_DecliningPlayer();
        await this.simulation8_VolatilePlayer();
        await this.simulation9_StableExpert();
        await this.simulation10_UnstableExpert();

        console.log('✅ 所有一致性玩家模拟测试完成！');
    }

    /**
     * 模拟1：完美一致性玩家
     */
    private async simulation1_PerfectConsistencyPlayer(): Promise<void> {
        console.log('=== 模拟1：完美一致性玩家 ===');

        const player = {
            uid: 'perfect_consistency_player',
            description: '完美一致性玩家',
            historicalScores: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟2：高一致性玩家
     */
    private async simulation2_HighConsistencyPlayer(): Promise<void> {
        console.log('=== 模拟2：高一致性玩家 ===');

        const player = {
            uid: 'high_consistency_player',
            description: '高一致性玩家',
            historicalScores: [10000, 10200, 9800, 10100, 9900, 10050, 9950, 10150, 9850, 10080],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟3：中等一致性玩家
     */
    private async simulation3_MediumConsistencyPlayer(): Promise<void> {
        console.log('=== 模拟3：中等一致性玩家 ===');

        const player = {
            uid: 'medium_consistency_player',
            description: '中等一致性玩家',
            historicalScores: [10000, 9500, 10500, 9000, 11000, 8500, 11500, 8000, 12000, 7500],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟4：低一致性玩家
     */
    private async simulation4_LowConsistencyPlayer(): Promise<void> {
        console.log('=== 模拟4：低一致性玩家 ===');

        const player = {
            uid: 'low_consistency_player',
            description: '低一致性玩家',
            historicalScores: [10000, 8000, 12000, 6000, 14000, 4000, 16000, 2000, 18000, 0],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟5：极低一致性玩家
     */
    private async simulation5_ExtremeInconsistencyPlayer(): Promise<void> {
        console.log('=== 模拟5：极低一致性玩家 ===');

        const player = {
            uid: 'extreme_inconsistency_player',
            description: '极低一致性玩家',
            historicalScores: [10000, 5000, 15000, 2000, 18000, 1000, 20000, 500, 22000, 0],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟6：进步型玩家
     */
    private async simulation6_ImprovingPlayer(): Promise<void> {
        console.log('=== 模拟6：进步型玩家 ===');

        const player = {
            uid: 'improving_player',
            description: '进步型玩家',
            historicalScores: [5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟7：退步型玩家
     */
    private async simulation7_DecliningPlayer(): Promise<void> {
        console.log('=== 模拟7：退步型玩家 ===');

        const player = {
            uid: 'declining_player',
            description: '退步型玩家',
            historicalScores: [15000, 14500, 14000, 13500, 13000, 12500, 12000, 11500, 11000, 10500],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟8：波动型玩家
     */
    private async simulation8_VolatilePlayer(): Promise<void> {
        console.log('=== 模拟8：波动型玩家 ===');

        const player = {
            uid: 'volatile_player',
            description: '波动型玩家',
            historicalScores: [10000, 15000, 5000, 12000, 8000, 14000, 6000, 13000, 7000, 11000],
            currentScore: 10000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟9：稳定专家玩家
     */
    private async simulation9_StableExpert(): Promise<void> {
        console.log('=== 模拟9：稳定专家玩家 ===');

        const player = {
            uid: 'stable_expert',
            description: '稳定专家玩家',
            historicalScores: [12000, 12100, 11900, 12050, 11950, 12150, 11850, 12080, 11920, 12120],
            currentScore: 12000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 模拟10：不稳定专家玩家
     */
    private async simulation10_UnstableExpert(): Promise<void> {
        console.log('=== 模拟10：不稳定专家玩家 ===');

        const player = {
            uid: 'unstable_expert',
            description: '不稳定专家玩家',
            historicalScores: [12000, 8000, 16000, 6000, 18000, 4000, 20000, 2000, 22000, 0],
            currentScore: 12000
        };

        await this.analyzePlayer(player);
    }

    /**
     * 分析单个玩家的历史数据和一致性影响
     */
    private async analyzePlayer(player: {
        uid: string;
        description: string;
        historicalScores: number[];
        currentScore: number;
    }): Promise<void> {
        console.log(`\n📊 玩家分析: ${player.description} (${player.uid})`);
        console.log(`历史分数: [${player.historicalScores.join(', ')}]`);
        console.log(`当前分数: ${player.currentScore}`);

        // 计算基础统计
        const averageScore = this.calculateAverage(player.historicalScores);
        const scoreRange = Math.max(...player.historicalScores) - Math.min(...player.historicalScores);
        const standardDeviation = this.calculateStandardDeviation(player.historicalScores);

        console.log(`平均分数: ${averageScore.toFixed(0)}`);
        console.log(`分数范围: ${scoreRange}`);
        console.log(`标准差: ${standardDeviation.toFixed(0)}`);

        // 计算一致性
        const consistency = this.calculateConsistency(player.historicalScores);
        console.log(`一致性分数: ${consistency.toFixed(3)}`);
        console.log(`一致性描述: ${this.getConsistencyDescription(consistency)}`);

        // 计算一致性对排名推荐的影响
        const skillImpact = (consistency - 0.5) * 0.2;
        const confidenceImpact = consistency * 0.2;

        console.log(`技能因子影响: ${skillImpact > 0 ? '+' : ''}${skillImpact.toFixed(3)}`);
        console.log(`信心度影响: +${confidenceImpact.toFixed(3)}`);

        // 分析趋势
        const trend = this.analyzeTrend(player.historicalScores);
        console.log(`表现趋势: ${trend}`);

        // 生成排名推荐
        const rankingRecommendation = this.getRankingRecommendation(consistency, skillImpact, trend);
        console.log(`排名推荐: ${rankingRecommendation}`);

        // 生成详细分析
        const detailedAnalysis = this.generateDetailedAnalysis(player, consistency, skillImpact, confidenceImpact, trend);
        console.log(`详细分析: ${detailedAnalysis}`);

        console.log('─'.repeat(80));
    }

    // ==================== 辅助计算方法 ====================

    /**
     * 计算一致性（完整版本）
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
     * 计算标准差
     */
    private calculateStandardDeviation(scores: number[]): number {
        const mean = this.calculateAverage(scores);
        const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
        return Math.sqrt(variance);
    }

    /**
     * 分析趋势
     */
    private analyzeTrend(scores: number[]): string {
        if (scores.length < 5) return '数据不足';

        const recentScores = scores.slice(0, 5);
        const olderScores = scores.slice(5, 10);

        const recentAvg = this.calculateAverage(recentScores);
        const olderAvg = olderScores.length > 0 ? this.calculateAverage(olderScores) : recentAvg;

        const improvement = (recentAvg - olderAvg) / olderAvg;

        if (improvement > 0.1) return '显著进步';
        if (improvement > 0.05) return '轻微进步';
        if (improvement < -0.1) return '显著退步';
        if (improvement < -0.05) return '轻微退步';
        return '表现稳定';
    }

    /**
     * 获取一致性描述
     */
    private getConsistencyDescription(consistency: number): string {
        if (consistency >= 0.95) return '完美一致性';
        if (consistency >= 0.9) return '极高一致性';
        if (consistency >= 0.8) return '高一致性';
        if (consistency >= 0.6) return '中等一致性';
        if (consistency >= 0.4) return '低一致性';
        if (consistency >= 0.2) return '极低一致性';
        return '极不稳定';
    }

    /**
     * 获取排名推荐
     */
    private getRankingRecommendation(consistency: number, skillImpact: number, trend: string): string {
        if (consistency >= 0.9 && skillImpact > 0.05) {
            return '高排名，高信心度，稳定表现';
        } else if (consistency >= 0.8 && skillImpact > 0) {
            return '中高排名，高信心度';
        } else if (consistency >= 0.6 && skillImpact > 0) {
            return '中等排名，中等信心度';
        } else if (consistency < 0.4 && skillImpact < 0) {
            return '保守排名，低信心度，表现不稳定';
        } else if (trend.includes('进步')) {
            return '排名提升，进步奖励';
        } else if (trend.includes('退步')) {
            return '排名下调，退步惩罚';
        } else {
            return '标准排名，标准信心度';
        }
    }

    /**
     * 生成详细分析
     */
    private generateDetailedAnalysis(
        player: any,
        consistency: number,
        skillImpact: number,
        confidenceImpact: number,
        trend: string
    ): string {
        const analysis = [];

        // 一致性分析
        if (consistency >= 0.9) {
            analysis.push('表现极其稳定，系统高度信任');
        } else if (consistency >= 0.8) {
            analysis.push('表现稳定，系统信任度高');
        } else if (consistency >= 0.6) {
            analysis.push('表现较为稳定，系统信任度中等');
        } else if (consistency >= 0.4) {
            analysis.push('表现不够稳定，系统信任度较低');
        } else {
            analysis.push('表现极不稳定，系统信任度很低');
        }

        // 技能因子影响分析
        if (skillImpact > 0.05) {
            analysis.push('获得显著技能奖励');
        } else if (skillImpact > 0) {
            analysis.push('获得轻微技能奖励');
        } else if (skillImpact < -0.05) {
            analysis.push('受到显著技能惩罚');
        } else if (skillImpact < 0) {
            analysis.push('受到轻微技能惩罚');
        }

        // 信心度分析
        if (confidenceImpact > 0.15) {
            analysis.push('推荐信心度很高');
        } else if (confidenceImpact > 0.1) {
            analysis.push('推荐信心度较高');
        } else if (confidenceImpact < 0.05) {
            analysis.push('推荐信心度较低');
        }

        // 趋势分析
        if (trend.includes('进步')) {
            analysis.push('呈现进步趋势，未来表现可期');
        } else if (trend.includes('退步')) {
            analysis.push('呈现退步趋势，需要关注');
        } else {
            analysis.push('表现趋势稳定');
        }

        return analysis.join('，');
    }
}

/**
 * 运行一致性玩家模拟测试的主函数
 */
export async function runConsistencyPlayerSimulations(): Promise<void> {
    const simulation = new ConsistencyPlayerSimulation();

    try {
        await simulation.runAllSimulations();
        console.log('🎉 所有一致性玩家模拟测试运行完成！');
    } catch (error) {
        console.error('💥 模拟测试运行过程中出现错误:', error);
    }
}

// 如果直接运行此文件，执行模拟测试
// if (require.main === module) {
//     runConsistencyPlayerSimulations();
// }
