/**
 * 基于分数门槛的名次概率控制系统 - 数据库驱动版本
 * 完全基于数据库存储，与现有Convex系统完全集成
 */

import { SegmentPromotionDemotionManager } from '../../segment/segmentPromotionDemotionManager';

export interface ScoreThreshold {
    minScore: number;           // 最小分数
    maxScore: number;           // 最大分数
    rankingProbabilities: number[]; // 动态名次概率数组 [rank1Prob, rank2Prob, ..., rankNProb]
    priority: number;           // 优先级（数字越大优先级越高）
}

export interface PlayerScoreThresholdConfig {
    uid: string;
    segmentName: string;        // 段位信息
    scoreThresholds: ScoreThreshold[];
    baseRankingProbability: number[]; // 动态名次概率数组
    maxRank: number;            // 最大名次数量
    adaptiveMode: boolean;      // 是否启用自适应模式
    learningRate: number;       // 学习率 (0.01-0.3)
    autoAdjustLearningRate: boolean; // 是否自动调整学习率
    createdAt: string;
    updatedAt: string;
}

export interface PlayerMatchRecord {
    matchId: string;
    uid: string;
    score: number;
    rank: number;
    points: number;
    createdAt: string;
}

export interface PlayerPerformanceMetrics {
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    totalPoints: number;
    averageScore: number;
    currentWinStreak: number;
    currentLoseStreak: number;
    bestScore: number;
    worstScore: number;
    lastUpdated: string;
}

export interface PlayerProtectionStatus {
    uid: string;
    segmentName: string;
    protectionLevel: number;    // 保护等级 (0-3)
    protectionThreshold: number; // 保护阈值
    demotionGracePeriod: number; // 降级宽限期
    promotionStabilityPeriod: number; // 升级稳定期
    lastSegmentChange: string;
    createdAt: string;
    updatedAt: string;
}

export interface SegmentChangeRecord {
    uid: string;
    oldSegment: string;
    newSegment: string;
    changeType: 'promotion' | 'demotion';
    reason?: string;
    pointsConsumed?: number;
    matchId?: string;
    createdAt: string;
}

