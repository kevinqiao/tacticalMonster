/**
 * 统一技能评估系统
 * 整合 RankingRecommendationManager 和 SeedRecommendationManager 的技能评估逻辑
 */

import { PlayerPerformanceProfile } from '../managers/RankingRecommendationManager';

export interface SkillAssessmentResult {
    // 离散等级（用于种子推荐）
    level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

    // 连续因子（用于排名推荐）
    factor: number; // 0-1

    // 信心度
    confidence: number; // 0-1

    // 详细分析
    analysis: {
        rankScore: number;        // 排名得分
        winRateScore: number;     // 胜率得分
        consistencyScore: number; // 一致性得分
        scoreScore: number;       // 分数得分
        totalScore: number;       // 总分
        matchCount: number;       // 比赛场次
        trend: 'improving' | 'declining' | 'stable';
    };

    // 推荐说明
    reasoning: string;
}

export interface SkillAssessmentOptions {
    // 数据范围
    matchCount?: number;          // 分析比赛数量，默认50

    // 权重配置
    weights?: {
        rank: number;             // 排名权重，默认0.3
        winRate: number;          // 胜率权重，默认0.25
        consistency: number;      // 一致性权重，默认0.25
        score: number;            // 分数权重，默认0.2
    };

    // 等级阈值
    levelThresholds?: {
        diamond: number;          // 钻石阈值，默认0.9
        platinum: number;         // 铂金阈值，默认0.75
        gold: number;             // 黄金阈值，默认0.6
        silver: number;           // 白银阈值，默认0.4
    };

    // 是否包含趋势分析
    includeTrend?: boolean;       // 默认true
}

export class UnifiedSkillAssessment {
    private defaultOptions: Required<SkillAssessmentOptions> = {
        matchCount: 50,
        weights: {
            rank: 0.3,
            winRate: 0.25,
            consistency: 0.25,
            score: 0.2
        },
        levelThresholds: {
            diamond: 0.9,
            platinum: 0.75,
            gold: 0.6,
            silver: 0.4
        },
        includeTrend: true
    };

    /**
     * 统一技能评估主方法
     */
    assessPlayerSkill(
        profile: PlayerPerformanceProfile,
        options: SkillAssessmentOptions = {}
    ): SkillAssessmentResult {
        const opts = { ...this.defaultOptions, ...options };

        // 1. 计算各项得分
        const rankScore = this.calculateRankScore(profile.averageRank);
        const winRateScore = this.calculateWinRateScore(profile.winRate);
        const consistencyScore = this.calculateConsistencyScore(profile.recentPerformance.consistency);
        const scoreScore = this.calculateScoreScore(profile.averageScore);

        // 2. 计算加权总分
        const totalScore =
            rankScore * opts.weights.rank +
            winRateScore * opts.weights.winRate +
            consistencyScore * opts.weights.consistency +
            scoreScore * opts.weights.score;

        // 3. 确定技能等级
        const level = this.determineSkillLevel(totalScore, opts.levelThresholds);

        // 4. 计算技能因子（0-1）
        const factor = Math.max(0, Math.min(1, totalScore));

        // 5. 计算信心度
        const confidence = this.calculateConfidence(profile, totalScore);

        // 6. 分析趋势
        const trend = opts.includeTrend ? this.analyzeTrend(profile) : 'stable';

        // 7. 生成推荐说明
        const reasoning = this.generateReasoning(level, factor, confidence, trend, profile);

        return {
            level,
            factor,
            confidence,
            analysis: {
                rankScore,
                winRateScore,
                consistencyScore,
                scoreScore,
                totalScore,
                matchCount: profile.totalMatches,
                trend
            },
            reasoning
        };
    }

    /**
     * 计算排名得分
     */
    private calculateRankScore(averageRank: number): number {
        // 排名越小越好，转换为0-1得分
        if (averageRank <= 1.0) return 1.0;
        if (averageRank <= 1.5) return 0.95;
        if (averageRank <= 2.0) return 0.85;
        if (averageRank <= 2.5) return 0.7;
        if (averageRank <= 3.0) return 0.5;
        if (averageRank <= 4.0) return 0.3;
        if (averageRank <= 5.0) return 0.15;
        return 0.05;
    }

    /**
     * 计算胜率得分
     */
    private calculateWinRateScore(winRate: number): number {
        // 胜率越高越好，转换为0-1得分
        if (winRate >= 0.8) return 1.0;
        if (winRate >= 0.6) return 0.9;
        if (winRate >= 0.5) return 0.8;
        if (winRate >= 0.4) return 0.6;
        if (winRate >= 0.3) return 0.4;
        if (winRate >= 0.2) return 0.25;
        if (winRate >= 0.1) return 0.15;
        return 0.05;
    }

