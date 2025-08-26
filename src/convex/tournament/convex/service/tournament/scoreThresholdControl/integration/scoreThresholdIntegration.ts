/**
 * 分数门槛控制系统集成适配器
 * 提供与现有锦标赛系统的接口
 */

import {
    DEFAULT_ADAPTIVE_MODES,
    DEFAULT_RANKING_MODES,
    DEFAULT_SCORE_THRESHOLDS,
    LEARNING_RATE_CONFIGS
} from "../config/config";
import { ScoreThreshold, ScoreThresholdConfig } from "../config/types";
import { ScoreThresholdPlayerController } from "../core/ScoreThresholdPlayerController";

export class ScoreThresholdIntegration {
    /**
     * 初始化玩家
     */
    static async initializePlayer(ctx: any, params: {
        uid: string;
        segmentName: string;
        useHybridMode?: boolean;
    }): Promise<ScoreThresholdConfig> {
        const playerController = new ScoreThresholdPlayerController(ctx);
        return await playerController.createPlayerDefaultConfig(params.uid, params.segmentName as any);
    }

    /**
  * 获取玩家统计信息
  */
    static async getPlayerStats(ctx: any, uid: string): Promise<{
        config: ScoreThresholdConfig | null;
        metrics: any;
        protectionStatus: any;
    } | null> {
        const playerController = new ScoreThresholdPlayerController(ctx);

        const config = await playerController.getPlayerConfig(uid);
        const metrics = await playerController.getPlayerPerformanceMetrics(uid);
        const protectionStatus = await playerController.getPlayerProtectionStatus(uid);

        if (!config) return null;

        return {
            config,
            metrics,
            protectionStatus
        };
    }

    /**
     * 调整分数门槛配置
     */
    static async adjustScoreThresholds(ctx: any, params: {
        uid: string;
        scoreThresholds: ScoreThreshold[];
        adaptiveMode?: any;
        learningRate?: number;
    }): Promise<boolean> {
        const playerController = new ScoreThresholdPlayerController(ctx);

        const adjustments: any = {};
        if (params.scoreThresholds) adjustments.scoreThresholds = params.scoreThresholds;
        if (params.adaptiveMode) adjustments.adaptiveMode = params.adaptiveMode;
        if (params.learningRate) adjustments.learningRate = params.learningRate;

        return await playerController.adjustScoreThresholds(params.uid, adjustments);
    }

    /**
     * 切换自适应模式
     */
    static async toggleAdaptiveMode(ctx: any, uid: string): Promise<void> {
        const playerController = new ScoreThresholdPlayerController(ctx);
        await playerController.toggleAdaptiveMode(uid);
    }

    /**
     * 创建混合模式配置
     */
    static createHybridModeConfig(uid: string, segmentName: string): ScoreThresholdConfig {
        const segmentConfig = DEFAULT_SCORE_THRESHOLDS[segmentName as keyof typeof DEFAULT_SCORE_THRESHOLDS];
        const adaptiveMode = DEFAULT_ADAPTIVE_MODES[segmentName as keyof typeof DEFAULT_ADAPTIVE_MODES];
        const rankingMode = DEFAULT_RANKING_MODES[segmentName as keyof typeof DEFAULT_RANKING_MODES];
        const learningRate = LEARNING_RATE_CONFIGS[segmentName as keyof typeof LEARNING_RATE_CONFIGS];

        return {
            uid,
            segmentName: segmentName as any,
            scoreThresholds: segmentConfig || [],
            maxRank: 8,
            adaptiveMode: adaptiveMode || 'learning',
            learningRate: learningRate || 0.1,
            autoAdjustLearningRate: true,
            rankingMode: rankingMode || 'hybrid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * 验证分数门槛配置
     */
    static validateScoreThresholdConfig(config: ScoreThresholdConfig): boolean {
        try {
            // 验证分数门槛配置的有效性
            if (!config.scoreThresholds || config.scoreThresholds.length === 0) {
                return false;
            }

            // 验证每个分数门槛的配置
            for (const threshold of config.scoreThresholds) {
                if (threshold.minScore >= threshold.maxScore) {
                    return false;
                }

                // 验证排名概率总和为1
                for (const rankCount in threshold.rankingProbabilities) {
                    const probabilities = threshold.rankingProbabilities[parseInt(rankCount)];
                    const sum = probabilities.reduce((acc: number, prob: number) => acc + prob, 0);
                    if (Math.abs(sum - 1) > 0.01) {
                        return false;
                    }
                }
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取段位配置摘要
     */
    static getSegmentConfigSummary(segmentName: string): {
        name: string;
        adaptiveMode: string;
        rankingMode: string;
        learningRate: number;
        maxRank: number;
    } {
        const adaptiveMode = DEFAULT_ADAPTIVE_MODES[segmentName as keyof typeof DEFAULT_ADAPTIVE_MODES] || 'learning';
        const rankingMode = DEFAULT_RANKING_MODES[segmentName as keyof typeof DEFAULT_RANKING_MODES] || 'hybrid';
        const learningRate = LEARNING_RATE_CONFIGS[segmentName as keyof typeof LEARNING_RATE_CONFIGS] || 0.1;

        return {
            name: segmentName,
            adaptiveMode,
            rankingMode,
            learningRate,
            maxRank: 8
        };
    }
}
