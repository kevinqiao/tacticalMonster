/**
 * 段位系统配置
 * 集中管理所有段位规则和系统配置
 */

import { SegmentName, SegmentRule, SegmentSystemConfig } from './types';

// ==================== 段位规则配置 ====================

export const SEGMENT_RULES: Record<SegmentName, SegmentRule> = {
    bronze: {
        name: "bronze",
        tier: 1,
        color: "#CD7F32",
        icon: "🥉",
        promotion: {
            pointsRequired: 1000
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.25, 0.25, 0.25, 0.25],      // 4人比赛：均等概率
            6: [0.20, 0.20, 0.20, 0.20, 0.10, 0.10],  // 6人比赛：前4名概率较高
            8: [0.18, 0.18, 0.18, 0.18, 0.12, 0.08, 0.05, 0.03]  // 8人比赛：前4名优势明显
        },
        nextSegment: "silver",
        previousSegment: null
    },

    silver: {
        name: "silver",
        tier: 2,
        color: "#C0C0C0",
        icon: "🥈",
        promotion: {
            pointsRequired: 2500
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.30, 0.25, 0.25, 0.20],      // 4人比赛：第1名优势
            6: [0.25, 0.22, 0.20, 0.18, 0.10, 0.05],  // 6人比赛：前3名优势
            8: [0.22, 0.20, 0.18, 0.16, 0.12, 0.08, 0.03, 0.01]  // 8人比赛：前4名优势
        },
        nextSegment: "gold",
        previousSegment: "bronze"
    },

    gold: {
        name: "gold",
        tier: 3,
        color: "#FFD700",
        icon: "🥇",
        promotion: {
            pointsRequired: 5000
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.35, 0.25, 0.25, 0.15],      // 4人比赛：第1名明显优势
            6: [0.30, 0.25, 0.20, 0.15, 0.07, 0.03],  // 6人比赛：前3名优势
            8: [0.28, 0.22, 0.18, 0.15, 0.10, 0.05, 0.01, 0.01]  // 8人比赛：前4名优势
        },
        nextSegment: "platinum",
        previousSegment: "silver"
    },

    platinum: {
        name: "platinum",
        tier: 4,
        color: "#E5E4E2",
        icon: "💎",
        promotion: {
            pointsRequired: 10000
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.40, 0.25, 0.20, 0.15],      // 4人比赛：第1名优势明显
            6: [0.35, 0.25, 0.20, 0.15, 0.04, 0.01],  // 6人比赛：前3名优势
            8: [0.32, 0.25, 0.18, 0.15, 0.08, 0.02, 0.00, 0.00]  // 8人比赛：前4名优势
        },
        nextSegment: "diamond",
        previousSegment: "gold"
    },

    diamond: {
        name: "diamond",
        tier: 5,
        color: "#B9F2FF",
        icon: "💠",
        promotion: {
            pointsRequired: 20000
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.45, 0.25, 0.20, 0.10],      // 4人比赛：第1名绝对优势
            6: [0.40, 0.25, 0.20, 0.12, 0.02, 0.01],  // 6人比赛：前3名优势
            8: [0.38, 0.25, 0.18, 0.15, 0.03, 0.01, 0.00, 0.00]  // 8人比赛：前4名优势
        },
        nextSegment: "master",
        previousSegment: "platinum"
    },

    master: {
        name: "master",
        tier: 6,
        color: "#FF6B6B",
        icon: "👑",
        promotion: {
            pointsRequired: 50000
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.50, 0.25, 0.15, 0.10],      // 4人比赛：第1名绝对优势
            6: [0.45, 0.25, 0.18, 0.10, 0.01, 0.01],  // 6人比赛：前3名优势
            8: [0.42, 0.25, 0.18, 0.12, 0.02, 0.01, 0.00, 0.00]  // 8人比赛：前4名优势
        },
        nextSegment: "grandmaster",
        previousSegment: "diamond"
    },

    grandmaster: {
        name: "grandmaster",
        tier: 7,
        color: "#9B59B6",
        icon: "🌟",
        promotion: {
            pointsRequired: 100000
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 0,
            gracePeriod: 0,
            maxProtectionLevel: 0,
            winRateThreshold: 0
        },
        rankingProbabilities: {
            4: [0.55, 0.25, 0.15, 0.05],      // 4人比赛：第1名绝对优势
            6: [0.50, 0.25, 0.15, 0.08, 0.01, 0.01],  // 6人比赛：前3名优势
            8: [0.48, 0.25, 0.15, 0.10, 0.01, 0.01, 0.00, 0.00]  // 8人比赛：前4名优势
        },
        nextSegment: null,
        previousSegment: "master"
    }
};

// ==================== 系统配置 ====================

export const SEGMENT_SYSTEM_CONFIG: SegmentSystemConfig = {
    enableProtection: false,
    enableGracePeriod: false,
    enableStabilityCheck: false, // 已禁用稳定期检查
    maxProtectionLevel: 0,
    defaultGracePeriod: 0,
    defaultStabilityPeriod: 0, // 已禁用稳定期
    pointsDecayRate: 0, // 无积分衰减
    winStreakBonus: 0,   // 已禁用连胜奖励
    loseStreakPenalty: 0, // 无连败惩罚

    // 表现保护配置（已禁用）
    performanceProtectionMultiplier: 1.0,  // 无保护倍数
    performanceProtectionDays: 0,           // 无保护天数
    stabilityProtectionMultiplier: 1.0,    // 无稳定性保护
    stabilityProtectionDays: 0             // 无稳定性保护天数
};

