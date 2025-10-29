/**
 * 排名推荐相关通用类型定义
 */

// 玩家相关类型
export interface HumanPlayer {
    uid: string;
    score: number;
    character_id?: string;
    name?: string;
}

export interface PlayerPerformanceProfile {
    uid: string;
    segmentName: 'bronze'; // 暂时固定为青铜段位
    averageScore: number;
    averageRank: number;
    winRate: number;
    totalMatches: number;
    recentPerformance: {
        last10Matches: any[];
        trendDirection: 'improving' | 'declining' | 'stable';
        consistency: number; // 0-1, 1为最一致
    };
}

export interface PlayerRankingResult {
    uid: string;
    recommendedRank: number;
    confidence: number;
    reasoning: string;
    relativePerformance: 'excellent' | 'good' | 'average' | 'poor';
}

export interface AIOpponent {
    uid: string;
    name: string;
    score: number;
    targetRank: number;
    recommendedRank?: number; // 添加推荐排名
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    character_id: string;
    description: string;
}

export interface MatchRankingResult {
    humanPlayerRankings: PlayerRankingResult[];
    aiOpponents: AIOpponent[];
    matchContext: {
        totalParticipants: number;
        humanPlayerCount: number;
        aiCount: number;
        averageHumanScore: number;
        scoreRange: {
            highest: number;
            lowest: number;
            median: number;
        };
        skillDistribution: {
            beginner: number;
            intermediate: number;
            advanced: number;
        };
    };
    recommendations: {
        strategy: string;
        reasoning: string;
        confidence: number;
    };
}

// 段位相关类型（暂时不使用）
/**
 * @deprecated 段位系统暂时不考虑
 */
export type SegmentName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/**
 * @deprecated 段位系统暂时不考虑
 */
export interface SegmentRule {
    minMatches: number;
    maxMatches: number;
    skillWeight: number;
    scoreWeight: number;
    rankingProbabilities: Record<number, number[]>;
    protectionEnabled: boolean;
    adjustmentMultiplier: number;
}

// 技能评估相关类型（暂时不使用）
/**
 * @deprecated 技能评估系统暂时不考虑
 */
export interface SkillAssessmentResult {
    level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    factor: number;
    confidence: number;
    analysis: {
        rankScore: number;
        winRateScore: number;
        consistencyScore: number;
        scoreScore: number;
        totalScore: number;
        matchCount: number;
        trend: 'improving' | 'declining' | 'stable';
    };
    reasoning: string;
}

// 人类玩家分析类型
export interface HumanAnalysis {
    averageScore: number;
    scoreDistribution: {
        highest: number;
        lowest: number;
        median: number;
    };
    skillDistribution: {
        beginner: number;
        intermediate: number;
        advanced: number;
    };
    overallSkillLevel: 'beginner' | 'intermediate' | 'advanced';
    scoreVariance: number;
}

// 排名策略接口
export interface RankingStrategy {
    calculateRanking(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult>;
}

// 缓存项接口
export interface CacheItem<T> {
    data: T;
    timestamp: number;
}
