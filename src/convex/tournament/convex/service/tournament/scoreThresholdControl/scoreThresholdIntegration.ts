/**
 * 分数门槛控制系统集成适配器
 * 提供与现有锦标赛系统的接口
 */

import { SegmentName } from '../../segment/types';
import { createDefaultHybridConfig, getHybridSegmentConfig } from './config';
import { ScoreThresholdPlayerController } from './ScoreThresholdPlayerController';
import { ScoreThresholdSystemController } from './ScoreThresholdSystemController';
import { ScoreThreshold, ScoreThresholdConfig } from './types';

export class ScoreThresholdIntegration {
    /**
     * 初始化玩家
     */
    static async initializePlayer(ctx: any, params: {
        uid: string;
        segmentName: SegmentName;
        useHybridMode?: boolean;
    }): Promise<ScoreThresholdConfig> {
        const playerController = new ScoreThresholdPlayerController(ctx);

        if (params.useHybridMode) {
            return await playerController.createPlayerDefaultConfig(params.uid, params.segmentName);
        } else {
            return await playerController.createPlayerDefaultConfig(params.uid, params.segmentName);
        }
    }

    /**
     * 记录比赛结果
     */
    static async recordMatchResult(ctx: any, params: {
        matchId: string;
        uid: string;
        score: number;
        rank: number;
        points: number;
    }): Promise<void> {
        const systemController = new ScoreThresholdSystemController(ctx);
        await systemController.processMatchEnd(params.matchId, [{
            uid: params.uid,
            score: params.score,
            points: params.points
        }]);
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
     * 结束比赛并生成AI分数
     */
    static async endMatch(ctx: any, params: {
        matchId: string;
        humanPlayerUid: string;
        humanScore: number;
        targetRank: number;
        aiPlayerCount: number;
    }): Promise<{ aiScores: number[]; finalRankings: Array<{ uid: string; score: number; rank: number }> }> {
        const systemController = new ScoreThresholdSystemController(ctx);

        // 生成AI分数
        const aiScores: number[] = [];
        for (let i = 0; i < params.aiPlayerCount; i++) {
            // 根据目标排名生成合适的AI分数
            let aiScore: number;
            if (params.targetRank === 1) {
                // 如果目标是第1名，AI分数应该低于人类分数
                aiScore = params.humanScore - (Math.random() * 500 + 100);
            } else {
                // 否则AI分数应该围绕人类分数分布
                aiScore = params.humanScore + (Math.random() * 1000 - 500);
            }
            aiScores.push(Math.max(0, aiScore));
        }

        // 处理比赛结束
        const allScores = [
            { uid: params.humanPlayerUid, score: params.humanScore, points: 0 },
            ...aiScores.map((score, index) => ({
                uid: `ai_player_${index}`,
                score,
                points: 0
            }))
        ];

        await systemController.processMatchEnd(params.matchId, allScores);

        // 生成最终排名
        const finalRankings = allScores
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                uid: player.uid,
                score: player.score,
                rank: index + 1
            }));

        return { aiScores, finalRankings };
    }

    /**
     * 获取活跃比赛
     */
    static async getActiveMatches(ctx: any): Promise<Array<{ matchId: string; uid: string; status: string }>> {
        // 这里应该查询数据库中的活跃比赛
        // 暂时返回空数组
        return [];
    }

    /**
     * 获取所有玩家
     */
    static async getAllPlayers(ctx: any): Promise<ScoreThresholdConfig[]> {
        // 这里应该查询数据库中的所有玩家配置
        // 暂时返回空数组
        return [];
    }

    /**
     * 重置系统
     */
    static async reset(ctx: any): Promise<void> {
        // 这里应该重置所有相关数据
        // 暂时不执行任何操作
        console.log('系统重置功能暂未实现');
    }

    // ==================== 配置管理方法 ====================

    /**
     * 创建混合模式配置
     */
    static createHybridModeConfig(playerUid: string, segmentName: SegmentName): ScoreThresholdConfig {
        return createDefaultHybridConfig(playerUid, segmentName);
    }

    /**
     * 创建段位升级配置
     */
    static createSegmentUpgradeConfig(playerUid: string, oldSegment: SegmentName, newSegment: SegmentName): ScoreThresholdConfig {
        const newConfig = createDefaultHybridConfig(playerUid, newSegment);

        // 可以在这里添加升级后的特殊配置
        return {
            ...newConfig,
            learningRate: newConfig.learningRate * 1.2, // 升级后提高学习率
            autoAdjustLearningRate: true
        };
    }

    /**
     * 比较段位配置
     */
    static compareSegmentConfigs(segment1: SegmentName, segment2: SegmentName): {
        segment1: { name: SegmentName; config: any };
        segment2: { name: SegmentName; config: any };
        differences: {
            learningRate: { difference: number; percentage: number };
            avgRank1Probability: { difference: number; percentage: number };
            protectionLevel: { difference: number; percentage: number };
        };
    } | null {
        try {
            const config1 = getHybridSegmentConfig(segment1);
            const config2 = getHybridSegmentConfig(segment2);

            const learningRateDiff = config2.learningRate - config1.learningRate;
            const learningRatePercentage = (learningRateDiff / config1.learningRate) * 100;

            const avgRank1Prob1 = config1.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config1.scoreThresholds.length;
            const avgRank1Prob2 = config2.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config2.scoreThresholds.length;
            const rank1ProbDiff = avgRank1Prob2 - avgRank1Prob1;
            const rank1ProbPercentage = (rank1ProbDiff / avgRank1Prob1) * 100;

            return {
                segment1: { name: segment1, config: config1 },
                segment2: { name: segment2, config: config2 },
                differences: {
                    learningRate: { difference: learningRateDiff, percentage: learningRatePercentage },
                    avgRank1Probability: { difference: rank1ProbDiff, percentage: rank1ProbPercentage },
                    protectionLevel: { difference: 0, percentage: 0 } // 暂时设为0
                }
            };
        } catch (error) {
            console.error('比较段位配置失败:', error);
            return null;
        }
    }

    /**
     * 验证分数门槛配置
     */
    static validateScoreThresholdConfig(config: ScoreThresholdConfig): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证分数门槛
        if (!config.scoreThresholds || config.scoreThresholds.length === 0) {
            errors.push('分数门槛配置不能为空');
        }

        // 验证概率总和
        for (const threshold of config.scoreThresholds || []) {
            const sum = threshold.rankingProbabilities.reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 1) > 0.01) {
                errors.push(`分数门槛 ${threshold.minScore}-${threshold.maxScore} 的概率总和不为1: ${sum}`);
            }
        }

        // 验证学习率范围
        if (config.learningRate < 0.01 || config.learningRate > 0.3) {
            warnings.push(`学习率 ${config.learningRate} 超出推荐范围 [0.01, 0.3]`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 批量更新玩家配置
     */
    static async batchUpdatePlayerConfigs(ctx: any, updates: Array<{
        uid: string;
        learningRate?: number;
        adaptiveMode?: any;
    }>): Promise<{
        success: boolean;
        failed: number;
        errors: Array<{ uid: string; error: string }>;
    }> {
        const playerController = new ScoreThresholdPlayerController(ctx);
        const errors: Array<{ uid: string; error: string }> = [];
        let failed = 0;

        for (const update of updates) {
            try {
                const adjustments: any = {};
                if (update.learningRate !== undefined) adjustments.learningRate = update.learningRate;
                if (update.adaptiveMode !== undefined) adjustments.adaptiveMode = update.adaptiveMode;

                const success = await playerController.adjustScoreThresholds(update.uid, adjustments);
                if (!success) {
                    failed++;
                    errors.push({ uid: update.uid, error: '配置更新失败' });
                }
            } catch (error) {
                failed++;
                errors.push({
                    uid: update.uid,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return {
            success: failed === 0,
            failed,
            errors
        };
    }

    /**
     * 获取系统状态
     */
    static async getSystemStatus(ctx: any): Promise<{
        totalPlayers: number;
        activeMatches: number;
        segmentDistribution: Record<string, number>;
        averageLearningRate: number;
        adaptiveModeEnabled: boolean;
    }> {
        // 这里应该查询数据库获取系统状态
        // 暂时返回默认值
        return {
            totalPlayers: 0,
            activeMatches: 0,
            segmentDistribution: {
                bronze: 0, silver: 0, gold: 0, platinum: 0,
                diamond: 0, master: 0, grandmaster: 0
            },
            averageLearningRate: 0.1,
            adaptiveModeEnabled: true
        };
    }
}