export interface PlayerPerformanceData {
    uid: string;
    segmentName: string;
    scoreThresholdConfig: PlayerScoreThresholdConfig;
    performanceMetrics: PlayerPerformanceMetrics;
    protectionStatus: PlayerProtectionStatus;
    lastMatchId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SegmentProtectionConfig {
    protectionThreshold: number;
    demotionGracePeriod: number;
    promotionStabilityPeriod: number;
    maxProtectionLevel: number;
}

// 段位配置常量
export const SEGMENT_CONFIGS: Record<string, SegmentProtectionConfig> = {
    bronze: {
        protectionThreshold: 3,
        demotionGracePeriod: 5,
        promotionStabilityPeriod: 3,
        maxProtectionLevel: 2
    },
    silver: {
        protectionThreshold: 4,
        demotionGracePeriod: 6,
        promotionStabilityPeriod: 4,
        maxProtectionLevel: 2
    },
    gold: {
        protectionThreshold: 5,
        demotionGracePeriod: 7,
        promotionStabilityPeriod: 5,
        maxProtectionLevel: 3
    },
    platinum: {
        protectionThreshold: 6,
        demotionGracePeriod: 8,
        promotionStabilityPeriod: 6,
        maxProtectionLevel: 3
    },
    diamond: {
        protectionThreshold: 7,
        demotionGracePeriod: 10,
        promotionStabilityPeriod: 8,
        maxProtectionLevel: 3
    }
};

// 混合模式段位配置
export const HYBRID_SEGMENT_CONFIGS: Record<string, {
    scoreThresholds: ScoreThreshold[];
    adaptiveMode: boolean;
    learningRate: number;
    maxRank: number; // 新增：最大名次数量
}> = {
    bronze: {
        maxRank: 4, // 4名次
        scoreThresholds: [
            { minScore: 0, maxScore: 1000, rankingProbabilities: [0.15, 0.25, 0.35, 0.25], priority: 1 },
            { minScore: 1001, maxScore: 2000, rankingProbabilities: [0.20, 0.30, 0.30, 0.20], priority: 2 },
            { minScore: 2001, maxScore: 3000, rankingProbabilities: [0.25, 0.35, 0.25, 0.15], priority: 3 }
        ],
        adaptiveMode: true,
        learningRate: 0.05
    },
    silver: {
        maxRank: 4, // 4名次
        scoreThresholds: [
            { minScore: 0, maxScore: 1500, rankingProbabilities: [0.20, 0.30, 0.30, 0.20], priority: 1 },
            { minScore: 1501, maxScore: 2500, rankingProbabilities: [0.25, 0.35, 0.25, 0.15], priority: 2 },
            { minScore: 2501, maxScore: 3500, rankingProbabilities: [0.30, 0.35, 0.20, 0.15], priority: 3 }
        ],
        adaptiveMode: true,
        learningRate: 0.08
    },
    gold: {
        maxRank: 4, // 4名次
        scoreThresholds: [
            { minScore: 0, maxScore: 2000, rankingProbabilities: [0.25, 0.35, 0.25, 0.15], priority: 1 },
            { minScore: 2001, maxScore: 3000, rankingProbabilities: [0.30, 0.35, 0.20, 0.15], priority: 2 },
            { minScore: 3001, maxScore: 4000, rankingProbabilities: [0.35, 0.30, 0.20, 0.15], priority: 3 }
        ],
        adaptiveMode: true,
        learningRate: 0.12
    },
    platinum: {
        maxRank: 4, // 4名次
        scoreThresholds: [
            { minScore: 0, maxScore: 2500, rankingProbabilities: [0.30, 0.35, 0.20, 0.15], priority: 1 },
            { minScore: 2501, maxScore: 3500, rankingProbabilities: [0.35, 0.30, 0.20, 0.15], priority: 2 },
            { minScore: 3501, maxScore: 4500, rankingProbabilities: [0.40, 0.30, 0.20, 0.10], priority: 3 }
        ],
        adaptiveMode: true,
        learningRate: 0.15
    },
    diamond: {
        maxRank: 4, // 4名次
        scoreThresholds: [
            { minScore: 0, maxScore: 3000, rankingProbabilities: [0.35, 0.35, 0.20, 0.10], priority: 1 },
            { minScore: 3001, maxScore: 4000, rankingProbabilities: [0.40, 0.30, 0.20, 0.10], priority: 2 },
            { minScore: 4001, maxScore: 5000, rankingProbabilities: [0.45, 0.30, 0.15, 0.10], priority: 3 }
        ],
        adaptiveMode: true,
        learningRate: 0.18
    }
};

export class ScoreThresholdRankingController {
    private static instance: ScoreThresholdRankingController;

    private constructor() { }

    public static getInstance(): ScoreThresholdRankingController {
        if (!ScoreThresholdRankingController.instance) {
            ScoreThresholdRankingController.instance = new ScoreThresholdRankingController();
        }
        return ScoreThresholdRankingController.instance;
    }

