/**
 * 分数门槛控制玩家级控制器
 * 专注于玩家级操作：配置管理、个人统计、保护状态等
 * 与ScoreThresholdSystemController分工明确，避免功能重复
 */
import { canDemote, canPromote, getSegmentRule, getSegmentTier } from '../../segment/config';
import { SegmentManager } from '../../segment/SegmentManager';
import { SegmentName } from '../../segment/types';
import {
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
    async createPlayerDefaultConfig(uid: string, segmentName: SegmentName): Promise<boolean> {
        try {
            const existingConfig = await this.getPlayerConfig(uid);
            if (existingConfig) return true; // 配置已存在

            const defaultConfig: ScoreThresholdConfig = {
                uid,
                segmentName,
                scoreThresholds: getDefaultScoreThresholds(segmentName),
                baseRankingProbability: getDefaultRankingProbabilities(segmentName),
                maxRank: 4,
                adaptiveMode: getAdaptiveMode(segmentName),
                learningRate: getLearningRate(segmentName),
                autoAdjustLearningRate: true,
                rankingMode: getRankingMode(segmentName),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.ctx.db.insert("player_score_threshold_configs", defaultConfig);
            return true;

        } catch (error) {
            console.error(`创建玩家默认配置失败: ${uid}`, error);
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
        switch (rankingMode) {
            case 'score_based':
                return this.calculateScoreBasedProbability(score, thresholds);
            case 'segment_based':
                return this.calculateSegmentBasedProbability(score);
            case 'hybrid':
                return this.calculateHybridProbability(score, thresholds);
            default:
                return 0.5;
        }
    }

    /**
     * 基于分数的概率计算
     */
    private calculateScoreBasedProbability(score: number, thresholds: ScoreThreshold[]): number {
        for (const threshold of thresholds) {
            if (score >= threshold.minScore && score <= threshold.maxScore) {
                // 在阈值范围内，使用线性插值计算概率
                const range = threshold.maxScore - threshold.minScore;
                const position = (score - threshold.minScore) / range;
                return threshold.rankingProbabilities[0] +
                    (threshold.rankingProbabilities[1] - threshold.rankingProbabilities[0]) * position;
            }
        }
        return 0.5; // 默认概率
    }

    /**
     * 基于段位的概率计算
     */
    private calculateSegmentBasedProbability(score: number): number {
        // 根据分数范围确定段位概率
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
        const segmentProb = this.calculateSegmentBasedProbability(score);
        return (scoreProb * 0.6) + (segmentProb * 0.4); // 60% 分数权重，40% 段位权重
    }

    /**
     * 确定最终排名
     */
    private determineFinalRank(
        rankingProbability: number,
        baseProbabilities: number[],
        adaptiveMode: AdaptiveMode,
        learningRate: number
    ): number {
        if (adaptiveMode === 'static') {
            return this.determineStaticRank(rankingProbability, baseProbabilities);
        } else if (adaptiveMode === 'dynamic') {
            return this.determineDynamicRank(rankingProbability, baseProbabilities);
        } else {
            return this.determineLearningRank(rankingProbability, baseProbabilities, learningRate);
        }
    }

    /**
     * 静态排名确定
     */
    private determineStaticRank(probability: number, baseProbabilities: number[]): number {
        let cumulative = 0;
        for (let i = 0; i < baseProbabilities.length; i++) {
            cumulative += baseProbabilities[i];
            if (probability <= cumulative) {
                return i + 1;
            }
        }
        return baseProbabilities.length;
    }

    /**
     * 动态排名确定
     */
    private determineDynamicRank(probability: number, baseProbabilities: number[]): number {
        // 添加随机性，避免完全确定性的排名
        const randomFactor = Math.random() * 0.2 - 0.1; // ±10% 随机性
        const adjustedProbability = Math.max(0, Math.min(1, probability + randomFactor));
        return this.determineStaticRank(adjustedProbability, baseProbabilities);
    }

    /**
     * 学习排名确定
     */
    private determineLearningRank(
        probability: number,
        baseProbabilities: number[],
        learningRate: number
    ): number {
        // 根据学习率调整概率
        const adjustedProbability = probability * (1 + learningRate);
        return this.determineStaticRank(adjustedProbability, baseProbabilities);
    }

    /**
     * 生成排名原因说明
     */
    private generateRankReason(
        score: number,
        rank: number,
        config: ScoreThresholdConfig,
        rankingProbability: number
    ): string {
        const reasons = [];

        // 基于分数范围的原因
        if (score >= 50000) {
            reasons.push('超高分数表现');
        } else if (score >= 20000) {
            reasons.push('优秀分数表现');
        } else if (score >= 10000) {
            reasons.push('良好分数表现');
        } else if (score >= 5000) {
            reasons.push('中等分数表现');
        } else if (score >= 1000) {
            reasons.push('基础分数表现');
        } else {
            reasons.push('需要提升分数');
        }

        // 基于排名模式的原因
        switch (config.rankingMode) {
            case 'score_based':
                reasons.push('基于分数排名');
                break;
            case 'segment_based':
                reasons.push('基于段位排名');
                break;
            case 'hybrid':
                reasons.push('混合模式排名');
                break;
        }

        // 基于自适应模式的原因
        switch (config.adaptiveMode) {
            case 'static':
                reasons.push('静态模式');
                break;
            case 'dynamic':
                reasons.push('动态模式');
                break;
            case 'learning':
                reasons.push(`学习模式(学习率: ${config.learningRate})`);
                break;
        }

        // 基于概率的原因
        if (rankingProbability >= 0.8) {
            reasons.push('高概率排名');
        } else if (rankingProbability >= 0.6) {
            reasons.push('中高概率排名');
        } else if (rankingProbability >= 0.4) {
            reasons.push('中等概率排名');
        } else {
            reasons.push('低概率排名');
        }

        return reasons.join(' + ');
    }
}
