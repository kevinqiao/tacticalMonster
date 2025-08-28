/**
 * 分数门槛控制系统配置
 * 专注于系统级别的配置，段位相关配置统一在 tournamentConfigs.ts 中管理
 */

import { SegmentName } from '../../../segment/types';
import {
    AdaptiveMode,
    RankingMode,
    ScoreThreshold,
    ScoreThresholdConfig,
    ScoreThresholdSystemConfig
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

// ==================== 系统级默认配置 ====================

export const DEFAULT_RANKING_MODES: Record<SegmentName, RankingMode> = {
    bronze: 'score_based',
    silver: 'hybrid',
    gold: 'hybrid',
    platinum: 'segment_based',
    diamond: 'segment_based',
    master: 'segment_based',
    grandmaster: 'segment_based'
};

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

        // 检查rankingProbabilities对象是否为空
        const rankCounts = Object.keys(threshold.rankingProbabilities);
        if (rankCounts.length === 0) return false;

        // 验证每个名次数量的概率分布
        for (const rankCount of rankCounts) {
            const probabilities = threshold.rankingProbabilities[parseInt(rankCount)];
            if (!probabilities || probabilities.length === 0) return false;

            const sum = probabilities.reduce((a: number, b: number) => a + b, 0);
            if (Math.abs(sum - 1) > 0.01) return false; // 允许1%的误差
        }
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

/**
 * 创建玩家默认配置
 * 使用 tournamentConfigs.ts 中的配置
 */
export function createDefaultPlayerConfig(uid: string, segmentName: SegmentName): ScoreThresholdConfig {
    return {
        uid,
        segmentName,
        scoreThresholds: [], // 从 tournamentConfigs.ts 获取
        maxRank: 8, // 默认支持最多8名次
        adaptiveMode: getAdaptiveMode(segmentName),
        learningRate: SCORE_THRESHOLD_SYSTEM_CONFIG.defaultLearningRate,
        rankingMode: getRankingMode(segmentName),
        autoAdjustLearningRate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}
