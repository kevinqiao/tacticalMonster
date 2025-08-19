/**
 * 分数门槛控制系统核心控制器
 * 整合段位系统和分数门槛系统
 */

import { SegmentManager } from '../../segment/SegmentManager';
import { SegmentName } from '../../segment/types';
import {
    getAdaptiveMode,
    getDefaultRankingProbabilities,
    getDefaultScoreThresholds,
    getLearningRate,
    getRankingMode,
    getSegmentProtectionConfig,
    validateRankingProbabilities,
    validateScoreThresholds
} from './config';
import {
    AdaptiveMode,
    MatchRankingResult,
    PlayerMatchRecord,
    PlayerPerformanceMetrics,
    PlayerProtectionStatus,
    RankingMode,
    RankingResult,
    ScoreThreshold,
    ScoreThresholdConfig
} from './types';

export interface DatabaseContext {
    db: any;
    auth: any;
}

export class ScoreThresholdController {
    private ctx: DatabaseContext;
    private segmentManager: SegmentManager;

    constructor(ctx: DatabaseContext) {
        this.ctx = ctx;
        this.segmentManager = new SegmentManager(ctx);
    }

    // ==================== 主要方法 ====================

    /**
     * 处理比赛结束，计算排名和段位变化
     */
    async processMatchEnd(
        matchId: string,
        playerScores: Array<{ uid: string; score: number; points: number }>
    ): Promise<MatchRankingResult> {
        try {
            console.log(`开始处理比赛结束: ${matchId}`);

            // 1. 计算排名
            const rankings = await this.calculateRankings(matchId, playerScores);

            // 2. 检查段位变化
            const segmentChanges = await this.checkSegmentChanges(rankings);

            // 3. 更新玩家数据
            await this.updatePlayerData(rankings, segmentChanges);

            // 4. 记录比赛结果
            await this.recordMatchResults(matchId, rankings);

            const result: MatchRankingResult = {
                matchId,
                rankings,
                segmentChanges,
                timestamp: new Date().toISOString()
            };

            console.log(`比赛处理完成: ${matchId}`);
            return result;

        } catch (error) {
            console.error(`处理比赛结束时发生错误: ${matchId}`, error);
            throw new Error(`比赛处理失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 计算玩家排名
     */
    async calculateRankings(
        matchId: string,
        playerScores: Array<{ uid: string; score: number; points: number }>
    ): Promise<RankingResult[]> {
        const rankings: RankingResult[] = [];

        for (const player of playerScores) {
            try {
                // 获取玩家配置
                const config = await this.getPlayerConfig(player.uid);
                if (!config) {
                    console.warn(`玩家配置未找到: ${player.uid}`);
                    continue;
                }

                // 计算排名概率
                const rankingProbability = this.calculateRankingProbability(
                    player.score,
                    config.scoreThresholds,
                    config.rankingMode
                );

                // 确定最终排名
                const rank = this.determineFinalRank(
                    rankingProbability,
                    config.baseRankingProbability,
                    config.adaptiveMode,
                    config.learningRate
                );

                // 检查保护状态
                const protectionStatus = await this.getPlayerProtectionStatus(player.uid);
                const protectionActive = protectionStatus?.protectionLevel > 0;

                const rankingResult: RankingResult = {
                    uid: player.uid,
                    rank,
                    score: player.score,
                    points: player.points,
                    segmentName: config.segmentName,
                    rankingProbability,
                    protectionActive
                };

                rankings.push(rankingResult);

            } catch (error) {
                console.error(`计算玩家排名失败: ${player.uid}`, error);
                // 使用默认排名
                rankings.push({
                    uid: player.uid,
                    rank: playerScores.length,
                    score: player.score,
                    points: player.points,
                    segmentName: 'bronze' as SegmentName,
                    rankingProbability: 0.1,
                    protectionActive: false
                });
            }
        }

        // 按排名排序
        return rankings.sort((a, b) => a.rank - b.rank);
    }

    /**
     * 检查段位变化
     */
    async checkSegmentChanges(rankings: RankingResult[]): Promise<any[]> {
        const segmentChanges = [];

        for (const ranking of rankings) {
            try {
                // 使用段位管理器检查变化
                const changeResult = await this.segmentManager.checkAndProcessSegmentChange(
                    ranking.uid,
                    ranking.points,
                    ranking.matchId
                );

                if (changeResult.changed) {
                    segmentChanges.push({
                        uid: ranking.uid,
                        oldSegment: changeResult.oldSegment,
                        newSegment: changeResult.newSegment,
                        changeType: changeResult.changeType,
                        reason: changeResult.reason,
                        matchId: ranking.matchId,
                        createdAt: new Date().toISOString()
                    });

                    // 更新排名结果中的段位变化信息
                    ranking.segmentChange = {
                        changeType: changeResult.changeType,
                        oldSegment: changeResult.oldSegment,
                        newSegment: changeResult.newSegment,
                        reason: changeResult.reason
                    };
                }

            } catch (error) {
                console.error(`检查段位变化失败: ${ranking.uid}`, error);
            }
        }

        return segmentChanges;
    }

    // ==================== 排名计算 ====================

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

    // ==================== 数据访问 ====================

    /**
     * 获取玩家配置
     */
    private async getPlayerConfig(uid: string): Promise<ScoreThresholdConfig | null> {
        try {
            const config = await this.ctx.db
                .query("player_score_threshold_configs")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (config) {
                return config as ScoreThresholdConfig;
            }

            // 如果没有配置，创建默认配置
            return await this.createDefaultConfig(uid);

        } catch (error) {
            console.error(`获取玩家配置失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 创建默认配置
     */
    private async createDefaultConfig(uid: string): Promise<ScoreThresholdConfig | null> {
        try {
            // 获取玩家当前段位
            const segmentInfo = await this.segmentManager.getPlayerSegmentInfo(uid);
            const segmentName = segmentInfo?.currentSegment || 'bronze';

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
            return defaultConfig;

        } catch (error) {
            console.error(`创建默认配置失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 获取玩家保护状态
     */
    private async getPlayerProtectionStatus(uid: string): Promise<PlayerProtectionStatus | null> {
        try {
            return await this.segmentManager.getPlayerProtectionStatus(uid);
        } catch (error) {
            console.error(`获取玩家保护状态失败: ${uid}`, error);
            return null;
        }
    }

    // ==================== 数据更新 ====================

    /**
     * 更新玩家数据
     */
    private async updatePlayerData(rankings: RankingResult[], segmentChanges: any[]): Promise<void> {
        for (const ranking of rankings) {
            try {
                await this.updatePlayerPerformanceMetrics(ranking);
                await this.updatePlayerProtectionStatus(ranking);
            } catch (error) {
                console.error(`更新玩家数据失败: ${ranking.uid}`, error);
            }
        }
    }

    /**
     * 更新玩家性能指标
     */
    private async updatePlayerPerformanceMetrics(ranking: RankingResult): Promise<void> {
        try {
            const existing = await this.ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", ranking.uid))
                .unique();

            if (existing) {
                // 更新现有记录
                const updates: Partial<PlayerPerformanceMetrics> = {
                    totalMatches: existing.totalMatches + 1,
                    totalPoints: existing.totalPoints + ranking.points,
                    lastUpdated: new Date().toISOString()
                };

                if (ranking.rank === 1) {
                    updates.totalWins = existing.totalWins + 1;
                    updates.currentWinStreak = existing.currentWinStreak + 1;
                    updates.currentLoseStreak = 0;
                } else {
                    updates.totalLosses = existing.totalLosses + 1;
                    updates.currentLoseStreak = existing.currentLoseStreak + 1;
                    updates.currentWinStreak = 0;
                }

                updates.averageScore = (existing.averageScore * existing.totalMatches + ranking.score) / (existing.totalMatches + 1);
                updates.bestScore = Math.max(existing.bestScore, ranking.score);
                updates.worstScore = Math.min(existing.worstScore, ranking.score);

                await this.ctx.db.patch(existing._id, updates);
            } else {
                // 创建新记录
                const newMetrics: PlayerPerformanceMetrics = {
                    uid: ranking.uid,
                    segmentName: ranking.segmentName,
                    totalMatches: 1,
                    totalWins: ranking.rank === 1 ? 1 : 0,
                    totalLosses: ranking.rank === 1 ? 0 : 1,
                    totalPoints: ranking.points,
                    averageScore: ranking.score,
                    currentWinStreak: ranking.rank === 1 ? 1 : 0,
                    currentLoseStreak: ranking.rank === 1 ? 0 : 1,
                    bestScore: ranking.score,
                    worstScore: ranking.score,
                    lastUpdated: new Date().toISOString()
                };

                await this.ctx.db.insert("player_performance_metrics", newMetrics);
            }
        } catch (error) {
            console.error(`更新玩家性能指标失败: ${ranking.uid}`, error);
        }
    }

    /**
     * 更新玩家保护状态
     */
    private async updatePlayerProtectionStatus(ranking: RankingResult): Promise<void> {
        try {
            if (ranking.segmentChange) {
                const protectionConfig = getSegmentProtectionConfig(ranking.segmentChange.newSegment);

                const protectionStatus: PlayerProtectionStatus = {
                    uid: ranking.uid,
                    segmentName: ranking.segmentChange.newSegment,
                    protectionLevel: protectionConfig.maxProtectionLevel,
                    protectionThreshold: protectionConfig.protectionThreshold,
                    demotionGracePeriod: protectionConfig.demotionGracePeriod,
                    promotionStabilityPeriod: protectionConfig.promotionStabilityPeriod,
                    lastSegmentChange: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const existing = await this.ctx.db
                    .query("player_protection_status")
                    .withIndex("by_uid", (q: any) => q.eq("uid", ranking.uid))
                    .unique();

                if (existing) {
                    await this.ctx.db.patch(existing._id, protectionStatus);
                } else {
                    await this.ctx.db.insert("player_protection_status", protectionStatus);
                }
            }
        } catch (error) {
            console.error(`更新玩家保护状态失败: ${ranking.uid}`, error);
        }
    }

    /**
     * 记录比赛结果
     */
    private async recordMatchResults(matchId: string, rankings: RankingResult[]): Promise<void> {
        try {
            for (const ranking of rankings) {
                const matchRecord: PlayerMatchRecord = {
                    matchId,
                    uid: ranking.uid,
                    score: ranking.score,
                    rank: ranking.rank,
                    points: ranking.points,
                    segmentName: ranking.segmentName,
                    createdAt: new Date().toISOString()
                };

                await this.ctx.db.insert("player_match_records", matchRecord);
            }
        } catch (error) {
            console.error(`记录比赛结果失败: ${matchId}`, error);
        }
    }

    // ==================== 配置管理 ====================

    /**
     * 更新玩家配置
     */
    async updatePlayerConfig(
        uid: string,
        updates: Partial<ScoreThresholdConfig>
    ): Promise<boolean> {
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

    // ==================== 统计查询 ====================

    /**
     * 获取系统统计信息
     */
    async getSystemStatistics(): Promise<any> {
        try {
            const totalPlayers = await this.ctx.db
                .query("player_performance_metrics")
                .collect()
                .then(players => players.length);

            const totalMatches = await this.ctx.db
                .query("player_match_records")
                .collect()
                .then(records => new Set(records.map(r => r.matchId)).size);

            const segmentDistribution = await this.ctx.db
                .query("player_performance_metrics")
                .collect()
                .then(players => {
                    const distribution: Record<SegmentName, number> = {
                        bronze: 0, silver: 0, gold: 0, platinum: 0,
                        diamond: 0, master: 0, grandmaster: 0
                    };
                    players.forEach(p => {
                        if (distribution[p.segmentName]) {
                            distribution[p.segmentName]++;
                        }
                    });
                    return distribution;
                });

            return {
                totalPlayers,
                totalMatches,
                segmentDistribution,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error("获取系统统计信息失败", error);
            return null;
        }
    }
}
