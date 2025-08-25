/**
 * 分数门槛控制玩家级控制器
 * 专注于玩家级操作：配置管理、个人统计、保护状态等
 * 整合了系统级和玩家级功能，提供完整的分数门槛控制
 */
import {
    getAdaptiveMode,
    getDefaultScoreThresholds,
    getLearningRate,
    getRankingMode
} from "../config/config";
import {
    AdaptiveMode,
    ChangeType,
    PlayerPerformanceMetrics,
    PlayerProtectionStatus,
    ProtectionLevel,
    RankingMode,
    ScoreThresholdConfig,
    SegmentName
} from "../config/types";
import { IntelligentExperienceManager } from "../managers/IntelligentExperienceManager";

// 添加缺失的常量
const DEFAULT_PROTECTION_LEVEL = 1;
const DEFAULT_GRACE_PERIOD = 3;
const DEFAULT_PROTECTION_DURATION = 7;

// 简化的SegmentManager类
class SegmentManager {
    private ctx: any;

    constructor(ctx: any) {
        this.ctx = ctx;
    }

    async canPromote(uid: string): Promise<boolean> {
        return true;
    }

    async canDemote(uid: string): Promise<boolean> {
        return true;
    }

    async getSegmentProtectionConfig(segmentName: SegmentName) {
        return {
            protectionLevel: DEFAULT_PROTECTION_LEVEL,
            gracePeriod: DEFAULT_GRACE_PERIOD,
            protectionDuration: DEFAULT_PROTECTION_DURATION
        };
    }

    async getSegmentRule(segmentName: SegmentName) {
        return {
            minScore: 0,
            maxScore: 10000,
            promotionRequirement: 100,
            demotionThreshold: 50
        };
    }

    async getSegmentTier(segmentName: SegmentName): Promise<number> {
        const tiers: Record<SegmentName, number> = {
            bronze: 1,
            silver: 2,
            gold: 3,
            platinum: 4,
            diamond: 5,
            master: 6,
            grandmaster: 7
        };
        return tiers[segmentName] || 1;
    }

    async checkAndProcessSegmentChange(uid: string, points: number): Promise<any> {
        return { changed: false, newSegment: null };
    }
}

// 历史数据分析器类
class HistoricalDataAnalyzer {
    private ctx: any;

    constructor(ctx: any) {
        this.ctx = ctx;
    }

    /**
     * 分析玩家历史数据并生成配置建议
     */
    async analyzePlayerHistory(uid: string): Promise<{
        learningRateAdjustment: number;
        rankingModeSuggestion: RankingMode;
        adaptiveModeSuggestion: AdaptiveMode;
        scoreThresholdAdjustments: any[];
        confidence: number;
    }> {
        try {
            // 获取玩家历史数据
            const performanceMetrics = await this.getPlayerPerformanceMetrics(uid);
            const matchRecords = await this.getPlayerMatchRecords(uid);

            if (!performanceMetrics || matchRecords.length === 0) {
                return this.getDefaultSuggestions();
            }

            // 分析胜率趋势
            const winRateAnalysis = this.analyzeWinRate(performanceMetrics, matchRecords);

            // 分析分数稳定性
            const scoreStabilityAnalysis = this.analyzeScoreStability(matchRecords);

            // 分析排名分布
            const rankingDistributionAnalysis = this.analyzeRankingDistribution(matchRecords);

            // 分析学习曲线
            const learningCurveAnalysis = this.analyzeLearningCurve(matchRecords);

            // 生成配置建议
            const suggestions = this.generateConfigSuggestions({
                winRateAnalysis,
                scoreStabilityAnalysis,
                rankingDistributionAnalysis,
                learningCurveAnalysis
            });

            return suggestions;
        } catch (error) {
            console.error(`分析玩家历史数据失败: ${uid}`, error);
            return this.getDefaultSuggestions();
        }
    }

    /**
     * 分析胜率趋势
     */
    private analyzeWinRate(metrics: any, records: any[]): {
        trend: 'improving' | 'stable' | 'declining';
        confidence: number;
        recentWinRate: number;
        overallWinRate: number;
    } {
        const overallWinRate = metrics.totalWins / metrics.totalMatches;

        // 分析最近10场比赛的胜率
        const recentRecords = records.slice(-10);
        const recentWins = recentRecords.filter(r => r.rank === 1).length;
        const recentWinRate = recentWins / recentRecords.length;

        let trend: 'improving' | 'stable' | 'declining';
        if (recentWinRate > overallWinRate + 0.1) {
            trend = 'improving';
        } else if (recentWinRate < overallWinRate - 0.1) {
            trend = 'declining';
        } else {
            trend = 'stable';
        }

        return {
            trend,
            confidence: Math.min(records.length / 20, 1), // 基于数据量的置信度
            recentWinRate,
            overallWinRate
        };
    }

