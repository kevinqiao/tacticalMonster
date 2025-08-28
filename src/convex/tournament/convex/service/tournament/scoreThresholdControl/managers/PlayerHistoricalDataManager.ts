/**
 * 玩家历史数据管理器
 * 负责分析玩家历史数据，为智能体验管理提供数据支持
 * 修复：段位计算现在基于积分而不是分数和排名
 */

import {
    EmotionalState,
    ExperienceTarget,
    LearningPatterns,
    PlayerHistoricalData
} from "../config/types";

// 直接定义段位配置，避免依赖 pointRules
const SEGMENT_POINT_REQUIREMENTS: { [key: string]: number } = {
    'bronze': 0, 'silver': 500, 'gold': 2000, 'platinum': 5000, 'diamond': 10000
};

const SEGMENT_LEVELS: { [key: string]: number } = {
    'bronze': 1, 'silver': 2, 'gold': 3, 'platinum': 4, 'diamond': 5
};

export class PlayerHistoricalDataManager {
    private ctx: any;

    constructor(ctx: any) {
        this.ctx = ctx;
    }

    /**
     * 获取玩家历史数据
     */
    async getPlayerHistoricalData(uid: string): Promise<PlayerHistoricalData | null> {
        try {
            const matchHistory = await this.getPlayerMatchHistory(uid);
            const performanceMetrics = await this.getPlayerPerformanceMetrics(uid);

            if (!matchHistory || !performanceMetrics) {
                return null;
            }

            const learningPatterns = this.analyzeLearningPatterns(matchHistory);
            const rankingHistory = this.buildRankingHistory(matchHistory);


            return {
                uid,
                matchHistory,
                performanceMetrics,
                learningPatterns,
                rankingHistory,
            };
        } catch (error) {
            console.error(`获取玩家历史数据失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 分析学习模式
     */
    private analyzeLearningPatterns(matchHistory: any[]): LearningPatterns {
        if (matchHistory.length < 5) {
            return this.getDefaultLearningPatterns();
        }

        const scores = matchHistory.map(m => m.score);
        const ranks = matchHistory.map(m => m.rank);

        // 计算适应速度（分数变化率）
        const scoreChanges = scores.slice(1).map((score, i) => score - scores[i]);
        const adaptationSpeed = Math.abs(scoreChanges.reduce((sum, change) => sum + change, 0)) / scoreChanges.length / 1000;

        // 计算波动指数（排名变化的标准差）
        const rankChanges = ranks.slice(1).map((rank, i) => Math.abs(rank - ranks[i]));
        const volatilityIndex = Math.sqrt(rankChanges.reduce((sum, change) => sum + change * change, 0) / rankChanges.length) / 4;

        // 计算一致性分数
        const rankVariance = ranks.reduce((sum, rank) => sum + Math.pow(rank - 2.5, 2), 0) / ranks.length;
        const consistencyScore = Math.max(0, 1 - rankVariance / 4);

        // 计算改进趋势
        const earlyScores = scores.slice(0, Math.floor(scores.length / 2));
        const lateScores = scores.slice(Math.floor(scores.length / 2));
        const earlyAvg = earlyScores.reduce((sum, score) => sum + score, 0) / earlyScores.length;
        const lateAvg = lateScores.reduce((sum, score) => sum + score, 0) / lateScores.length;
        const improvementTrend = (lateAvg - earlyAvg) / Math.max(earlyAvg, 1000);

        // 计算学习效率
        const learningEfficiency = Math.max(0, Math.min(1, (1 - volatilityIndex) * (1 + improvementTrend) / 2));

        return {
            adaptationSpeed: Math.min(1, adaptationSpeed),
            volatilityIndex: Math.min(1, volatilityIndex),
            consistencyScore: Math.max(0, Math.min(1, consistencyScore)),
            improvementTrend: Math.max(-1, Math.min(1, improvementTrend)),
            lastLearningRate: 0.1, // 从配置中获取
            learningEfficiency: Math.max(0, Math.min(1, learningEfficiency))
        };
    }

    /**
     * 构建排名历史
     */
    private buildRankingHistory(matchHistory: any[]): any[] {
        return matchHistory.map(match => ({
            matchId: match.matchId,
            rank: match.rank,
            score: match.score,
            timestamp: match.createdAt,
            segmentName: match.segmentName
        }));
    }




    /**
     * 获取默认学习模式
     */
    private getDefaultLearningPatterns(): LearningPatterns {
        return {
            adaptationSpeed: 0.5,
            volatilityIndex: 0.5,
            consistencyScore: 0.5,
            improvementTrend: 0,
            lastLearningRate: 0.1,
            learningEfficiency: 0.5
        };
    }

    /**
     * 获取玩家比赛历史
     */
    private async getPlayerMatchHistory(uid: string): Promise<any[]> {
        try {
            return await this.ctx.db.query("match_results")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .collect();
        } catch (error) {
            console.error(`获取玩家比赛历史失败: ${uid}`, error);
            return [];
        }
    }

    /**
     * 获取玩家性能指标
     */
    private async getPlayerPerformanceMetrics(uid: string): Promise<any> {
        try {
            return await this.ctx.db.query("player_performance_metrics")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();
        } catch (error) {
            console.error(`获取玩家性能指标失败: ${uid}`, error);
            return null;
        }
    }




    /**
     * 分析玩家情绪状态
     */
    analyzeEmotionalState(historicalData: PlayerHistoricalData): EmotionalState {
        const recentMatches = historicalData.matchHistory.slice(-10);
        const performanceMetrics = historicalData.performanceMetrics;
        const learningPatterns = historicalData.learningPatterns;

        if (recentMatches.length === 0) {
            return this.getDefaultEmotionalState();
        }

        // 计算自信度（基于最近胜率和排名）
        const recentWins = recentMatches.filter(m => m.rank === 1).length;
        const confidence = recentWins / recentMatches.length;

        // 计算挫败感（基于连续失败和排名下降）
        const consecutiveLosses = this.calculateConsecutiveLosses(recentMatches);
        const frustration = Math.min(1, consecutiveLosses / 5);

        // 计算动机水平（基于改进趋势和一致性）
        const motivation = (learningPatterns.improvementTrend + 1) / 2 * learningPatterns.consistencyScore;

        // 计算满意度（基于整体表现）
        const satisfaction = (confidence + (1 - frustration) + motivation) / 3;

        // 确定整体状态
        let overallState: EmotionalState['overallState'];
        if (confidence > 0.7 && frustration < 0.3) {
            overallState = 'encouraged';
        } else if (frustration > 0.6) {
            overallState = 'frustrated';
        } else if (motivation > 0.6) {
            overallState = 'challenged';
        } else {
            overallState = 'balanced';
        }

        return {
            confidence: Math.max(0, Math.min(1, confidence)),
            frustration: Math.max(0, Math.min(1, frustration)),
            motivation: Math.max(0, Math.min(1, motivation)),
            satisfaction: Math.max(0, Math.min(1, satisfaction)),
            overallState
        };
    }

    /**
     * 计算连续失败次数
     */
    private calculateConsecutiveLosses(matches: any[]): number {
        let consecutiveLosses = 0;
        for (let i = matches.length - 1; i >= 0; i--) {
            if (matches[i].rank > 2) { // 假设前2名算胜利
                consecutiveLosses++;
            } else {
                break;
            }
        }
        return consecutiveLosses;
    }

    /**
     * 获取默认情绪状态
     */
    private getDefaultEmotionalState(): EmotionalState {
        return {
            confidence: 0.5,
            frustration: 0.3,
            motivation: 0.6,
            satisfaction: 0.5,
            overallState: 'balanced'
        };
    }

    /**
     * 确定体验目标
     */
    determineExperienceTarget(emotionalState: EmotionalState, learningPatterns: LearningPatterns): ExperienceTarget {
        if (emotionalState.overallState === 'frustrated') {
            return {
                primary: 'encouragement',
                secondary: 'confidence_building',
                intensity: 'high',
                duration: 'short'
            };
        } else if (emotionalState.overallState === 'encouraged') {
            return {
                primary: 'challenge',
                secondary: 'skill_development',
                intensity: 'medium',
                duration: 'medium'
            };
        } else if (emotionalState.overallState === 'challenged') {
            return {
                primary: 'growth',
                secondary: 'motivation_maintenance',
                intensity: 'medium',
                duration: 'long'
            };
        } else {
            return {
                primary: 'balance',
                secondary: 'skill_development',
                intensity: 'low',
                duration: 'medium'
            };
        }
    }

    // ==================== Seed难度分析相关方法 ====================

    /**
     * 获取多个seed的比赛统计信息
     */
    async getMultipleSeedStatistics(seeds: string[]): Promise<{
        [seed: string]: {
            totalMatches: number;
            averageScore: number;
            averageRank: number;
            winRate: number;
            playerCount: number;
            difficultyTrend: 'increasing' | 'decreasing' | 'stable';
        };
    }> {
        try {
            const results: { [key: string]: any } = {};

            for (const seed of seeds) {
                const matches = await this.getSeedMatchHistory(seed);

                if (matches.length === 0) {
                    results[seed] = {
                        totalMatches: 0,
                        averageScore: 2000,
                        averageRank: 2.5,
                        winRate: 0.5,
                        playerCount: 0,
                        difficultyTrend: 'stable' as const
                    };
                    continue;
                }

                const scores = matches.map((m: any) => m.score);
                const ranks = matches.map((m: any) => m.rank);
                const wins = matches.filter((m: any) => m.rank === 1).length;
                const uniquePlayers = new Set(matches.map((m: any) => m.uid)).size;

                // 计算难度趋势（基于最近10场比赛的分数变化）
                const recentMatches = matches.slice(-10);
                let difficultyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

                if (recentMatches.length >= 5) {
                    const earlyScores = recentMatches.slice(0, Math.floor(recentMatches.length / 2));
                    const lateScores = recentMatches.slice(Math.floor(recentMatches.length / 2));
                    const earlyAvg = earlyScores.reduce((sum: number, m: any) => sum + m.score, 0) / earlyScores.length;
                    const lateAvg = lateScores.reduce((sum: number, m: any) => sum + m.score, 0) / lateScores.length;

                    if (lateAvg < earlyAvg * 0.9) {
                        difficultyTrend = 'increasing'; // 分数下降，难度增加
                    } else if (lateAvg > earlyAvg * 1.1) {
                        difficultyTrend = 'decreasing'; // 分数上升，难度降低
                    }
                }

                results[seed] = {
                    totalMatches: matches.length,
                    averageScore: scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length,
                    averageRank: ranks.reduce((sum: number, rank: number) => sum + rank, 0) / ranks.length,
                    winRate: wins / matches.length,
                    playerCount: uniquePlayers,
                    difficultyTrend
                };
            }

            return results;
        } catch (error) {
            console.error("获取多个seed统计信息失败:", error);
            return {};
        }
    }

    /**
     * 分析seed对不同技能水平玩家的影响
     */
    async analyzeSeedPlayerSkillImpact(seed: string): Promise<{
        beginner: { count: number; averageScore: number; winRate: number; };
        intermediate: { count: number; averageScore: number; winRate: number; };
        advanced: { count: number; averageScore: number; winRate: number; };
    }> {
        try {
            const matches = await this.getSeedMatchHistory(seed);

            if (matches.length === 0) {
                return {
                    beginner: { count: 0, averageScore: 2000, winRate: 0.5 },
                    intermediate: { count: 0, averageScore: 2000, winRate: 0.5 },
                    advanced: { count: 0, averageScore: 2000, winRate: 0.5 }
                };
            }

            // 根据玩家历史表现分类技能水平
            const playerSkillLevels = await this.classifyPlayersBySkillLevel(matches);

            const beginner = this.calculateSkillLevelStats(matches, playerSkillLevels, 'beginner');
            const intermediate = this.calculateSkillLevelStats(matches, playerSkillLevels, 'intermediate');
            const advanced = this.calculateSkillLevelStats(matches, playerSkillLevels, 'advanced');

            return { beginner, intermediate, advanced };
        } catch (error) {
            console.error(`分析seed玩家技能影响失败: ${seed}`, error);
            return {
                beginner: { count: 0, averageScore: 2000, winRate: 0.5 },
                intermediate: { count: 0, averageScore: 2000, winRate: 0.5 },
                advanced: { count: 0, averageScore: 2000, winRate: 0.5 }
            };
        }
    }

    /**
     * 根据历史表现分类玩家技能水平
     */
    private async classifyPlayersBySkillLevel(matches: any[]): Promise<{ [uid: string]: 'beginner' | 'intermediate' | 'advanced' }> {
        const playerSkillLevels: { [uid: string]: 'beginner' | 'intermediate' | 'advanced' } = {};

        for (const match of matches) {
            if (playerSkillLevels[match.uid]) continue;

            try {
                const playerData = await this.getPlayerHistoricalData(match.uid);
                if (!playerData) {
                    playerSkillLevels[match.uid] = 'intermediate';
                    continue;
                }

                // 基于历史表现分类
                const { averageScore } = playerData.performanceMetrics;
                const { learningEfficiency } = playerData.learningPatterns;

                // 计算胜率（基于历史比赛记录）
                const playerMatches = playerData.matchHistory || [];
                const winRate = playerMatches.length > 0 ?
                    playerMatches.filter(m => m.rank === 1).length / playerMatches.length : 0.5;

                if (averageScore < 2000 || winRate < 0.3 || learningEfficiency < 0.3) {
                    playerSkillLevels[match.uid] = 'beginner';
                } else if (averageScore > 6000 || winRate > 0.7 || learningEfficiency > 0.7) {
                    playerSkillLevels[match.uid] = 'advanced';
                } else {
                    playerSkillLevels[match.uid] = 'intermediate';
                }
            } catch (error) {
                playerSkillLevels[match.uid] = 'intermediate';
            }
        }

        return playerSkillLevels;
    }

    /**
     * 计算特定技能水平的统计数据
     */
    private calculateSkillLevelStats(
        matches: any[],
        playerSkillLevels: { [uid: string]: 'beginner' | 'intermediate' | 'advanced' },
        skillLevel: 'beginner' | 'intermediate' | 'advanced'
    ): { count: number; averageScore: number; winRate: number; } {
        const levelMatches = matches.filter(m => playerSkillLevels[m.uid] === skillLevel);

        if (levelMatches.length === 0) {
            return { count: 0, averageScore: 2000, winRate: 0.5 };
        }

        const scores = levelMatches.map(m => m.score);
        const wins = levelMatches.filter(m => m.rank === 1).length;

        return {
            count: levelMatches.length,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            winRate: wins / levelMatches.length
        };
    }

    // ==================== Seed难度分析系统 ====================

    /**
     * 获取所有可用的seed列表
     */
    async getAllSeeds(): Promise<string[]> {
        try {
            const matches = await this.ctx.db
                .query("match_results")
                .filter((q: any) => q.neq(q.field("seed"), undefined))
                .collect();

            const uniqueSeeds = new Set<string>();
            matches.forEach((match: any) => {
                if (match.seed) {
                    uniqueSeeds.add(match.seed);
                }
            });

            return Array.from(uniqueSeeds);
        } catch (error) {
            console.error('获取所有seed失败:', error);
            return [];
        }
    }

    /**
     * 获取指定seed的完整比赛历史
     */
    async getSeedMatchHistory(seed: string): Promise<any[]> {
        try {
            return await this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("seed"), seed))
                .collect();
        } catch (error) {
            console.error(`获取seed比赛历史失败: ${seed}`, error);
            return [];
        }
    }

    /**
     * 分页获取seed的比赛历史数据（适用于大数据量）
     */
    async getSeedMatchHistoryPaginated(
        seed: string,
        page: number = 1,
        pageSize: number = 1000,
        filters?: {
            minScore?: number;
            maxScore?: number;
            minRank?: number;
            maxRank?: number;
            dateRange?: { start: Date; end: Date };
        }
    ): Promise<{
        matches: any[];
        totalCount: number;
        hasMore: boolean;
        page: number;
        pageSize: number;
    }> {
        try {
            let query = this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("seed"), seed));

            // 应用过滤器
            if (filters?.minScore !== undefined) {
                query = query.filter((q: any) => q.gte(q.field("score"), filters.minScore!));
            }
            if (filters?.maxScore !== undefined) {
                query = query.filter((q: any) => q.lte(q.field("score"), filters.maxScore!));
            }
            if (filters?.minRank !== undefined) {
                query = query.filter((q: any) => q.gte(q.field("rank"), filters.minRank!));
            }
            if (filters?.maxRank !== undefined) {
                query = query.filter((q: any) => q.lte(q.field("rank"), filters.maxRank!));
            }
            if (filters?.dateRange) {
                query = query.filter((q: any) =>
                    q.and(
                        q.gte(q.field("createdAt"), filters.dateRange!.start.getTime()),
                        q.lte(q.field("createdAt"), filters.dateRange!.end.getTime())
                    )
                );
            }

            // 获取总数
            const totalCount = await query.count();

            // 分页查询
            const offset = (page - 1) * pageSize;
            const matches = await query
                .order("desc")
                .paginate({ numItems: pageSize, cursor: offset > 0 ? offset.toString() : undefined });

            return {
                matches: matches.page,
                totalCount,
                hasMore: offset + pageSize < totalCount,
                page,
                pageSize
            };
        } catch (error) {
            console.error('分页获取seed比赛历史失败:', error);
            throw new Error('Failed to get paginated seed match history');
        }
    }

    /**
     * 流式处理大量seed数据
     */
    async *processSeedDataStream(
        seed: string,
        batchSize: number = 1000,
        filters?: any
    ): AsyncGenerator<any[], void, unknown> {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const result = await this.getSeedMatchHistoryPaginated(seed, page, batchSize, filters);
            yield result.matches;

            hasMore = result.hasMore;
            page++;
        }
    }

    /**
     * 计算seed的完整难度系数
     */
    async calculateSeedDifficultyCoefficient(seed: string): Promise<{
        seed: string;
        difficultyCoefficient: number;
        difficultyLevel: 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard';
        confidence: number;
        metrics: {
            averageScore: number;
            averageRank: number;
            winRate: number;
            scoreDistribution: { min: number; max: number; stdDev: number; };
            rankDistribution: { top3: number; middle: number; bottom: number; };
            playerSkillImpact: {
                beginner: { count: number; averageScore: number; winRate: number; };
                intermediate: { count: number; averageScore: number; winRate: number; };
                advanced: { count: number; averageScore: number; winRate: number; };
            };
            volatilityIndex: number;
            consistencyScore: number;
        };
        analysis: {
            primaryFactors: string[];
            secondaryFactors: string[];
            recommendations: string[];
        };
    }> {
        try {
            // 获取seed的所有比赛数据
            const matches = await this.getSeedMatchHistory(seed);

            if (matches.length === 0) {
                return this.getDefaultSeedDifficulty(seed);
            }

            // 计算基础统计指标
            const basicStats = this.calculateBasicSeedStatistics(matches);

            // 分析玩家技能水平影响
            const playerSkillImpact = await this.analyzeSeedPlayerSkillImpact(seed);

            // 计算波动性和一致性
            const volatilityIndex = this.calculateSeedVolatility(matches);
            const consistencyScore = this.calculateSeedConsistency(matches);

            // 计算综合难度系数
            const difficultyCoefficient = this.calculateComprehensiveDifficulty(
                basicStats,
                playerSkillImpact,
                volatilityIndex,
                consistencyScore
            );

            // 确定难度等级
            const difficultyLevel = this.determineDifficultyLevel(difficultyCoefficient);

            // 计算置信度
            const confidence = this.calculateAnalysisConfidence(matches.length, basicStats);

            // 生成分析报告
            const analysis = this.generateSeedAnalysisReport(
                basicStats,
                playerSkillImpact,
                difficultyLevel,
                volatilityIndex,
                consistencyScore
            );

            return {
                seed,
                difficultyCoefficient,
                difficultyLevel,
                confidence,
                metrics: {
                    ...basicStats,
                    playerSkillImpact,
                    volatilityIndex,
                    consistencyScore
                },
                analysis
            };
        } catch (error) {
            console.error(`计算seed难度系数失败: ${seed}`, error);
            return this.getDefaultSeedDifficulty(seed);
        }
    }

    /**
     * 计算seed的基础统计指标
     */
    private calculateBasicSeedStatistics(matches: any[]): {
        averageScore: number;
        averageRank: number;
        winRate: number;
        scoreDistribution: { min: number; max: number; stdDev: number; };
        rankDistribution: { top3: number; middle: number; bottom: number; };
    } {
        const scores = matches.map(m => m.score);
        const ranks = matches.map(m => m.rank);
        const wins = matches.filter(m => m.rank === 1).length;

        // 分数分布
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        const scoreStdDev = Math.sqrt(scoreVariance);

        // 排名分布
        const totalMatches = matches.length;
        const top3Count = ranks.filter(r => r <= 3).length;
        const middleCount = ranks.filter(r => r > 3 && r <= Math.ceil(totalMatches * 0.7)).length;
        const bottomCount = totalMatches - top3Count - middleCount;

        return {
            averageScore: avgScore,
            averageRank: ranks.reduce((sum, rank) => sum + rank, 0) / totalMatches,
            winRate: wins / totalMatches,
            scoreDistribution: {
                min: minScore,
                max: maxScore,
                stdDev: scoreStdDev
            },
            rankDistribution: {
                top3: top3Count / totalMatches,
                middle: middleCount / totalMatches,
                bottom: bottomCount / totalMatches
            }
        };
    }

    /**
     * 计算seed的波动性指数
     */
    private calculateSeedVolatility(matches: any[]): number {
        if (matches.length < 2) return 0.5;

        // 按时间排序
        const sortedMatches = matches.sort((a, b) =>
            (a.timestamp || a.createdAt || 0) - (b.timestamp || b.createdAt || 0)
        );

        // 计算分数变化的标准差
        const scoreChanges = [];
        for (let i = 1; i < sortedMatches.length; i++) {
            const change = Math.abs(sortedMatches[i].score - sortedMatches[i - 1].score);
            scoreChanges.push(change);
        }

        if (scoreChanges.length === 0) return 0.5;

        const avgChange = scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length;
        const changeVariance = scoreChanges.reduce((sum, change) =>
            sum + Math.pow(change - avgChange, 2), 0) / scoreChanges.length;

        // 标准化到0-1范围
        return Math.min(1, Math.sqrt(changeVariance) / 2000);
    }

    /**
     * 计算seed的一致性分数
     */
    private calculateSeedConsistency(matches: any[]): number {
        if (matches.length < 5) return 0.5;

        const scores = matches.map(m => m.score);
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        // 计算分数的一致性（基于变异系数）
        const variance = scores.reduce((sum, score) =>
            sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avgScore;

        // 转换为一致性分数（变异系数越小，一致性越高）
        return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
    }

    /**
     * 计算综合难度系数
     */
    private calculateComprehensiveDifficulty(
        basicStats: any,
        playerSkillImpact: any,
        volatilityIndex: number,
        consistencyScore: number
    ): number {
        // 权重配置
        const weights = {
            averageScore: 0.25,      // 平均分数权重
            winRate: 0.20,           // 胜率权重
            rankDistribution: 0.20,  // 排名分布权重
            playerSkillImpact: 0.20, // 玩家技能影响权重
            volatilityIndex: 0.10,   // 波动性权重
            consistencyScore: 0.05   // 一致性权重
        };

        // 分数难度（分数越高越容易）
        const scoreDifficulty = Math.max(0, Math.min(1, (10000 - basicStats.averageScore) / 10000));

        // 胜率难度（胜率越低越难）
        const winRateDifficulty = 1 - basicStats.winRate;

        // 排名分布难度（前3名比例越低越难）
        const rankDifficulty = 1 - basicStats.rankDistribution.top3;

        // 玩家技能影响难度（新手玩家表现越差越难）
        const skillDifficulty = this.calculateSkillBasedDifficulty(playerSkillImpact);

        // 波动性难度（波动性越高越难）
        const volatilityDifficulty = volatilityIndex;

        // 一致性难度（一致性越低越难）
        const consistencyDifficulty = 1 - consistencyScore;

        // 计算加权平均
        const totalDifficulty =
            scoreDifficulty * weights.averageScore +
            winRateDifficulty * weights.winRate +
            rankDifficulty * weights.rankDistribution +
            skillDifficulty * weights.playerSkillImpact +
            volatilityDifficulty * weights.volatilityIndex +
            consistencyDifficulty * weights.consistencyScore;

        // 转换为0-100的难度系数
        return Math.round(totalDifficulty * 100);
    }

    /**
     * 计算基于玩家技能的难度
     */
    private calculateSkillBasedDifficulty(playerSkillImpact: any): number {
        const { beginner, intermediate, advanced } = playerSkillImpact;

        if (beginner.count === 0 && intermediate.count === 0 && advanced.count === 0) {
            return 0.5; // 默认中等难度
        }

        // 计算各技能水平的加权平均表现
        const totalMatches = beginner.count + intermediate.count + advanced.count;
        const beginnerPerformance = beginner.count > 0 ? (beginner.averageScore / 10000) * beginner.winRate : 0;
        const intermediatePerformance = intermediate.count > 0 ? (intermediate.averageScore / 10000) * intermediate.winRate : 0;
        const advancedPerformance = advanced.count > 0 ? (advanced.averageScore / 10000) * advanced.winRate : 0;

        // 加权平均
        const weightedPerformance = (
            beginnerPerformance * beginner.count +
            intermediatePerformance * intermediate.count +
            advancedPerformance * advanced.count
        ) / totalMatches;

        // 转换为难度（表现越好，难度越低）
        return 1 - weightedPerformance;
    }

    /**
     * 确定难度等级
     */
    private determineDifficultyLevel(difficultyCoefficient: number): 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard' {
        if (difficultyCoefficient < 20) return 'very_easy';
        if (difficultyCoefficient < 40) return 'easy';
        if (difficultyCoefficient < 60) return 'normal';
        if (difficultyCoefficient < 80) return 'hard';
        return 'very_hard';
    }

    /**
     * 计算分析置信度
     */
    private calculateAnalysisConfidence(matchCount: number, basicStats: any): number {
        // 基于数据量的基础置信度
        let baseConfidence = Math.min(1, matchCount / 100);

        // 基于数据质量的调整
        const scoreRange = basicStats.scoreDistribution.max - basicStats.scoreDistribution.min;
        const qualityAdjustment = Math.min(1, scoreRange / 5000); // 分数范围越大，数据质量越高

        // 基于分布均匀性的调整
        const distributionBalance = 1 - Math.abs(
            basicStats.rankDistribution.top3 - 0.25
        ) - Math.abs(
            basicStats.rankDistribution.middle - 0.5
        ) - Math.abs(
            basicStats.rankDistribution.bottom - 0.25
        );

        const finalConfidence = (baseConfidence + qualityAdjustment + distributionBalance) / 3;
        return Math.max(0.1, Math.min(1, finalConfidence));
    }

    /**
     * 生成seed分析报告
     */
    private generateSeedAnalysisReport(
        basicStats: any,
        playerSkillImpact: any,
        difficultyLevel: string,
        volatilityIndex: number,
        consistencyScore: number
    ): {
        primaryFactors: string[];
        secondaryFactors: string[];
        recommendations: string[];
    } {
        const primaryFactors = [];
        const secondaryFactors = [];
        const recommendations = [];

        // 主要因素分析
        if (basicStats.averageScore < 3000) {
            primaryFactors.push('平均分数偏低，整体难度较高');
        } else if (basicStats.averageScore > 7000) {
            primaryFactors.push('平均分数偏高，整体难度较低');
        }

        if (basicStats.winRate < 0.2) {
            primaryFactors.push('胜率极低，获胜难度很大');
        } else if (basicStats.winRate > 0.8) {
            primaryFactors.push('胜率极高，获胜难度很小');
        }

        // 次要因素分析
        if (volatilityIndex > 0.7) {
            secondaryFactors.push('分数波动性较大，比赛结果不稳定');
        }
        if (consistencyScore < 0.3) {
            secondaryFactors.push('一致性较差，玩家表现差异大');
        }

        // 玩家技能影响分析
        if (playerSkillImpact.beginner.count > 0 && playerSkillImpact.beginner.winRate < 0.1) {
            secondaryFactors.push('新手玩家表现极差，学习曲线陡峭');
        }
        if (playerSkillImpact.advanced.count > 0 && playerSkillImpact.advanced.winRate > 0.9) {
            secondaryFactors.push('高级玩家表现极好，挑战性不足');
        }

        // 生成建议
        if (difficultyLevel === 'very_hard') {
            recommendations.push('建议降低AI难度，增加新手保护机制');
            recommendations.push('考虑调整牌序生成算法，减少极端情况');
        } else if (difficultyLevel === 'very_easy') {
            recommendations.push('建议提高AI难度，增加挑战性');
            recommendations.push('考虑调整牌序，增加策略复杂度');
        }

        if (volatilityIndex > 0.7) {
            recommendations.push('建议优化牌序生成，减少随机性');
        }

        if (consistencyScore < 0.3) {
            recommendations.push('建议平衡牌序设计，减少运气因素');
        }

        return { primaryFactors, secondaryFactors, recommendations };
    }

    /**
     * 获取默认seed难度（当数据不足时）
     */
    private getDefaultSeedDifficulty(seed: string): any {
        return {
            seed,
            difficultyCoefficient: 50,
            difficultyLevel: 'normal' as const,
            confidence: 0.1,
            metrics: {
                averageScore: 5000,
                averageRank: 2.5,
                winRate: 0.25,
                scoreDistribution: { min: 1000, max: 9000, stdDev: 2000 },
                rankDistribution: { top3: 0.25, middle: 0.5, bottom: 0.25 },
                playerSkillImpact: {
                    beginner: { count: 0, averageScore: 3000, winRate: 0.1 },
                    intermediate: { count: 0, averageScore: 5000, winRate: 0.25 },
                    advanced: { count: 0, averageScore: 7000, winRate: 0.6 }
                },
                volatilityIndex: 0.5,
                consistencyScore: 0.5
            },
            analysis: {
                primaryFactors: ['数据不足，无法进行准确分析'],
                secondaryFactors: ['建议收集更多比赛数据'],
                recommendations: ['增加数据收集，提高分析准确性']
            }
        };
    }

    /**
     * 批量分析多个seed的难度
     */
    async analyzeMultipleSeedDifficulties(seeds: string[]): Promise<Map<string, any>> {
        const results = new Map<string, any>();

        for (const seed of seeds) {
            try {
                const analysis = await this.calculateSeedDifficultyCoefficient(seed);
                results.set(seed, analysis);
            } catch (error) {
                console.error(`分析seed ${seed} 失败:`, error);
                results.set(seed, {
                    seed,
                    error: error instanceof Error ? error.message : '未知错误',
                    difficultyCoefficient: 50,
                    difficultyLevel: 'normal'
                });
            }
        }

        return results;
    }

    /**
     * 获取seed难度统计报告
     */
    async getSeedDifficultyReport(includeRecommendations: boolean = true): Promise<{
        totalSeeds: number;
        difficultyDistribution: { [level: string]: number };
        averageDifficulty: number;
        mostDifficultSeeds: string[];
        easiestSeeds: string[];
        recommendations: string[];
        timestamp: string;
    }> {
        try {
            const allSeeds = await this.getAllSeeds();
            const difficultyAnalysis = await this.analyzeMultipleSeedDifficulties(allSeeds);

            // 统计难度分布
            const difficultyDistribution: { [level: string]: number } = {};
            const difficulties: number[] = [];
            const difficultSeeds: string[] = [];
            const easySeeds: string[] = [];

            difficultyAnalysis.forEach((analysis, seed) => {
                if (analysis.error) return;

                const level = analysis.difficultyLevel;
                difficultyDistribution[level] = (difficultyDistribution[level] || 0) + 1;
                difficulties.push(analysis.difficultyCoefficient);

                if (analysis.difficultyCoefficient > 80) {
                    difficultSeeds.push(seed);
                } else if (analysis.difficultyCoefficient < 20) {
                    easySeeds.push(seed);
                }
            });

            const averageDifficulty = difficulties.length > 0 ?
                difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length : 50;

            const recommendations = includeRecommendations ? [
                '定期分析seed难度分布，保持游戏平衡',
                '根据玩家反馈调整seed生成算法',
                '为不同难度seed设置合适的AI配置',
                '监控极端难度seed，及时调整',
                '建立seed难度评估体系，持续优化'
            ] : [];

            return {
                totalSeeds: allSeeds.length,
                difficultyDistribution,
                averageDifficulty: Math.round(averageDifficulty),
                mostDifficultSeeds: difficultSeeds.slice(0, 5),
                easiestSeeds: easySeeds.slice(0, 5),
                recommendations,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取seed难度报告失败:', error);
            return {
                totalSeeds: 0,
                difficultyDistribution: {},
                averageDifficulty: 50,
                mostDifficultSeeds: [],
                easiestSeeds: [],
                recommendations: ['无法生成报告，请检查数据'],
                timestamp: new Date().toISOString()
            };
        }
    }

    // ==================== 新增实用方法 ====================

    /**
     * 获取玩家技能发展趋势
     */
    async getPlayerSkillTrend(uid: string, timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<{
        trend: 'improving' | 'declining' | 'stable';
        confidence: number;
        metrics: {
            scoreTrend: number;
            rankTrend: number;
            winRateTrend: number;
            consistencyTrend: number;
        };
        recommendations: string[];
    }> {
        try {
            const matchHistory = await this.getPlayerMatchHistory(uid);

            if (!matchHistory || matchHistory.length < 10) {
                return {
                    trend: 'stable',
                    confidence: 0.3,
                    metrics: { scoreTrend: 0, rankTrend: 0, winRateTrend: 0, consistencyTrend: 0 },
                    recommendations: ['需要更多比赛数据来分析趋势']
                };
            }

            // 按时间段分组
            const timeGroups = this.groupMatchesByTime(matchHistory, timeRange);
            const trends = this.calculateTrendsByTimeGroups(timeGroups);

            // 确定整体趋势
            const overallTrend = this.determineOverallTrend(trends);
            const confidence = this.calculateTrendConfidence(matchHistory.length, trends);
            const recommendations = this.generateTrendRecommendations(overallTrend, trends);

            return {
                trend: overallTrend,
                confidence,
                metrics: trends,
                recommendations
            };
        } catch (error) {
            console.error(`获取玩家技能趋势失败: ${uid}`, error);
            return {
                trend: 'stable',
                confidence: 0.1,
                metrics: { scoreTrend: 0, rankTrend: 0, winRateTrend: 0, consistencyTrend: 0 },
                recommendations: ['分析失败，请稍后重试']
            };
        }
    }

    /**
     * 按时间段分组比赛
     */
    private groupMatchesByTime(matchHistory: any[], timeRange: string): any[] {
        const now = Date.now();
        const timeRanges = {
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            quarter: 90 * 24 * 60 * 60 * 1000
        };

        const rangeMs = timeRanges[timeRange as keyof typeof timeRanges] || timeRanges.month;
        const groups: any[] = [];
        const groupCount = 4; // 分成4组
        const groupSize = rangeMs / groupCount;

        for (let i = 0; i < groupCount; i++) {
            const startTime = now - rangeMs + (i * groupSize);
            const endTime = now - rangeMs + ((i + 1) * groupSize);

            const groupMatches = matchHistory.filter(match => {
                const matchTime = match.timestamp || match.createdAt || 0;
                return matchTime >= startTime && matchTime < endTime;
            });

            groups.push({
                period: i + 1,
                startTime,
                endTime,
                matches: groupMatches,
                metrics: this.calculateGroupMetrics(groupMatches)
            });
        }

        return groups;
    }

    /**
     * 计算分组指标
     */
    private calculateGroupMetrics(matches: any[]): any {
        if (matches.length === 0) {
            return { averageScore: 0, averageRank: 0, winRate: 0, consistency: 0 };
        }

        const scores = matches.map(m => m.score);
        const ranks = matches.map(m => m.rank);
        const wins = matches.filter(m => m.rank === 1).length;

        // 计算一致性（基于分数的标准差）
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        const consistency = Math.max(0, 1 - Math.sqrt(variance) / avgScore);

        return {
            averageScore: avgScore,
            averageRank: ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length,
            winRate: wins / matches.length,
            consistency
        };
    }

    /**
     * 计算时间段趋势
     */
    private calculateTrendsByTimeGroups(groups: any[]): any {
        if (groups.length < 2) {
            return { scoreTrend: 0, rankTrend: 0, winRateTrend: 0, consistencyTrend: 0 };
        }

        // 计算各指标的变化趋势
        const scoreTrend = this.calculateMetricTrend(groups, 'averageScore');
        const rankTrend = this.calculateMetricTrend(groups, 'averageRank', true); // 排名越低越好
        const winRateTrend = this.calculateMetricTrend(groups, 'winRate');
        const consistencyTrend = this.calculateMetricTrend(groups, 'consistency');

        return { scoreTrend, rankTrend, winRateTrend, consistencyTrend };
    }

    /**
     * 计算指标趋势
     */
    private calculateMetricTrend(groups: any[], metric: string, reverse: boolean = false): number {
        if (groups.length < 2) return 0;

        const values = groups.map(g => g.metrics[metric]);
        let trend = 0;

        for (let i = 1; i < values.length; i++) {
            const change = values[i] - values[i - 1];
            trend += reverse ? -change : change;
        }

        // 标准化到 -1 到 1 范围
        const maxValue = Math.max(...values);
        return Math.max(-1, Math.min(1, trend / (maxValue * (groups.length - 1))));
    }

    /**
     * 确定整体趋势
     */
    private determineOverallTrend(trends: any): 'improving' | 'declining' | 'stable' {
        const { scoreTrend, rankTrend, winRateTrend, consistencyTrend } = trends;

        // 加权计算整体趋势
        const overallScore = (
            scoreTrend * 0.3 +
            rankTrend * 0.3 +
            winRateTrend * 0.25 +
            consistencyTrend * 0.15
        );

        if (overallScore > 0.2) return 'improving';
        if (overallScore < -0.2) return 'declining';
        return 'stable';
    }

    /**
     * 计算趋势置信度
     */
    private calculateTrendConfidence(matchCount: number, trends: any): number {
        // 基于数据量的基础置信度
        let baseConfidence = Math.min(1, matchCount / 50);

        // 基于趋势一致性的调整
        const { scoreTrend, rankTrend, winRateTrend, consistencyTrend } = trends;
        const trendValues = [scoreTrend, rankTrend, winRateTrend, consistencyTrend];
        const positiveTrends = trendValues.filter(t => t > 0).length;
        const negativeTrends = trendValues.filter(t => t < 0).length;

        const consistencyAdjustment = Math.abs(positiveTrends - negativeTrends) / trendValues.length;

        return Math.max(0.1, Math.min(1, (baseConfidence + consistencyAdjustment) / 2));
    }

    /**
     * 生成趋势建议
     */
    private generateTrendRecommendations(overallTrend: string, trends: any): string[] {
        const recommendations: string[] = [];

        if (overallTrend === 'improving') {
            recommendations.push('技能持续提升，建议尝试更具挑战性的内容');
            recommendations.push('保持当前学习节奏，巩固已掌握的技能');
        } else if (overallTrend === 'declining') {
            recommendations.push('技能有所下降，建议回顾基础策略');
            recommendations.push('考虑调整游戏策略，寻找新的突破点');
        } else {
            recommendations.push('技能保持稳定，建议尝试新的游戏模式');
            recommendations.push('可以挑战更高难度的内容来提升技能');
        }

        // 基于具体指标的建议
        if (trends.consistencyTrend < -0.3) {
            recommendations.push('表现一致性下降，建议练习基础操作');
        }
        if (trends.winRateTrend < -0.3) {
            recommendations.push('胜率下降，建议分析失败原因并调整策略');
        }

        return recommendations;
    }

    /**
     * 获取玩家对比分析
     */
    async getPlayerComparison(uid: string, compareUids: string[]): Promise<{
        playerStats: any;
        comparisons: { [compareUid: string]: any };
        ranking: { uid: string; rank: number; score: number }[];
        insights: string[];
    }> {
        try {
            const playerData = await this.getPlayerHistoricalData(uid);
            if (!playerData) {
                throw new Error('无法获取玩家数据');
            }

            const comparisons: { [key: string]: any } = {};
            const allPlayerStats: any[] = [];

            // 获取对比玩家的数据
            for (const compareUid of compareUids) {
                const compareData = await this.getPlayerHistoricalData(compareUid);
                if (compareData) {
                    comparisons[compareUid] = compareData;
                    allPlayerStats.push({
                        playerUid: compareUid,
                        ...compareData.performanceMetrics
                    });
                }
            }

            // 添加当前玩家
            allPlayerStats.push({
                playerUid: uid,
                ...playerData.performanceMetrics
            });

            // 排序并生成排名
            const ranking = this.generatePlayerRanking(allPlayerStats);
            const insights = this.generateComparisonInsights(playerData, comparisons, ranking);

            return {
                playerStats: playerData,
                comparisons,
                ranking,
                insights
            };
        } catch (error) {
            console.error(`获取玩家对比分析失败: ${uid}`, error);
            throw error;
        }
    }

    /**
     * 生成玩家排名
     */
    private generatePlayerRanking(allPlayerStats: any[]): { uid: string; rank: number; score: number }[] {
        // 计算综合得分
        const scoredPlayers = allPlayerStats.map(player => {
            const score = this.calculatePlayerScore(player);
            return { uid: player.playerUid, score, rank: 0 };
        });

        // 按得分排序
        scoredPlayers.sort((a, b) => b.score - a.score);

        // 分配排名
        scoredPlayers.forEach((player, index) => {
            player.rank = index + 1;
        });

        return scoredPlayers;
    }

    /**
     * 计算玩家综合得分
     */
    private calculatePlayerScore(player: any): number {
        const { averageScore, averageRank, winRate } = player;

        // 标准化各项指标到0-100
        const normalizedScore = Math.min(100, averageScore / 100);
        const normalizedRank = Math.max(0, 100 - (averageRank - 1) * 25);
        const normalizedWinRate = winRate * 100;

        // 加权计算综合得分
        return Math.round(
            normalizedScore * 0.4 +
            normalizedRank * 0.35 +
            normalizedWinRate * 0.25
        );
    }

    /**
     * 生成对比洞察
     */
    private generateComparisonInsights(playerData: any, comparisons: any, ranking: any[]): string[] {
        const insights: string[] = [];
        const playerRank = ranking.find(r => r.uid === playerData.uid)?.rank || 0;

        if (playerRank === 1) {
            insights.push('你在对比玩家中表现最佳，继续保持！');
        } else if (playerRank <= Math.ceil(ranking.length / 2)) {
            insights.push('你在对比玩家中表现良好，有进一步提升空间');
        } else {
            insights.push('你在对比玩家中还有提升空间，建议分析差距并改进');
        }

        // 分析具体指标
        const playerMetrics = playerData.performanceMetrics;
        Object.entries(comparisons).forEach(([compareUid, compareData]) => {
            const compareMetrics = (compareData as any).performanceMetrics;

            if (playerMetrics.averageScore > compareMetrics.averageScore * 1.2) {
                insights.push(`相比${compareUid}，你的平均分数明显更高`);
            } else if (playerMetrics.averageScore < compareMetrics.averageScore * 0.8) {
                insights.push(`相比${compareUid}，你的平均分数还有提升空间`);
            }
        });

        return insights;
    }
}
