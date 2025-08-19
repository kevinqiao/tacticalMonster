/**
 * 分数门槛控制系统配置
 * 整合段位系统和分数门槛系统的配置
 */

import { SegmentName } from '../../segment/types';
import {
    AdaptiveMode,
    RankingMode,
    ScoreThreshold,
    ScoreThresholdSystemConfig,
    SegmentProtectionConfig
} from './types';

// ==================== 系统配置 ====================

export const SCORE_THRESHOLD_SYSTEM_CONFIG: ScoreThresholdSystemConfig = {
    enableAdaptiveRanking: true,
    enableSegmentIntegration: true,
    enableProtectionSystem: true,
    defaultLearningRate: 0.1,
    maxLearningRate: 0.3,
    minLearningRate: 0.01,
    rankingUpdateInterval: 1000 * 60 * 5, // 5分钟
    protectionCheckInterval: 1000 * 60 * 10, // 10分钟
    segmentChangeThreshold: 0.8 // 80%概率触发段位变化
};

// ==================== 段位保护配置 ====================

export const SEGMENT_PROTECTION_CONFIGS: Record<SegmentName, SegmentProtectionConfig> = {
    bronze: {
        protectionThreshold: 3,
        demotionGracePeriod: 5,
        promotionStabilityPeriod: 3,
        maxProtectionLevel: 2
    },
    silver: {
        protectionThreshold: 4,
        demotionGracePeriod: 4,
        promotionStabilityPeriod: 4,
        maxProtectionLevel: 2
    },
    gold: {
        protectionThreshold: 5,
        demotionGracePeriod: 3,
        promotionStabilityPeriod: 5,
        maxProtectionLevel: 1
    },
    platinum: {
        protectionThreshold: 6,
        demotionGracePeriod: 2,
        promotionStabilityPeriod: 6,
        maxProtectionLevel: 1
    },
    diamond: {
        protectionThreshold: 7,
        demotionGracePeriod: 3,
        promotionStabilityPeriod: 7,
        maxProtectionLevel: 3
    },
    master: {
        protectionThreshold: 8,
        demotionGracePeriod: 2,
        promotionStabilityPeriod: 8,
        maxProtectionLevel: 2
    },
    grandmaster: {
        protectionThreshold: 10,
        demotionGracePeriod: 1,
        promotionStabilityPeriod: 10,
        maxProtectionLevel: 1
    }
};

// ==================== 默认分数门槛配置 ====================

export const DEFAULT_SCORE_THRESHOLDS: Record<SegmentName, ScoreThreshold[]> = {
    bronze: [
        {
            minScore: 0,
            maxScore: 1000,
            rankingProbabilities: [0.4, 0.3, 0.2, 0.1],
            priority: 1,
            segmentName: "bronze"
        }
    ],
    silver: [
        {
            minScore: 1000,
            maxScore: 2500,
            rankingProbabilities: [0.35, 0.3, 0.25, 0.1],
            priority: 2,
            segmentName: "silver"
        }
    ],
    gold: [
        {
            minScore: 2500,
            maxScore: 5000,
            rankingProbabilities: [0.3, 0.3, 0.3, 0.1],
            priority: 3,
            segmentName: "gold"
        }
    ],
    platinum: [
        {
            minScore: 5000,
            maxScore: 10000,
            rankingProbabilities: [0.25, 0.3, 0.3, 0.15],
            priority: 4,
            segmentName: "platinum"
        }
    ],
    diamond: [
        {
            minScore: 10000,
            maxScore: 20000,
            rankingProbabilities: [0.2, 0.3, 0.3, 0.2],
            priority: 5,
            segmentName: "diamond"
        }
    ],
    master: [
        {
            minScore: 20000,
            maxScore: 50000,
            rankingProbabilities: [0.15, 0.3, 0.3, 0.25],
            priority: 6,
            segmentName: "master"
        }
    ],
    grandmaster: [
        {
            minScore: 50000,
            maxScore: 100000,
            rankingProbabilities: [0.1, 0.3, 0.3, 0.3],
            priority: 7,
            segmentName: "grandmaster"
        }
    ]
};