    /**
     * 分析分数稳定性
     */
    private analyzeScoreStability(records: any[]): {
        stability: 'high' | 'medium' | 'low';
        scoreVariance: number;
        averageScore: number;
    } {
        const scores = records.map(r => r.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // 计算分数方差
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / averageScore;

        let stability: 'high' | 'medium' | 'low';
        if (coefficientOfVariation < 0.2) {
            stability = 'high';
        } else if (coefficientOfVariation < 0.4) {
            stability = 'medium';
        } else {
            stability = 'low';
        }

        return {
            stability,
            scoreVariance: variance,
            averageScore
        };
    }

    /**
     * 分析排名分布
     */
    private analyzeRankingDistribution(records: any[]): {
        distribution: 'top_heavy' | 'balanced' | 'bottom_heavy';
        averageRank: number;
        top3Percentage: number;
    } {
        const ranks = records.map(r => r.rank);
        const averageRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
        const top3Count = ranks.filter(r => r <= 3).length;
        const top3Percentage = top3Count / ranks.length;

        let distribution: 'top_heavy' | 'balanced' | 'bottom_heavy';
        if (averageRank < 2.5) {
            distribution = 'top_heavy';
        } else if (averageRank < 3.5) {
            distribution = 'balanced';
        } else {
            distribution = 'bottom_heavy';
        }

        return {
            distribution,
            averageRank,
            top3Percentage
        };
    }

    /**
     * 分析学习曲线
     */
    private analyzeLearningCurve(records: any[]): {
        learningSpeed: 'fast' | 'medium' | 'slow';
        improvementRate: number;
        plateauDetected: boolean;
    } {
        if (records.length < 10) {
            return { learningSpeed: 'medium', improvementRate: 0, plateauDetected: false };
        }

        // 将记录分为前半段和后半段
        const midPoint = Math.floor(records.length / 2);
        const firstHalf = records.slice(0, midPoint);
        const secondHalf = records.slice(midPoint);

        const firstHalfAvgScore = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
        const secondHalfAvgScore = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;

        const improvementRate = (secondHalfAvgScore - firstHalfAvgScore) / firstHalfAvgScore;

        let learningSpeed: 'fast' | 'medium' | 'slow';
        if (improvementRate > 0.2) {
            learningSpeed = 'fast';
        } else if (improvementRate > 0.05) {
            learningSpeed = 'medium';
        } else {
            learningSpeed = 'slow';
        }

        // 检测学习平台期（最近5场比赛分数变化很小）
        const recentScores = records.slice(-5).map(r => r.score);
        const recentVariance = this.calculateVariance(recentScores);
        const plateauDetected = recentVariance < 1000; // 分数变化小于1000认为进入平台期

        return {
            learningSpeed,
            improvementRate,
            plateauDetected
        };
    }

    /**
     * 计算方差
     */
    private calculateVariance(values: number[]): number {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    }

    /**
     * 生成配置建议
     */
    private generateConfigSuggestions(analysis: any): {
        learningRateAdjustment: number;
        rankingModeSuggestion: RankingMode;
        adaptiveModeSuggestion: AdaptiveMode;
        scoreThresholdAdjustments: any[];
        confidence: number;
    } {
        const { winRateAnalysis, scoreStabilityAnalysis, rankingDistributionAnalysis, learningCurveAnalysis } = analysis;

        // 学习率调整建议
        let learningRateAdjustment = 0;
        if (winRateAnalysis.trend === 'improving' && learningCurveAnalysis.learningSpeed === 'fast') {
            learningRateAdjustment = 0.05; // 增加学习率
        } else if (winRateAnalysis.trend === 'declining' || learningCurveAnalysis.plateauDetected) {
            learningRateAdjustment = -0.03; // 降低学习率
        }

        // 排名模式建议
        let rankingModeSuggestion: RankingMode = 'hybrid';
        if (scoreStabilityAnalysis.stability === 'high' && rankingDistributionAnalysis.distribution === 'top_heavy') {
            rankingModeSuggestion = 'segment_based'; // 稳定且表现好的玩家使用段位模式
        } else if (scoreStabilityAnalysis.stability === 'low') {
            rankingModeSuggestion = 'score_based'; // 不稳定的玩家使用分数模式
        }

        // 自适应模式建议
        let adaptiveModeSuggestion: AdaptiveMode = 'learning';
        if (learningCurveAnalysis.learningSpeed === 'fast' && winRateAnalysis.trend === 'improving') {
            adaptiveModeSuggestion = 'learning'; // 学习能力强且进步的玩家
        } else if (learningCurveAnalysis.plateauDetected) {
            adaptiveModeSuggestion = 'dynamic'; // 进入平台期的玩家使用动态模式
        } else if (scoreStabilityAnalysis.stability === 'high') {
            adaptiveModeSuggestion = 'static'; // 稳定的玩家使用静态模式
        }

        // 分数门槛调整建议
        const scoreThresholdAdjustments = this.generateScoreThresholdAdjustments(analysis);

        // 计算整体置信度
        const confidence = Math.min(
            (winRateAnalysis.confidence +
                Math.min(analysis.records?.length || 0, 20) / 20) / 2,
            1
        );

        return {
            learningRateAdjustment,
            rankingModeSuggestion,
            adaptiveModeSuggestion,
            scoreThresholdAdjustments,
            confidence
        };
    }

    /**
     * 生成分数门槛调整建议
     */
    private generateScoreThresholdAdjustments(analysis: any): any[] {
        const adjustments = [];

        // 基于分数稳定性调整
        if (analysis.scoreStabilityAnalysis.stability === 'low') {
            adjustments.push({
                type: 'expand_thresholds',
                reason: '分数不稳定，扩大分数门槛范围',
                adjustment: { expandRange: 0.2 }
            });
        }

        // 基于排名分布调整
        if (analysis.rankingDistributionAnalysis.distribution === 'bottom_heavy') {
            adjustments.push({
                type: 'lower_thresholds',
                reason: '排名偏低，降低分数门槛',
                adjustment: { lowerThresholds: 0.15 }
            });
        }

        return adjustments;
    }

    /**
     * 获取默认建议
     */
    private getDefaultSuggestions(): {
        learningRateAdjustment: number;
        rankingModeSuggestion: RankingMode;
        adaptiveModeSuggestion: AdaptiveMode;
        scoreThresholdAdjustments: any[];
        confidence: number;
    } {
        return {
            learningRateAdjustment: 0,
            rankingModeSuggestion: 'hybrid',
            adaptiveModeSuggestion: 'learning',
            scoreThresholdAdjustments: [],
            confidence: 0
        };
    }

    /**
     * 获取玩家性能指标
     */
    private async getPlayerPerformanceMetrics(uid: string): Promise<any> {
        try {
            return await this.ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();
        } catch (error) {
            console.error(`获取玩家性能指标失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 获取玩家比赛记录
     */
    private async getPlayerMatchRecords(uid: string): Promise<any[]> {
        try {
            return await this.ctx.db
                .query("match_results")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .collect();
        } catch (error) {
            console.error(`获取玩家比赛记录失败: ${uid}`, error);
            return [];
        }
    }
}

// 添加缺失的类型定义
interface MatchRankingResult {
    matchId: string;
    rankings: RankingResult[];
    segmentChanges: any[];
    timestamp: string;
}

interface RankingResult {
    uid: string;
    rank: number;
    score: number;
    rankingProbability: number;
    segmentName: SegmentName;
    protectionActive: boolean;
    reason: string;
}

type DatabaseContext = any;

export class ScoreThresholdPlayerController {
    private ctx: DatabaseContext;
    private segmentManager: SegmentManager;
    private intelligentExperienceManager: IntelligentExperienceManager;
    private historicalDataAnalyzer: HistoricalDataAnalyzer;

    constructor(ctx: DatabaseContext) {
        this.ctx = ctx;
        this.segmentManager = new SegmentManager(ctx);
        this.intelligentExperienceManager = new IntelligentExperienceManager(ctx);
        this.historicalDataAnalyzer = new HistoricalDataAnalyzer(ctx);
    }

    // ==================== 游戏流程方法 ====================

    /**
     * 获取推荐种子（游戏开始）
     */
    async getRecommendedSeeds(
        uid: string,
        options: {
            limit?: number;
            gameType?: string;
            preferredDifficulty?: 'practice' | 'balanced' | 'challenge';
        } = {}
    ): Promise<{
        success: boolean;
        recommendedSeeds?: string[];
        reasoning?: string;
        difficulty?: string;
        playerSkillLevel?: string;
        error?: string;
    }> {
        try {
            // 使用智能推荐管理器获取推荐
            const { IntelligentRecommendationManager } = await import("../managers/IntelligentRecommendationManager");
            const recommendationManager = new IntelligentRecommendationManager(this.ctx);

            const result = await recommendationManager.intelligentRecommendSeeds(
                uid,
                options.limit || 3
            );

            return {
                success: true,
                recommendedSeeds: result.recommendation.seeds,
                reasoning: result.reasoning,
                difficulty: result.adaptiveDifficulty,
                playerSkillLevel: result.playerSkillLevel
            };

        } catch (error) {
            console.error('获取推荐种子失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
    async settleMatchAIAndHumanScore(
        matchId: string,
        playerScores: Array<{ uid: string; segmentName: SegmentName; score: number; seed: string; }>,
        aiCount: number
    ): Promise<{ uid?: string, rank: number, score: number }[]> {
        const targetRanks: RankingResult[] = await this.calculateRankings(matchId, playerScores);
        const aiScores: { uid?: string, rank: number, score: number }[] = this.generateAIScoresForTargetRanks(aiCount, targetRanks);
        const humanScores: { uid?: string, rank: number, score: number }[] = targetRanks.map(r => ({ uid: r.uid, rank: r.rank, score: r.score }));
        humanScores.forEach(async p => {
            const pscore = playerScores.find(s => s.uid === p.uid);
            await this.ctx.db.insert("match_results", {
                matchId,
                seed: pscore?.seed,
                uid: p.uid,
                score: pscore?.score,
                rank: p.rank,
                points: 0,
                segmentName: pscore?.segmentName,
                createdAt: new Date().toISOString()
            });
        });
        await this.autoUpdatePlayerConfigsAfterMatch(targetRanks);
        return [...aiScores, ...humanScores].sort((a, b) => a.rank - b.rank);
    }

    /**
     * 获取比赛参与者信息
     */
    private async getMatchParticipants(matchId: string): Promise<any[]> {
        try {
            // 从比赛配置中获取参与者信息
            const matchConfig = await this.ctx.db
                .query("score_threshold_match_configs")
                .withIndex("by_matchId", (q: any) => q.eq("matchId", matchId))
                .unique();

            if (matchConfig) {
                // 如果有配置的比赛，返回配置的参与者
                const participants = [];

                // 添加人类玩家
                if (matchConfig.humanScore !== undefined) {
                    participants.push({
                        uid: matchConfig.uid,
                        score: matchConfig.humanScore,
                        isAI: false
                    });
                }

                // 注意：AI分数在玩家提交分数后才生成，这里不返回AI
                // AI数量和配置在创建match时已确定，但分数需要智能生成
                return participants;
            }

            // 如果没有配置，返回默认数量的AI对手（分数为0，等待后续生成）
            return await this.generateIntelligentAIOpponents(undefined, 3); // 默认3个AI

        } catch (error) {
            console.error('获取比赛参与者失败:', error);
            return await this.generateIntelligentAIOpponents(undefined, 3); // 默认3个AI
        }
    }

    /**
     * 生成智能AI对手（基于match配置）
     */
    private async generateIntelligentAIOpponents(
        playerSkillLevel: string = 'normal',
        aiCount: number = 3
    ): Promise<any[]> {
        // AI数量在创建match时已确定，这里直接使用
        // 根据玩家技能水平调整AI难度范围
        const difficultyConfig = {
            'beginner': { min: 600, max: 900 },
            'normal': { min: 800, max: 1200 },
            'advanced': { min: 1000, max: 1400 },
            'expert': { min: 1200, max: 1600 }
        };

        const config = difficultyConfig[playerSkillLevel as keyof typeof difficultyConfig] || difficultyConfig.normal;

        const aiScores = [];

        // 生成阶梯式AI分数，确保有挑战性
        for (let i = 0; i < aiCount; i++) {
            const baseScore = config.min + (config.max - config.min) * (i / (aiCount - 1));
            // 添加随机波动，但保持阶梯性
            const variation = (Math.random() - 0.5) * 100;
            const score = Math.max(100, Math.floor(baseScore + variation));
            aiScores.push(score);
        }

        // 按分数降序排序，确保AI难度递增
        aiScores.sort((a, b) => b - a);

        return aiScores.map((score, index) => ({
            uid: `ai_${index + 1}`,
            score: score,
            isAI: true,
            difficulty: this.getDifficultyByIndex(index, aiCount)
        }));
    }



    /**
     * 基于多个真人玩家的目标排名生成AI分数
     * 支持多个真人玩家，每个玩家都有目标排名
     */
    private generateAIScoresForTargetRanks(
        aiCount: number,
        targetRanks: { uid: string, score: number, rank: number }[],
    ): { rank: number, score: number }[] {
        if (targetRanks.length === 0 || aiCount === 0) {
            return [];
        }

        const totalParticipants = targetRanks.length + aiCount;
        const aiScores: { rank: number, score: number }[] = [];

        // 按目标排名排序，确保处理顺序正确
        const sortedTargetRanks = [...targetRanks].sort((a, b) => a.rank - b.rank);

        // 计算所有AI需要填充的排名位置
        const allRankPositions = Array.from({ length: totalParticipants }, (_, i) => i + 1);
        const humanRankPositions = sortedTargetRanks.map(r => r.rank);
        const aiRankPositions = allRankPositions.filter(pos => !humanRankPositions.includes(pos));

        // 为每个AI位置生成合适的分数
        for (let i = 0; i < aiCount; i++) {
            const aiRank = aiRankPositions[i];
            const aiScore = this.generateAIScoreForPosition(
                aiRank,
                sortedTargetRanks,
                totalParticipants
            );
            aiScores.push({ rank: aiRank, score: aiScore });
        }

        // 按分数降序排序，确保排名正确
        aiScores.sort((a, b) => a.rank - b.rank);

        return aiScores;
    }

    /**
     * 为特定AI排名位置生成合适的分数
     */
    private generateAIScoreForPosition(
        aiRank: number,
        humanPlayers: { uid: string, score: number, rank: number }[],
        totalParticipants: number
    ): number {
        // 找到排名在AI之前和之后的人类玩家
        const playersBeforeAI = humanPlayers.filter(p => p.rank < aiRank);
        const playersAfterAI = humanPlayers.filter(p => p.rank > aiRank);

        let targetScore: number;

        if (playersBeforeAI.length > 0 && playersAfterAI.length > 0) {
            // AI在两个人类玩家之间，分数应该在这两个分数之间
            const maxScoreBefore = Math.max(...playersBeforeAI.map(p => p.score));
            const minScoreAfter = Math.min(...playersAfterAI.map(p => p.score));
            targetScore = (maxScoreBefore + minScoreAfter) / 2;
        } else if (playersBeforeAI.length > 0) {
            // AI在所有人类玩家之后，分数应该比最低的人类分数还低
            const minHumanScore = Math.min(...humanPlayers.map(p => p.score));
            targetScore = Math.max(100, minHumanScore - 50 - Math.random() * 30);
        } else if (playersAfterAI.length > 0) {
            // AI在所有人类玩家之前，分数应该比最高的人类分数还高
            const maxHumanScore = Math.max(...humanPlayers.map(p => p.score));
            targetScore = maxHumanScore + 50 + Math.random() * 30;
        } else {
            // 没有人类玩家，生成默认分数
            targetScore = 500 + Math.random() * 200;
        }

        // 添加随机波动，避免分数过于整齐
        const variation = (Math.random() - 0.5) * 40;
        return Math.max(100, Math.floor(targetScore + variation));
    }

    /**
     * 计算玩家目标排名
     */
    private calculateTargetRank(skillLevel: string, totalParticipants: number): number {
        // 根据技能水平确定目标排名范围
        const targetRankingRanges = {
            'beginner': { min: Math.floor(totalParticipants * 0.6), max: Math.floor(totalParticipants * 0.8) }, // 60%-80%
            'normal': { min: Math.floor(totalParticipants * 0.4), max: Math.floor(totalParticipants * 0.7) },   // 40%-70%
            'advanced': { min: Math.floor(totalParticipants * 0.2), max: Math.floor(totalParticipants * 0.6) }, // 20%-60%
            'expert': { min: 1, max: Math.floor(totalParticipants * 0.5) }                                     // 1-50%
        };

        const targetRange = targetRankingRanges[skillLevel as keyof typeof targetRankingRanges] || targetRankingRanges.normal;

        // 返回目标排名范围的中点
        return Math.floor((targetRange.min + targetRange.max) / 2);
    }

    /**
     * 智能调整AI分数，确保玩家获得合适的排名
     */
    private adjustAIScoresForTargetRanking(
        playerScore: number,
        initialAIScores: number[],
        totalParticipants: number,
        skillLevel: string
    ): number[] {
        // 根据技能水平确定目标排名范围
        const targetRankingRanges = {
            'beginner': { min: Math.floor(totalParticipants * 0.6), max: Math.floor(totalParticipants * 0.8) }, // 60%-80%
            'normal': { min: Math.floor(totalParticipants * 0.4), max: Math.floor(totalParticipants * 0.7) },   // 40%-70%
            'advanced': { min: Math.floor(totalParticipants * 0.2), max: Math.floor(totalParticipants * 0.6) }, // 20%-60%
            'expert': { min: 1, max: Math.floor(totalParticipants * 0.5) }                                     // 1-50%
        };

        const targetRange = targetRankingRanges[skillLevel as keyof typeof targetRankingRanges] || targetRankingRanges.normal;
        const targetRank = Math.floor((targetRange.min + targetRange.max) / 2);

        // 计算当前预估排名
        const allScores = [playerScore, ...initialAIScores];
        allScores.sort((a, b) => b - a);
        const currentPlayerRank = allScores.indexOf(playerScore) + 1;

        // 如果当前排名接近目标排名，直接返回
        if (Math.abs(currentPlayerRank - targetRank) <= 1) {
            return initialAIScores;
        }

        // 调整AI分数以达到目标排名
        const adjustedScores = [...initialAIScores];

        if (currentPlayerRank > targetRank) {
            // 玩家排名太低，需要降低一些AI分数
            const adjustmentFactor = 0.8;
            for (let i = 0; i < Math.min(2, adjustedScores.length); i++) {
                adjustedScores[i] = Math.floor(adjustedScores[i] * adjustmentFactor);
            }
        } else {
            // 玩家排名太高，需要提高一些AI分数
            const adjustmentFactor = 1.2;
            for (let i = 0; i < Math.min(2, adjustedScores.length); i++) {
                adjustedScores[i] = Math.floor(adjustedScores[i] * adjustmentFactor);
            }
        }

        // 确保分数在合理范围内
        return adjustedScores.map(score => Math.max(100, Math.min(score, 2000)));
    }

    /**
     * 根据AI数量和位置确定难度等级
     */
    private getDifficultyByIndex(index: number, totalCount: number): string {
        if (totalCount <= 3) {
            // 3个或更少AI：简单难度分布
            return index === 0 ? 'hard' : index === 1 ? 'medium' : 'easy';
        } else if (totalCount <= 5) {
            // 4-5个AI：中等难度分布
            if (index === 0) return 'hard';
            if (index === 1) return 'medium_hard';
            if (index === 2) return 'medium';
            if (index === 3) return 'easy';
            return 'very_easy';
        } else {
            // 6个以上AI：精细难度分布
            if (index === 0) return 'very_hard';
            if (index === 1) return 'hard';
            if (index === 2) return 'medium_hard';
            if (index === 3) return 'medium';
            if (index === 4) return 'medium_easy';
            if (index === 5) return 'easy';
            return 'very_easy';
        }
    }

    /**
     * 计算最终排名（智能排名计算）
     */
    private async calculateFinalRankings(participants: any[], humanUid: string, humanScore: number): Promise<any[]> {
        // 创建包含人类玩家的完整参与者列表
        const allParticipants = [
            ...participants,
            {
                uid: humanUid,
                score: humanScore,
                isAI: false
            }
        ];

        // 转换为 calculateRankings 需要的格式
        const playerScores = allParticipants.map(participant => ({
            uid: participant.uid,
            score: participant.score,
            points: 0 // 临时积分，稍后计算
        }));

        // 使用智能排名计算
        const rankings = await this.calculateRankings("temp_match_id", playerScores);

        // 转换为原有格式，保持兼容性
        return rankings.map(ranking => ({
            uid: ranking.uid,
            score: ranking.score,
            rank: ranking.rank,
            isAI: participants.find(p => p.uid === ranking.uid)?.isAI || false
        }));
    }

    /**
     * 计算积分
     */
    private calculatePoints(rank: number, totalParticipants: number): number {
        // 基础积分规则
        const basePoints: Record<number, number> = {
            1: 100,
            2: 60,
            3: 30,
            4: 10
        };

        // 根据参与人数调整积分
        const participantMultiplier = Math.max(1, totalParticipants / 4);

        return Math.floor((basePoints[rank] || 0) * participantMultiplier);
    }

    /**
     * 获取玩家游戏历史
     */
    async getPlayerGameHistory(
        uid: string,
        limit: number = 20
    ): Promise<{
        success: boolean;
        matches?: any[];
        error?: string;
    }> {
        try {
            const matches = await this.ctx.db
                .query("match_results")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(limit);

            return {
                success: true,
                matches: matches.map((match: any) => ({
                    matchId: match.matchId,
                    seedId: match.seed,
                    score: match.score,
                    rank: match.rank,
                    points: match.points,
                    segmentName: match.segmentName,
                    createdAt: match.createdAt
                }))
            };

        } catch (error) {
            console.error('获取玩家游戏历史失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }

    /**
     * 获取种子难度统计
     */
    async getSeedDifficultyStats(seedId: string): Promise<{
        success: boolean;
        difficulty?: string;
        averageScore?: number;
        completionRate?: number;
        playerCount?: number;
        error?: string;
    }> {
        try {
            // 从种子统计缓存中获取数据
            const stats = await this.ctx.db
                .query("seed_statistics_cache")
                .withIndex("by_seed", (q: any) => q.eq("seed", seedId))
                .unique();

            if (stats) {
                return {
                    success: true,
                    difficulty: stats.difficulty,
                    averageScore: stats.averageScore,
                    completionRate: stats.completionRate,
                    playerCount: stats.playerCount
                };
            }

            // 如果没有缓存数据，返回默认值
            return {
                success: true,
                difficulty: 'normal',
                averageScore: 1000,
                completionRate: 0.8,
                playerCount: 0
            };

        } catch (error) {
            console.error('获取种子难度统计失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }

    /**
     * 获取玩家技能等级
     */
    async getPlayerSkillLevel(uid: string): Promise<{
        success: boolean;
        skillLevel?: string;
        confidence?: number;
        error?: string;
    }> {
        try {
            // 使用增量统计管理器获取技能等级
            const { IncrementalStatisticsManager } = await import("../managers/IncrementalStatisticsManager");
            const statsManager = new IncrementalStatisticsManager(this.ctx);
            const skillLevel = await statsManager.getPlayerSkillLevel(uid);

            return {
                success: true,
                skillLevel,
                confidence: 0.8 // 可以从统计数据中计算
            };

        } catch (error) {
            console.error('获取玩家技能等级失败:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }

    /**
     * 处理比赛结束
     */
    async processMatchEnd(
        matchId: string,
        playerScores: Array<{ uid: string; score: number; points: number }>
    ): Promise<MatchRankingResult> {
        try {
            // 1. 计算玩家排名
            const rankings = await this.calculateRankings(matchId, playerScores);

            // 2. 检查段位变化
            const segmentChanges = await this.checkSegmentChanges(rankings, matchId);

            // 3. 更新玩家数据
            await this.updatePlayerData(rankings, matchId);

            // 4. 记录比赛结果
            await this.recordMatchResults(matchId, rankings, segmentChanges);

            // 5. 基于历史数据智能更新玩家配置
            await this.autoUpdatePlayerConfigsAfterMatch(rankings);

            return {
                matchId,
                rankings,
                segmentChanges,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`处理比赛结束失败: ${matchId}`, error);
            throw error;
        }
    }


    /**
     * 计算玩家排名
     */
    async calculateRankings(
        matchId: string,
        playerScores: Array<{ uid: string; score: number, rank?: number }>
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

                // 确定最终排名 - 根据参与者数量动态获取基础概率
                const participantCount = playerScores.length;
                const baseProbs = this.getBaseRankingProbabilities(config.segmentName, participantCount);
                const rank = this.determineFinalRank(
                    player.score,
                    baseProbs,
                    config.adaptiveMode,
                    config.learningRate
                );

                // 检查保护状态
                const protectionStatus = await this.getPlayerProtectionStatus(player.uid);
                const protectionActive = protectionStatus?.protectionLevel ? protectionStatus.protectionLevel > 0 : false;

                // 生成排名原因
                const reason = this.generateRankReason(player.score, rank, config, 0.5);

                rankings.push({
                    uid: player.uid,
                    rank,
                    score: player.score,
                    rankingProbability: 0.5,
                    segmentName: config.segmentName,
                    protectionActive,
                    reason
                });
            } catch (error) {
                console.error(`计算玩家 ${player.uid} 排名失败:`, error);
                // 添加默认排名
                rankings.push({
                    uid: player.uid,
                    rank: playerScores.length,
                    score: player.score,
                    rankingProbability: 0.1,
                    segmentName: 'bronze' as SegmentName,
                    protectionActive: false,
                    reason: '排名计算失败，使用默认排名'
                });
            }
        }

        return rankings;
    }

    /**
     * 确定最终排名
     */
    private determineFinalRank(
        score: number,
        baseProbabilities: number[],
        adaptiveMode: AdaptiveMode,
        learningRate: number
    ): number {
        if (adaptiveMode === 'static') {
            return this.determineStaticRank(score, baseProbabilities);
        } else if (adaptiveMode === 'dynamic') {
            return this.determineDynamicRank(score, baseProbabilities);
        } else {
            return this.determineLearningRank(score, baseProbabilities, learningRate);
        }
    }

    /**
     * 静态排名确定
     */
    private determineStaticRank(score: number, baseProbabilities: number[]): number {
        // 基于分数和概率分布确定排名
        const normalizedScore = Math.min(Math.max(score / 10000, 0), 1); // 将分数标准化到0-1
        let cumulative = 0;
        for (let i = 0; i < baseProbabilities.length; i++) {
            cumulative += baseProbabilities[i];
            if (normalizedScore <= cumulative) {
                return i + 1;
            }
        }
        return baseProbabilities.length;
    }

    /**
     * 动态排名确定
     */
    private determineDynamicRank(score: number, baseProbabilities: number[]): number {
        // 添加随机性，避免完全确定性的排名
        const normalizedScore = Math.min(Math.max(score / 10000, 0), 1);
        const randomFactor = Math.random() * 0.2 - 0.1; // ±10% 随机性
        const adjustedScore = Math.max(0, Math.min(1, normalizedScore + randomFactor));
        return this.determineStaticRank(adjustedScore * 10000, baseProbabilities);
    }

    /**
     * 学习排名确定
     */
    private determineLearningRank(
        score: number,
        baseProbabilities: number[],
        learningRate: number
    ): number {
        // 根据学习率调整分数
        const adjustedScore = score * (1 + learningRate);
        return this.determineStaticRank(adjustedScore, baseProbabilities);
    }

    /**
     * 检查段位变化
     */
    async checkSegmentChanges(rankings: RankingResult[], matchId: string): Promise<any[]> {
        const segmentChanges = [];

        for (const ranking of rankings) {
            try {
                // 使用段位管理器检查变化
                const changeResult = await this.segmentManager.checkAndProcessSegmentChange(
                    ranking.uid,
                    0 // 临时使用0，因为RankingResult没有points属性
                );

                if (changeResult.changed) {
                    segmentChanges.push({
                        uid: ranking.uid,
                        matchId,
                        oldSegment: ranking.segmentName,
                        newSegment: changeResult.newSegment,
                        changeType: changeResult.changeType,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error(`检查玩家 ${ranking.uid} 段位变化失败:`, error);
            }
        }

        return segmentChanges;
    }

    /**
     * 获取基础排名概率
     * 直接从 DEFAULT_SCORE_THRESHOLDS 获取，不再需要 DEFAULT_RANKING_PROBABILITIES
     */
    private getBaseRankingProbabilities(segmentName: SegmentName, participantCount: number): number[] {
        try {
            // 直接从系统配置获取基础概率
            const { getDefaultRankingProbabilities } = require("../config/config");
            return getDefaultRankingProbabilities(segmentName, participantCount);
        } catch (error) {
            console.error(`获取基础排名概率失败: ${segmentName}, ${participantCount}`, error);
            // 返回默认概率
            return [0.25, 0.25, 0.25, 0.25];
        }
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
     * 获取玩家配置
     */
    async getPlayerConfig(uid: string): Promise<ScoreThresholdConfig | null> {
        try {
            const config = await this.ctx.db
                .query("score_threshold_configs")
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
            const existing = await this.getPlayerConfig(uid);
            if (!existing) {
                console.warn(`玩家配置不存在，无法更新: ${uid}`);
                return false;
            }

            await this.ctx.db.patch(existing._id, {
                ...updates,
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`更新玩家配置失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 重置玩家配置
     */
    async resetPlayerConfig(uid: string): Promise<boolean> {
        try {
            const existing = await this.getPlayerConfig(uid);
            if (!existing) {
                return false;
            }

            // 获取默认配置
            const defaultConfig = getDefaultScoreThresholds(existing.segmentName);

            await this.ctx.db.patch(existing._id, {
                scoreThresholds: defaultConfig,
                adaptiveMode: getAdaptiveMode(existing.segmentName),
                learningRate: getLearningRate(existing.segmentName),
                rankingMode: getRankingMode(existing.segmentName),
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error(`重置玩家配置失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 获取玩家段位信息
     */
    async getPlayerSegmentInfo(uid: string): Promise<{ currentSegment: SegmentName } | null> {
        try {
            const config = await this.getPlayerConfig(uid);
            return config ? { currentSegment: config.segmentName } : null;
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
            const status = await this.ctx.db
                .query("player_protection_status")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            return status;
        } catch (error) {
            console.error(`获取玩家保护状态失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 检查段位变化
     */
    async checkSegmentChange(uid: string, changeType: ChangeType): Promise<{
        shouldChange: boolean;
        changeType?: ChangeType;
        reason?: string;
    }> {
        try {
            if (changeType === 'promotion') {
                const canPromote = await this.segmentManager.canPromote(uid);
                return {
                    shouldChange: canPromote,
                    changeType: 'promotion',
                    reason: canPromote ? '满足升级条件' : '不满足升级条件'
                };
            } else {
                const canDemote = await this.segmentManager.canDemote(uid);
                return {
                    shouldChange: canDemote,
                    changeType: 'demotion',
                    reason: canDemote ? '满足降级条件' : '受保护机制保护'
                };
            }
        } catch (error) {
            console.error(`检查段位变化失败: ${uid}`, error);
            return { shouldChange: false, reason: '检查失败' };
        }
    }

    // ==================== 数据更新和记录方法 ====================

    /**
     * 更新玩家数据
     */
    async updatePlayerData(rankings: RankingResult[], matchId: string): Promise<void> {
        for (const ranking of rankings) {
            try {
                // 更新性能指标
                await this.updatePlayerPerformanceMetrics(ranking);

                // 更新保护状态
                await this.updatePlayerProtectionStatus(ranking);
            } catch (error) {
                console.error(`更新玩家数据失败: ${ranking.uid}`, error);
            }
        }
    }

    /**
     * 更新玩家性能指标
     */
    async updatePlayerPerformanceMetrics(ranking: RankingResult): Promise<void> {
        try {
            const existing = await this.getPlayerPerformanceMetrics(ranking.uid);

            if (existing) {
                // 更新现有记录
                await this.ctx.db.patch(existing._id, {
                    totalMatches: existing.totalMatches + 1,
                    totalWins: existing.totalWins + (ranking.rank === 1 ? 1 : 0),
                    totalScore: existing.totalScore + ranking.score,
                    lastMatchScore: ranking.score,
                    lastMatchRank: ranking.rank,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // 创建新记录
                await this.ctx.db.insert("player_performance_metrics", {
                    uid: ranking.uid,
                    totalMatches: 1,
                    totalWins: ranking.rank === 1 ? 1 : 0,
                    totalScore: ranking.score,
                    averageScore: ranking.score,
                    lastMatchScore: ranking.score,
                    lastMatchRank: ranking.rank,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`更新玩家性能指标失败: ${ranking.uid}`, error);
        }
    }

    /**
     * 更新玩家保护状态
     */
    async updatePlayerProtectionStatus(ranking: RankingResult): Promise<void> {
        try {
            const existing = await this.getPlayerProtectionStatus(ranking.uid);
            const config = await this.getPlayerConfig(ranking.uid);

            if (!config) return;

            const protectionConfig = await this.segmentManager.getSegmentProtectionConfig(config.segmentName);

            if (existing) {
                // 更新保护状态
                let newProtectionLevel = existing.protectionLevel;

                if (ranking.rank === 1) {
                    // 获胜增加保护
                    newProtectionLevel = Math.min(
                        (protectionConfig?.protectionLevel ?? DEFAULT_PROTECTION_LEVEL) + 1,
                        5
                    ) as ProtectionLevel;
                } else if (ranking.rank > 3) {
                    // 排名较低减少保护
                    newProtectionLevel = Math.max(newProtectionLevel - 1, 0) as ProtectionLevel;
                }

                await this.ctx.db.patch(existing._id, {
                    protectionLevel: newProtectionLevel,
                    gracePeriod: protectionConfig?.gracePeriod ?? DEFAULT_GRACE_PERIOD,
                    protectionDuration: protectionConfig?.protectionDuration ?? DEFAULT_PROTECTION_DURATION,
                    lastUpdateMatch: ranking.uid,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // 创建新的保护状态
                await this.ctx.db.insert("player_protection_status", {
                    uid: ranking.uid,
                    protectionLevel: protectionConfig?.protectionLevel ?? DEFAULT_PROTECTION_LEVEL,
                    gracePeriod: protectionConfig?.gracePeriod ?? DEFAULT_GRACE_PERIOD,
                    protectionDuration: protectionConfig?.protectionDuration ?? DEFAULT_PROTECTION_DURATION,
                    isActive: true,
                    lastUpdateMatch: ranking.uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`更新玩家保护状态失败: ${ranking.uid}`, error);
        }
    }

    /**
     * 记录比赛结果
     */
    async recordMatchResults(
        matchId: string,
        rankings: RankingResult[],
        segmentChanges: any[]
    ): Promise<void> {
        try {
            // 记录比赛结果
            await this.ctx.db.insert("match_results", {
                matchId,
                rankings,
                segmentChanges,
                timestamp: new Date().toISOString()
            });

            // 为每个玩家记录比赛记录
            for (const ranking of rankings) {
                await this.ctx.db.insert("match_results", {
                    matchId,
                    seed: "default", // 需要从比赛数据中获取实际种子
                    uid: ranking.uid,
                    score: ranking.score,
                    rank: ranking.rank,
                    segmentName: ranking.segmentName,
                    createdAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`记录比赛结果失败: ${matchId}`, error);
        }
    }

    /**
     * 获取系统统计信息
     */
    async getSystemStatistics(): Promise<any> {
        try {
            const totalPlayers = await this.ctx.db.query("score_threshold_configs").collect();
            const totalMatches = await this.ctx.db.query("match_results").collect();

            return {
                totalPlayers: totalPlayers.length,
                totalMatches: totalMatches.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取系统统计信息失败:', error);
            return null;
        }
    }

    /**
     * 创建玩家默认配置
     */
    async createPlayerDefaultConfig(uid: string, segmentName?: SegmentName): Promise<ScoreThresholdConfig> {
        try {
            const segment = segmentName || 'bronze';
            const defaultConfig = getDefaultScoreThresholds(segment);

            const config: ScoreThresholdConfig = {
                uid,
                segmentName: segment,
                scoreThresholds: defaultConfig,
                maxRank: 8,
                adaptiveMode: getAdaptiveMode(segment),
                learningRate: getLearningRate(segment),
                autoAdjustLearningRate: true,
                rankingMode: getRankingMode(segment),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 保存到数据库
            const result = await this.ctx.db.insert("score_threshold_configs", config);
            return { ...config, _id: result };
        } catch (error) {
            console.error(`创建玩家默认配置失败: ${uid}`, error);
            throw error;
        }
    }

    /**
     * 调整分数门槛配置
     */
    async adjustScoreThresholds(uid: string, adjustments: any): Promise<boolean> {
        try {
            return await this.updatePlayerConfig(uid, adjustments);
        } catch (error) {
            console.error(`调整分数门槛配置失败: ${uid}`, error);
            return false;
        }
    }

    /**
     * 切换自适应模式
     */
    async toggleAdaptiveMode(uid: string): Promise<void> {
        try {
            const config = await this.getPlayerConfig(uid);
            if (!config) return;

            const modes: AdaptiveMode[] = ['static', 'dynamic', 'learning'];
            const currentIndex = modes.indexOf(config.adaptiveMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            const nextMode = modes[nextIndex];

            await this.updatePlayerConfig(uid, { adaptiveMode: nextMode });
        } catch (error) {
            console.error(`切换自适应模式失败: ${uid}`, error);
        }
    }

    /**
     * 基于历史数据智能更新玩家配置
     */
    async updatePlayerConfigBasedOnHistory(uid: string): Promise<{
        updated: boolean;
        changes: any[];
        confidence: number;
        reason: string;
    }> {
        try {
            // 分析玩家历史数据
            const analysis = await this.historicalDataAnalyzer.analyzePlayerHistory(uid);

            if (analysis.confidence < 0.3) {
                return {
                    updated: false,
                    changes: [],
                    confidence: analysis.confidence,
                    reason: '历史数据不足，无法生成可靠的配置建议'
                };
            }

            // 获取当前配置
            const currentConfig = await this.getPlayerConfig(uid);
            if (!currentConfig) {
                return {
                    updated: false,
                    changes: [],
                    confidence: 0,
                    reason: '玩家配置未找到'
                };
            }

            const changes = [];
            let hasChanges = false;

            // 1. 调整学习率
            if (Math.abs(analysis.learningRateAdjustment) > 0.01) {
                const newLearningRate = Math.max(0.01, Math.min(0.3,
                    currentConfig.learningRate + analysis.learningRateAdjustment));

                if (Math.abs(newLearningRate - currentConfig.learningRate) > 0.01) {
                    changes.push({
                        field: 'learningRate',
                        oldValue: currentConfig.learningRate,
                        newValue: newLearningRate,
                        reason: analysis.learningRateAdjustment > 0 ? '基于进步趋势增加学习率' : '基于表现下降降低学习率'
                    });
                    hasChanges = true;
                }
            }

            // 2. 更新排名模式
            if (analysis.rankingModeSuggestion !== currentConfig.rankingMode) {
                changes.push({
                    field: 'rankingMode',
                    oldValue: currentConfig.rankingMode,
                    newValue: analysis.rankingModeSuggestion,
                    reason: '基于历史表现分析优化排名模式'
                });
                hasChanges = true;
            }

            // 3. 更新自适应模式
            if (analysis.adaptiveModeSuggestion !== currentConfig.adaptiveMode) {
                changes.push({
                    field: 'adaptiveMode',
                    oldValue: currentConfig.adaptiveMode,
                    newValue: analysis.adaptiveModeSuggestion,
                    reason: '基于学习曲线分析优化自适应模式'
                });
                hasChanges = true;
            }

            // 4. 应用分数门槛调整
            if (analysis.scoreThresholdAdjustments.length > 0) {
                const adjustedThresholds = this.applyScoreThresholdAdjustments(
                    currentConfig.scoreThresholds,
                    analysis.scoreThresholdAdjustments
                );

                if (JSON.stringify(adjustedThresholds) !== JSON.stringify(currentConfig.scoreThresholds)) {
                    changes.push({
                        field: 'scoreThresholds',
                        oldValue: currentConfig.scoreThresholds,
                        newValue: adjustedThresholds,
                        reason: '基于分数稳定性分析调整分数门槛'
                    });
                    hasChanges = true;
                }
            }

            // 如果有变化，更新配置
            if (hasChanges) {
                const updates: Partial<ScoreThresholdConfig> = {};

                changes.forEach(change => {
                    if (change.field === 'learningRate') {
                        updates.learningRate = change.newValue as number;
                    } else if (change.field === 'rankingMode') {
                        updates.rankingMode = change.newValue as RankingMode;
                    } else if (change.field === 'adaptiveMode') {
                        updates.adaptiveMode = change.newValue as AdaptiveMode;
                    } else if (change.field === 'scoreThresholds') {
                        updates.scoreThresholds = change.newValue as any[];
                    }
                });

                updates.updatedAt = new Date().toISOString();
                await this.updatePlayerConfig(uid, updates);

                return {
                    updated: true,
                    changes,
                    confidence: analysis.confidence,
                    reason: `基于历史数据分析成功更新了 ${changes.length} 项配置`
                };
            }

            return {
                updated: false,
                changes: [],
                confidence: analysis.confidence,
                reason: '当前配置已是最优，无需更新'
            };

        } catch (error) {
            console.error(`基于历史数据更新玩家配置失败: ${uid}`, error);
            return {
                updated: false,
                changes: [],
                confidence: 0,
                reason: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }

    /**
     * 应用分数门槛调整
     */
    private applyScoreThresholdAdjustments(
        thresholds: any[],
        adjustments: any[]
    ): any[] {
        const adjustedThresholds = JSON.parse(JSON.stringify(thresholds));

        adjustments.forEach(adjustment => {
            if (adjustment.type === 'expand_thresholds') {
                // 扩大分数门槛范围
                adjustedThresholds.forEach((threshold: any) => {
                    const range = threshold.maxScore - threshold.minScore;
                    const expandAmount = range * adjustment.adjustment.expandRange;
                    threshold.minScore = Math.max(0, threshold.minScore - expandAmount / 2);
                    threshold.maxScore = threshold.maxScore + expandAmount / 2;
                });
            } else if (adjustment.type === 'lower_thresholds') {
                // 降低分数门槛
                adjustedThresholds.forEach((threshold: any) => {
                    const range = threshold.maxScore - threshold.minScore;
                    const lowerAmount = range * adjustment.adjustment.lowerThresholds;
                    threshold.minScore = Math.max(0, threshold.minScore - lowerAmount);
                    threshold.maxScore = Math.max(threshold.minScore + 100, threshold.maxScore - lowerAmount);
                });
            }
        });

        return adjustedThresholds;
    }

    /**
     * 获取玩家配置优化建议
     */
    async getPlayerConfigOptimizationSuggestions(uid: string): Promise<{
        suggestions: any[];
        confidence: number;
        lastAnalysis: string;
    }> {
        try {
            const analysis = await this.historicalDataAnalyzer.analyzePlayerHistory(uid);
            const currentConfig = await this.getPlayerConfig(uid);

            if (!currentConfig) {
                return {
                    suggestions: [],
                    confidence: 0,
                    lastAnalysis: new Date().toISOString()
                };
            }

            const suggestions = [];

            // 学习率建议
            if (analysis.learningRateAdjustment !== 0) {
                suggestions.push({
                    type: 'learningRate',
                    current: currentConfig.learningRate,
                    suggested: Math.max(0.01, Math.min(0.3,
                        currentConfig.learningRate + analysis.learningRateAdjustment)),
                    reason: analysis.learningRateAdjustment > 0 ?
                        '基于进步趋势建议增加学习率' :
                        '基于表现下降建议降低学习率',
                    priority: 'medium'
                });
            }

            // 排名模式建议
            if (analysis.rankingModeSuggestion !== currentConfig.rankingMode) {
                suggestions.push({
                    type: 'rankingMode',
                    current: currentConfig.rankingMode,
                    suggested: analysis.rankingModeSuggestion,
                    reason: '基于历史表现分析建议优化排名模式',
                    priority: 'high'
                });
            }

            // 自适应模式建议
            if (analysis.adaptiveModeSuggestion !== currentConfig.adaptiveMode) {
                suggestions.push({
                    type: 'adaptiveMode',
                    current: currentConfig.adaptiveMode,
                    suggested: analysis.adaptiveModeSuggestion,
                    reason: '基于学习曲线分析建议优化自适应模式',
                    priority: 'high'
                });
            }

            // 分数门槛建议
            if (analysis.scoreThresholdAdjustments.length > 0) {
                analysis.scoreThresholdAdjustments.forEach(adjustment => {
                    suggestions.push({
                        type: 'scoreThresholds',
                        current: '当前配置',
                        suggested: adjustment.reason,
                        reason: adjustment.reason,
                        priority: 'low'
                    });
                });
            }

            return {
                suggestions,
                confidence: analysis.confidence,
                lastAnalysis: new Date().toISOString()
            };

        } catch (error) {
            console.error(`获取玩家配置优化建议失败: ${uid}`, error);
            return {
                suggestions: [],
                confidence: 0,
                lastAnalysis: new Date().toISOString()
            };
        }
    }

    /**
     * 比赛结束后自动更新玩家配置
     */
    private async autoUpdatePlayerConfigsAfterMatch(rankings: RankingResult[]): Promise<void> {
        try {
            // 为每个玩家尝试更新配置
            for (const ranking of rankings) {
                try {
                    // 检查是否有足够的历史数据（至少5场比赛）
                    const metrics = await this.getPlayerPerformanceMetrics(ranking.uid);
                    if (metrics && metrics.totalMatches >= 5) {
                        // 异步更新配置，不阻塞比赛结果返回
                        this.updatePlayerConfigBasedOnHistory(ranking.uid).catch(error => {
                            console.error(`自动更新玩家 ${ranking.uid} 配置失败:`, error);
                        });
                    }
                } catch (error) {
                    console.error(`检查玩家 ${ranking.uid} 历史数据失败:`, error);
                }
            }
        } catch (error) {
            console.error('自动更新玩家配置失败:', error);
        }
    }

    /**
     * 批量更新多个玩家的配置
     */
    async batchUpdatePlayerConfigs(uids: string[]): Promise<{
        total: number;
        updated: number;
        failed: number;
        results: any[];
    }> {
        const results = [];
        let updated = 0;
        let failed = 0;

        for (const uid of uids) {
            try {
                const result = await this.updatePlayerConfigBasedOnHistory(uid);
                results.push({ uid, ...result });

                if (result.updated) {
                    updated++;
                }
            } catch (error) {
                console.error(`批量更新玩家 ${uid} 配置失败:`, error);
                results.push({
                    uid,
                    updated: false,
                    changes: [],
                    confidence: 0,
                    reason: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`
                });
                failed++;
            }
        }

        return {
            total: uids.length,
            updated,
            failed,
            results
        };
    }


}
