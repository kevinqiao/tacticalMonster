/**
 * 分数门槛控制玩家级控制器
 * 专注于玩家级操作：配置管理、个人统计、保护状态等
 * 与ScoreThresholdSystemController分工明确，避免功能重复
 */
import { canDemote, canPromote, getSegmentRule, getSegmentTier } from '../../segment/config';
import { SegmentManager } from '../../segment/SegmentManager';
import { ChangeType, SegmentName } from '../../segment/types';
import {
    createDefaultHybridConfig,
    getAdaptiveMode,
    getDefaultRankingProbabilities,
    getDefaultScoreThresholds,
    getLearningRate,
    getRankingMode,
    validateRankingProbabilities,
    validateScoreThresholds
} from './config';
import {
    AdaptiveMode,
    PlayerMatchRecord,
    PlayerPerformanceMetrics,
    PlayerProtectionStatus,
    RankingMode,
    ScoreThreshold,
    ScoreThresholdConfig
} from './types';

export interface DatabaseContext {
    db: any;
    auth: any;
}

export class ScoreThresholdPlayerController {
    private ctx: DatabaseContext;
    private segmentManager: SegmentManager;

    constructor(ctx: DatabaseContext) {
        this.ctx = ctx;
        this.segmentManager = new SegmentManager(ctx);
    }

    // ==================== 玩家级方法 ====================
    // 专注于：个人配置管理、个人统计查询、个人保护状态等