// ==================== 默认排名概率配置 ====================

export const DEFAULT_RANKING_PROBABILITIES: Record<SegmentName, number[]> = {
    bronze: [0.4, 0.3, 0.2, 0.1],
    silver: [0.35, 0.3, 0.25, 0.1],
    gold: [0.3, 0.3, 0.3, 0.1],
    platinum: [0.25, 0.3, 0.3, 0.15],
    diamond: [0.2, 0.3, 0.3, 0.2],
    master: [0.15, 0.3, 0.3, 0.25],
    grandmaster: [0.1, 0.3, 0.3, 0.3]
};

// ==================== 学习率配置 ====================

export const LEARNING_RATE_CONFIGS: Record<SegmentName, number> = {
    bronze: 0.15,
    silver: 0.12,
    gold: 0.1,
    platinum: 0.08,
    diamond: 0.06,
    master: 0.04,
    grandmaster: 0.02
};

// ==================== 排名模式配置 ====================

export const DEFAULT_RANKING_MODES: Record<SegmentName, RankingMode> = {
    bronze: 'score_based',
    silver: 'hybrid',
    gold: 'hybrid',
    platinum: 'segment_based',
    diamond: 'segment_based',
    master: 'segment_based',
    grandmaster: 'segment_based'
};

// ==================== 自适应模式配置 ====================

export const DEFAULT_ADAPTIVE_MODES: Record<SegmentName, AdaptiveMode> = {
    bronze: 'static',
    silver: 'dynamic',
    gold: 'learning',
    platinum: 'learning',
    diamond: 'learning',
    master: 'learning',
    grandmaster: 'learning'
};

// ==================== 辅助函数 ====================

/**
 * 获取段位保护配置
 */
export function getSegmentProtectionConfig(segmentName: SegmentName): SegmentProtectionConfig {
    return SEGMENT_PROTECTION_CONFIGS[segmentName] || SEGMENT_PROTECTION_CONFIGS.bronze;
}

/**
 * 获取默认分数门槛
 */
export function getDefaultScoreThresholds(segmentName: SegmentName): ScoreThreshold[] {
    return DEFAULT_SCORE_THRESHOLDS[segmentName] || DEFAULT_SCORE_THRESHOLDS.bronze;
}

/**
 * 获取默认排名概率
 */
export function getDefaultRankingProbabilities(segmentName: SegmentName): number[] {
    return DEFAULT_RANKING_PROBABILITIES[segmentName] || DEFAULT_RANKING_PROBABILITIES.bronze;
}

/**
 * 获取学习率
 */
export function getLearningRate(segmentName: SegmentName): number {
    return LEARNING_RATE_CONFIGS[segmentName] || SCORE_THRESHOLD_SYSTEM_CONFIG.defaultLearningRate;
}

/**
 * 获取排名模式
 */
export function getRankingMode(segmentName: SegmentName): RankingMode {
    return DEFAULT_RANKING_MODES[segmentName] || 'hybrid';
}

/**
 * 获取自适应模式
 */
export function getAdaptiveMode(segmentName: SegmentName): AdaptiveMode {
    return DEFAULT_ADAPTIVE_MODES[segmentName] || 'dynamic';
}

/**
 * 验证分数门槛配置
 */
export function validateScoreThresholds(thresholds: ScoreThreshold[]): boolean {
    if (!thresholds || thresholds.length === 0) return false;

    for (const threshold of thresholds) {
        if (threshold.minScore >= threshold.maxScore) return false;
        if (threshold.rankingProbabilities.length === 0) return false;

        const sum = threshold.rankingProbabilities.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 0.01) return false; // 允许1%的误差
    }

    return true;
}

/**
 * 验证排名概率数组
 */
export function validateRankingProbabilities(probabilities: number[]): boolean {
    if (!probabilities || probabilities.length === 0) return false;

    const sum = probabilities.reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1) <= 0.01; // 允许1%的误差
}
