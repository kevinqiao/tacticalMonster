/**
 * 排名推荐管理器
 * 核心功能：基于玩家历史数据和当前分数，智能推荐排名
 */

import { SegmentName } from "../../../segment/types";



export interface HumanPlayer {
    uid: string;
    score: number;
}

export interface AIOpponent {
    uid: string;
    recommendedRank: number;
    recommendedScore: number;
    scoreRange: {
        min: number;
        max: number;
    };
    difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
    behavior: 'supportive' | 'balanced' | 'competitive';
}

export interface MatchParticipant {
    uid: string;
    score: number;
    isAI: boolean;
    aiDifficulty?: 'easy' | 'normal' | 'hard' | 'extreme';
    aiBehavior?: 'supportive' | 'balanced' | 'competitive';
}

export interface PlayerRankingResult {
    uid: string;
    recommendedRank: number;
    confidence: number;
    reasoning: string;
    relativePerformance: 'excellent' | 'good' | 'average' | 'poor';
}

export interface MatchRankingResult {
    humanPlayers: PlayerRankingResult[];
    aiOpponents: AIOpponent[];
    matchContext: {
        totalParticipants: number;
        humanPlayersCount: number;
        aiPlayersCount: number;
        averageHumanScore: number;
        scoreDistribution: {
            highest: number;
            lowest: number;
            median: number;
        };
    };
}



export interface PlayerPerformanceProfile {
    uid: string;
    segmentName: SegmentName;
    averageScore: number;
    averageRank: number;
    winRate: number;
    totalMatches: number;
    recentPerformance: {
        last10Matches: any[];
        trendDirection: 'improving' | 'declining' | 'stable';
        consistency: number; // 0-1, 1为最一致
    };
}

export class RankingRecommendationManager {
    private ctx: any;

    constructor(ctx: any) {
        this.ctx = ctx;
    }



    /**
 * 核心方法：基于真人玩家分数和AI数量，生成完整的比赛排名结果
 * @param humanPlayers 所有真人玩家的分数
 * @param aiCount AI对手数量
 * @returns 完整的比赛排名结果（包括真人玩家排名和AI对手分数）
 */
    async generateMatchRankings(
        humanPlayers: HumanPlayer[],
        aiCount: number
    ): Promise<MatchRankingResult> {
        try {
            // 1. 获取所有人类玩家的历史档案
            const playerProfiles = new Map<string, PlayerPerformanceProfile>();
            for (const player of humanPlayers) {
                const profile = await this.getPlayerPerformanceProfile(player.uid);
                playerProfiles.set(player.uid, profile);
            }

            // 2. 分析人类玩家的整体水平和分布
            const humanAnalysis = this.analyzeHumanPlayers(humanPlayers, playerProfiles);

            // 3. 为每个人类玩家推荐排名
            const humanRankings = await this.generateHumanPlayerRankings(
                humanPlayers,
                playerProfiles,
                humanAnalysis,
                aiCount
            );

            // 4. 智能生成AI对手的分数和排名
            const aiOpponents = await this.generateIntelligentAIOpponents(
                humanPlayers,
                humanAnalysis,
                aiCount,
                humanRankings
            );

            // 5. 构建完整的比赛结果
            return {
                humanPlayers: humanRankings,
                aiOpponents,
                matchContext: {
                    totalParticipants: humanPlayers.length + aiCount,
                    humanPlayersCount: humanPlayers.length,
                    aiPlayersCount: aiCount,
                    averageHumanScore: humanAnalysis.averageScore,
                    scoreDistribution: humanAnalysis.scoreDistribution
                }
            };

        } catch (error) {
            console.error('生成比赛排名失败:', error);
            return this.getDefaultMatchResult(humanPlayers, aiCount);
        }
    }



