/**
 * 分数门槛控制系统集成适配器
 * 提供与现有锦标赛系统的接口
 */

import { HYBRID_SEGMENT_CONFIGS, PlayerPerformanceData, PlayerScoreThresholdConfig, ScoreThreshold, scoreThresholdController } from './scoreThresholdRankingController';

export class ScoreThresholdIntegration {
    /**
     * 初始化玩家
     */
    static async initializePlayer(ctx: any, params: {
        uid: string;
        segmentName: string;
        useHybridMode?: boolean;
    }): Promise<PlayerPerformanceData> {
        return await scoreThresholdController.initializePlayer(ctx, params);
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
        await scoreThresholdController.recordMatchResult(ctx, params);
    }

    /**
     * 获取玩家统计信息
     */
    static async getPlayerStats(ctx: any, uid: string): Promise<PlayerPerformanceData | null> {
        return await scoreThresholdController.getPlayerStats(ctx, uid);
    }

    /**
     * 调整分数门槛配置
     */
    static async adjustScoreThresholds(ctx: any, params: {
        uid: string;
        scoreThresholds: ScoreThreshold[];
        adaptiveMode?: boolean;
        learningRate?: number;
    }): Promise<void> {
        await scoreThresholdController.adjustScoreThresholds(ctx, params);
    }

    /**
     * 切换自适应模式
     */
    static async toggleAdaptiveMode(ctx: any, uid: string): Promise<void> {
        await scoreThresholdController.toggleAdaptiveMode(ctx, uid);
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
        return await scoreThresholdController.endMatch(ctx, params);
    }

    /**
     * 获取活跃比赛
     */
    static async getActiveMatches(ctx: any): Promise<Array<{ matchId: string; uid: string; status: string }>> {
        return await scoreThresholdController.getActiveMatches(ctx);
    }

    /**
     * 获取所有玩家
     */
    static async getAllPlayers(ctx: any): Promise<PlayerPerformanceData[]> {
        return await scoreThresholdController.getAllPlayers(ctx);
    }

    /**
     * 重置系统
     */
    static async reset(ctx: any): Promise<void> {
        await scoreThresholdController.reset(ctx);
    }

    // ==================== 配置管理方法 ====================

    /**
     * 创建混合模式配置
     */
    static createHybridModeConfig(playerUid: string, segmentName: string): PlayerScoreThresholdConfig {
        const hybridConfig = HYBRID_SEGMENT_CONFIGS[segmentName];
        if (!hybridConfig) {
            throw new Error(`段位 ${segmentName} 不支持混合模式`);
        }

        const nowISO = new Date().toISOString();
        return {
            uid: playerUid,
            segmentName,
            scoreThresholds: hybridConfig.scoreThresholds,
            baseRankingProbability: this.calculateBaseProbability(hybridConfig.scoreThresholds),
            maxRank: hybridConfig.maxRank,
            adaptiveMode: hybridConfig.adaptiveMode,
            learningRate: hybridConfig.learningRate,
            autoAdjustLearningRate: true,
            createdAt: nowISO,
            updatedAt: nowISO
        };
    }

    /**
     * 创建段位升级配置
     */
    static createSegmentUpgradeConfig(playerUid: string, oldSegment: string, newSegment: string): PlayerScoreThresholdConfig {
        const newSegmentConfig = HYBRID_SEGMENT_CONFIGS[newSegment];
        if (!newSegmentConfig) {
            throw new Error(`段位 ${newSegment} 不支持混合模式`);
        }

        const nowISO = new Date().toISOString();
        return {
            uid: playerUid,
            segmentName: newSegment,
            scoreThresholds: newSegmentConfig.scoreThresholds,
            baseRankingProbability: this.calculateBaseProbability(newSegmentConfig.scoreThresholds),
            maxRank: newSegmentConfig.maxRank,
            adaptiveMode: newSegmentConfig.adaptiveMode,
            learningRate: newSegmentConfig.learningRate,
            autoAdjustLearningRate: true,
            createdAt: nowISO,
            updatedAt: nowISO
        };
    }

