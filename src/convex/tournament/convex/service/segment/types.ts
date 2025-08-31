/**
 * 段位系统类型定义
 * 提供清晰的接口和类型约束
 */

// ==================== 基础类型 ====================

export type SegmentName =
    | "bronze"
    | "silver"
    | "gold"
    | "platinum"
    | "diamond"
    | "master"
    | "grandmaster";

export type ChangeType = "promotion" | "demotion" | "none";

export type ProtectionLevel = 0 | 1 | 2 | 3;

// ==================== 段位规则接口 ====================

export interface SegmentRule {
    // 段位基本信息
    name: SegmentName;
    tier: number;
    color: string;
    icon: string;

    // 升级条件
    promotion: {
        pointsRequired: number;
        winRateRequired: number;
        stabilityPeriod: number;
        minMatches: number;
        consecutiveWinsRequired?: number;
    };

    // 降级条件
    demotion: {
        pointsThreshold: number;
        consecutiveLosses: number;
        gracePeriod: number;
        maxProtectionLevel: ProtectionLevel;
        winRateThreshold?: number;
    };

    // 排名概率配置
    rankingProbabilities: {
        [participantCount: number]: number[];  // 参与者数量 -> 排名概率数组
    };

    // 段位关系
    nextSegment: SegmentName | null;
    previousSegment: SegmentName | null;
}

// ==================== 玩家数据接口 ====================

export interface PlayerSegmentData {
    uid: string;
    currentSegment: SegmentName;
    points: number;
    totalMatches: number;
    totalWins: number;
    currentWinStreak: number;
    currentLoseStreak: number;
    lastMatchDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface PlayerProtectionData {
    uid: string;
    segmentName: SegmentName;
    protectionLevel: ProtectionLevel;
    gracePeriodRemaining: number;
    lastSegmentChange: string;
    createdAt: string;
    updatedAt: string;
}

export interface SegmentChangeRecord {
    uid: string;
    oldSegment: SegmentName;
    newSegment: SegmentName;
    changeType: ChangeType;
    pointsConsumed?: number;
    reason: string;
    createdAt: string;
}

// ==================== 检查结果接口 ====================

export interface PromotionCheckResult {
    shouldPromote: boolean;
    nextSegment: SegmentName | null;
    pointsConsumed: number;
    reason: string;
    missingRequirements: string[];
}

export interface DemotionCheckResult {
    shouldDemote: boolean;
    previousSegment: SegmentName | null;
    reason: string;
    protectionActive: boolean;
}

export interface StabilityCheckResult {
    stable: boolean;
    currentPeriod: number;
    requiredPeriod: number;
    progress: number; // 0-1 表示进度
}

export interface GracePeriodCheckResult {
    inGracePeriod: boolean;
    remainingGrace: number;
    daysRemaining: number;
}

// ==================== 段位变化结果接口 ====================

export interface SegmentChangeResult {
    changed: boolean;
    changeType: ChangeType;
    oldSegment: SegmentName;
    newSegment: SegmentName;
    pointsConsumed: number;
    message: string;
    reason: string;
    timestamp: string;
    protectionInfo?: {
        isProtected: boolean;
        protectionType: 'new_segment' | 'performance' | 'grace_period' | 'demotion_protection' | 'none';
        reason: string;
        remainingDays: number;
        protectionLevel: number;
    };
}

// ==================== 配置接口 ====================

export interface SegmentSystemConfig {
    enableProtection: boolean;
    enableGracePeriod: boolean;
    enableStabilityCheck: boolean;
    maxProtectionLevel: ProtectionLevel;
    defaultGracePeriod: number;
    defaultStabilityPeriod: number;
    pointsDecayRate: number;
    winStreakBonus: number;
    loseStreakPenalty: number;

    // 表现保护配置
    performanceProtectionMultiplier?: number;  // 积分表现保护倍数
    performanceProtectionDays?: number;        // 表现保护天数
    stabilityProtectionMultiplier?: number;   // 稳定性保护倍数
    stabilityProtectionDays?: number;         // 稳定性保护天数
}

// ==================== 统计接口 ====================

export interface SegmentStatistics {
    totalPlayers: number;
    segmentDistribution: Record<SegmentName, number>;
    averagePromotionTime: number;
    averageDemotionTime: number;
    protectionUsageRate: number;
    gracePeriodUsageRate: number;
}

// ==================== 事件接口 ====================

export interface SegmentEvent {
    type: "promotion" | "demotion" | "protection_activated" | "grace_period_started";
    uid: string;
    oldSegment: SegmentName;
    newSegment: SegmentName;
    timestamp: string;
    metadata: Record<string, any>;
}
