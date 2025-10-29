/**
 * 玩家画像生成器
 * 基于历史数据生成玩家画像
 */

export interface PlayerHistory {
    recentMatches: any[];
    recentEvents: any[];
    totalMatches: number;
    averageScore: number;
    averageRank: number;
    bestRank: number;
    worstRank: number;
}

export interface PlayerProfile {
    uid: string;
    preferences: {
        challengeLevel: 'easy' | 'normal' | 'hard' | 'extreme';
        competitionStyle: 'conservative' | 'balanced' | 'aggressive';
        focusArea: 'ranking' | 'score' | 'improvement' | 'fun';
        riskTolerance: 'low' | 'medium' | 'high';
        playTime: 'morning' | 'afternoon' | 'evening' | 'night';
        sessionLength: 'short' | 'medium' | 'long';
    };
    behavioralPatterns: {
        playFrequency: 'daily' | 'weekly' | 'casual';
        retryBehavior: 'persistent' | 'occasional' | 'rare';
        goalOrientation: 'competitive' | 'casual' | 'social';
        learningStyle: 'explorer' | 'achiever' | 'socializer' | 'killer';
        stressResponse: 'calm' | 'moderate' | 'anxious';
    };
    performanceHistory: {
        bestRank: number;
        worstRank: number;
        averageRank: number;
        rankingTrend: 'improving' | 'declining' | 'stable';
        consistency: number;
        riskTaking: number;
        comebackAbility: number;
    };
    psychologicalProfile: {
        motivationType: 'intrinsic' | 'extrinsic' | 'mixed';
        feedbackPreference: 'immediate' | 'delayed' | 'detailed';
        socialInteraction: 'high' | 'medium' | 'low';
        achievementOrientation: 'high' | 'medium' | 'low';
    };
    dataQuality: 'high' | 'medium' | 'low';
    confidence: number;
}

export class PlayerProfileGenerator {
    /**
     * 生成玩家画像
     */
    static generateProfile(uid: string, history: PlayerHistory): PlayerProfile {
        return {
            uid,
            preferences: this.generatePreferences(history),
            behavioralPatterns: this.generateBehavioralPatterns(history),
            performanceHistory: this.generatePerformanceHistory(history),
            psychologicalProfile: this.generatePsychologicalProfile(history),
            dataQuality: this.calculateDataQuality(history),
            confidence: this.calculateConfidence(history)
        };
    }

    /**
     * 生成偏好设置
     */
    private static generatePreferences(history: PlayerHistory): PlayerProfile['preferences'] {
        const { averageScore, averageRank, totalMatches } = history;

        // 基于平均分数和排名推断挑战偏好
        let challengeLevel: 'easy' | 'normal' | 'hard' | 'extreme';
        if (averageScore > 1500 && averageRank < 2) {
            challengeLevel = 'extreme';
        } else if (averageScore > 1200 && averageRank < 3) {
            challengeLevel = 'hard';
        } else if (averageScore > 800) {
            challengeLevel = 'normal';
        } else {
            challengeLevel = 'easy';
        }

        // 基于游戏频率推断竞争风格
        let competitionStyle: 'conservative' | 'balanced' | 'aggressive';
        const playFrequency = this.calculatePlayFrequency(history);
        if (playFrequency === 'daily' && averageRank < 2) {
            competitionStyle = 'aggressive';
        } else if (playFrequency === 'casual') {
            competitionStyle = 'conservative';
        } else {
            competitionStyle = 'balanced';
        }

        // 基于排名和分数推断专注领域
        let focusArea: 'ranking' | 'score' | 'improvement' | 'fun';
        if (averageRank < 2) {
            focusArea = 'ranking';
        } else if (averageScore > 1000) {
            focusArea = 'score';
        } else if (totalMatches > 20) {
            focusArea = 'improvement';
        } else {
            focusArea = 'fun';
        }

        // 基于表现一致性推断风险承受度
        let riskTolerance: 'low' | 'medium' | 'high';
        const consistency = this.calculateConsistency(history);
        if (consistency > 0.8) {
            riskTolerance = 'high';
        } else if (consistency > 0.5) {
            riskTolerance = 'medium';
        } else {
            riskTolerance = 'low';
        }

        return {
            challengeLevel,
            competitionStyle,
            focusArea,
            riskTolerance,
            playTime: 'evening', // 默认值
            sessionLength: 'medium' // 默认值
        };
    }