    /**
     * 初始化玩家数据
     */
    async initializePlayer(ctx: any, params: {
        uid: string;
        segmentName: string;
        scoreThresholdConfig?: PlayerScoreThresholdConfig;
        useHybridMode?: boolean;
    }): Promise<PlayerPerformanceData> {
        const { uid, segmentName, scoreThresholdConfig, useHybridMode = true } = params;

        // 尝试从数据库加载现有玩家数据
        let playerData = await this.loadPlayerDataFromDB(ctx, uid);

        if (!playerData) {
            // 创建新的玩家数据
            const nowISO = new Date().toISOString();

            // 使用混合模式配置或自定义配置
            let config: PlayerScoreThresholdConfig;
            if (useHybridMode && HYBRID_SEGMENT_CONFIGS[segmentName]) {
                const hybridConfig = HYBRID_SEGMENT_CONFIGS[segmentName];
                config = {
                    uid,
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
            } else {
                config = scoreThresholdConfig || this.createDefaultConfig(uid, segmentName);
            }

            // 创建性能指标
            const performanceMetrics: PlayerPerformanceMetrics = {
                totalMatches: 0,
                totalWins: 0,
                totalLosses: 0,
                totalPoints: 0,
                averageScore: 0,
                currentWinStreak: 0,
                currentLoseStreak: 0,
                bestScore: 0,
                worstScore: 0,
                lastUpdated: nowISO
            };

            // 创建保护状态
            const protectionConfig = SEGMENT_CONFIGS[segmentName] || SEGMENT_CONFIGS.bronze;
            const protectionStatus: PlayerProtectionStatus = {
                uid,
                segmentName,
                protectionLevel: 0,
                protectionThreshold: protectionConfig.protectionThreshold,
                demotionGracePeriod: protectionConfig.demotionGracePeriod,
                promotionStabilityPeriod: protectionConfig.promotionStabilityPeriod,
                lastSegmentChange: nowISO,
                createdAt: nowISO,
                updatedAt: nowISO
            };

            playerData = {
                uid,
                segmentName,
                scoreThresholdConfig: config,
                performanceMetrics,
                protectionStatus,
                createdAt: nowISO,
                updatedAt: nowISO
            };

            // 保存到数据库
            await this.savePlayerDataToDB(ctx, playerData);
        } else {
            // 更新现有玩家数据
            if (playerData.segmentName !== segmentName) {
                playerData.segmentName = segmentName;
                playerData.updatedAt = new Date().toISOString();

                // 更新保护状态配置
                const protectionConfig = SEGMENT_CONFIGS[segmentName] || SEGMENT_CONFIGS.bronze;
                playerData.protectionStatus.segmentName = segmentName;
                playerData.protectionStatus.protectionThreshold = protectionConfig.protectionThreshold;
                playerData.protectionStatus.demotionGracePeriod = protectionConfig.demotionGracePeriod;
                playerData.protectionStatus.promotionStabilityPeriod = protectionConfig.promotionStabilityPeriod;

                await this.savePlayerDataToDB(ctx, playerData);
            }
        }

        return playerData;
    }

    /**
     * 记录比赛结果
     */
    async recordMatchResult(ctx: any, params: {
        matchId: string;
        uid: string;
        score: number;
        rank: number;
        points: number;
    }): Promise<void> {
        const { matchId, uid, score, rank, points } = params;

        // 加载玩家数据
        let playerData = await this.loadPlayerDataFromDB(ctx, uid);
        if (!playerData) {
            throw new Error(`玩家 ${uid} 数据不存在`);
        }

        const nowISO = new Date().toISOString();

        // 更新性能指标
        const metrics = playerData.performanceMetrics;
        metrics.totalMatches++;
        metrics.totalPoints += points;
        metrics.averageScore = metrics.totalPoints / metrics.totalMatches;
        metrics.lastUpdated = nowISO;

        // 更新胜负记录和连胜连败
        if (rank === 1) {
            metrics.totalWins++;
            metrics.currentWinStreak++;
            metrics.currentLoseStreak = 0;
        } else {
            metrics.totalLosses++;
            metrics.currentLoseStreak++;
            metrics.currentWinStreak = 0;
        }

        // 更新最佳和最差分数
        if (score > metrics.bestScore) {
            metrics.bestScore = score;
        }
        if (score < metrics.worstScore || metrics.worstScore === 0) {
            metrics.worstScore = score;
        }

        // 记录比赛记录
        const matchRecord: PlayerMatchRecord = {
            matchId,
            uid,
            score,
            rank,
            points,
            createdAt: nowISO
        };

        // 保存比赛记录到数据库
        await this.saveMatchRecordToDB(ctx, matchRecord);

        // 更新玩家数据
        playerData.lastMatchId = matchId;
        playerData.updatedAt = nowISO;

        // 自动调整学习率
        await this.autoAdjustLearningRate(ctx, playerData);

        // 检查段位变化
        await this.checkSegmentChange(ctx, playerData, points);

        // 保存更新后的玩家数据
        await this.savePlayerDataToDB(ctx, playerData);
    }

    /**
     * 获取玩家统计信息
     */
    async getPlayerStats(ctx: any, uid: string): Promise<PlayerPerformanceData | null> {
        return await this.loadPlayerDataFromDB(ctx, uid);
    }

    /**
     * 调整分数门槛配置
     */
    async adjustScoreThresholds(ctx: any, params: {
        uid: string;
        scoreThresholds: ScoreThreshold[];
        adaptiveMode?: boolean;
        learningRate?: number;
    }): Promise<void> {
        const { uid, scoreThresholds, adaptiveMode, learningRate } = params;

        let playerData = await this.loadPlayerDataFromDB(ctx, uid);
        if (!playerData) {
            throw new Error(`玩家 ${uid} 数据不存在`);
        }

        const nowISO = new Date().toISOString();

        // 更新配置
        playerData.scoreThresholdConfig.scoreThresholds = scoreThresholds;
        playerData.scoreThresholdConfig.baseRankingProbability = this.calculateBaseProbability(scoreThresholds);
        playerData.scoreThresholdConfig.updatedAt = nowISO;

        if (adaptiveMode !== undefined) {
            playerData.scoreThresholdConfig.adaptiveMode = adaptiveMode;
        }

        if (learningRate !== undefined) {
            playerData.scoreThresholdConfig.learningRate = Math.max(0.01, Math.min(0.3, learningRate));
        }

        // 保存到数据库
        await this.savePlayerDataToDB(ctx, playerData);
    }

    /**
     * 切换自适应模式
     */
    async toggleAdaptiveMode(ctx: any, uid: string): Promise<void> {
        let playerData = await this.loadPlayerDataFromDB(ctx, uid);
        if (!playerData) {
            throw new Error(`玩家 ${uid} 数据不存在`);
        }

        playerData.scoreThresholdConfig.adaptiveMode = !playerData.scoreThresholdConfig.adaptiveMode;
        playerData.scoreThresholdConfig.updatedAt = new Date().toISOString();

        await this.savePlayerDataToDB(ctx, playerData);
    }

    /**
     * 结束比赛并生成AI分数
     */
    async endMatch(ctx: any, params: {
        matchId: string;
        humanPlayerUid: string;
        humanScore: number;
        targetRank: number;
        aiPlayerCount: number;
    }): Promise<{ aiScores: number[]; finalRankings: Array<{ uid: string; score: number; rank: number }> }> {
        const { matchId, humanPlayerUid, humanScore, targetRank, aiPlayerCount } = params;

        // 加载玩家数据
        const playerData = await this.loadPlayerDataFromDB(ctx, humanPlayerUid);
        if (!playerData) {
            throw new Error(`玩家 ${humanPlayerUid} 数据不存在`);
        }

        // 生成AI分数以确保目标名次
        const aiScores = this.generateAIScoresForTargetRank(humanScore, targetRank, aiPlayerCount, playerData.scoreThresholdConfig.maxRank);

        // 计算最终排名
        const allScores = [humanScore, ...aiScores];
        const finalRankings = this.calculateFinalRankings([
            { uid: humanPlayerUid, score: humanScore },
            ...aiScores.map((score, index) => ({ uid: `ai_${index + 1}`, score }))
        ]);

        return { aiScores, finalRankings };
    }

    /**
     * 获取活跃比赛
     */
    async getActiveMatches(ctx: any): Promise<Array<{ matchId: string; uid: string; status: string }>> {
        // 从数据库查询活跃比赛
        const activeMatches = await ctx.db
            .query("score_threshold_match_configs")
            .withIndex("by_status", (q: any) => q.eq("status", "active"))
            .collect();

        return activeMatches.map((match: any) => ({
            matchId: match.matchId,
            uid: match.uid,
            status: match.status
        }));
    }

    /**
     * 获取所有玩家
     */
    async getAllPlayers(ctx: any): Promise<PlayerPerformanceData[]> {
        // 从数据库查询所有玩家数据
        const allPlayers = await ctx.db
            .query("player_performance_metrics")
            .collect();

        const players: PlayerPerformanceData[] = [];
        for (const metrics of allPlayers) {
            const playerData = await this.loadPlayerDataFromDB(ctx, metrics.uid);
            if (playerData) {
                players.push(playerData);
            }
        }

        return players;
    }

    /**
     * 重置系统
     */
    async reset(ctx: any): Promise<void> {
        // 清空所有相关数据库表
        // 注意：在生产环境中应该谨慎使用
        console.log("重置分数门槛控制系统");
    }

    // ==================== 私有方法 ====================

    /**
     * 计算基础概率
     */
    private calculateBaseProbability(scoreThresholds: ScoreThreshold[]): number[] {
        // 按优先级排序
        const sortedThresholds = [...scoreThresholds].sort((a, b) => b.priority - a.priority);

        // 使用最高优先级的配置作为基础概率
        const baseThreshold = sortedThresholds[0];

        // 返回动态长度的概率数组
        return [...baseThreshold.rankingProbabilities];
    }

    /**
     * 创建默认配置
     */
    private createDefaultConfig(uid: string, segmentName: string): PlayerScoreThresholdConfig {
        const nowISO = new Date().toISOString();
        const defaultThresholds: ScoreThreshold[] = [
            { minScore: 0, maxScore: 1000, rankingProbabilities: [0.25, 0.25, 0.25, 0.25], priority: 1 }
        ];

        return {
            uid,
            segmentName,
            scoreThresholds: defaultThresholds,
            baseRankingProbability: this.calculateBaseProbability(defaultThresholds),
            maxRank: 4, // 默认4名次
            adaptiveMode: false,
            learningRate: 0.1,
            autoAdjustLearningRate: false,
            createdAt: nowISO,
            updatedAt: nowISO
        };
    }

    /**
     * 生成AI分数以确保目标名次
     */
    private generateAIScoresForTargetRank(
        humanScore: number,
        targetRank: number,
        aiPlayerCount: number,
        maxRank: number // 新增参数
    ): number[] {
        const aiScores: number[] = [];

        if (targetRank === 1) {
            // 人类玩家要得第1名，所有AI分数都要低于人类分数
            for (let i = 0; i < aiPlayerCount; i++) {
                aiScores.push(humanScore - Math.random() * 100 - 50);
            }
        } else if (targetRank === maxRank) {
            // 人类玩家要得最后一名，所有AI分数都要高于人类分数
            for (let i = 0; i < aiPlayerCount; i++) {
                aiScores.push(humanScore + Math.random() * 100 + 50);
            }
        } else {
            // 人类玩家要得中间名次
            const higherAICount = targetRank - 1; // 需要多少个AI分数高于人类
            const lowerAICount = aiPlayerCount - higherAICount;

            // 生成高于人类的AI分数
            for (let i = 0; i < higherAICount; i++) {
                aiScores.push(humanScore + Math.random() * 100 + 50);
            }

            // 生成低于人类的AI分数
            for (let i = 0; i < lowerAICount; i++) {
                aiScores.push(humanScore - Math.random() * 100 - 50);
            }
        }

        return aiScores;
    }

    /**
     * 计算最终排名
     */
    private calculateFinalRankings(players: Array<{ uid: string; score: number }>): Array<{ uid: string; score: number; rank: number }> {
        // 按分数降序排序
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

        return sortedPlayers.map((player, index) => ({
            ...player,
            rank: index + 1
        }));
    }

    /**
     * 自动调整学习率
     */
    private async autoAdjustLearningRate(ctx: any, playerData: PlayerPerformanceData): Promise<void> {
        if (!playerData.scoreThresholdConfig.autoAdjustLearningRate) {
            return;
        }

        const { performanceMetrics } = playerData;
        const baseConfig = HYBRID_SEGMENT_CONFIGS[playerData.segmentName];

        if (!baseConfig) {
            return;
        }

        let newLearningRate = baseConfig.learningRate;
        const totalMatches = performanceMetrics.totalMatches;

        if (totalMatches >= 20) {
            const winRate = performanceMetrics.totalWins / totalMatches;

            // 根据胜率调整学习率
            if (winRate < 0.3) {
                newLearningRate = Math.min(0.3, baseConfig.learningRate * 1.5);
            } else if (winRate > 0.7) {
                newLearningRate = Math.max(0.02, baseConfig.learningRate * 0.8);
            }

            // 根据连胜连败调整学习率
            if (performanceMetrics.currentWinStreak >= 5) {
                newLearningRate = Math.max(0.02, newLearningRate * 0.9);
            } else if (performanceMetrics.currentLoseStreak >= 3) {
                newLearningRate = Math.min(0.3, newLearningRate * 1.3);
            }

            // 如果学习率有显著变化，更新配置
            if (Math.abs(newLearningRate - playerData.scoreThresholdConfig.learningRate) > 0.01) {
                playerData.scoreThresholdConfig.learningRate = newLearningRate;
                await this.updateScoreThresholdConfigInDB(ctx, playerData.uid, playerData.scoreThresholdConfig);
            }
        }
    }

    /**
     * 检查段位变化
     */
    private async checkSegmentChange(ctx: any, playerData: PlayerPerformanceData, points: number): Promise<void> {
        // 使用新的段位升降管理器
        const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
            ctx,
            playerData.uid,
            points,
            playerData.performanceMetrics
        );

        if (segmentChange.changed) {
            // 处理段位变化
            await this.handleSegmentChange(ctx, playerData, segmentChange);
        }
    }