    /**
     * 获取玩家配置
     */
    async getPlayerConfig(uid: string): Promise<ScoreThresholdConfig | null> {
        try {
            const config = await this.ctx.db
                .query("player_score_threshold_configs")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            return config;
        } catch (error) {
            console.error(`获取玩家配置失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 更新玩家配置
     */
    async updatePlayerConfig(uid: string, updates: Partial<ScoreThresholdConfig>): Promise<boolean> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return false;

            // 验证更新后的配置
            if (updates.scoreThresholds && !validateScoreThresholds(updates.scoreThresholds)) {
                throw new Error("分数门槛配置无效");
            }

            if (updates.baseRankingProbability && !validateRankingProbabilities(updates.baseRankingProbability)) {
                throw new Error("排名概率配置无效");
            }

            const updatedConfig = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await this.ctx.db.patch(config._id, updatedConfig);
            return true;

        } catch (error) {
            console.error(`更新玩家配置失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 重置玩家配置为默认值
     */
    async resetPlayerConfig(uid: string): Promise<boolean> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return false;

            const segmentName = config.segmentName;
            const defaultConfig = {
                scoreThresholds: getDefaultScoreThresholds(segmentName),
                baseRankingProbability: getDefaultRankingProbabilities(segmentName),
                adaptiveMode: getAdaptiveMode(segmentName),
                learningRate: getLearningRate(segmentName),
                rankingMode: getRankingMode(segmentName),
                updatedAt: new Date().toISOString()
            };

            await this.ctx.db.patch(config._id, defaultConfig);
            return true;

        } catch (error) {
            console.error(`重置玩家配置失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 创建玩家默认配置
     */
    async createPlayerDefaultConfig(uid: string, segmentName?: SegmentName): Promise<ScoreThresholdConfig> {
        try {
            // 如果没有指定段位，获取玩家当前段位
            let targetSegmentName = segmentName;
            if (!targetSegmentName) {
                const segmentInfo = await this.getPlayerSegmentInfo(uid);
                targetSegmentName = segmentInfo?.currentSegment || 'bronze';
            }

            // 使用混合模式配置创建默认配置
            return createDefaultHybridConfig(uid, targetSegmentName);
        } catch (error) {
            console.error(`创建玩家默认配置失败: ${uid}`, error);
            // 返回基础配置作为后备
            const fallbackSegmentName = segmentName || 'bronze';
            return {
                uid,
                segmentName: fallbackSegmentName,
                scoreThresholds: getDefaultScoreThresholds(fallbackSegmentName),
                baseRankingProbability: getDefaultRankingProbabilities(fallbackSegmentName),
                maxRank: 4,
                adaptiveMode: 'static',
                learningRate: 0.1,
                rankingMode: 'hybrid',
                autoAdjustLearningRate: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * 获取混合模式配置
     */
    async getHybridConfig(uid: string): Promise<ScoreThresholdConfig | null> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return null;

            // 如果当前配置不是混合模式，转换为混合模式
            if (config.adaptiveMode !== 'learning' || config.rankingMode !== 'hybrid') {
                const hybridConfig = createDefaultHybridConfig(uid, config.segmentName);
                await this.updatePlayerConfig(uid, {
                    scoreThresholds: hybridConfig.scoreThresholds,
                    maxRank: hybridConfig.maxRank,
                    adaptiveMode: hybridConfig.adaptiveMode,
                    learningRate: hybridConfig.learningRate,
                    rankingMode: hybridConfig.rankingMode
                });
                return hybridConfig;
            }

            return config;
        } catch (error) {
            console.error(`获取混合模式配置失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 切换自适应模式
     */
    async toggleAdaptiveMode(uid: string): Promise<void> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return;

            // 在三种模式之间循环切换
            const modes: AdaptiveMode[] = ['static', 'dynamic', 'learning'];
            const currentIndex = modes.indexOf(config.adaptiveMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];

            await this.updatePlayerConfig(uid, { adaptiveMode: nextMode });
        } catch (error) {
            console.error(`切换自适应模式失败: ${uid}`, error);
        }
    }

    /**
     * 调整分数门槛
     */
    async adjustScoreThresholds(uid: string, adjustments: {
        scoreThresholds?: ScoreThreshold[];
        learningRate?: number;
        adaptiveMode?: AdaptiveMode;
    }): Promise<boolean> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return false;

            // 验证新的分数门槛
            if (adjustments.scoreThresholds && !validateScoreThresholds(adjustments.scoreThresholds)) {
                throw new Error('分数门槛配置无效');
            }

            // 更新配置
            await this.updatePlayerConfig(uid, adjustments);
            return true;
        } catch (error) {
            console.error(`调整分数门槛失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 获取玩家段位信息
     */
    async getPlayerSegmentInfo(uid: string): Promise<{ currentSegment: SegmentName; tier: number } | null> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return null;

            return {
                currentSegment: config.segmentName,
                tier: getSegmentTier(config.segmentName)
            };
        } catch (error) {
            console.error(`获取玩家段位信息失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 获取玩家性能指标
     */
    async getPlayerPerformanceMetrics(uid: string): Promise<PlayerPerformanceMetrics | null> {
        try {
            const metrics = await this.ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            return metrics;
        } catch (error) {
            console.error(`获取玩家性能指标失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 获取玩家保护状态
     */
    async getPlayerProtectionStatus(uid: string): Promise<PlayerProtectionStatus | null> {
        try {
            const protectionData = await this.ctx.db
                .query("player_protection_data")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!protectionData) return null;

            // 转换为PlayerProtectionStatus格式
            return {
                uid: protectionData.uid,
                segmentName: protectionData.segmentName,
                protectionLevel: protectionData.protectionLevel,
                protectionThreshold: 5, // 默认值
                demotionGracePeriod: 7, // 默认值
                promotionStabilityPeriod: 5, // 默认值
                lastSegmentChange: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error(`获取玩家保护状态失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 获取玩家比赛记录
     */
    async getPlayerMatchRecords(uid: string, limit: number = 20): Promise<PlayerMatchRecord[]> {
        try {
            const records = await this.ctx.db
                .query("player_match_records")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(limit);

            return records;
        } catch (error) {
            console.error(`获取玩家比赛记录失败: ${uid}`, error);
            return [];
        }
    }

    /**
     * 计算玩家胜率
     */
    async calculatePlayerWinRate(uid: string): Promise<number> {
        try {
            const metrics = await this.getPlayerPerformanceMetrics(uid);
            if (!metrics || metrics.totalMatches === 0) return 0;

            return metrics.totalWins / metrics.totalMatches;
        } catch (error) {
            console.error(`计算玩家胜率失败: ${uid}`, error);
            return 0;
        }
    }

    /**
     * 检查玩家是否可以升级
     */
    async canPlayerPromote(uid: string): Promise<boolean> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return false;

            const metrics = await this.getPlayerPerformanceMetrics(uid);
            if (!metrics) return false;

            const winRate = metrics.totalMatches > 0 ? metrics.totalWins / metrics.totalMatches : 0;
            const currentSegment = config.segmentName;

            // 使用配置检查升级条件
            return canPromote(currentSegment);
        } catch (error) {
            console.error(`检查玩家升级条件失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 检查玩家是否应该降级
     */
    async shouldPlayerDemote(uid: string): Promise<boolean> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return false;

            const metrics = await this.getPlayerPerformanceMetrics(uid);
            if (!metrics) return false;

            const segmentRule = getSegmentRule(config.segmentName);
            if (!segmentRule) return false;

            // 检查降级条件
            const shouldDemote = canDemote(config.segmentName) &&
                metrics.totalMatches >= segmentRule.promotion.minMatches && // 使用promotion.minMatches
                metrics.averageScore <= segmentRule.demotion.pointsThreshold &&
                metrics.currentLoseStreak >= segmentRule.demotion.consecutiveLosses;

            return shouldDemote;
        } catch (error) {
            console.error(`检查玩家降级条件失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 根据玩家分数获取相应名次
     * 这是玩家级操作，应该放在玩家级控制器中
     */
    async getRankByScore(
        uid: string,
        score: number,
        matchId?: string
    ): Promise<{
        rank: number;
        rankingProbability: number;
        segmentName: SegmentName;
        protectionActive: boolean;
        reason: string;
    }> {
        try {
            // 1. 获取玩家配置
            const config = await this.getPlayerConfig(uid);
            if (!config) {
                throw new Error(`玩家配置未找到: ${uid}`);
            }

            // 2. 计算排名概率
            const rankingProbability = this.calculateRankingProbability(
                score,
                config.scoreThresholds,
                config.rankingMode
            );

            // 3. 确定最终排名
            const rank = this.determineFinalRank(
                rankingProbability,
                config.baseRankingProbability,
                config.adaptiveMode,
                config.learningRate
            );

            // 4. 检查保护状态
            const protectionStatus = await this.getPlayerProtectionStatus(uid);
            const protectionActive = protectionStatus?.protectionLevel ? protectionStatus.protectionLevel > 0 : false;

            // 5. 生成排名原因
            const reason = this.generateRankReason(score, rank, config, rankingProbability);

            return {
                rank,
                rankingProbability,
                segmentName: config.segmentName,
                protectionActive,
                reason
            };

        } catch (error) {
            console.error(`获取玩家排名失败: ${uid}`, error);
            throw new Error(`排名计算失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 计算排名概率
     */
    private calculateRankingProbability(
        score: number,
        thresholds: ScoreThreshold[],
        rankingMode: RankingMode
    ): number {
        try {
            switch (rankingMode) {
                case 'score_based':
                    return this.calculateScoreBasedProbability(score, thresholds);
                case 'segment_based':
                    return this.calculateSegmentBasedProbability(score, thresholds);
                case 'hybrid':
                    return this.calculateHybridProbability(score, thresholds);
                default:
                    return this.calculateHybridProbability(score, thresholds);
            }
        } catch (error) {
            console.error('计算排名概率失败:', error);
            return 0.5; // 默认概率
        }
    }

    /**
     * 基于分数的概率计算
     */
    private calculateScoreBasedProbability(score: number, thresholds: ScoreThreshold[]): number {
        // 找到匹配的分数门槛
        const matchingThreshold = thresholds.find(t =>
            score >= t.minScore && score <= t.maxScore
        );

        if (!matchingThreshold) {
            return 0.5; // 默认概率
        }

        // 基于分数在范围内的位置计算概率
        const range = matchingThreshold.maxScore - matchingThreshold.minScore;
        const position = (score - matchingThreshold.minScore) / range;

        // 分数越高，概率越高
        return Math.min(0.9, Math.max(0.1, 0.5 + position * 0.4));
    }

    /**
     * 基于段位的概率计算
     */
    private calculateSegmentBasedProbability(score: number, thresholds: ScoreThreshold[]): number {
        // 基于段位规则计算概率
        if (score >= 50000) return 0.9;      // Grandmaster
        if (score >= 20000) return 0.8;      // Master
        if (score >= 10000) return 0.7;      // Diamond
        if (score >= 5000) return 0.6;       // Platinum
        if (score >= 2500) return 0.5;       // Gold
        if (score >= 1000) return 0.4;       // Silver
        return 0.3;                           // Bronze
    }

    /**
     * 混合模式概率计算
     */
    private calculateHybridProbability(score: number, thresholds: ScoreThreshold[]): number {
        const scoreProb = this.calculateScoreBasedProbability(score, thresholds);
        const segmentProb = this.calculateSegmentBasedProbability(score, thresholds);

        // 加权平均：分数权重60%，段位权重40%
        return scoreProb * 0.6 + segmentProb * 0.4;
    }

    /**
     * 确定最终排名
     */
    private determineFinalRank(
        rankingProbability: number,
        baseRankingProbability: number[],
        adaptiveMode: AdaptiveMode,
        learningRate: number
    ): number {
        try {
            switch (adaptiveMode) {
                case 'static':
                    return this.determineStaticRank(rankingProbability, baseRankingProbability);
                case 'dynamic':
                    return this.determineDynamicRank(rankingProbability, baseRankingProbability);
                case 'learning':
                    return this.determineLearningRank(rankingProbability, baseRankingProbability, learningRate);
                default:
                    return this.determineStaticRank(rankingProbability, baseRankingProbability);
            }
        } catch (error) {
            console.error('确定最终排名失败:', error);
            return 1; // 默认第1名
        }
    }

    /**
     * 静态排名确定
     */
    private determineStaticRank(rankingProbability: number, baseRankingProbability: number[]): number {
        // 基于概率分布确定排名
        const random = Math.random();
        let cumulativeProbability = 0;

        for (let i = 0; i < baseRankingProbability.length; i++) {
            cumulativeProbability += baseRankingProbability[i];
            if (random <= cumulativeProbability) {
                return i + 1;
            }
        }

        return baseRankingProbability.length; // 最后一名
    }

    /**
     * 动态排名确定
     */
    private determineDynamicRank(rankingProbability: number, baseRankingProbability: number[]): number {
        // 动态调整概率分布
        const adjustedProbabilities = baseRankingProbability.map((prob, index) => {
            const rank = index + 1;
            const adjustment = rankingProbability * (1 - rank / baseRankingProbability.length);
            return Math.max(0.05, Math.min(0.9, prob + adjustment));
        });

        // 重新归一化概率
        const total = adjustedProbabilities.reduce((sum, prob) => sum + prob, 0);
        const normalizedProbabilities = adjustedProbabilities.map(prob => prob / total);

        return this.determineStaticRank(rankingProbability, normalizedProbabilities);
    }

    /**
     * 学习模式排名确定
     */
    private determineLearningRank(
        rankingProbability: number,
        baseRankingProbability: number[],
        learningRate: number
    ): number {
        // 基于学习率调整概率
        const adjustedProbabilities = baseRankingProbability.map((prob, index) => {
            const rank = index + 1;
            const learningAdjustment = learningRate * (rankingProbability - 0.5) * (1 - rank / baseRankingProbability.length);
            return Math.max(0.05, Math.min(0.9, prob + learningAdjustment));
        });

        // 重新归一化概率
        const total = adjustedProbabilities.reduce((sum, prob) => sum + prob, 0);
        const normalizedProbabilities = adjustedProbabilities.map(prob => prob / total);

        return this.determineStaticRank(rankingProbability, normalizedProbabilities);
    }

    /**
     * 生成排名原因
     */
    private generateRankReason(
        score: number,
        rank: number,
        config: ScoreThresholdConfig,
        rankingProbability: number
    ): string {
        const reasons = [];

        // 基于分数分析
        if (score > 10000) {
            reasons.push('高分表现');
        } else if (score > 5000) {
            reasons.push('良好表现');
        } else if (score > 1000) {
            reasons.push('稳定表现');
        } else {
            reasons.push('基础表现');
        }

        // 基于排名分析
        if (rank === 1) {
            reasons.push('获得第1名');
        } else if (rank <= 3) {
            reasons.push('获得前3名');
        } else {
            reasons.push('需要继续努力');
        }

        // 基于概率分析
        if (rankingProbability > 0.8) {
            reasons.push('高概率预期');
        } else if (rankingProbability > 0.6) {
            reasons.push('中高概率预期');
        } else if (rankingProbability > 0.4) {
            reasons.push('中等概率预期');
        } else {
            reasons.push('低概率预期');
        }

        return reasons.join('，');
    }

    /**
     * 自动调整学习率
     */
    async autoAdjustLearningRate(uid: string): Promise<void> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config || !config.autoAdjustLearningRate) return;

            const metrics = await this.getPlayerPerformanceMetrics(uid);
            if (!metrics) return;

            // 基于胜率调整学习率
            const winRate = metrics.totalMatches > 0 ? metrics.totalWins / metrics.totalMatches : 0.5;
            let newLearningRate = config.learningRate;

            if (winRate > 0.7) {
                // 胜率高，降低学习率（更稳定）
                newLearningRate = Math.max(0.01, config.learningRate * 0.9);
            } else if (winRate < 0.3) {
                // 胜率低，提高学习率（更快适应）
                newLearningRate = Math.min(0.3, config.learningRate * 1.1);
            }

            if (Math.abs(newLearningRate - config.learningRate) > 0.01) {
                await this.updatePlayerConfig(uid, { learningRate: newLearningRate });
            }
        } catch (error) {
            console.error(`自动调整学习率失败: ${uid}`, error);
        }
    }

    /**
     * 检查段位变化
     */
    async checkSegmentChange(uid: string, points: number): Promise<{
        shouldChange: boolean;
        changeType?: ChangeType;
        reason?: string;
    }> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return { shouldChange: false };

            const metrics = await this.getPlayerPerformanceMetrics(uid);
            if (!metrics) return { shouldChange: false };

            const protectionStatus = await this.getPlayerProtectionStatus(uid);
            if (!protectionStatus) return { shouldChange: false };

            // 检查升级条件
            if (await this.canPlayerPromote(uid)) {
                return {
                    shouldChange: true,
                    changeType: 'promotion',
                    reason: '满足升级条件'
                };
            }

            // 检查降级条件
            if (await this.shouldPlayerDemote(uid)) {
                // 检查保护状态
                if (protectionStatus.protectionLevel > 0) {
                    return {
                        shouldChange: false,
                        reason: '保护状态激活'
                    };
                }

                return {
                    shouldChange: true,
                    changeType: 'demotion',
                    reason: '满足降级条件'
                };
            }

            return { shouldChange: false };
        } catch (error) {
            console.error(`检查段位变化失败: ${uid}`, error);
            return { shouldChange: false };
        }
    }
}
