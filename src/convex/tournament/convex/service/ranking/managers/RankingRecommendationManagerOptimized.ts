/**
 * 排名推荐管理器 - 优化版本
 * 核心功能：基于玩家历史数据和当前分数，智能推荐排名
 * 
 * 优化特性：
 * - 策略模式：不同经验水平的玩家使用不同的排名策略
 * - 缓存机制：避免重复计算，提升性能
 * - 配置驱动：通过配置调整行为，提高灵活性
 * - 模块化设计：职责清晰，易于维护和测试
 */

// 导入新的类型和工具
import { GrowingRankingStrategy } from './strategies/GrowingRankingStrategy';
import { NewbieRankingStrategy } from './strategies/NewbieRankingStrategy';
import { VeteranRankingStrategy } from './strategies/VeteranRankingStrategy';
import {
    AIOpponent,
    HumanAnalysis,
    HumanPlayer,
    MatchRankingResult,
    PlayerPerformanceProfile,
    PlayerRankingResult
} from './types/CommonTypes';
import { DEFAULT_RANKING_CONFIG, RankingConfig } from './types/RankingConfig';
import { CacheManager } from './utils/CacheManager';
import { RankingCalculator } from './utils/RankingCalculator';

export class RankingRecommendationManagerOptimized {
    private ctx: any;
    private config: RankingConfig;
    private cache: CacheManager;
    private static callCounter = 0;

    constructor(ctx: any, config?: Partial<RankingConfig>) {
        this.ctx = ctx;
        this.config = { ...DEFAULT_RANKING_CONFIG, ...config };
        this.cache = new CacheManager(this.config);
    }

    /**
     * 核心方法：生成完整的比赛排名结果
     */
    async generateMatchRankings(
        humanPlayers: HumanPlayer[],
        aiCount: number
    ): Promise<MatchRankingResult> {
        try {
            // 输入验证
            this.validateInputs(humanPlayers, aiCount);

            // 获取玩家档案（带缓存）
            const playerProfiles = await this.getPlayerProfiles(humanPlayers);

            // 分析人类玩家
            const humanAnalysis = this.analyzeHumanPlayers(humanPlayers, playerProfiles);

            // 生成人类玩家排名
            const humanRankings = await this.generateHumanPlayerRankings(
                humanPlayers, playerProfiles, humanAnalysis, aiCount
            );

            // 生成AI对手
            const aiOpponents = await this.generateIntelligentAIOpponents(
                humanPlayers, humanAnalysis, aiCount, humanRankings
            );

            // 重新分配排名
            const finalRankings = this.reassignAllRanksBasedOnScores(
                aiOpponents, humanRankings, humanPlayers
            );

            return this.buildMatchResult(finalRankings, humanAnalysis, humanPlayers, aiCount);

        } catch (error) {
            console.error('生成比赛排名失败:', error);
            return this.getDefaultMatchResult(humanPlayers, aiCount);
        }
    }

    /**
     * 输入验证
     */
    private validateInputs(humanPlayers: HumanPlayer[], aiCount: number): void {
        if (!humanPlayers || humanPlayers.length === 0) {
            throw new Error('至少需要一个人类玩家');
        }

        if (aiCount < 0 || aiCount > this.config.maxAICount) {
            throw new Error(`AI数量必须在0-${this.config.maxAICount}之间`);
        }

        if (humanPlayers.length + aiCount > this.config.maxParticipants) {
            throw new Error(`总参与者数量不能超过${this.config.maxParticipants}`);
        }
    }

    /**
     * 获取玩家档案（带缓存）
     */
    private async getPlayerProfiles(humanPlayers: HumanPlayer[]): Promise<Map<string, PlayerPerformanceProfile>> {
        const profiles = new Map<string, PlayerPerformanceProfile>();

        for (const player of humanPlayers) {
            const cacheKey = `profile_${player.uid}`;
            let profile = this.cache.get<PlayerPerformanceProfile>(cacheKey);

            if (!profile) {
                profile = await this.fetchPlayerProfile(player.uid);
                this.cache.set(cacheKey, profile);
            }

            profiles.set(player.uid, profile);
        }

        return profiles;
    }