    /**
     * 处理段位变化
     */
    private async handleSegmentChange(ctx: any, playerData: PlayerPerformanceData, segmentChange: any): Promise<void> {
        const { changeType, oldSegment, newSegment, pointsConsumed, message } = segmentChange;

        // 更新玩家数据中的段位
        playerData.segmentName = newSegment;

        // 更新保护状态
        if (changeType === "promotion") {
            // 升级后重置保护状态
            playerData.protectionStatus.protectionLevel = 0;
            playerData.protectionStatus.segmentName = newSegment;
        } else if (changeType === "demotion") {
            // 降级后设置保护状态
            playerData.protectionStatus.protectionLevel = 1;
            playerData.protectionStatus.segmentName = newSegment;
        }

        // 记录段位变化
        const segmentChangeRecord: SegmentChangeRecord = {
            uid: playerData.uid,
            oldSegment,
            newSegment,
            changeType,
            pointsConsumed: pointsConsumed || 0,
            createdAt: new Date().toISOString()
        };

        await this.saveSegmentChangeToDB(ctx, segmentChangeRecord);

        // 发送通知
        console.log(`段位变化: ${message}`);
    }

    // ==================== 数据库操作方法 ====================

    /**
     * 从数据库加载玩家数据
     */
    private async loadPlayerDataFromDB(ctx: any, uid: string): Promise<PlayerPerformanceData | null> {
        try {
            // 加载分数门槛配置
            const config = await ctx.db
                .query("score_threshold_configs")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!config) {
                return null;
            }

            // 加载性能指标
            const metrics = await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!metrics) {
                return null;
            }