    /**
 * 获取玩家表现档案
 */
    private async getPlayerPerformanceProfile(uid: string): Promise<PlayerPerformanceProfile> {
        // 获取最近50场比赛
        const recentMatches = await this.ctx.db
            .query("match_results")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(50);

        if (recentMatches.length < 3) {
            return this.getDefaultPlayerProfile(uid);
        }

        // 计算基础统计
        const scores = recentMatches.map((m: any) => m.score || 0);
        const ranks = recentMatches.map((m: any) => m.rank || 1);
        const wins = ranks.filter((rank: any) => rank === 1).length;

        const averageScore = scores.reduce((sum: any, score: any) => sum + score, 0) / scores.length;
        const averageRank = ranks.reduce((sum: any, rank: any) => sum + rank, 0) / ranks.length;
        const winRate = wins / ranks.length;

        // 分析最近10场趋势
        const last10Matches = recentMatches.slice(0, 10);
        const trendDirection = this.analyzeTrend(last10Matches);
        const consistency = this.calculateConsistency(scores);

        // 获取段位信息
        const segmentName = (recentMatches[0]?.segmentName as SegmentName) || 'bronze';

        return {
            uid,
            segmentName,
            averageScore,
            averageRank,
            winRate,
            totalMatches: recentMatches.length,
            recentPerformance: {
                last10Matches,
                trendDirection,
                consistency
            }
        };
    }



















    // ==================== 辅助方法 ====================

    private getDefaultPlayerProfile(uid: string): PlayerPerformanceProfile {
        return {
            uid,
            segmentName: 'bronze',
            averageScore: 1000,
            averageRank: 3,
            winRate: 0.25,
            totalMatches: 0,
            recentPerformance: {
                last10Matches: [],
                trendDirection: 'stable',
                consistency: 0.5
            }
        };
    }



    private analyzeTrend(matches: any[]): 'improving' | 'declining' | 'stable' {
        if (matches.length < 5) return 'stable';

        const recentScores = matches.slice(0, 5).map(m => m.score || 0);
        const olderScores = matches.slice(5, 10).map(m => m.score || 0);

        const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const olderAvg = olderScores.length > 0 ? olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length : recentAvg;

        const improvement = (recentAvg - olderAvg) / olderAvg;

        if (improvement > 0.1) return 'improving';
        if (improvement < -0.1) return 'declining';
        return 'stable';
    }

    private calculateConsistency(scores: number[]): number {
        if (scores.length < 3) return 0.5;

        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);

