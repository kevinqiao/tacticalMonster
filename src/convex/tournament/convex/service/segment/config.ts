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
            pointsRequired: 1000,
            winRateRequired: 0.4,
            stabilityPeriod: 3,
            minMatches: 10,
            consecutiveWinsRequired: 2
        },
        demotion: {
            pointsThreshold: -200,
            consecutiveLosses: 5,
            gracePeriod: 5,
            maxProtectionLevel: 2,
            winRateThreshold: 0.3
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
            pointsRequired: 2500,
            winRateRequired: 0.45,
            stabilityPeriod: 3,
            minMatches: 15,
            consecutiveWinsRequired: 3
        },
        demotion: {
            pointsThreshold: -150,
            consecutiveLosses: 4,
            gracePeriod: 4,
            maxProtectionLevel: 2,
            winRateThreshold: 0.35
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
            pointsRequired: 5000,
            winRateRequired: 0.5,
            stabilityPeriod: 4,
            minMatches: 20,
            consecutiveWinsRequired: 3
        },
        demotion: {
            pointsThreshold: -100,
            consecutiveLosses: 3,
            gracePeriod: 3,
            maxProtectionLevel: 1,
            winRateThreshold: 0.4
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
            pointsRequired: 10000,
            winRateRequired: 0.55,
            stabilityPeriod: 5,
            minMatches: 25,
            consecutiveWinsRequired: 4
        },
        demotion: {
            pointsThreshold: -50,
            consecutiveLosses: 3,
            gracePeriod: 2,
            maxProtectionLevel: 1,
            winRateThreshold: 0.45
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
            pointsRequired: 20000,
            winRateRequired: 0.6,
            stabilityPeriod: 6,
            minMatches: 30,
            consecutiveWinsRequired: 4
        },
        demotion: {
            pointsThreshold: 0,
            consecutiveLosses: 5,
            gracePeriod: 3,
            maxProtectionLevel: 3,
            winRateThreshold: 0.5
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
            pointsRequired: 50000,
            winRateRequired: 0.65,
            stabilityPeriod: 8,
            minMatches: 40,
            consecutiveWinsRequired: 5
        },
        demotion: {
            pointsThreshold: 1000,
            consecutiveLosses: 3,
            gracePeriod: 2,
            maxProtectionLevel: 2,
            winRateThreshold: 0.55
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
            pointsRequired: 100000,
            winRateRequired: 0.7,
            stabilityPeriod: 10,
            minMatches: 50,
            consecutiveWinsRequired: 6
        },
        demotion: {
            pointsThreshold: 5000,
            consecutiveLosses: 2,
            gracePeriod: 1,
            maxProtectionLevel: 1,
            winRateThreshold: 0.6
        },
        nextSegment: null,
        previousSegment: "master"
    }
};

// ==================== 系统配置 ====================

export const SEGMENT_SYSTEM_CONFIG: SegmentSystemConfig = {
    enableProtection: true,
    enableGracePeriod: true,
    enableStabilityCheck: true,
    maxProtectionLevel: 3,
    defaultGracePeriod: 7,
    defaultStabilityPeriod: 5,
    pointsDecayRate: 0.1, // 每天衰减10%
    winStreakBonus: 50,   // 连胜奖励
    loseStreakPenalty: 25 // 连败惩罚
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