            // 加载保护状态
            const protection = await ctx.db
                .query("player_protection_status")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!protection) {
                return null;
            }

            // 加载最后一场比赛ID
            const lastMatch = await ctx.db
                .query("player_match_records")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .first();

            return {
                uid,
                segmentName: config.segmentName,
                scoreThresholdConfig: config,
                performanceMetrics: metrics,
                protectionStatus: protection,
                lastMatchId: lastMatch?.matchId,
                createdAt: config.createdAt,
                updatedAt: config.updatedAt
            };
        } catch (error) {
            console.error("加载玩家数据失败:", error);
            return null;
        }
    }

    /**
     * 保存玩家数据到数据库
     */
    private async savePlayerDataToDB(ctx: any, playerData: PlayerPerformanceData): Promise<void> {
        try {
            // 保存分数门槛配置
            await this.saveScoreThresholdConfigInDB(ctx, playerData.uid, playerData.scoreThresholdConfig);

            // 保存性能指标
            await this.savePerformanceMetricsInDB(ctx, playerData.uid, playerData.performanceMetrics);

            // 保存保护状态
            await this.saveProtectionStatusInDB(ctx, playerData.uid, playerData.protectionStatus);
        } catch (error) {
            console.error("保存玩家数据失败:", error);
            throw error;
        }
    }

    /**
     * 保存分数门槛配置到数据库
     */
    private async saveScoreThresholdConfigInDB(ctx: any, uid: string, config: PlayerScoreThresholdConfig): Promise<void> {
        const existing = await ctx.db
            .query("score_threshold_configs")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, config);
        } else {
            await ctx.db.insert("score_threshold_configs", config);
        }
    }

    /**
     * 更新分数门槛配置到数据库
     */
    private async updateScoreThresholdConfigInDB(ctx: any, uid: string, config: PlayerScoreThresholdConfig): Promise<void> {
        const existing = await ctx.db
            .query("score_threshold_configs")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, config);
        }
    }

    /**
     * 保存性能指标到数据库
     */
    private async savePerformanceMetricsInDB(ctx: any, uid: string, metrics: PlayerPerformanceMetrics): Promise<void> {
        const existing = await ctx.db
            .query("player_performance_metrics")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, metrics);
        } else {
            await ctx.db.insert("player_performance_metrics", { uid, ...metrics });
        }
    }

    /**
     * 保存保护状态到数据库
     */
    private async saveProtectionStatusInDB(ctx: any, uid: string, protection: PlayerProtectionStatus): Promise<void> {
        const existing = await ctx.db
            .query("player_protection_status")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, protection);
        } else {
            await ctx.db.insert("player_protection_status", protection);
        }
    }

    /**
     * 保存比赛记录到数据库
     */
    private async saveMatchRecordToDB(ctx: any, record: PlayerMatchRecord): Promise<void> {
        await ctx.db.insert("player_match_records", record);
    }

    /**
     * 保存段位变化记录到数据库
     */
    private async saveSegmentChangeToDB(ctx: any, change: SegmentChangeRecord): Promise<void> {
        await ctx.db.insert("segment_change_history", change);
    }
}

// 导出单例实例
export const scoreThresholdController = ScoreThresholdRankingController.getInstance();