    /**
     * 获取单个玩家档案
     */
    private async fetchPlayerProfile(uid: string): Promise<PlayerPerformanceProfile> {
        const recentMatches = await this.ctx.db
            .query("match_results")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(50);

        if (recentMatches.length < 3) {
            return this.getDefaultPlayerProfile(uid);
        }

        const scores = recentMatches.map((m: any) => m.score || 0);
        const ranks = recentMatches.map((m: any) => m.rank || 1);
        const wins = ranks.filter((rank: any) => rank === 1).length;

        const averageScore = scores.reduce((sum: any, score: any) => sum + score, 0) / scores.length;
        const averageRank = ranks.reduce((sum: any, rank: any) => sum + rank, 0) / ranks.length;
        const winRate = wins / ranks.length;

        const last10Matches = recentMatches.slice(0, 10);
        const trendDirection = this.analyzeTrend(last10Matches);
        const consistency = this.calculateConsistency(scores);

        return {
            uid,
            segmentName: 'bronze' as const, // 暂时使用固定段位
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

    /**
     * 分析人类玩家整体水平
     */
    private analyzeHumanPlayers(
        humanPlayers: HumanPlayer[],
        playerProfiles: Map<string, PlayerPerformanceProfile>
    ): HumanAnalysis {
        const scores = humanPlayers.map(p => p.score);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        const scoreDistribution = {
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
            median: this.calculateMedian(scores)
        };

        const skillDistribution = this.calculateSkillDistribution(playerProfiles);
        const overallSkillLevel = this.determineOverallSkillLevel(skillDistribution);
        const scoreVariance = this.calculateVariance(scores, averageScore);

        return {
            averageScore,
            scoreDistribution,
            skillDistribution,
            overallSkillLevel,
            scoreVariance
        };
    }

    /**
     * 生成人类玩家排名
     */
    private async generateHumanPlayerRankings(
        humanPlayers: HumanPlayer[],
        playerProfiles: Map<string, PlayerPerformanceProfile>,
        humanAnalysis: HumanAnalysis,
        aiCount: number
    ): Promise<PlayerRankingResult[]> {
        const totalParticipants = humanPlayers.length + aiCount;
        const results: PlayerRankingResult[] = [];

        for (const player of humanPlayers) {
            const profile = playerProfiles.get(player.uid)!;
            const strategy = this.selectRankingStrategy(profile, humanPlayers.length);

            const result = await strategy.calculateRanking(
                player, profile, humanAnalysis, totalParticipants, humanPlayers
            );

            results.push(result);
        }

        return results;
    }

    /**
     * 选择排名策略
     */
    private selectRankingStrategy(
        profile: PlayerPerformanceProfile,
        humanPlayerCount: number
    ) {
        if (profile.totalMatches < this.config.newbieThreshold) {
            return new NewbieRankingStrategy(this.config);
        } else if (profile.totalMatches < this.config.growingThreshold) {
            return new GrowingRankingStrategy(this.config);
        } else {
            return new VeteranRankingStrategy(this.config, humanPlayerCount);
        }
    }

    /**
     * 生成智能AI对手
     */
    private async generateIntelligentAIOpponents(
        humanPlayers: HumanPlayer[],
        humanAnalysis: HumanAnalysis,
        aiCount: number,
        humanRankings: PlayerRankingResult[]
    ): Promise<AIOpponent[]> {
        const aiStrategy = this.determineAIStrategy(humanAnalysis);
        const aiOpponents: AIOpponent[] = [];

        for (let i = 0; i < aiCount; i++) {
            const aiOpponent = this.generateSingleAIOpponent(
                `ai_${i + 1}`,
                i + 1,
                humanPlayers.length + aiCount,
                humanAnalysis,
                aiStrategy,
                i
            );
            aiOpponents.push(aiOpponent);
        }

        return this.ensureNonOverlappingScoreRanges(aiOpponents, humanPlayers);
    }

    /**
     * 生成单个AI对手
     */
    private generateSingleAIOpponent(
        uid: string,
        targetRank: number,
        totalParticipants: number,
        humanAnalysis: HumanAnalysis,
        aiStrategy: any,
        index: number
    ): AIOpponent {
        const baseScore = RankingCalculator.calculateAIBaseScore(targetRank, totalParticipants, humanAnalysis);
        const variance = RankingCalculator.calculateAIScoreVariance(humanAnalysis);
        const score = Math.max(0, baseScore + (Math.random() - 0.5) * variance);

        const skillLevel = this.determineAISkillLevel(targetRank, totalParticipants, aiStrategy);
        const character_id = this.selectAICharacter(skillLevel);
        const difficulty = this.mapSkillLevelToDifficulty(skillLevel);
        const behavior = this.selectAIBehavior(skillLevel, aiStrategy);

        return {
            uid,
            name: `AI ${index + 1}`,
            score: Math.round(score),
            targetRank,
            skillLevel,
            character_id,
            description: this.generateAIDescription(skillLevel, difficulty, behavior)
        };
    }

    /**
     * 重新分配所有排名
     */
    private reassignAllRanksBasedOnScores(
        aiOpponents: AIOpponent[],
        humanRankings: PlayerRankingResult[],
        humanPlayers: HumanPlayer[]
    ): { aiOpponents: AIOpponent[], humanRankings: PlayerRankingResult[] } {
        // 创建所有参与者的分数列表
        const allParticipants = [
            ...humanPlayers.map(p => ({ ...p, isAI: false })),
            ...aiOpponents.map(ai => ({ ...ai, isAI: true }))
        ];

        // 按分数排序
        allParticipants.sort((a, b) => b.score - a.score);

        // 重新分配排名
        const updatedHumanRankings = [...humanRankings];
        const updatedAIOpponents = [...aiOpponents];

        allParticipants.forEach((participant, index) => {
            const finalRank = index + 1;

            if (participant.isAI) {
                const ai = updatedAIOpponents.find(a => a.uid === participant.uid);
                if (ai) {
                    ai.recommendedRank = finalRank;
                }
            } else {
                const human = updatedHumanRankings.find(h => h.uid === participant.uid);
                if (human) {
                    human.recommendedRank = finalRank;
                }
            }
        });

        return { aiOpponents: updatedAIOpponents, humanRankings: updatedHumanRankings };
    }

    /**
     * 构建比赛结果
     */
    private buildMatchResult(
        finalRankings: { aiOpponents: AIOpponent[], humanRankings: PlayerRankingResult[] },
        humanAnalysis: HumanAnalysis,
        humanPlayers: HumanPlayer[],
        aiCount: number
    ): MatchRankingResult {
        return {
            humanPlayerRankings: finalRankings.humanRankings,
            aiOpponents: finalRankings.aiOpponents,
            matchContext: {
                totalParticipants: humanPlayers.length + aiCount,
                humanPlayerCount: humanPlayers.length,
                aiCount,
                averageHumanScore: humanAnalysis.averageScore,
                scoreRange: humanAnalysis.scoreDistribution,
                skillDistribution: humanAnalysis.skillDistribution
            },
            recommendations: {
                strategy: this.generateStrategyRecommendation(humanAnalysis),
                reasoning: this.generateOverallReasoning(humanAnalysis, humanPlayers.length, aiCount),
                confidence: this.calculateOverallConfidence(humanAnalysis)
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

    private getDefaultMatchResult(humanPlayers: HumanPlayer[], aiCount: number): MatchRankingResult {
        const humanRankings = humanPlayers.map((player, index) => ({
            uid: player.uid,
            recommendedRank: index + 1,
            confidence: 0.5,
            reasoning: '使用默认排名',
            relativePerformance: 'average' as const
        }));

        return {
            humanPlayerRankings: humanRankings,
            aiOpponents: [],
            matchContext: {
                totalParticipants: humanPlayers.length + aiCount,
                humanPlayerCount: humanPlayers.length,
                aiCount,
                averageHumanScore: humanPlayers.reduce((sum, p) => sum + p.score, 0) / humanPlayers.length,
                scoreRange: {
                    highest: Math.max(...humanPlayers.map(p => p.score)),
                    lowest: Math.min(...humanPlayers.map(p => p.score)),
                    median: 0
                },
                skillDistribution: {
                    beginner: 0,
                    intermediate: 0,
                    advanced: 0
                }
            },
            recommendations: {
                strategy: 'default',
                reasoning: '使用默认策略',
                confidence: 0.1
            }
        };
    }

    // ==================== 工具方法 ====================

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

        const validScores = scores.filter(score => score >= 0 && !isNaN(score));
        if (validScores.length < 3) return 0.5;

        const mean = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
        if (mean === 0) return 0.5;

        const timeWeights = this.calculateTimeWeights(validScores.length);
        const weightedVariance = this.calculateWeightedVariance(validScores, timeWeights, mean);
        const weightedStandardDeviation = Math.sqrt(weightedVariance);

        const baseConsistency = 1 - (weightedStandardDeviation / mean);
        const scoreRange = Math.max(...validScores) - Math.min(...validScores);
        const rangeAdjustment = this.calculateRangeAdjustment(scoreRange, mean);

        const finalConsistency = baseConsistency * rangeAdjustment;
        return Math.max(0, Math.min(1, finalConsistency));
    }

    private calculateTimeWeights(length: number): number[] {
        const weights: number[] = [];
        for (let i = 0; i < length; i++) {
            const weight = Math.pow(0.9, i);
            weights.push(weight);
        }
        return weights;
    }

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

    private calculateRangeAdjustment(scoreRange: number, mean: number): number {
        if (mean === 0) return 1;
        const rangeRatio = scoreRange / mean;
        return Math.max(0.5, Math.min(1.2, 1 - (rangeRatio - 0.5) * 0.3));
    }

    private calculateMedian(scores: number[]): number {
        const sorted = [...scores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    private calculateVariance(scores: number[], mean: number): number {
        const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
    }

    private calculateSkillDistribution(playerProfiles: Map<string, PlayerPerformanceProfile>) {
        const distribution = { beginner: 0, intermediate: 0, advanced: 0 };

        for (const profile of playerProfiles.values()) {
            if (profile.totalMatches < 10) distribution.beginner++;
            else if (profile.totalMatches < 30) distribution.intermediate++;
            else distribution.advanced++;
        }

        return distribution;
    }

    private determineOverallSkillLevel(skillDistribution: any): 'beginner' | 'intermediate' | 'advanced' {
        const total = skillDistribution.beginner + skillDistribution.intermediate + skillDistribution.advanced;
        if (total === 0) return 'beginner';

        const advancedRatio = skillDistribution.advanced / total;
        const intermediateRatio = skillDistribution.intermediate / total;

        if (advancedRatio >= 0.5) return 'advanced';
        if (intermediateRatio >= 0.5) return 'intermediate';
        return 'beginner';
    }

    private determineAIStrategy(humanAnalysis: HumanAnalysis): any {
        return {
            difficulty: humanAnalysis.overallSkillLevel,
            behavior: 'balanced',
            skillVariation: 0.2
        };
    }

    private ensureNonOverlappingScoreRanges(aiOpponents: AIOpponent[], humanPlayers: HumanPlayer[]): AIOpponent[] {
        // 实现分数范围不重叠的逻辑
        return aiOpponents;
    }

    private determineAISkillLevel(targetRank: number, totalParticipants: number, aiStrategy: any): 'beginner' | 'intermediate' | 'advanced' {
        const rankRatio = targetRank / totalParticipants;
        if (rankRatio <= 0.3) return 'advanced';
        if (rankRatio <= 0.7) return 'intermediate';
        return 'beginner';
    }

    private selectAICharacter(skillLevel: string): string {
        const characters = {
            beginner: 'ai_beginner',
            intermediate: 'ai_intermediate',
            advanced: 'ai_advanced'
        };
        return characters[skillLevel as keyof typeof characters] || 'ai_intermediate';
    }

    private mapSkillLevelToDifficulty(skillLevel: string): 'easy' | 'normal' | 'hard' | 'extreme' {
        const mapping: Record<string, 'easy' | 'normal' | 'hard' | 'extreme'> = {
            beginner: 'easy',
            intermediate: 'normal',
            advanced: 'hard'
        };
        return mapping[skillLevel] || 'normal';
    }

    private selectAIBehavior(skillLevel: string, aiStrategy: any): 'supportive' | 'balanced' | 'competitive' {
        return 'balanced';
    }

    private generateAIDescription(skillLevel: string, difficulty: string, behavior: string): string {
        return `AI对手 - ${skillLevel}水平，${difficulty}难度，${behavior}行为`;
    }

    private generateStrategyRecommendation(humanAnalysis: HumanAnalysis): string {
        return `基于${humanAnalysis.overallSkillLevel}水平群体的智能匹配策略`;
    }

    private generateOverallReasoning(humanAnalysis: HumanAnalysis, humanCount: number, aiCount: number): string {
        return `为${humanCount}名人类玩家和${aiCount}名AI对手生成了平衡的排名推荐`;
    }

    private calculateOverallConfidence(humanAnalysis: HumanAnalysis): number {
        return 0.8; // 简化实现
    }

    // ==================== 配置管理 ====================

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<RankingConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.cache.clear();
    }

    /**
     * 获取当前配置
     */
    getConfig(): RankingConfig {
        return { ...this.config };
    }

    /**
     * 清理缓存
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return this.cache.getStats();
    }
}
