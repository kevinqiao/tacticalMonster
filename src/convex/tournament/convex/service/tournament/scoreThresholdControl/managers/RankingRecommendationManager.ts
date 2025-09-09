/**
 * 排名推荐管理器
 * 核心功能：基于玩家历史数据和当前分数，智能推荐排名
 */

import { SEGMENT_RULES } from "../../../segment/config";
import { SegmentManager } from "../../../segment/SegmentManager";
import { PlayerSegmentData, SegmentName } from "../../../segment/types";
import { UnifiedSkillAssessment } from "../core/UnifiedSkillAssessment";



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
    private static callCounter = 0; // 静态计数器确保每次调用都有不同的种子
    private skillAssessment: UnifiedSkillAssessment;

    constructor(ctx: any) {
        this.ctx = ctx;
        this.skillAssessment = new UnifiedSkillAssessment();
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
            // console.log("humanAnalysis", humanAnalysis);
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
        console.log("recentMatches", recentMatches.length);
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

        // 获取段位信息：使用积分累积段位（玩家可见的段位）
        const segmentInfo = await this.getPlayerSegmentInfo(uid);
        const segmentName = (segmentInfo?.currentSegment as SegmentName) || 'bronze';

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

        // 过滤无效分数
        const validScores = scores.filter(score => score >= 0 && !isNaN(score));
        if (validScores.length < 3) return 0.5;

        const mean = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;

        // 安全检查：避免除零错误
        if (mean === 0) return 0.5;

        // 计算加权方差（最近比赛权重更高）
        const timeWeights = this.calculateTimeWeights(validScores.length);
        const weightedVariance = this.calculateWeightedVariance(validScores, timeWeights, mean);
        const weightedStandardDeviation = Math.sqrt(weightedVariance);

        // 基础一致性计算
        const baseConsistency = 1 - (weightedStandardDeviation / mean);

        // 考虑分数范围的调整
        const scoreRange = Math.max(...validScores) - Math.min(...validScores);
        const rangeAdjustment = this.calculateRangeAdjustment(scoreRange, mean);

        // 综合一致性计算
        const finalConsistency = baseConsistency * rangeAdjustment;

        // 限制在0-1之间
        return Math.max(0, Math.min(1, finalConsistency));
    }

    /**
     * 计算时间权重（最近比赛权重更高）
     */
    private calculateTimeWeights(length: number): number[] {
        const weights: number[] = [];
        for (let i = 0; i < length; i++) {
            // 最近比赛的权重为1，越早的比赛权重递减
            const weight = Math.pow(0.9, i); // 每场比赛权重递减10%
            weights.push(weight);
        }
        return weights;
    }

    /**
     * 计算加权方差
     */
    private calculateWeightedVariance(scores: number[], weights: number[], mean: number): number {
        let weightedSumSquaredDiffs = 0;
        let totalWeight = 0;

        for (let i = 0; i < scores.length; i++) {
            const diff = scores[i] - mean;
            const weight = weights[i];
            weightedSumSquaredDiffs += weight * diff * diff;
            totalWeight += weight;
        }

        return totalWeight > 0 ? weightedSumSquaredDiffs / totalWeight : 0;
    }

    /**
     * 计算分数范围调整因子
     */
    private calculateRangeAdjustment(scoreRange: number, mean: number): number {
        // 如果分数范围相对于平均值很小，说明分数很集中，给予奖励
        const rangeRatio = scoreRange / mean;

        if (rangeRatio < 0.1) {
            return 1.1; // 分数很集中，给予10%奖励
        } else if (rangeRatio < 0.2) {
            return 1.05; // 分数较集中，给予5%奖励
        } else if (rangeRatio > 0.5) {
            return 0.9; // 分数范围很大，给予10%惩罚
        } else if (rangeRatio > 0.3) {
            return 0.95; // 分数范围较大，给予5%惩罚
        }

        return 1.0; // 正常范围，无调整
    }




    // ==================== 缺失的辅助方法 ====================

    private classifyPlayerSkillLevel(profile: PlayerPerformanceProfile): 'beginner' | 'intermediate' | 'advanced' {
        // 使用统一技能评估系统
        const assessment = this.skillAssessment.assessPlayerSkill(profile);

        // 映射到3个等级
        if (assessment.level === 'diamond' || assessment.level === 'platinum') return 'advanced';
        if (assessment.level === 'gold' || assessment.level === 'silver') return 'intermediate';
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
        // 使用统一技能评估系统
        const assessment = this.skillAssessment.assessPlayerSkill(profile);
        return assessment.factor;
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
        relativePerformance: 'excellent' | 'good' | 'average' | 'poor',
        usedSegmentProbability: boolean = false
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

        // 🆕 段位排名概率影响
        if (usedSegmentProbability) {
            const segmentName = profile.segmentName;

            const segmentDesc = {
                'bronze': '青铜段位',
                'silver': '白银段位',
                'gold': '黄金段位',
                'platinum': '铂金段位',
                'diamond': '钻石段位',
                'master': '大师段位',
                'grandmaster': '宗师段位'
            }[segmentName] || '当前段位';

            reasons.push(`基于${segmentDesc}的排名概率分布`);
        }

        // 技能水平影响
        const skillLevel = this.classifyPlayerSkillLevel(profile);
        if (skillLevel !== 'intermediate') {
            reasons.push(`基于${skillLevel}水平的预期表现`);
        }

        return `推荐第${recommendedRank}名：${reasons.join('，')}`;
    }

    private calculateAIScoreVariance(humanAnalysis: any, aiStrategy: any): number {
        let baseVariance = humanAnalysis.scoreVariance * 0.3; // AI分数变化范围相对较小

        // 如果人类分数变化范围太小（如单玩家情况），使用平均分作为基础变化范围
        if (baseVariance < humanAnalysis.averageScore * 0.05) {
            baseVariance = humanAnalysis.averageScore * 0.1; // 使用平均分的10%作为基础变化范围
        }

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

        // 🆕 判断是否使用段位概率：单真人玩家 + 有对应概率配置的场景
        const shouldUseSegmentProbability = this.shouldUseSegmentProbabilityForSinglePlayer(
            humanPlayers.length,
            totalParticipants
        );

        for (const player of humanPlayers) {
            const profile = playerProfiles.get(player.uid)!;

            // 基础排名（基于分数在人类玩家中的位置）
            const humanRank = this.calculateHumanRank(player, humanPlayers);

            let adjustedRank: number;

            if (shouldUseSegmentProbability) {
                // 🆕 单真人玩家场景：使用段位概率调整排名
                adjustedRank = this.calculateSegmentAdjustedRankForSinglePlayer(
                    player,
                    profile,
                    humanRank,
                    totalParticipants
                );
            } else {
                // 多真人玩家场景：使用传统排名逻辑
                adjustedRank = this.calculateAdjustedRankWithAI(
                    player,
                    profile,
                    humanAnalysis,
                    humanRank,
                    aiCount,
                    totalParticipants,
                    humanPlayers
                );
            }

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
                relativePerformance,
                shouldUseSegmentProbability
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

        // 根据人类玩家水平决定AI配置策略
        const aiStrategy = this.determineAIStrategy(humanAnalysis);

        // 🔥 新逻辑：生成AI对手（使用临时排名）
        const tempAIOpponents: AIOpponent[] = [];

        for (let i = 0; i < aiCount; i++) {
            // 使用临时排名生成AI（稍后会重新分配）
            const tempRank = i + 1;

            const aiOpponent = this.generateSingleAIOpponent(
                `ai_${i + 1}`,
                tempRank,
                totalParticipants,
                humanAnalysis,
                aiStrategy,
                i
            );

            tempAIOpponents.push(aiOpponent);
        }

        // 🎯 关键修复：重新分配所有排名，确保分数和排名一致
        return this.reassignAllRanksBasedOnScores(tempAIOpponents, humanRankings, humanPlayers);
    }

    /**
 * 🔥 新方法：重新分配所有参与者的排名，确保排名与分数一致
 */
    private reassignAllRanksBasedOnScores(
        aiOpponents: AIOpponent[],
        humanRankings: PlayerRankingResult[],
        humanPlayers: HumanPlayer[]
    ): AIOpponent[] {
        // 创建所有参与者的分数-排名映射
        const allParticipants = [
            ...humanRankings.map(h => ({
                uid: h.uid,
                score: this.getHumanPlayerScore(h.uid, humanPlayers),
                type: 'human' as const,
                data: h
            })),
            ...aiOpponents.map(ai => ({
                uid: ai.uid,
                score: ai.recommendedScore,
                type: 'ai' as const,
                data: ai
            }))
        ];

        // 按分数排序（分数高的排名靠前）
        allParticipants.sort((a, b) => b.score - a.score);

        // 🔍 调试日志：显示排序后的参与者
        console.log("🔄 重新分配排名 - 按分数排序后的参与者:");
        let debugRank = 1;
        let debugScore = allParticipants[0]?.score;
        allParticipants.forEach((p, index) => {
            if (p.score !== debugScore) {
                debugRank = index + 1;
                debugScore = p.score;
            }
            console.log(`  第${debugRank}名: ${p.uid} (${p.type}) - 分数: ${p.score}`);
        });

        // 重新分配排名并更新数据（支持并列名次）
        const reassignedAI: AIOpponent[] = [];

        // 🔧 修复：正确处理并列名次
        let currentRank = 1;
        let currentScore = allParticipants[0]?.score;
        let tiedCount = 0;

        allParticipants.forEach((participant, index) => {
            // 如果分数不同，更新当前排名和分数
            if (participant.score !== currentScore) {
                // 跳过并列名次的数量，设置下一个排名
                currentRank = index + 1;
                currentScore = participant.score;
                tiedCount = 1;
            } else {
                // 分数相同，增加并列计数
                tiedCount++;
            }

            if (participant.type === 'ai') {
                const aiData = participant.data as AIOpponent;
                reassignedAI.push({
                    ...aiData,
                    recommendedRank: currentRank
                });
            } else {
                // 更新人类玩家的排名（直接修改原对象）
                const humanData = participant.data as PlayerRankingResult;
                humanData.recommendedRank = currentRank;
            }
        });

        // 🔍 调试日志：显示最终排名分配
        console.log("🔧 最终排名分配:");
        allParticipants.forEach((p, index) => {
            console.log(`  ${index + 1}. ${p.uid} (${p.type}) - 分数: ${p.score}, 排名: ${p.type === 'ai' ? reassignedAI.find(ai => ai.uid === p.uid)?.recommendedRank : (p.data as PlayerRankingResult).recommendedRank}`);
        });

        // 🎯 关键新增：重新计算AI分数范围，确保无重叠
        console.log("🔧 重新计算AI分数范围前:");
        reassignedAI.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 分数${ai.recommendedScore}`);
        });

        const finalAI = this.ensureNonOverlappingScoreRanges(reassignedAI, humanPlayers);

        console.log("🔧 重新计算AI分数范围后:");
        finalAI.forEach(ai => {
            console.log(`  ${ai.uid}: 第${ai.recommendedRank}名, 分数${ai.recommendedScore} (范围: ${ai.scoreRange.min}-${ai.scoreRange.max})`);
        });

        return finalAI.sort((a, b) => a.recommendedRank - b.recommendedRank);
    }

    /**
 * 🎯 确保AI分数范围无重叠
 */
    private ensureNonOverlappingScoreRanges(
        aiOpponents: AIOpponent[],
        humanPlayers: HumanPlayer[]
    ): AIOpponent[] {
        if (aiOpponents.length === 0) return aiOpponents;

        // 🔧 修复：按排名排序而不是按分数排序，保持排名的正确性
        const sortedAI = [...aiOpponents].sort((a, b) => a.recommendedRank - b.recommendedRank);

        // 获取人类玩家分数作为约束条件
        const humanScores = humanPlayers.map(p => p.score).sort((a, b) => b - a);

        // 🔥 新策略：全局分数区间分配
        return this.allocateNonOverlappingRanges(sortedAI, humanScores);
    }

    /**
     * 🎯 全局分数区间分配策略
     */
    private allocateNonOverlappingRanges(
        sortedAI: AIOpponent[],
        humanScores: number[]
    ): AIOpponent[] {
        const allScores = [
            ...sortedAI.map(ai => ai.recommendedScore),
            ...humanScores
        ].sort((a, b) => b - a);

        const minScore = Math.min(...allScores);
        const maxScore = Math.max(...allScores);

        // 扩展总范围
        const totalRange = maxScore - minScore;
        const buffer = Math.max(totalRange * 0.15, 100); // 15%缓冲区，最少100分
        const globalMin = Math.max(0, minScore - buffer);
        const globalMax = maxScore + buffer;

        // 创建分数区间映射
        const scoreIntervals = this.createScoreIntervals(sortedAI, humanScores, globalMin, globalMax);

        // 为每个AI分配区间
        const updatedAI: AIOpponent[] = [];

        for (let i = 0; i < sortedAI.length; i++) {
            const ai = sortedAI[i];
            const interval = scoreIntervals[i];

            updatedAI.push({
                ...ai,
                scoreRange: {
                    min: Math.round(interval.min),
                    max: Math.round(interval.max)
                }
            });
        }

        return updatedAI;
    }

    /**
     * 创建无重叠的分数区间
     */
    private createScoreIntervals(
        sortedAI: AIOpponent[],
        humanScores: number[],
        globalMin: number,
        globalMax: number
    ): Array<{ min: number; max: number }> {
        const intervals: Array<{ min: number; max: number }> = [];
        const aiCount = sortedAI.length;

        // 计算每个AI的基础变化范围
        const baseVariances = sortedAI.map(ai => Math.max(ai.recommendedScore * 0.08, 15));

        // 🔧 修复：现在AI按排名排序，需要按排名分配区间
        // 排名越小（越靠前），分数应该越高
        let currentUpperBound = globalMax;

        for (let i = 0; i < aiCount; i++) {
            const ai = sortedAI[i];
            const baseVariance = baseVariances[i];
            const recommendedScore = ai.recommendedScore;

            // 计算理想区间
            let idealMin = recommendedScore - baseVariance;
            let idealMax = recommendedScore + baseVariance;

            // 应用上边界约束（排名靠前的AI应该有更高的分数上限）
            idealMax = Math.min(idealMax, currentUpperBound);

            // 检查与人类分数的冲突
            for (const humanScore of humanScores) {
                if (humanScore >= idealMin && humanScore <= idealMax) {
                    // 调整区间避免与人类分数重叠
                    if (humanScore > recommendedScore) {
                        idealMax = Math.min(idealMax, humanScore - 1);
                    } else {
                        idealMin = Math.max(idealMin, humanScore + 1);
                    }
                }
            }

            // 确保区间有效
            if (idealMin >= idealMax) {
                const midPoint = (idealMin + currentUpperBound) / 2;
                idealMin = Math.max(globalMin, midPoint - 5);
                idealMax = Math.min(currentUpperBound, midPoint + 5);
            }

            // 最终安全检查
            idealMin = Math.max(globalMin, idealMin);
            idealMax = Math.min(currentUpperBound, idealMax);

            if (idealMin >= idealMax) {
                idealMin = Math.max(globalMin, currentUpperBound - 10);
                idealMax = currentUpperBound;
            }

            intervals.push({
                min: idealMin,
                max: idealMax
            });

            // 更新下一个AI的上边界
            currentUpperBound = idealMin - 1;
        }

        return intervals;
    }

    /**
     * 计算全局分数范围
     */
    private calculateGlobalScoreRange(
        sortedAI: AIOpponent[],
        humanScores: number[]
    ): { min: number; max: number } {
        const allScores = [
            ...sortedAI.map(ai => ai.recommendedScore),
            ...humanScores
        ];

        const minScore = Math.min(...allScores);
        const maxScore = Math.max(...allScores);

        // 扩展范围以提供缓冲区
        const range = maxScore - minScore;
        const buffer = Math.max(range * 0.1, 50); // 至少50分的缓冲区

        return {
            min: Math.max(0, minScore - buffer),
            max: maxScore + buffer
        };
    }

    /**
 * 为单个AI计算无重叠的分数范围
 */
    private calculateNonOverlappingRange(
        currentAI: AIOpponent,
        index: number,
        sortedAI: AIOpponent[],
        globalRange: { min: number; max: number },
        humanScores: number[]
    ): { min: number; max: number } {
        const currentScore = currentAI.recommendedScore;

        // 计算基础变化范围（基于推荐分数的8%，最少15分）
        const baseVariance = Math.max(currentScore * 0.08, 15);

        // 初始边界设定
        let upperBound = globalRange.max;
        let lowerBound = globalRange.min;

        // 🔥 修复：正确的相邻AI约束逻辑
        // 前一个AI（分数更高）的最小分数应该是当前AI的上边界
        if (index > 0) {
            const previousAI = sortedAI[index - 1];
            // 如果前一个AI已经有分数范围，使用其最小值作为约束
            if (previousAI.scoreRange) {
                upperBound = Math.min(upperBound, previousAI.scoreRange.min - 1);
            } else {
                upperBound = Math.min(upperBound, previousAI.recommendedScore - 1);
            }
        }

        // 后一个AI（分数更低）的最大分数应该是当前AI的下边界
        if (index < sortedAI.length - 1) {
            const nextAI = sortedAI[index + 1];
            // 如果后一个AI已经有分数范围，使用其最大值作为约束
            if (nextAI.scoreRange) {
                lowerBound = Math.max(lowerBound, nextAI.scoreRange.max + 1);
            } else {
                lowerBound = Math.max(lowerBound, nextAI.recommendedScore + 1);
            }
        }

        // 考虑人类玩家分数的约束
        for (const humanScore of humanScores) {
            if (humanScore > currentScore) {
                upperBound = Math.min(upperBound, humanScore - 1);
            } else if (humanScore < currentScore) {
                lowerBound = Math.max(lowerBound, humanScore + 1);
            }
        }

        // 计算理想的分数范围
        let idealMin = currentScore - baseVariance;
        let idealMax = currentScore + baseVariance;

        // 应用边界约束
        let finalMin = Math.max(lowerBound, idealMin);
        let finalMax = Math.min(upperBound, idealMax);

        // 🎯 关键修复：确保范围有效且合理
        if (finalMin >= finalMax) {
            // 如果约束太严格，创建一个最小的有效范围
            const midPoint = (lowerBound + upperBound) / 2;
            const minGap = 2; // 最小间隙

            if (upperBound - lowerBound >= minGap * 2) {
                // 有足够空间，在中点附近创建范围
                finalMin = Math.max(lowerBound, Math.floor(midPoint - minGap));
                finalMax = Math.min(upperBound, Math.ceil(midPoint + minGap));
            } else {
                // 空间不足，使用可用空间
                finalMin = lowerBound;
                finalMax = upperBound;

                // 如果还是无效，使用推荐分数的紧密范围
                if (finalMin >= finalMax) {
                    finalMin = Math.max(0, currentScore - 1);
                    finalMax = currentScore + 1;
                }
            }
        }

        return {
            min: Math.round(Math.max(0, finalMin)),
            max: Math.round(finalMax)
        };
    }

    /**
     * 根据分数重新分配AI排名，确保排名与分数一致（旧方法，保留兼容性）
     */
    private reassignAIRanksBasedOnScores(
        aiOpponents: AIOpponent[],
        humanRankings: PlayerRankingResult[],
        humanPlayers: HumanPlayer[],
        totalParticipants: number
    ): AIOpponent[] {
        // 创建所有参与者的分数-排名映射
        const allParticipants = [
            ...humanRankings.map(h => ({
                uid: h.uid,
                score: this.getHumanPlayerScore(h.uid, humanPlayers),
                type: 'human' as const,
                originalRank: h.recommendedRank,
                data: h
            })),
            ...aiOpponents.map(ai => ({
                uid: ai.uid,
                score: ai.recommendedScore,
                type: 'ai' as const,
                originalRank: ai.recommendedRank,
                data: ai
            }))
        ];

        // 按分数排序（分数高的排名靠前）
        allParticipants.sort((a, b) => b.score - a.score);

        // 重新分配排名
        const reassignedAI: AIOpponent[] = [];

        allParticipants.forEach((participant, index) => {
            const newRank = index + 1;

            if (participant.type === 'ai') {
                const aiData = participant.data as AIOpponent;
                reassignedAI.push({
                    ...aiData,
                    recommendedRank: newRank
                });
            }
        });

        return reassignedAI.sort((a, b) => a.recommendedRank - b.recommendedRank);
    }

    /**
     * 获取人类玩家分数（辅助方法）
     */
    private getHumanPlayerScore(uid: string, humanPlayers: HumanPlayer[]): number {
        const player = humanPlayers.find(p => p.uid === uid);
        return player ? player.score : 1000; // 如果找不到，使用默认分数
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
        // 对于单玩家场景，使用更智能的排名预测
        if (humanPlayers.length === 1) {
            return this.calculateSinglePlayerRankWithAI(player, profile, totalParticipants);
        }

        // 多玩家场景：使用原有逻辑
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
     * 单玩家场景下的智能排名计算
     */
    private calculateSinglePlayerRankWithAI(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        totalParticipants: number
    ): number {
        // 基于玩家历史表现和当前分数，预测在总体中的合理排名
        const skillFactor = this.calculateSkillFactor(profile);
        const currentScore = player.score;

        // 根据技能水平和分数确定基础排名位置
        let baseRankRatio: number;

        if (skillFactor >= 0.8) {
            // 高技能玩家：通常排在前25%
            baseRankRatio = 0.1 + (1 - skillFactor) * 0.15;
        } else if (skillFactor >= 0.6) {
            // 中等技能玩家：排在25%-60%
            baseRankRatio = 0.25 + (0.8 - skillFactor) * 1.75;
        } else if (skillFactor >= 0.4) {
            // 较低技能玩家：排在60%-80%
            baseRankRatio = 0.6 + (0.6 - skillFactor) * 1.0;
        } else {
            // 新手玩家：排在后20%
            baseRankRatio = 0.8 + (0.4 - skillFactor) * 0.5;
        }

        // 根据当前分数调整：分数太低时排名应该更靠后
        if (currentScore < profile.averageScore * 0.5) {
            // 当前分数远低于历史平均，排名下调
            baseRankRatio = Math.min(0.95, baseRankRatio + 0.2);
        } else if (currentScore > profile.averageScore * 1.5) {
            // 当前分数远高于历史平均，排名上调
            baseRankRatio = Math.max(0.05, baseRankRatio - 0.2);
        }

        // 转换为具体排名
        let predictedRank = Math.round(baseRankRatio * totalParticipants);

        // 🎲 添加随机变化：在单玩家场景中也引入一些不确定性
        const randomVariation = this.generateSmartRandomVariation(predictedRank, predictedRank, totalParticipants);
        const rankAdjustment = Math.round(randomVariation / 10); // 将分数变化转换为排名调整

        predictedRank += rankAdjustment;

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

        // 为单玩家场景创建更合理的分数分布
        let highScore, lowScore, scoreRange;

        if (scoreDistribution.highest === scoreDistribution.lowest) {
            // 单玩家场景：基于玩家分数和历史表现创建合理的分数范围
            const playerScore = scoreDistribution.highest;
            const baseRange = Math.max(averageScore * 0.6, playerScore * 0.8); // 确保有足够的分数范围

            // 创建以玩家分数为中心的分数分布
            highScore = playerScore + baseRange * 0.4;
            lowScore = Math.max(0, playerScore - baseRange * 0.6);
            scoreRange = highScore - lowScore;
        } else {
            // 多玩家场景：使用实际分数分布
            highScore = scoreDistribution.highest;
            lowScore = scoreDistribution.lowest;
            scoreRange = highScore - lowScore;

            // 确保最小分数范围
            if (scoreRange < averageScore * 0.2) {
                scoreRange = averageScore * 0.4;
            }
        }

        const baseScore = highScore - (rankRatio * scoreRange);

        // 添加智能调整和随机变化
        const adjustment = this.calculateAIScoreAdjustment(targetRank, totalParticipants, averageScore);
        const randomVariation = this.generateSmartRandomVariation(baseScore, targetRank, totalParticipants);

        return Math.max(0, baseScore + adjustment + randomVariation);
    }

    /**
 * 🎲 生成智能随机变化
 */
    private generateSmartRandomVariation(baseScore: number, targetRank: number, totalParticipants: number): number {
        // 使用静态计数器确保每次调用都有不同的种子
        RankingRecommendationManager.callCounter++;

        const baseSeed = Date.now();
        const complexSeed = baseSeed + targetRank * 1000 + RankingRecommendationManager.callCounter * 7919; // 使用质数增加随机性
        const pseudoRandom = this.seededRandom(complexSeed);

        // 计算变化范围（基于分数的5-15%，增加变化幅度）
        const variationRange = baseScore * (0.05 + pseudoRandom * 0.10);

        // 生成变化值（可正可负）
        const variation = (pseudoRandom - 0.5) * 2 * variationRange;

        // 根据排名调整变化倾向
        const rankFactor = this.calculateRankVariationFactor(targetRank, totalParticipants);

        return variation * rankFactor;
    }

    /**
     * 简单的种子随机数生成器
     */
    private seededRandom(seed: number): number {
        // 简单的线性同余生成器
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);

        seed = (a * seed + c) % m;
        return Math.abs(seed) / m;
    }

    /**
     * 计算排名变化因子
     */
    private calculateRankVariationFactor(targetRank: number, totalParticipants: number): number {
        const rankRatio = targetRank / totalParticipants;

        // 中间排名的AI有更大的变化空间
        if (rankRatio >= 0.3 && rankRatio <= 0.7) {
            return 1.2; // 中间排名变化更大
        } else if (rankRatio < 0.3) {
            return 0.8; // 前排变化较小
        } else {
            return 0.9; // 后排变化适中
        }
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

    // ==================== 段位信息获取方法 ====================

    /**
     * 获取玩家段位信息（积分累积段位）
     */
    private async getPlayerSegmentInfo(uid: string): Promise<PlayerSegmentData | null> {
        try {
            // 创建SegmentManager实例并获取玩家段位信息
            const segmentManager = new SegmentManager(this.ctx);
            const segmentData = await segmentManager.getPlayerSegmentInfo(uid);

            if (!segmentData) {
                console.warn(`玩家 ${uid} 的段位信息不存在，使用默认段位`);
                // 返回默认的段位信息
                return {
                    uid,
                    currentSegment: 'bronze' as SegmentName,
                    points: 0,
                    totalMatches: 0,
                    totalWins: 0,
                    currentWinStreak: 0,
                    currentLoseStreak: 0,
                    lastMatchDate: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }

            return segmentData;
        } catch (error) {
            console.error(`获取玩家段位信息失败: ${uid}`, error);
            return null;
        }
    }

    // ==================== 段位排名概率支持方法 ====================

    /**
     * 判断是否应该为单真人玩家使用段位概率
     * 基于段位配置中的数量key来决定是否有对应的概率配置
     */
    private shouldUseSegmentProbabilityForSinglePlayer(
        humanPlayerCount: number,
        totalParticipants: number
    ): boolean {
        // 只在单真人玩家场景下使用段位概率
        if (humanPlayerCount !== 1) {
            return false;
        }

        // 检查段位配置中是否有对应参与者数量的概率配置
        return this.hasSegmentProbabilityForParticipantCount(totalParticipants);
    }

    /**
     * 检查段位配置中是否有对应参与者数量的概率配置
     */
    private hasSegmentProbabilityForParticipantCount(participantCount: number): boolean {
        // 从段位配置中获取所有支持的参与者数量
        const supportedCounts = this.getSupportedParticipantCounts();

        // 检查是否有对应的概率配置
        return supportedCounts.includes(participantCount);
    }

    /**
     * 获取段位配置中支持的所有参与者数量
     */
    private getSupportedParticipantCounts(): number[] {
        // 从段位配置中获取支持的参与者数量
        // 这里使用硬编码，实际应该从配置中动态获取
        return [4, 6, 8]; // 对应段位配置中的 rankingProbabilities 的 key
    }

    /**
     * 为单真人玩家计算段位调整排名
     */
    private calculateSegmentAdjustedRankForSinglePlayer(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanRank: number,
        totalParticipants: number
    ): number {
        const segmentName = profile.segmentName;

        // 获取段位排名概率分布
        const segmentRule = SEGMENT_RULES[segmentName];
        const probabilities = segmentRule?.rankingProbabilities[totalParticipants] || [];

        if (probabilities.length === 0) {
            return humanRank; // 如果没有概率配置，返回原始排名
        }

        // 直接使用段位概率配置，不需要额外的段位优势计算
        // 因为段位概率配置已经体现了不同段位的优势差异
        const randomValue = Math.random();
        let cumulativeProb = 0;

        for (let i = 0; i < probabilities.length; i++) {
            cumulativeProb += probabilities[i];
            if (randomValue <= cumulativeProb) {
                return i + 1;
            }
        }

        return humanRank; // 兜底返回原始排名
    }

    /**
     * 获取段位排名概率分布（保留用于多玩家场景）
     */
    private getSegmentRankingProbabilities(
        humanPlayers: HumanPlayer[],
        playerProfiles: Map<string, PlayerPerformanceProfile>,
        totalParticipants: number
    ): Map<string, number[]> {
        const probabilities = new Map<string, number[]>();

        for (const player of humanPlayers) {
            const profile = playerProfiles.get(player.uid)!;
            const segmentName = profile.segmentName;

            // 获取该段位的排名概率分布
            const segmentRule = SEGMENT_RULES[segmentName];
            const segmentProbabilities = segmentRule?.rankingProbabilities[totalParticipants] || [];
            probabilities.set(player.uid, segmentProbabilities);
        }

        return probabilities;
    }

    /**
     * 计算基于段位排名概率的调整排名
     */
    private calculateSegmentAdjustedRank(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanRank: number,
        totalParticipants: number,
        segmentRankingProbabilities: Map<string, number[]>
    ): number {
        const segmentName = profile.segmentName;
        const probabilities = segmentRankingProbabilities.get(player.uid) || [];

        if (probabilities.length === 0) {
            return humanRank; // 如果没有概率配置，返回原始排名
        }

        // 根据段位概率分布调整排名
        const segmentAdjustedRank = this.applySegmentProbabilityAdjustment(
            humanRank,
            probabilities,
            totalParticipants,
            segmentName
        );

        return segmentAdjustedRank;
    }

    /**
     * 应用段位概率调整
     */
    private applySegmentProbabilityAdjustment(
        originalRank: number,
        probabilities: number[],
        totalParticipants: number,
        segmentName: SegmentName
    ): number {
        // 计算段位优势系数
        const segmentAdvantage = this.calculateSegmentAdvantage(segmentName);

        // 根据段位优势调整概率权重
        const adjustedProbabilities = probabilities.map((prob, index) => {
            const rank = index + 1;
            const distanceFromOriginal = Math.abs(rank - originalRank);

            // 段位优势影响：高段位玩家更容易获得好排名
            const advantageMultiplier = 1 + (segmentAdvantage * (1 - distanceFromOriginal / totalParticipants));

            return prob * advantageMultiplier;
        });

        // 归一化概率
        const totalProb = adjustedProbabilities.reduce((sum, prob) => sum + prob, 0);
        const normalizedProbabilities = adjustedProbabilities.map(prob => prob / totalProb);

        // 根据调整后的概率分布选择排名
        const randomValue = Math.random();
        let cumulativeProb = 0;

        for (let i = 0; i < normalizedProbabilities.length; i++) {
            cumulativeProb += normalizedProbabilities[i];
            if (randomValue <= cumulativeProb) {
                return i + 1;
            }
        }

        return originalRank; // 兜底返回原始排名
    }

    /**
     * 计算段位优势系数
     */
    private calculateSegmentAdvantage(segmentName: SegmentName): number {
        const segmentTiers = {
            'bronze': 1,
            'silver': 2,
            'gold': 3,
            'platinum': 4,
            'diamond': 5,
            'master': 6,
            'grandmaster': 7
        };

        const tier = segmentTiers[segmentName] || 1;
        const maxTier = 7;

        // 段位优势系数：0-0.3，高段位有更大优势
        return (tier - 1) / (maxTier - 1) * 0.3;
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