        // 一致性 = 1 - (标准差 / 平均值)，限制在0-1之间
        return Math.max(0, Math.min(1, 1 - (standardDeviation / mean)));
    }

   


    // ==================== 缺失的辅助方法 ====================

    private classifyPlayerSkillLevel(profile: PlayerPerformanceProfile): 'beginner' | 'intermediate' | 'advanced' {
        const { averageRank, winRate, totalMatches } = profile;

        if (totalMatches < 5) return 'beginner';

        if (averageRank <= 1.8 && winRate >= 0.5) return 'advanced';
        if (averageRank <= 2.5 && winRate >= 0.35) return 'intermediate';
        return 'beginner';
    }

    private determineOverallSkillLevel(skillLevels: string[]): 'beginner' | 'intermediate' | 'advanced' {
        const counts = {
            beginner: skillLevels.filter(s => s === 'beginner').length,
            intermediate: skillLevels.filter(s => s === 'intermediate').length,
            advanced: skillLevels.filter(s => s === 'advanced').length
        };

        if (counts.advanced >= counts.intermediate && counts.advanced >= counts.beginner) return 'advanced';
        if (counts.intermediate >= counts.beginner) return 'intermediate';
        return 'beginner';
    }

    private calculateVariance(scores: number[]): number {
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
    }

    private calculateSkillFactor(profile: PlayerPerformanceProfile): number {
        const { averageRank, winRate, totalMatches, recentPerformance } = profile;

        let skillFactor = 0.5; // 基础值

        // 排名因子
        if (averageRank <= 1.5) skillFactor += 0.3;
        else if (averageRank <= 2.0) skillFactor += 0.2;
        else if (averageRank <= 2.5) skillFactor += 0.1;
        else skillFactor -= 0.1;

        // 胜率因子
        if (winRate >= 0.6) skillFactor += 0.2;
        else if (winRate >= 0.4) skillFactor += 0.1;
        else skillFactor -= 0.1;

        // 一致性因子
        skillFactor += (recentPerformance.consistency - 0.5) * 0.2;

        return Math.max(0, Math.min(1, skillFactor));
    }

    private calculateScoreFactor(score: number, humanAnalysis: any): number {
        const { averageScore, scoreDistribution } = humanAnalysis;

        if (scoreDistribution.highest === scoreDistribution.lowest) return 0.5;

        // 分数在人类分数范围内的相对位置
        const relativePosition = (score - scoreDistribution.lowest) / (scoreDistribution.highest - scoreDistribution.lowest);

        // 与平均分的比较
        const averageComparison = score / averageScore;

        return (relativePosition * 0.7) + ((averageComparison - 1) * 0.3 + 0.5);
    }

    private calculateRankingConfidence(
        profile: PlayerPerformanceProfile,
        humanAnalysis: any,
        totalParticipants: number
    ): number {
        let confidence = 0.5;

        // 历史数据充分性
        if (profile.totalMatches >= 20) confidence += 0.2;
        else if (profile.totalMatches >= 10) confidence += 0.1;

        // 表现一致性
        confidence += profile.recentPerformance.consistency * 0.2;

        // 参与者数量影响
        if (totalParticipants <= 6) confidence += 0.1;
        else if (totalParticipants >= 10) confidence -= 0.05;

        // 分数分布的清晰度
        const scoreVariance = humanAnalysis.scoreVariance;
        if (scoreVariance > humanAnalysis.averageScore * 0.3) confidence += 0.05; // 分数差异大，排名更明确

        return Math.max(0.1, Math.min(0.95, confidence));
    }

    private analyzePlayerRelativePerformance(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: any
    ): 'excellent' | 'good' | 'average' | 'poor' {
        const scoreImprovement = (player.score - profile.averageScore) / profile.averageScore;
        const scoreRankInHumans = this.calculatePlayerPercentile(player.score, humanAnalysis.scoreDistribution);

        if (scoreImprovement > 0.2 && scoreRankInHumans >= 0.8) return 'excellent';
        if (scoreImprovement > 0.1 || scoreRankInHumans >= 0.6) return 'good';
        if (scoreImprovement > -0.1 && scoreRankInHumans >= 0.3) return 'average';
        return 'poor';
    }

    private generateRankingReasoning(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        recommendedRank: number,
        totalParticipants: number,
        aiCount: number,
        relativePerformance: 'excellent' | 'good' | 'average' | 'poor'
    ): string {
        const reasons = [];

        // 当前表现
        const performanceDesc = {
            'excellent': '表现优异',
            'good': '表现良好',
            'average': '表现一般',
            'poor': '表现欠佳'
        }[relativePerformance];

        reasons.push(`当前${performanceDesc}（得分${player.score}）`);

        // 历史对比
        if (profile.totalMatches >= 5) {
            const improvement = ((player.score - profile.averageScore) / profile.averageScore * 100).toFixed(1);
            if (Math.abs(parseFloat(improvement)) > 5) {
                const direction = parseFloat(improvement) > 0 ? '提升' : '下降';
                reasons.push(`比历史平均${direction}${Math.abs(parseFloat(improvement))}%`);
            }
        }

        // 竞争环境
        reasons.push(`在${totalParticipants}人比赛中（含${aiCount}个AI对手）`);

        // 技能水平影响
        const skillLevel = this.classifyPlayerSkillLevel(profile);
        if (skillLevel !== 'intermediate') {
            reasons.push(`基于${skillLevel}水平的预期表现`);
        }

        return `推荐第${recommendedRank}名：${reasons.join('，')}`;
    }

    private calculateAIScoreVariance(humanAnalysis: any, aiStrategy: any): number {
        const baseVariance = humanAnalysis.scoreVariance * 0.3; // AI分数变化范围相对较小

        // 根据策略调整变化范围
        const strategyMultiplier = {
            'challenging': 0.8,  // 挑战性策略，变化范围小一些
            'supportive': 1.2,   // 支持性策略，变化范围大一些
            'balanced': 1.0      // 平衡策略，标准变化范围
        }[aiStrategy.type as 'challenging' | 'supportive' | 'balanced'] || 1.0;

        return baseVariance * strategyMultiplier;
    }

    private calculatePlayerPercentile(score: number, scoreDistribution: any): number {
        const { highest, lowest } = scoreDistribution;
        if (highest === lowest) return 0.5;

        return (score - lowest) / (highest - lowest);
    }

    private getDefaultMatchResult(humanPlayers: HumanPlayer[], aiCount: number): MatchRankingResult {
        const totalParticipants = humanPlayers.length + aiCount;

        return {
            humanPlayers: humanPlayers.map((player, index) => ({
                uid: player.uid,
                recommendedRank: index + Math.ceil(aiCount / 2) + 1,
                confidence: 0.3,
                reasoning: '数据不足，使用默认排名',
                relativePerformance: 'average' as const
            })),
            aiOpponents: Array.from({ length: aiCount }, (_, i) => ({
                uid: `ai_${i + 1}`,
                recommendedRank: humanPlayers.length + i + 1,
                recommendedScore: Math.round(humanPlayers.reduce((sum, p) => sum + p.score, 0) / humanPlayers.length),
                scoreRange: { min: 1000, max: 5000 },
                difficulty: 'normal' as const,
                behavior: 'balanced' as const
            })),
            matchContext: {
                totalParticipants,
                humanPlayersCount: humanPlayers.length,
                aiPlayersCount: aiCount,
                averageHumanScore: humanPlayers.reduce((sum, p) => sum + p.score, 0) / humanPlayers.length,
                scoreDistribution: {
                    highest: Math.max(...humanPlayers.map(p => p.score)),
                    lowest: Math.min(...humanPlayers.map(p => p.score)),
                    median: humanPlayers.map(p => p.score).sort((a, b) => b - a)[Math.floor(humanPlayers.length / 2)]
                }
            }
        };
    }

    // ==================== 新的核心支持方法 ====================

    /**
     * 分析人类玩家的整体情况
     */
    private analyzeHumanPlayers(
        humanPlayers: HumanPlayer[],
        playerProfiles: Map<string, PlayerPerformanceProfile>
    ) {
        const scores = humanPlayers.map(p => p.score);
        const sortedScores = [...scores].sort((a, b) => b - a);

        // 计算技能水平分布
        const skillLevels = humanPlayers.map(player => {
            const profile = playerProfiles.get(player.uid)!;
            return this.classifyPlayerSkillLevel(profile);
        });

        return {
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            scoreDistribution: {
                highest: Math.max(...scores),
                lowest: Math.min(...scores),
                median: sortedScores[Math.floor(sortedScores.length / 2)]
            },
            skillDistribution: {
                beginner: skillLevels.filter(s => s === 'beginner').length,
                intermediate: skillLevels.filter(s => s === 'intermediate').length,
                advanced: skillLevels.filter(s => s === 'advanced').length
            },
            overallSkillLevel: this.determineOverallSkillLevel(skillLevels),
            scoreVariance: this.calculateVariance(scores)
        };
    }

    /**
     * 为人类玩家生成排名推荐
     */
    private async generateHumanPlayerRankings(
        humanPlayers: HumanPlayer[],
        playerProfiles: Map<string, PlayerPerformanceProfile>,
        humanAnalysis: any,
        aiCount: number
    ): Promise<PlayerRankingResult[]> {
        const totalParticipants = humanPlayers.length + aiCount;
        const results: PlayerRankingResult[] = [];

        for (const player of humanPlayers) {
            const profile = playerProfiles.get(player.uid)!;

            // 基础排名（基于分数在人类玩家中的位置）
            const humanRank = this.calculateHumanRank(player, humanPlayers);

            // 考虑AI对手后的调整排名
            const adjustedRank = this.calculateAdjustedRankWithAI(
                player,
                profile,
                humanAnalysis,
                humanRank,
                aiCount,
                totalParticipants,
                humanPlayers
            );

            // 计算信心度
            const confidence = this.calculateRankingConfidence(
                profile,
                humanAnalysis,
                totalParticipants
            );

            // 分析相对表现
            const relativePerformance = this.analyzePlayerRelativePerformance(
                player,
                profile,
                humanAnalysis
            );

            // 生成推理说明
            const reasoning = this.generateRankingReasoning(
                player,
                profile,
                adjustedRank,
                totalParticipants,
                aiCount,
                relativePerformance
            );

            results.push({
                uid: player.uid,
                recommendedRank: adjustedRank,
                confidence,
                reasoning,
                relativePerformance
            });
        }

        return results;
    }

    /**
     * 智能生成AI对手
     */
    private async generateIntelligentAIOpponents(
        humanPlayers: HumanPlayer[],
        humanAnalysis: any,
        aiCount: number,
        humanRankings: PlayerRankingResult[]
    ): Promise<AIOpponent[]> {
        const totalParticipants = humanPlayers.length + aiCount;
        const aiOpponents: AIOpponent[] = [];

        // 分析需要填补的排名位置
        const occupiedRanks = new Set(humanRankings.map(h => h.recommendedRank));
        const availableRanks = Array.from({ length: totalParticipants }, (_, i) => i + 1)
            .filter(rank => !occupiedRanks.has(rank));

        // 根据人类玩家水平决定AI配置策略
        const aiStrategy = this.determineAIStrategy(humanAnalysis);

        for (let i = 0; i < aiCount; i++) {
            const aiRank = availableRanks[i] || (totalParticipants - aiCount + i + 1);

            const aiOpponent = this.generateSingleAIOpponent(
                `ai_${i + 1}`,
                aiRank,
                totalParticipants,
                humanAnalysis,
                aiStrategy,
                i
            );

            aiOpponents.push(aiOpponent);
        }

        // 按推荐分数排序
        return aiOpponents.sort((a, b) => b.recommendedScore - a.recommendedScore);
    }

    /**
     * 生成单个AI对手
     */
    private generateSingleAIOpponent(
        uid: string,
        targetRank: number,
        totalParticipants: number,
        humanAnalysis: any,
        aiStrategy: any,
        aiIndex: number
    ): AIOpponent {
        // 根据目标排名计算基础分数
        const baseScore = this.calculateAIBaseScore(targetRank, totalParticipants, humanAnalysis);

        // 添加随机变化范围
        const varianceRange = this.calculateAIScoreVariance(humanAnalysis, aiStrategy);
        const minScore = Math.max(0, baseScore - varianceRange);
        const maxScore = baseScore + varianceRange;

        // 选择AI难度和行为
        const { difficulty, behavior } = this.selectAIDifficultyAndBehavior(
            targetRank,
            totalParticipants,
            aiStrategy,
            aiIndex
        );

        return {
            uid,
            recommendedRank: targetRank,
            recommendedScore: Math.round(baseScore),
            scoreRange: {
                min: Math.round(minScore),
                max: Math.round(maxScore)
            },
            difficulty,
            behavior
        };
    }

    // ==================== 辅助计算方法 ====================

    /**
     * 计算人类玩家在人类中的排名
     */
    private calculateHumanRank(player: HumanPlayer, humanPlayers: HumanPlayer[]): number {
        const sortedPlayers = [...humanPlayers].sort((a, b) => b.score - a.score);
        return sortedPlayers.findIndex(p => p.uid === player.uid) + 1;
    }

    /**
     * 计算考虑AI后的调整排名
     * 保证：人类玩家之间的相对排序永远基于分数，只调整AI插入的位置
     */
    private calculateAdjustedRankWithAI(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: any,
        humanRank: number,
        aiCount: number,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): number {
        // 计算技能调整因子（用于预测AI插入影响）
        const skillFactor = this.calculateSkillFactor(profile);
        const scoreFactor = this.calculateScoreFactor(player.score, humanAnalysis);

        // 综合调整因子：历史表现越好，被AI超越的可能性越小
        const performanceAdjustment = (skillFactor + scoreFactor) / 2;

        // 基于人类排名计算在总排名中的基础位置
        // 假设AI均匀分布在人类玩家之间
        const basePosition = humanRank + Math.floor((humanRank - 1) * aiCount / humanPlayers.length);

        // 根据表现调整：表现好的玩家排名提升，表现差的玩家排名下降
        // 调整范围限制在 [-2, +2] 以避免过度调整
        const adjustment = Math.round((performanceAdjustment - 0.5) * 4);
        const clampedAdjustment = Math.max(-2, Math.min(2, adjustment));

        let predictedRank = basePosition + clampedAdjustment;

        // 关键约束：确保不违背人类玩家之间的分数排序
        predictedRank = this.enforceHumanRankingConstraints(
            player,
            predictedRank,
            humanPlayers,
            totalParticipants
        );

        return Math.max(1, Math.min(totalParticipants, predictedRank));
    }

    /**
     * 强制约束：确保人类玩家之间的排名不违背分数排序
     */
    private enforceHumanRankingConstraints(
        currentPlayer: HumanPlayer,
        proposedRank: number,
        humanPlayers: HumanPlayer[],
        totalParticipants: number
    ): number {
        // 获取所有分数比当前玩家高的玩家
        const higherScorePlayers = humanPlayers.filter(p => p.score > currentPlayer.score);
        const lowerScorePlayers = humanPlayers.filter(p => p.score < currentPlayer.score);

        // 约束1：不能排在任何分数更高的玩家前面
        const minAllowedRank = higherScorePlayers.length + 1;

        // 约束2：不能排在所有分数更低的玩家后面
        const maxAllowedRank = totalParticipants - lowerScorePlayers.length;

        // 应用约束
        return Math.max(minAllowedRank, Math.min(maxAllowedRank, proposedRank));
    }

    /**
     * 计算AI基础分数
     */
    private calculateAIBaseScore(
        targetRank: number,
        totalParticipants: number,
        humanAnalysis: any
    ): number {
        const { scoreDistribution, averageScore } = humanAnalysis;

        // 根据排名位置插值计算分数
        const rankRatio = (targetRank - 1) / (totalParticipants - 1); // 0表示第1名，1表示最后一名

        // 使用人类分数分布作为参考
        const scoreRange = scoreDistribution.highest - scoreDistribution.lowest;
        const baseScore = scoreDistribution.highest - (rankRatio * scoreRange);

        // 添加一些智能调整
        const adjustment = this.calculateAIScoreAdjustment(targetRank, totalParticipants, averageScore);

        return Math.max(0, baseScore + adjustment);
    }

    /**
     * 计算AI分数调整
     */
    private calculateAIScoreAdjustment(targetRank: number, totalParticipants: number, averageScore: number): number {
        // 前排AI稍微提高分数，后排AI稍微降低分数，使分布更合理
        const midRank = totalParticipants / 2;
        const distanceFromMid = targetRank - midRank;

        return -distanceFromMid * (averageScore * 0.05); // 最多调整5%
    }

    /**
     * 确定AI策略
     */
    private determineAIStrategy(humanAnalysis: any) {
        const { overallSkillLevel, skillDistribution } = humanAnalysis;

        if (overallSkillLevel === 'advanced') {
            return { type: 'challenging', supportiveRatio: 0.2, competitiveRatio: 0.6 };
        } else if (overallSkillLevel === 'beginner') {
            return { type: 'supportive', supportiveRatio: 0.6, competitiveRatio: 0.2 };
        } else {
            return { type: 'balanced', supportiveRatio: 0.4, competitiveRatio: 0.4 };
        }
    }

    /**
     * 选择AI难度和行为
     */
    private selectAIDifficultyAndBehavior(
        targetRank: number,
        totalParticipants: number,
        aiStrategy: any,
        aiIndex: number
    ): { difficulty: 'easy' | 'normal' | 'hard' | 'extreme'; behavior: 'supportive' | 'balanced' | 'competitive' } {
        const rankRatio = (targetRank - 1) / (totalParticipants - 1);

        // 根据排名位置和策略选择难度
        let difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
        if (rankRatio < 0.25) difficulty = 'extreme';
        else if (rankRatio < 0.5) difficulty = 'hard';
        else if (rankRatio < 0.75) difficulty = 'normal';
        else difficulty = 'easy';

        // 根据策略和索引选择行为
        let behavior: 'supportive' | 'balanced' | 'competitive';
        const behaviorRand = aiIndex / (aiIndex + 1); // 简单的确定性"随机"

        if (behaviorRand < aiStrategy.supportiveRatio) behavior = 'supportive';
        else if (behaviorRand < aiStrategy.supportiveRatio + aiStrategy.competitiveRatio) behavior = 'competitive';
        else behavior = 'balanced';

        return { difficulty, behavior };
    }

    // ==================== 多玩家推荐支持方法（保留旧方法） ====================

    /**
     * 分析比赛整体环境
     */
    private analyzeMatchContext(
        allParticipants: MatchParticipant[],
        humanPlayers: MatchParticipant[],
        aiPlayers: MatchParticipant[]
    ) {
        const humanScores = humanPlayers.map(p => p.score);
        const aiScores = aiPlayers.map(p => p.score);
        const allScores = allParticipants.map(p => p.score).sort((a, b) => b - a);

        return {
            totalParticipants: allParticipants.length,
            humanCount: humanPlayers.length,
            aiCount: aiPlayers.length,
            averageHumanScore: humanScores.length > 0 ?
                humanScores.reduce((sum, score) => sum + score, 0) / humanScores.length : 0,
            averageAIScore: aiScores.length > 0 ?
                aiScores.reduce((sum, score) => sum + score, 0) / aiScores.length : 0,
            scoreRange: {
                highest: Math.max(...allScores),
                lowest: Math.min(...allScores),
                median: allScores[Math.floor(allScores.length / 2)]
            },
            aiDifficultyDistribution: this.analyzeAIDifficultyDistribution(aiPlayers)
        };
    }

    /**
     * 分析AI难度分布
     */
    private analyzeAIDifficultyDistribution(aiPlayers: MatchParticipant[]) {
        const distribution = { easy: 0, normal: 0, hard: 0, extreme: 0 };
        aiPlayers.forEach(ai => {
            if (ai.aiDifficulty) {
                distribution[ai.aiDifficulty]++;
            }
        });
        return distribution;
    }



    /**
     * 分析相对表现
     */
    private analyzeRelativePerformance(
        currentScore: number,
        historicalAverage: number,
        matchContext: any
    ): 'excellent' | 'good' | 'average' | 'poor' {
        const improvement = (currentScore - historicalAverage) / historicalAverage;
        const scoreRank = this.getScoreRankInMatch(currentScore, matchContext);

        // 综合考虑个人改进和相对排名
        if (improvement > 0.2 && scoreRank <= 0.3) return 'excellent';
        if (improvement > 0.1 || scoreRank <= 0.5) return 'good';
        if (improvement > -0.1 && scoreRank <= 0.7) return 'average';
        return 'poor';
    }

    /**
     * 获取分数在比赛中的相对排名
     */
    private getScoreRankInMatch(score: number, matchContext: any): number {
        const { scoreRange } = matchContext;
        if (scoreRange.highest === scoreRange.lowest) return 0.5;

        return 1 - (score - scoreRange.lowest) / (scoreRange.highest - scoreRange.lowest);
    }



    /**
     * 计算AI难度对排名的调整
     */
    private calculateAIRankAdjustment(
        player: MatchParticipant,
        allParticipants: MatchParticipant[],
        playerProfile: PlayerPerformanceProfile
    ): number {
        const aiPlayers = allParticipants.filter(p => p.isAI);
        let adjustment = 0;

        aiPlayers.forEach(ai => {
            if (ai.score > player.score) {
                // AI分数更高，根据难度调整
                switch (ai.aiDifficulty) {
                    case 'easy': adjustment -= 0.3; break;     // 被简单AI超越，排名下调
                    case 'normal': adjustment -= 0.1; break;   // 被普通AI超越，轻微下调
                    case 'hard': adjustment += 0.1; break;     // 被困难AI超越，轻微上调
                    case 'extreme': adjustment += 0.3; break;  // 被极难AI超越，排名上调
                }
            } else {
                // AI分数更低，根据难度调整
                switch (ai.aiDifficulty) {
                    case 'easy': adjustment += 0.1; break;     // 超越简单AI，轻微上调
                    case 'normal': adjustment += 0.2; break;   // 超越普通AI，上调
                    case 'hard': adjustment += 0.4; break;     // 超越困难AI，明显上调
                    case 'extreme': adjustment += 0.6; break;  // 超越极难AI，大幅上调
                }
            }
        });

        return adjustment;
    }

    /**
     * 计算历史表现对排名的调整
     */
    private calculateHistoryRankAdjustment(
        player: MatchParticipant,
        playerProfile: PlayerPerformanceProfile
    ): number {
        const scoreImprovement = (player.score - playerProfile.averageScore) / playerProfile.averageScore;

        // 表现超出历史平均，排名上调；表现低于历史平均，排名下调
        return -scoreImprovement * 0.5; // 负号是因为排名越小越好
    }



    /**
     * 计算AI难度多样性奖励
     */
    private calculateAIDiversityBonus(aiDistribution: any): number {
        const totalAI = Object.values(aiDistribution).reduce((sum: number, count: any) => sum + count, 0);
        if (totalAI === 0) return 0;

        const diversityTypes = Object.values(aiDistribution).filter((count: any) => count > 0).length;

        // AI难度越多样，推荐越准确
        return diversityTypes * 0.02;
    }



    /**
     * 获取默认的多玩家推荐
     */



}
