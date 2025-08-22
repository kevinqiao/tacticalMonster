/**
 * 分数门槛控制系统配置
 * 整合段位系统和分数门槛系统的配置
 */

import { SegmentName } from '../../../segment/types';
import {
    AdaptiveMode,
    RankingMode,
    ScoreThreshold,
    ScoreThresholdConfig,
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
            rankingProbabilities: {
                4: [0.25, 0.25, 0.25, 0.25],      // 4人比赛：平均分布
                6: [0.20, 0.20, 0.20, 0.20, 0.10, 0.10], // 6人比赛：前4名平均，后2名降低
                8: [0.18, 0.18, 0.18, 0.18, 0.12, 0.08, 0.05, 0.03] // 8人比赛：前4名平均，后4名递减
            },
            priority: 1,
            segmentName: "bronze"
        },
        {
            minScore: 1001,
            maxScore: 2000,
            rankingProbabilities: {
                4: [0.30, 0.30, 0.25, 0.15],
                6: [0.25, 0.25, 0.20, 0.15, 0.10, 0.05],
                8: [0.22, 0.22, 0.18, 0.15, 0.12, 0.06, 0.03, 0.02]
            },
            priority: 2,
            segmentName: "bronze"
        }
    ],
    silver: [
        {
            minScore: 0,
            maxScore: 2500,
            rankingProbabilities: {
                4: [0.35, 0.30, 0.25, 0.10],
                6: [0.30, 0.25, 0.20, 0.15, 0.08, 0.02],
                8: [0.25, 0.22, 0.18, 0.15, 0.12, 0.05, 0.02, 0.01]
            },
            priority: 1,
            segmentName: "silver"
        },
        {
            minScore: 2501,
            maxScore: 5000,
            rankingProbabilities: {
                4: [0.40, 0.30, 0.20, 0.10],
                6: [0.35, 0.25, 0.20, 0.12, 0.06, 0.02],
                8: [0.30, 0.25, 0.18, 0.15, 0.08, 0.03, 0.01, 0.00]
            },
            priority: 2,
            segmentName: "silver"
        }
    ],
    gold: [
        {
            minScore: 0,
            maxScore: 5000,
            rankingProbabilities: {
                4: [0.40, 0.30, 0.20, 0.10],
                6: [0.35, 0.25, 0.20, 0.12, 0.06, 0.02],
                8: [0.30, 0.25, 0.18, 0.15, 0.08, 0.03, 0.01, 0.00]
            },
            priority: 1,
            segmentName: "gold"
        },
        {
            minScore: 5001,
            maxScore: 10000,
            rankingProbabilities: {
                4: [0.45, 0.30, 0.18, 0.07],
                6: [0.40, 0.25, 0.18, 0.10, 0.05, 0.02],
                8: [0.35, 0.25, 0.18, 0.12, 0.06, 0.03, 0.01, 0.00]
            },
            priority: 2,
            segmentName: "gold"
        }
    ],
    platinum: [
        {
            minScore: 0,
            maxScore: 10000,
            rankingProbabilities: {
                4: [0.45, 0.30, 0.18, 0.07],
                6: [0.40, 0.25, 0.18, 0.10, 0.05, 0.02],
                8: [0.35, 0.25, 0.18, 0.12, 0.06, 0.03, 0.01, 0.00]
            },
            priority: 1,
            segmentName: "platinum"
        },
        {
            minScore: 10001,
            maxScore: 20000,
            rankingProbabilities: {
                4: [0.50, 0.30, 0.15, 0.05],
                6: [0.45, 0.25, 0.15, 0.08, 0.05, 0.02],
                8: [0.40, 0.25, 0.15, 0.10, 0.06, 0.03, 0.01, 0.00]
            },
            priority: 2,
            segmentName: "platinum"
        }
    ],
    diamond: [
        {
            minScore: 0,
            maxScore: 20000,
            rankingProbabilities: {
                4: [0.50, 0.30, 0.15, 0.05],
                6: [0.45, 0.25, 0.15, 0.08, 0.05, 0.02],
                8: [0.40, 0.25, 0.15, 0.10, 0.06, 0.03, 0.01, 0.00]
            },
            priority: 1,
            segmentName: "diamond"
        },
        {
            minScore: 20001,
            maxScore: 50000,
            rankingProbabilities: {
                4: [0.55, 0.30, 0.12, 0.03],
                6: [0.50, 0.25, 0.12, 0.08, 0.03, 0.02],
                8: [0.45, 0.25, 0.12, 0.08, 0.06, 0.03, 0.01, 0.00]
            },
            priority: 2,
            segmentName: "diamond"
        }
    ],
    master: [
        {
            minScore: 0,
            maxScore: 50000,
            rankingProbabilities: {
                4: [0.55, 0.30, 0.12, 0.03],
                6: [0.50, 0.25, 0.12, 0.08, 0.03, 0.02],
                8: [0.45, 0.25, 0.12, 0.08, 0.06, 0.03, 0.01, 0.00]
            },
            priority: 1,
            segmentName: "master"
        },
        {
            minScore: 50001,
            maxScore: 100000,
            rankingProbabilities: {
                4: [0.60, 0.30, 0.08, 0.02],
                6: [0.55, 0.25, 0.10, 0.06, 0.03, 0.01],
                8: [0.50, 0.25, 0.10, 0.06, 0.05, 0.03, 0.01, 0.00]
            },
            priority: 2,
            segmentName: "master"
        }
    ],
    grandmaster: [
        {
            minScore: 0,
            maxScore: 100000,
            rankingProbabilities: {
                4: [0.60, 0.30, 0.08, 0.02],
                6: [0.55, 0.25, 0.10, 0.06, 0.03, 0.01],
                8: [0.50, 0.25, 0.10, 0.06, 0.05, 0.03, 0.01, 0.00]
            },
            priority: 1,
            segmentName: "grandmaster"
        },
        {
            minScore: 100001,
            maxScore: 999999,
            rankingProbabilities: {
                4: [0.65, 0.25, 0.08, 0.02],
                6: [0.60, 0.25, 0.08, 0.05, 0.01, 0.01],
                8: [0.55, 0.25, 0.08, 0.05, 0.04, 0.02, 0.01, 0.00]
            },
            priority: 2,
            segmentName: "grandmaster"
        }
    ]
};