    /**
     * 生成行为模式
     */
    private static generateBehavioralPatterns(history: PlayerHistory): PlayerProfile['behavioralPatterns'] {
        return {
            playFrequency: this.calculatePlayFrequency(history),
            retryBehavior: this.calculateRetryBehavior(history),
            goalOrientation: this.calculateGoalOrientation(history),
            learningStyle: this.calculateLearningStyle(history),
            stressResponse: this.calculateStressResponse(history)
        };
    }

    /**
     * 生成历史表现
     */
    private static generatePerformanceHistory(history: PlayerHistory): PlayerProfile['performanceHistory'] {
        const { bestRank, worstRank, averageRank, totalMatches } = history;

        return {
            bestRank,
            worstRank,
            averageRank,
            rankingTrend: this.calculateRankingTrend(history),
            consistency: this.calculateConsistency(history),
            riskTaking: this.calculateRiskTaking(history),
            comebackAbility: this.calculateComebackAbility(history)
        };
    }

    /**
     * 生成心理特征
     */
    private static generatePsychologicalProfile(history: PlayerHistory): PlayerProfile['psychologicalProfile'] {
        return {
            motivationType: this.calculateMotivationType(history),
            feedbackPreference: this.calculateFeedbackPreference(history),
            socialInteraction: this.calculateSocialInteraction(history),
            achievementOrientation: this.calculateAchievementOrientation(history)
        };
    }