    /**
     * 计算一致性得分
     */
    private calculateConsistencyScore(consistency: number): number {
        // 一致性越高越好，直接使用0-1得分
        return Math.max(0, Math.min(1, consistency));
    }

    /**
     * 计算分数得分
     */
    private calculateScoreScore(averageScore: number): number {
        // 分数越高越好，使用对数缩放避免极端值
        const normalizedScore = Math.log10(Math.max(1, averageScore)) / 5; // 假设最高分100000
        return Math.max(0, Math.min(1, normalizedScore));
    }

    /**
     * 确定技能等级
     */
    private determineSkillLevel(
        totalScore: number,
        thresholds: Required<SkillAssessmentOptions>['levelThresholds']
    ): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
        if (totalScore >= thresholds.diamond) return 'diamond';
        if (totalScore >= thresholds.platinum) return 'platinum';
        if (totalScore >= thresholds.gold) return 'gold';
        if (totalScore >= thresholds.silver) return 'silver';
        return 'bronze';
    }

    /**
     * 计算信心度
     */
    private calculateConfidence(profile: PlayerPerformanceProfile, totalScore: number): number {
        let confidence = 0.5; // 基础信心度

        // 比赛场次影响
        if (profile.totalMatches >= 50) confidence += 0.3;
        else if (profile.totalMatches >= 20) confidence += 0.2;
        else if (profile.totalMatches >= 10) confidence += 0.1;
        else confidence -= 0.2;

        // 一致性影响
        confidence += profile.recentPerformance.consistency * 0.2;

        // 技能水平影响
        if (totalScore >= 0.8) confidence += 0.1;
        else if (totalScore <= 0.3) confidence -= 0.1;

        return Math.max(0.1, Math.min(0.95, confidence));
    }

    /**
     * 分析趋势
     */
    private analyzeTrend(profile: PlayerPerformanceProfile): 'improving' | 'declining' | 'stable' {
        const { last10Matches, trendDirection } = profile.recentPerformance;

        if (last10Matches.length < 5) return 'stable';

        // 使用已有的趋势分析结果
        return trendDirection;
    }

    /**
     * 生成推荐说明
     */
    private generateReasoning(
        level: string,
        factor: number,
        confidence: number,
        trend: string,
        profile: PlayerPerformanceProfile
    ): string {
        const reasons = [];

        // 技能等级说明
        const levelDesc = {
            'bronze': '新手',
            'silver': '初级',
            'gold': '中级',
            'platinum': '高级',
            'diamond': '专家'
        }[level] || '未知';

        reasons.push(`${levelDesc}水平 (${(factor * 100).toFixed(1)}%)`);

        // 信心度说明
        if (confidence >= 0.8) reasons.push('高信心度');
        else if (confidence >= 0.6) reasons.push('中等信心度');
        else reasons.push('低信心度');

        // 趋势说明
        if (trend === 'improving') reasons.push('表现上升');
        else if (trend === 'declining') reasons.push('表现下降');
        else reasons.push('表现稳定');

        // 比赛场次说明
        if (profile.totalMatches >= 50) reasons.push('经验丰富');
        else if (profile.totalMatches < 10) reasons.push('经验不足');

        return reasons.join('，');
    }

    /**
     * 批量评估多个玩家
     */
    assessMultiplePlayers(
        profiles: PlayerPerformanceProfile[],
        options: SkillAssessmentOptions = {}
    ): Map<string, SkillAssessmentResult> {
        const results = new Map<string, SkillAssessmentResult>();

        for (const profile of profiles) {
            const assessment = this.assessPlayerSkill(profile, options);
            results.set(profile.uid, assessment);
        }

        return results;
    }

    /**
     * 获取技能分布统计
     */
    getSkillDistribution(assessments: Map<string, SkillAssessmentResult>) {
        const distribution = {
            bronze: 0,
            silver: 0,
            gold: 0,
            platinum: 0,
            diamond: 0
        };

        for (const assessment of assessments.values()) {
            distribution[assessment.level]++;
        }

        return distribution;
    }

    /**
     * 比较两个玩家的技能水平
     */
    comparePlayers(
        player1: SkillAssessmentResult,
        player2: SkillAssessmentResult
    ): {
        winner: 'player1' | 'player2' | 'tie';
        difference: number;
        reasoning: string;
    } {
        const diff = player1.factor - player2.factor;
        const absDiff = Math.abs(diff);

        let winner: 'player1' | 'player2' | 'tie';
        let reasoning: string;

        if (absDiff < 0.05) {
            winner = 'tie';
            reasoning = '技能水平相当';
        } else if (diff > 0) {
            winner = 'player1';
            reasoning = `技能水平高出 ${(absDiff * 100).toFixed(1)}%`;
        } else {
            winner = 'player2';
            reasoning = `技能水平高出 ${(absDiff * 100).toFixed(1)}%`;
        }

        return { winner, difference: diff, reasoning };
    }
}