    /**
     * 获取段位配置信息
     */
    static getSegmentConfigInfo(segmentName: string): {
        scoreThresholds: ScoreThreshold[];
        adaptiveMode: boolean;
        learningRate: number;
        protectionConfig: {
            protectionThreshold: number;
            demotionGracePeriod: number;
            promotionStabilityPeriod: number;
            maxProtectionLevel: number;
        };
    } | null {
        const hybridConfig = HYBRID_SEGMENT_CONFIGS[segmentName];
        if (!hybridConfig) {
            return null;
        }

        // 这里需要导入 SEGMENT_CONFIGS，暂时返回默认值
        const protectionConfig = {
            protectionThreshold: 5,
            demotionGracePeriod: 7,
            promotionStabilityPeriod: 5,
            maxProtectionLevel: 3
        };

        return {
            scoreThresholds: hybridConfig.scoreThresholds,
            adaptiveMode: hybridConfig.adaptiveMode,
            learningRate: hybridConfig.learningRate,
            protectionConfig
        };
    }

    /**
     * 比较段位配置
     */
    static compareSegmentConfigs(segment1: string, segment2: string): {
        segment1: string;
        segment2: string;
        differences: {
            learningRate: { segment1: number; segment2: number; difference: number };
            avgRank1Probability: { segment1: number; segment2: number; difference: number };
            protectionLevel: { segment1: number; segment2: number; difference: number };
        };
    } | null {
        const config1 = this.getSegmentConfigInfo(segment1);
        const config2 = this.getSegmentConfigInfo(segment2);

        if (!config1 || !config2) {
            return null;
        }

        const avgRank1Prob1 = config1.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config1.scoreThresholds.length;
        const avgRank1Prob2 = config2.scoreThresholds.reduce((sum, t) => sum + t.rankingProbabilities[0], 0) / config2.scoreThresholds.length;

        return {
            segment1,
            segment2,
            differences: {
                learningRate: {
                    segment1: config1.learningRate,
                    segment2: config2.learningRate,
                    difference: config2.learningRate - config1.learningRate
                },
                avgRank1Probability: {
                    segment1: avgRank1Prob1,
                    segment2: avgRank1Prob2,
                    difference: avgRank1Prob2 - avgRank1Prob1
                },
                protectionLevel: {
                    segment1: config1.protectionConfig.maxProtectionLevel,
                    segment2: config2.protectionConfig.maxProtectionLevel,
                    difference: config2.protectionConfig.maxProtectionLevel - config1.protectionConfig.maxProtectionLevel
                }
            }
        };
    }

    /**
     * 验证分数门槛配置
     */
    static validateScoreThresholdConfig(config: PlayerScoreThresholdConfig): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证基本字段
        if (!config.uid) {
            errors.push("玩家UID不能为空");
        }

        if (!config.segmentName) {
            errors.push("段位名称不能为空");
        }

        if (!config.scoreThresholds || config.scoreThresholds.length === 0) {
            errors.push("分数门槛配置不能为空");
        }

        // 验证分数门槛
        if (config.scoreThresholds) {
            for (let i = 0; i < config.scoreThresholds.length; i++) {
                const threshold = config.scoreThresholds[i];

                if (threshold.minScore >= threshold.maxScore) {
                    errors.push(`分数门槛 ${i + 1}: 最小分数必须小于最大分数`);
                }

                const totalProbability = threshold.rankingProbabilities.reduce((sum, prob) => sum + prob, 0);

                if (Math.abs(totalProbability - 1.0) > 0.01) {
                    errors.push(`分数门槛 ${i + 1}: 概率总和必须等于1.0 (当前: ${totalProbability})`);
                }

                if (threshold.priority <= 0) {
                    errors.push(`分数门槛 ${i + 1}: 优先级必须大于0`);
                }
            }

            // 检查分数门槛重叠
            const sortedThresholds = [...config.scoreThresholds].sort((a, b) => a.minScore - b.minScore);
            for (let i = 0; i < sortedThresholds.length - 1; i++) {
                if (sortedThresholds[i].maxScore >= sortedThresholds[i + 1].minScore) {
                    warnings.push(`分数门槛 ${i + 1} 和 ${i + 2} 存在重叠`);
                }
            }
        }