// ==================== 默认排名概率配置 ====================
// 已移除 DEFAULT_RANKING_PROBABILITIES，直接从 DEFAULT_SCORE_THRESHOLDS 获取

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

// ==================== 混合模式段位配置 ====================

export const HYBRID_SEGMENT_CONFIGS: Record<SegmentName, {
    scoreThresholds: ScoreThreshold[];
    adaptiveMode: AdaptiveMode;
    learningRate: number;
    maxRank: number;
}> = {
    bronze: {
        maxRank: 8, // 支持最多8名次
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 1000,
                rankingProbabilities: {
                    4: [0.15, 0.25, 0.35, 0.25],
                    6: [0.12, 0.20, 0.25, 0.25, 0.12, 0.06],
                    8: [0.10, 0.15, 0.20, 0.20, 0.15, 0.10, 0.06, 0.04]
                },
                priority: 1,
                segmentName: "bronze"
            },
            {
                minScore: 1001,
                maxScore: 2000,
                rankingProbabilities: {
                    4: [0.20, 0.30, 0.30, 0.20],
                    6: [0.15, 0.22, 0.25, 0.20, 0.12, 0.06],
                    8: [0.12, 0.18, 0.20, 0.18, 0.15, 0.10, 0.05, 0.02]
                },
                priority: 2,
                segmentName: "bronze"
            },
            {
                minScore: 2001,
                maxScore: 3000,
                rankingProbabilities: {
                    4: [0.25, 0.35, 0.25, 0.15],
                    6: [0.20, 0.25, 0.22, 0.18, 0.10, 0.05],
                    8: [0.15, 0.20, 0.18, 0.15, 0.12, 0.10, 0.06, 0.04]
                },
                priority: 3,
                segmentName: "bronze"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.05
    },
    silver: {
        maxRank: 8,
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 1500,
                rankingProbabilities: {
                    4: [0.20, 0.30, 0.30, 0.20],
                    6: [0.15, 0.22, 0.25, 0.20, 0.12, 0.06],
                    8: [0.12, 0.18, 0.20, 0.18, 0.15, 0.10, 0.05, 0.02]
                },
                priority: 1,
                segmentName: "silver"
            },
            {
                minScore: 1501,
                maxScore: 2500,
                rankingProbabilities: {
                    4: [0.25, 0.35, 0.25, 0.15],
                    6: [0.20, 0.25, 0.22, 0.18, 0.10, 0.05],
                    8: [0.15, 0.20, 0.18, 0.15, 0.12, 0.10, 0.06, 0.04]
                },
                priority: 2,
                segmentName: "silver"
            },
            {
                minScore: 2501,
                maxScore: 3500,
                rankingProbabilities: {
                    4: [0.30, 0.35, 0.20, 0.15],
                    6: [0.25, 0.28, 0.20, 0.15, 0.08, 0.04],
                    8: [0.20, 0.22, 0.18, 0.15, 0.10, 0.08, 0.05, 0.02]
                },
                priority: 3,
                segmentName: "silver"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.08
    },
    gold: {
        maxRank: 8,
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 2000,
                rankingProbabilities: {
                    4: [0.25, 0.35, 0.25, 0.15],
                    6: [0.20, 0.25, 0.22, 0.18, 0.10, 0.05],
                    8: [0.15, 0.20, 0.18, 0.15, 0.12, 0.10, 0.06, 0.04]
                },
                priority: 1,
                segmentName: "gold"
            },
            {
                minScore: 2001,
                maxScore: 3000,
                rankingProbabilities: {
                    4: [0.30, 0.35, 0.20, 0.15],
                    6: [0.25, 0.28, 0.20, 0.15, 0.08, 0.04],
                    8: [0.20, 0.22, 0.18, 0.15, 0.10, 0.08, 0.05, 0.02]
                },
                priority: 2,
                segmentName: "gold"
            },
            {
                minScore: 3001,
                maxScore: 4000,
                rankingProbabilities: {
                    4: [0.35, 0.30, 0.20, 0.15],
                    6: [0.30, 0.25, 0.18, 0.15, 0.08, 0.04],
                    8: [0.25, 0.22, 0.18, 0.12, 0.10, 0.08, 0.04, 0.01]
                },
                priority: 3,
                segmentName: "gold"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.12
    },
    platinum: {
        maxRank: 8,
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 2500,
                rankingProbabilities: {
                    4: [0.30, 0.35, 0.20, 0.15],
                    6: [0.25, 0.28, 0.20, 0.15, 0.08, 0.04],
                    8: [0.20, 0.22, 0.18, 0.15, 0.10, 0.08, 0.05, 0.02]
                },
                priority: 1,
                segmentName: "platinum"
            },
            {
                minScore: 2501,
                maxScore: 3500,
                rankingProbabilities: {
                    4: [0.35, 0.30, 0.20, 0.15],
                    6: [0.30, 0.25, 0.18, 0.15, 0.08, 0.04],
                    8: [0.25, 0.22, 0.18, 0.12, 0.10, 0.08, 0.04, 0.01]
                },
                priority: 2,
                segmentName: "platinum"
            },
            {
                minScore: 3501,
                maxScore: 4500,
                rankingProbabilities: {
                    4: [0.40, 0.30, 0.20, 0.10],
                    6: [0.35, 0.25, 0.18, 0.12, 0.07, 0.03],
                    8: [0.30, 0.22, 0.18, 0.12, 0.08, 0.06, 0.03, 0.01]
                },
                priority: 3,
                segmentName: "platinum"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.15
    },
    diamond: {
        maxRank: 8,
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 3000,
                rankingProbabilities: {
                    4: [0.35, 0.35, 0.20, 0.10],
                    6: [0.30, 0.28, 0.18, 0.12, 0.08, 0.04],
                    8: [0.25, 0.22, 0.18, 0.12, 0.10, 0.08, 0.04, 0.01]
                },
                priority: 1,
                segmentName: "diamond"
            },
            {
                minScore: 3001,
                maxScore: 4000,
                rankingProbabilities: {
                    4: [0.40, 0.30, 0.20, 0.10],
                    6: [0.35, 0.25, 0.18, 0.12, 0.07, 0.03],
                    8: [0.30, 0.22, 0.18, 0.12, 0.08, 0.06, 0.03, 0.01]
                },
                priority: 2,
                segmentName: "diamond"
            },
            {
                minScore: 4001,
                maxScore: 5000,
                rankingProbabilities: {
                    4: [0.45, 0.30, 0.15, 0.10],
                    6: [0.40, 0.25, 0.15, 0.10, 0.07, 0.03],
                    8: [0.35, 0.22, 0.15, 0.10, 0.08, 0.06, 0.03, 0.01]
                },
                priority: 3,
                segmentName: "diamond"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.18
    },
    master: {
        maxRank: 8,
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 4000,
                rankingProbabilities: {
                    4: [0.40, 0.35, 0.15, 0.10],
                    6: [0.35, 0.28, 0.15, 0.12, 0.07, 0.03],
                    8: [0.30, 0.22, 0.15, 0.12, 0.10, 0.08, 0.02, 0.01]
                },
                priority: 1,
                segmentName: "master"
            },
            {
                minScore: 4001,
                maxScore: 6000,
                rankingProbabilities: {
                    4: [0.45, 0.30, 0.15, 0.10],
                    6: [0.40, 0.25, 0.15, 0.10, 0.07, 0.03],
                    8: [0.35, 0.22, 0.15, 0.10, 0.08, 0.06, 0.03, 0.01]
                },
                priority: 2,
                segmentName: "master"
            },
            {
                minScore: 6001,
                maxScore: 8000,
                rankingProbabilities: {
                    4: [0.50, 0.30, 0.15, 0.05],
                    6: [0.45, 0.25, 0.15, 0.10, 0.03, 0.02],
                    8: [0.40, 0.22, 0.15, 0.10, 0.08, 0.03, 0.01, 0.01]
                },
                priority: 3,
                segmentName: "master"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.20
    },
    grandmaster: {
        maxRank: 8,
        scoreThresholds: [
            {
                minScore: 0,
                maxScore: 5000,
                rankingProbabilities: {
                    4: [0.45, 0.35, 0.15, 0.05],
                    6: [0.40, 0.28, 0.15, 0.10, 0.01, 0.01],
                    8: [0.35, 0.22, 0.15, 0.10, 0.08, 0.06, 0.02, 0.02]
                },
                priority: 1,
                segmentName: "grandmaster"
            },
            {
                minScore: 5001,
                maxScore: 8000,
                rankingProbabilities: {
                    4: [0.50, 0.30, 0.15, 0.05],
                    6: [0.45, 0.25, 0.15, 0.10, 0.03, 0.02],
                    8: [0.40, 0.22, 0.15, 0.10, 0.08, 0.03, 0.01, 0.01]
                },
                priority: 2,
                segmentName: "grandmaster"
            },
            {
                minScore: 8001,
                maxScore: 10000,
                rankingProbabilities: {
                    4: [0.55, 0.30, 0.10, 0.05],
                    6: [0.50, 0.25, 0.12, 0.08, 0.03, 0.02],
                    8: [0.45, 0.22, 0.12, 0.08, 0.08, 0.03, 0.01, 0.01]
                },
                priority: 3,
                segmentName: "grandmaster"
            }
        ],
        adaptiveMode: "learning",
        learningRate: 0.25
    }
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
export function getDefaultRankingProbabilities(segmentName: SegmentName, participantCount: number): number[] {
    const scoreThresholds = getDefaultScoreThresholds(segmentName);

    // 直接查找对应的概率配置
    for (const threshold of scoreThresholds) {
        if (threshold.rankingProbabilities[participantCount]) {
            return threshold.rankingProbabilities[participantCount];
        }
    }

    // 如果没有找到对应参与者数量的配置，使用第一个可用的
    const firstThreshold = scoreThresholds[0];
    if (firstThreshold && firstThreshold.rankingProbabilities[4]) {
        return firstThreshold.rankingProbabilities[4];
    }

    // 最后的后备方案
    return [0.25, 0.25, 0.25, 0.25];
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
 * 获取混合模式配置
 */
export function getHybridSegmentConfig(segmentName: SegmentName) {
    return HYBRID_SEGMENT_CONFIGS[segmentName] || HYBRID_SEGMENT_CONFIGS.bronze;
}

/**
 * 获取混合模式分数门槛
 */
export function getHybridScoreThresholds(segmentName: SegmentName): ScoreThreshold[] {
    const config = getHybridSegmentConfig(segmentName);
    return config.scoreThresholds;
}

/**
 * 获取混合模式最大名次
 */
export function getHybridMaxRank(segmentName: SegmentName): number {
    const config = getHybridSegmentConfig(segmentName);
    return config.maxRank;
}

/**
 * 获取混合模式自适应模式
 */
export function getHybridAdaptiveMode(segmentName: SegmentName): AdaptiveMode {
    const config = getHybridSegmentConfig(segmentName);
    return config.adaptiveMode;
}

/**
 * 获取混合模式学习率
 */
export function getHybridLearningRate(segmentName: SegmentName): number {
    const config = getHybridSegmentConfig(segmentName);
    return config.learningRate;
}

/**
 * 创建玩家默认混合配置
 */
export function createDefaultHybridConfig(uid: string, segmentName: SegmentName): ScoreThresholdConfig {
    const hybridConfig = getHybridSegmentConfig(segmentName);

    return {
        uid,
        segmentName,
        scoreThresholds: hybridConfig.scoreThresholds,
        maxRank: hybridConfig.maxRank,
        adaptiveMode: hybridConfig.adaptiveMode,
        learningRate: hybridConfig.learningRate,
        rankingMode: getRankingMode(segmentName),
        autoAdjustLearningRate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}
