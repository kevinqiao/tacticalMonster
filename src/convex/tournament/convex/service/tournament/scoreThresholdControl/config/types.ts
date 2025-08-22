/**
 * 分数门槛控制系统类型定义
 * 整合段位系统和分数门槛系统的类型
 */

import { ChangeType, ProtectionLevel, SegmentName } from '../../../segment/types';

// 重新导出从segment导入的类型
export type { ChangeType, ProtectionLevel, SegmentName };

// ==================== 基础类型 ====================

export type RankingMode = 'score_based' | 'segment_based' | 'hybrid';

export type AdaptiveMode = 'static' | 'dynamic' | 'learning';

// ==================== 分数门槛接口 ====================

export interface ScoreThreshold {
    minScore: number;
    maxScore: number;
    // 改为二维数组：第一维是名次数量，第二维是该数量下的概率分布
    rankingProbabilities: {
        [rankCount: number]: number[]; // 例如: { 4: [0.4, 0.3, 0.2, 0.1], 8: [0.25, 0.2, 0.15, ...] }
    };
    priority: number;
    segmentName?: SegmentName;
}

export interface ScoreThresholdConfig {
    _id?: string;
    uid: string;
    segmentName: SegmentName;
    scoreThresholds: ScoreThreshold[];
    maxRank: number;
    adaptiveMode: AdaptiveMode;
    learningRate: number;
    autoAdjustLearningRate: boolean;
    rankingMode: RankingMode;
    createdAt: string;
    updatedAt: string;
}

// ==================== 玩家数据接口 ====================

export interface PlayerMatchRecord {
    _id?: string;
    matchId: string;
    uid: string;
    score: number;
    rank: number;
    points: number;
    segmentName: SegmentName;
    createdAt: string;
}

export interface PlayerPerformanceMetrics {
    _id?: string;
    uid: string;
    segmentName?: SegmentName;
    totalMatches: number;
    totalWins: number;
    totalLosses?: number;
    totalPoints?: number;
    totalScore: number;
    averageScore: number;
    currentWinStreak?: number;
    currentLoseStreak?: number;
    bestScore?: number;
    worstScore?: number;
    lastMatchScore?: number;
    lastMatchRank?: number;
    createdAt?: string;
    updatedAt?: string;
    lastUpdated?: string;
}

export interface PlayerProtectionStatus {
    _id?: string;
    uid: string;
    segmentName: SegmentName;
    protectionLevel: ProtectionLevel;
    protectionThreshold: number;
    demotionGracePeriod: number;
    promotionStabilityPeriod: number;
    lastSegmentChange: string;
    createdAt: string;
    updatedAt: string;
}

export interface SegmentChangeRecord {
    _id?: string;
    uid: string;
    oldSegment: SegmentName;
    newSegment: SegmentName;
    changeType: ChangeType;
    reason?: string;
    pointsConsumed?: number;
    matchId?: string;
    createdAt: string;
}

export interface PlayerPerformanceData {
    uid: string;
    segmentName: SegmentName;
    scoreThresholdConfig: ScoreThresholdConfig;
    performanceMetrics: PlayerPerformanceMetrics;
    protectionStatus: PlayerProtectionStatus;
    lastMatchId?: string;
    createdAt: string;
    updatedAt: string;
}

// ==================== 段位保护配置 ====================

export interface SegmentProtectionConfig {
    protectionThreshold: number;
    demotionGracePeriod: number;
    promotionStabilityPeriod: number;
    maxProtectionLevel: ProtectionLevel;
}

// ==================== 排名结果接口 ====================

export interface RankingResult {
    uid: string;
    rank: number;
    score: number;
    points: number;
    segmentName: SegmentName;
    rankingProbability: number;
    protectionActive: boolean;
    segmentChange?: {
        changeType: ChangeType;
        oldSegment: SegmentName;
        newSegment: SegmentName;
        reason: string;
    };
}

export interface MatchRankingResult {
    matchId: string;
    rankings: RankingResult[];
    segmentChanges: SegmentChangeRecord[];
    timestamp: string;
}

// ==================== 系统配置接口 ====================

