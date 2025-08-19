/**
 * 分数门槛控制系统类型定义
 * 整合段位系统和分数门槛系统的类型
 */

import { ChangeType, ProtectionLevel, SegmentName } from '../../segment/types';

// ==================== 基础类型 ====================

export type RankingMode = 'score_based' | 'segment_based' | 'hybrid';

export type AdaptiveMode = 'static' | 'dynamic' | 'learning';

// ==================== 分数门槛接口 ====================

export interface ScoreThreshold {
    minScore: number;           // 最小分数
    maxScore: number;           // 最大分数
    rankingProbabilities: number[]; // 动态名次概率数组 [rank1Prob, rank2Prob, ..., rankNProb]
    priority: number;           // 优先级（数字越大优先级越高）
    segmentName?: SegmentName;  // 关联段位
}

export interface ScoreThresholdConfig {
    uid: string;
    segmentName: SegmentName;
    scoreThresholds: ScoreThreshold[];
    baseRankingProbability: number[]; // 动态名次概率数组
    maxRank: number;            // 最大名次数量
    adaptiveMode: AdaptiveMode; // 自适应模式
    learningRate: number;       // 学习率 (0.01-0.3)
    autoAdjustLearningRate: boolean; // 是否自动调整学习率
    rankingMode: RankingMode;   // 排名模式
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
    uid: string;
    segmentName: SegmentName;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    totalPoints: number;
    averageScore: number;
    currentWinStreak: number;
    currentLoseStreak: number;
    bestScore: number;
    worstScore: number;
    lastUpdated: string;
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