// ==================== 赛季重置配置 ====================

export const SEASON_RESET_CONFIG = {
    // 重置基准段位
    resetBaseSegment: "bronze" as SegmentName,

    // 重置后保留的积分比例
    pointsRetentionRate: 0.3, // 保留30%的积分

    // 重置后最低积分
    minRetainedPoints: 100,

    // 重置后最高积分（防止保留过多积分）
    maxRetainedPoints: 500,

    // 重置规则：根据当前段位决定重置后的段位
    resetRules: {
        bronze: "bronze",      // 青铜保持青铜
        silver: "bronze",      // 白银重置为青铜
        gold: "bronze",        // 黄金重置为青铜
        platinum: "silver",    // 铂金重置为白银
        diamond: "silver",     // 钻石重置为白银
        master: "gold",        // 大师重置为黄金
        grandmaster: "gold"    // 宗师重置为黄金
    }
};

// ==================== 段位颜色主题 ====================

export const SEGMENT_COLORS = {
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    gold: "#FFD700",
    platinum: "#E5E4E2",
    diamond: "#B9F2FF",
    master: "#FF6B6B",
    grandmaster: "#9B59B6"
} as const;

// ==================== 段位图标 ====================

export const SEGMENT_ICONS = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💎",
    diamond: "💠",
    master: "👑",
    grandmaster: "🌟"
} as const;

// ==================== 段位等级映射 ====================

export const SEGMENT_TIERS: Record<SegmentName, number> = {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
    diamond: 5,
    master: 6,
    grandmaster: 7
};

// ==================== 辅助函数 ====================

/**
 * 获取段位规则
 */
export function getSegmentRule(segmentName: SegmentName): SegmentRule | null {
    return SEGMENT_RULES[segmentName] || null;
}

/**
 * 获取所有段位名称
 */
export function getAllSegmentNames(): SegmentName[] {
    return Object.keys(SEGMENT_RULES) as SegmentName[];
}

/**
 * 获取段位等级
 */
export function getSegmentTier(segmentName: SegmentName): number {
    return SEGMENT_TIERS[segmentName] || 0;
}

/**
 * 获取段位颜色
 */
export function getSegmentColor(segmentName: SegmentName): string {
    return SEGMENT_COLORS[segmentName] || "#000000";
}

/**
 * 获取段位图标
 */
export function getSegmentIcon(segmentName: SegmentName): string {
    return SEGMENT_ICONS[segmentName] || "🏆";
}

/**
 * 获取段位升级所需积分
 */
export function getSegmentPointsRequired(segmentName: SegmentName): number {
    const rule = getSegmentRule(segmentName);
    return rule?.promotion.pointsRequired || 0;
}

/**
 * 检查是否可以升级
 */
export function canPromote(segmentName: SegmentName): boolean {
    const rule = getSegmentRule(segmentName);
    return rule?.nextSegment !== null;
}

/**
 * 检查是否可以降级
 */
export function canDemote(segmentName: SegmentName): boolean {
    const rule = getSegmentRule(segmentName);
    return rule?.previousSegment !== null;
}

/**
 * 获取下一个段位
 */
export function getNextSegment(segmentName: SegmentName): SegmentName | null {
    const rule = getSegmentRule(segmentName);
    return rule?.nextSegment || null;
}

/**
 * 获取上一个段位
 */
export function getPreviousSegment(segmentName: SegmentName): SegmentName | null {
    const rule = getSegmentRule(segmentName);
    return rule?.previousSegment || null;
}

/**
 * 获取段位路径（从当前段位到目标段位）
 */
export function getSegmentPath(from: SegmentName, to: SegmentName): SegmentName[] {
    const path: SegmentName[] = [];
    let current: SegmentName | null = from;

    while (current !== to && current !== null) {
        path.push(current);
        current = getNextSegment(current);
    }

    if (current === to) {
        path.push(to);
    }

    return path;
}

/**
 * 计算段位距离
 */
export function getSegmentDistance(from: SegmentName, to: SegmentName): number {
    const path = getSegmentPath(from, to);
    return path.length > 0 ? path.length - 1 : -1;
}

/**
 * 获取段位排名概率
 * @param segmentName 段位名称
 * @param participantCount 参与者数量
 * @returns 排名概率数组，如果配置不存在则返回默认概率
 */
export function getSegmentRankingProbabilitiesConfig(
    segmentName: SegmentName,
    participantCount: number
): number[] {
    const rule = getSegmentRule(segmentName);
    if (!rule?.rankingProbabilities?.[participantCount]) {
        // 返回默认概率：均等分布
        return new Array(participantCount).fill(1 / participantCount);
    }
    return rule.rankingProbabilities[participantCount];
}

/**
 * 获取所有支持的参与者数量
 */
export function getSupportedParticipantCounts(): number[] {
    return [4, 6, 8]; // 当前支持的参与者数量
}