        // 验证学习率
        if (config.learningRate < 0.01 || config.learningRate > 0.3) {
            errors.push("学习率必须在0.01到0.3之间");
        }

        // 验证自适应模式
        if (config.adaptiveMode && config.learningRate === 0) {
            warnings.push("启用自适应模式时，建议设置适当的学习率");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 计算基础概率
     */
    private static calculateBaseProbability(scoreThresholds: ScoreThreshold[]): number[] {
        // 按优先级排序
        const sortedThresholds = [...scoreThresholds].sort((a, b) => b.priority - a.priority);

        // 使用最高优先级的配置作为基础概率
        const baseThreshold = sortedThresholds[0];

        // 返回动态长度的概率数组
        return [...baseThreshold.rankingProbabilities];
    }

    /**
     * 获取系统状态概览
     */
    static async getSystemStatus(ctx: any): Promise<{
        totalPlayers: number;
        activeMatches: number;
        segmentDistribution: Record<string, number>;
        averageLearningRate: number;
        adaptiveModeEnabled: number;
    }> {
        const allPlayers = await this.getAllPlayers(ctx);
        const activeMatches = await this.getActiveMatches(ctx);

        const segmentDistribution: Record<string, number> = {};
        let totalLearningRate = 0;
        let adaptiveModeCount = 0;

        for (const player of allPlayers) {
            // 统计段位分布
            const segment = player.segmentName;
            segmentDistribution[segment] = (segmentDistribution[segment] || 0) + 1;

            // 统计学习率
            totalLearningRate += player.scoreThresholdConfig.learningRate;

            // 统计自适应模式
            if (player.scoreThresholdConfig.adaptiveMode) {
                adaptiveModeCount++;
            }
        }

        return {
            totalPlayers: allPlayers.length,
            activeMatches: activeMatches.length,
            segmentDistribution,
            averageLearningRate: allPlayers.length > 0 ? totalLearningRate / allPlayers.length : 0,
            adaptiveModeEnabled: adaptiveModeCount
        };
    }

    /**
     * 批量更新玩家配置
     */
    static async batchUpdatePlayerConfigs(ctx: any, updates: Array<{
        uid: string;
        scoreThresholds?: ScoreThreshold[];
        adaptiveMode?: boolean;
        learningRate?: number;
    }>): Promise<{
        success: number;
        failed: number;
        errors: Array<{ uid: string; error: string }>;
    }> {
        let success = 0;
        let failed = 0;
        const errors: Array<{ uid: string; error: string }> = [];

        for (const update of updates) {
            try {
                if (update.scoreThresholds) {
                    await this.adjustScoreThresholds(ctx, {
                        uid: update.uid,
                        scoreThresholds: update.scoreThresholds,
                        adaptiveMode: update.adaptiveMode,
                        learningRate: update.learningRate
                    });
                } else if (update.adaptiveMode !== undefined || update.learningRate !== undefined) {
                    if (update.adaptiveMode !== undefined) {
                        await this.toggleAdaptiveMode(ctx, update.uid);
                    }
                    if (update.learningRate !== undefined) {
                        await this.adjustScoreThresholds(ctx, {
                            uid: update.uid,
                            scoreThresholds: [],
                            learningRate: update.learningRate
                        });
                    }
                }
                success++;
            } catch (error) {
                failed++;
                errors.push({
                    uid: update.uid,
                    error: error instanceof Error ? error.message : '未知错误'
                });
            }
        }

        return { success, failed, errors };
    }
}