    /**
     * 计算数据质量
     */
    private static calculateDataQuality(history: PlayerHistory): 'high' | 'medium' | 'low' {
        const { totalMatches, recentEvents } = history;

        if (totalMatches >= 30 && recentEvents.length >= 50) {
            return 'high';
        } else if (totalMatches >= 10 && recentEvents.length >= 20) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * 计算置信度
     */
    private static calculateConfidence(history: PlayerHistory): number {
        let confidence = 0.5; // 基础置信度

        // 比赛场次影响
        if (history.totalMatches >= 50) confidence += 0.3;
        else if (history.totalMatches >= 20) confidence += 0.2;
        else if (history.totalMatches >= 10) confidence += 0.1;

        // 行为事件影响
        if (history.recentEvents.length >= 100) confidence += 0.2;
        else if (history.recentEvents.length >= 50) confidence += 0.1;

        // 数据一致性影响
        const consistency = this.calculateConsistency(history);
        confidence += consistency * 0.1;

        return Math.max(0.1, Math.min(0.95, confidence));
    }

    // 辅助计算方法
    private static calculatePlayFrequency(history: PlayerHistory): 'daily' | 'weekly' | 'casual' {
        const { totalMatches } = history;
        const daysSinceFirstMatch = 30; // 假设30天
        const matchesPerDay = totalMatches / daysSinceFirstMatch;

        if (matchesPerDay >= 1) return 'daily';
        if (matchesPerDay >= 0.3) return 'weekly';
        return 'casual';
    }

    private static calculateRetryBehavior(history: PlayerHistory): 'persistent' | 'occasional' | 'rare' {
        // 基于重试事件计算
        const retryEvents = history.recentEvents.filter(e => e.eventType === 'retry');
        const retryRate = retryEvents.length / history.totalMatches;

        if (retryRate > 0.3) return 'persistent';
        if (retryRate > 0.1) return 'occasional';
        return 'rare';
    }

    private static calculateGoalOrientation(history: PlayerHistory): 'competitive' | 'casual' | 'social' {
        const { averageRank, averageScore } = history;

        if (averageRank < 2 && averageScore > 1200) return 'competitive';
        if (averageRank > 4) return 'casual';
        return 'social';
    }

    private static calculateLearningStyle(history: PlayerHistory): 'explorer' | 'achiever' | 'socializer' | 'killer' {
        const { totalMatches, averageRank } = history;

        if (totalMatches > 30 && averageRank < 2) return 'killer';
        if (totalMatches > 20) return 'achiever';
        if (totalMatches > 10) return 'socializer';
        return 'explorer';
    }

    private static calculateStressResponse(history: PlayerHistory): 'calm' | 'moderate' | 'anxious' {
        const consistency = this.calculateConsistency(history);

        if (consistency > 0.8) return 'calm';
        if (consistency > 0.5) return 'moderate';
        return 'anxious';
    }

    private static calculateRankingTrend(history: PlayerHistory): 'improving' | 'declining' | 'stable' {
        const { recentMatches } = history;
        if (recentMatches.length < 5) return 'stable';

        const recent5 = recentMatches.slice(0, 5);
        const previous5 = recentMatches.slice(5, 10);

        if (previous5.length === 0) return 'stable';

        const recentAvg = recent5.reduce((sum, m) => sum + m.rank, 0) / recent5.length;
        const previousAvg = previous5.reduce((sum, m) => sum + m.rank, 0) / previous5.length;

        const improvement = previousAvg - recentAvg;

        if (improvement > 0.5) return 'improving';
        if (improvement < -0.5) return 'declining';
        return 'stable';
    }

    private static calculateConsistency(history: PlayerHistory): number {
        const { recentMatches } = history;
        if (recentMatches.length < 2) return 0.5;

        const scores = recentMatches.map(m => m.score);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        return Math.max(0, 1 - (stdDev / mean));
    }

    private static calculateRiskTaking(history: PlayerHistory): number {
        const { averageScore, averageRank } = history;

        // 基于分数和排名的变化计算风险承受度
        const scoreRisk = Math.min(1, averageScore / 2000);
        const rankRisk = Math.min(1, (5 - averageRank) / 4);

        return (scoreRisk + rankRisk) / 2;
    }

    private static calculateComebackAbility(history: PlayerHistory): number {
        const { recentMatches } = history;
        if (recentMatches.length < 3) return 0.5;

        // 计算从低排名恢复的能力
        let comebackCount = 0;
        for (let i = 1; i < recentMatches.length - 1; i++) {
            const prev = recentMatches[i + 1].rank;
            const curr = recentMatches[i].rank;
            const next = recentMatches[i - 1].rank;

            if (prev > 3 && curr <= 2 && next <= 2) {
                comebackCount++;
            }
        }

        return Math.min(1, comebackCount / (recentMatches.length - 2));
    }

    private static calculateMotivationType(history: PlayerHistory): 'intrinsic' | 'extrinsic' | 'mixed' {
        const { totalMatches, averageRank } = history;

        if (totalMatches > 20 && averageRank < 2) return 'intrinsic';
        if (totalMatches < 10) return 'extrinsic';
        return 'mixed';
    }

    private static calculateFeedbackPreference(history: PlayerHistory): 'immediate' | 'delayed' | 'detailed' {
        const playFrequency = this.calculatePlayFrequency(history);

        if (playFrequency === 'daily') return 'immediate';
        if (playFrequency === 'weekly') return 'detailed';
        return 'delayed';
    }

    private static calculateSocialInteraction(history: PlayerHistory): 'high' | 'medium' | 'low' {
        const { recentEvents } = history;
        const socialEvents = recentEvents.filter(e =>
            e.eventType === 'session_start' || e.eventType === 'session_end'
        );

        const socialRate = socialEvents.length / recentEvents.length;

        if (socialRate > 0.3) return 'high';
        if (socialRate > 0.1) return 'medium';
        return 'low';
    }

    private static calculateAchievementOrientation(history: PlayerHistory): 'high' | 'medium' | 'low' {
        const { averageRank, totalMatches } = history;

        if (averageRank < 2 && totalMatches > 15) return 'high';
        if (averageRank < 3 && totalMatches > 10) return 'medium';
        return 'low';
    }
}