export interface ScoreThresholdSystemConfig {
    enableAdaptiveRanking: boolean;
    enableSegmentIntegration: boolean;
    enableProtectionSystem: boolean;
    defaultLearningRate: number;
    maxLearningRate: number;
    minLearningRate: number;
    rankingUpdateInterval: number;
    protectionCheckInterval: number;
    segmentChangeThreshold: number;
}

// ==================== 统计接口 ====================

export interface SystemStatistics {
    totalPlayers: number;
    totalMatches: number;
    segmentDistribution: Record<SegmentName, number>;
    averageRankingAccuracy: number;
    protectionUsageRate: number;
    segmentChangeRate: number;
    timestamp: string;
}

// ==================== 事件接口 ====================

export interface ScoreThresholdEvent {
    type: 'ranking_update' | 'segment_change' | 'protection_activated' | 'config_update';
    uid: string;
    matchId?: string;
    oldData?: any;
    newData?: any;
    timestamp: string;
    metadata: Record<string, any>;
}

// ==================== 历史数据分析接口 ====================

export interface PlayerHistoricalData {
    uid: string;
    matchHistory: PlayerMatchRecord[];
    performanceMetrics: PlayerPerformanceMetrics;
    learningPatterns: LearningPatterns;
    rankingHistory: RankingHistory[];
    segmentProgression: SegmentProgression;
}

export interface LearningPatterns {
    adaptationSpeed: number;        // 适应速度 (0-1)
    volatilityIndex: number;        // 波动指数 (0-1)
    consistencyScore: number;       // 一致性分数 (0-1)
    improvementTrend: number;       // 改进趋势 (-1 到 1)
    lastLearningRate: number;       // 上次学习率
    learningEfficiency: number;     // 学习效率 (0-1)
}

export interface RankingHistory {
    matchId: string;
    rank: number;
    totalParticipants: number;
    score: number;
    timestamp: string;
    rankingMode: RankingMode;
    probability: number;
}

export interface SegmentProgression {
    currentSegment: SegmentName;
    previousSegments: SegmentName[];
    promotionHistory: Array<{ from: SegmentName; to: SegmentName; timestamp: string }>;
    demotionHistory: Array<{ from: SegmentName; to: SegmentName; timestamp: string }>;
    stabilityPeriod: number;
}

// ==================== 智能体验管理接口 ====================

export interface EmotionalState {
    confidence: number;             // 自信度 (0-1)
    frustration: number;            // 挫败感 (0-1)
    motivation: number;             // 动机水平 (0-1)
    satisfaction: number;           // 满意度 (0-1)
    overallState: 'encouraged' | 'challenged' | 'balanced' | 'frustrated';
}

export interface AIStrategy {
    difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
    behavior: 'supportive' | 'balanced' | 'challenging' | 'aggressive';
    scoreRange: { min: number; max: number };
    rankingBias: 'encouraging' | 'neutral' | 'challenging';
}

export interface ExperienceTarget {
    primary: 'encouragement' | 'challenge' | 'balance' | 'growth';
    secondary?: 'skill_development' | 'confidence_building' | 'motivation_maintenance';
    intensity: 'low' | 'medium' | 'high';
    duration: 'short' | 'medium' | 'long';
}

export interface IntelligentRankingStrategy {
    targetExperience: ExperienceTarget;
    rankingAdjustment: number[];    // 每个名次的调整因子
    aiStrategy: AIStrategy;
    learningRateAdjustment: number;
    immediateActions: string[];     // 即时行动建议
    learningMilestones: string[];   // 学习里程碑
    confidence: number;             // 策略置信度
}

// ==================== 学习曲线优化接口 ====================

export interface LearningCurveOptimization {
    currentSkillLevel: number;      // 当前技能水平 (0-1)
    targetSkillLevel: number;       // 目标技能水平 (0-1)
    challengeFrequency: number;     // 挑战频率 (0-1)
    successProbability: number;     // 成功概率 (0-1)
    learningPath: LearningMilestone[];
}

export interface LearningMilestone {
    skillLevel: number;
    challengeType: string;
    expectedDuration: number;
    successCriteria: string[];
}
