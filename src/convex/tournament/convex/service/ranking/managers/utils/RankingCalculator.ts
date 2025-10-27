/**
 * 排名计算工具类
 */

import { HumanAnalysis, HumanPlayer, PlayerPerformanceProfile } from '../types/CommonTypes';

export class RankingCalculator {
    /**
     * 计算人类玩家在人类玩家中的排名
     */
    static calculateHumanRank(player: HumanPlayer, humanPlayers: HumanPlayer[]): number {
        const sortedPlayers = [...humanPlayers].sort((a, b) => b.score - a.score);
        return sortedPlayers.findIndex(p => p.uid === player.uid) + 1;
    }

    /**
     * 计算分数因子
     */
    static calculateScoreFactor(score: number, humanAnalysis: HumanAnalysis): number {
        const { averageScore, scoreDistribution } = humanAnalysis;

        if (scoreDistribution.highest === scoreDistribution.lowest) return 0.5;

        const relativePosition = (score - scoreDistribution.lowest) / (scoreDistribution.highest - scoreDistribution.lowest);
        const averageComparison = score / averageScore;

        return (relativePosition * 0.7) + ((averageComparison - 1) * 0.3 + 0.5);
    }

    /**
     * 计算技能因子
     */
    static calculateSkillFactor(profile: PlayerPerformanceProfile): number {
        // 基于历史数据的技能因子计算
        const { averageScore, averageRank, winRate, recentPerformance } = profile;

        // 简化的技能因子计算
        const rankScore = Math.max(0, 1 - (averageRank - 1) / 10); // 排名越好，分数越高
        const winRateScore = winRate;
        const consistencyScore = recentPerformance.consistency;

        return (rankScore * 0.4) + (winRateScore * 0.3) + (consistencyScore * 0.3);
    }

    /**
     * 计算信心度
     */
    static calculateConfidence(profile: PlayerPerformanceProfile, humanAnalysis: HumanAnalysis): number {
        let confidence = 0.5;

        // 比赛场次影响
        if (profile.totalMatches >= 20) confidence += 0.2;
        else if (profile.totalMatches >= 10) confidence += 0.1;

        // 表现一致性影响
        confidence += profile.recentPerformance.consistency * 0.2;

        // 技能水平影响
        const skillFactor = this.calculateSkillFactor(profile);
        if (skillFactor >= 0.8) confidence += 0.1;
        else if (skillFactor <= 0.3) confidence -= 0.1;

        return Math.max(0.1, Math.min(0.95, confidence));
    }

    /**
     * 分析玩家相对表现
     */
    static analyzePlayerRelativePerformance(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis
    ): 'excellent' | 'good' | 'average' | 'poor' {
        const scoreImprovement = (player.score - profile.averageScore) / profile.averageScore;
        const scoreRankInHumans = this.calculateScoreFactor(player.score, humanAnalysis);

        if (scoreImprovement > 0.2 && scoreRankInHumans >= 0.8) return 'excellent';
        if (scoreImprovement > 0.1 || scoreRankInHumans >= 0.6) return 'good';
        if (scoreImprovement > -0.1 && scoreRankInHumans >= 0.3) return 'average';
        return 'poor';
    }

    /**
     * 计算AI基础分数
     */
    static calculateAIBaseScore(
        targetRank: number,
        totalParticipants: number,
        humanAnalysis: HumanAnalysis
    ): number {
        const { scoreDistribution, averageScore } = humanAnalysis;

        // 根据排名位置插值计算分数
        const rankRatio = (targetRank - 1) / (totalParticipants - 1);

        let highScore, lowScore, scoreRange;

        if (scoreDistribution.highest === scoreDistribution.lowest) {
            // 单玩家场景：基于玩家分数创建合理范围
            const playerScore = scoreDistribution.highest;
            const baseRange = Math.max(averageScore * 0.6, playerScore * 0.8);

            highScore = playerScore + baseRange * 0.4;
            lowScore = Math.max(0, playerScore - baseRange * 0.6);
            scoreRange = highScore - lowScore;
        } else {
            // 多玩家场景：使用实际分数分布
            highScore = scoreDistribution.highest;
            lowScore = scoreDistribution.lowest;
            scoreRange = highScore - lowScore;

            // 确保最小分数范围
            if (scoreRange < averageScore * 0.2) {
                scoreRange = averageScore * 0.4;
            }
        }

        const baseScore = highScore - (rankRatio * scoreRange);

        // 添加随机变化
        const randomVariation = (Math.random() - 0.5) * scoreRange * 0.1;

        return Math.max(0, baseScore + randomVariation);
    }

    /**
     * 计算AI分数变化范围
     */
    static calculateAIScoreVariance(humanAnalysis: HumanAnalysis): number {
        const { averageScore, scoreDistribution } = humanAnalysis;

        if (scoreDistribution.highest === scoreDistribution.lowest) {
            return Math.max(averageScore * 0.1, 50);
        }

        const range = scoreDistribution.highest - scoreDistribution.lowest;
        return Math.max(range * 0.05, 30);
    }
}
