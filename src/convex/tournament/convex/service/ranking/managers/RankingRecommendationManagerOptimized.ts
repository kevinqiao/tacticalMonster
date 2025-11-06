/**
 * 排名推荐管理器 - 优化版本
 * 核心功能：基于玩家历史数据和当前分数，智能推荐排名
 * 
     * 优化特性：
     * - 策略模式：不同经验水平的玩家使用不同的排名策略
     * - 配置驱动：通过配置调整行为，提高灵活性
     * - 模块化设计：职责清晰，易于维护和测试
 */

// 导入新的类型和工具
import { internal } from '../../../_generated/api';
import { GrowingRankingStrategy } from './strategies/GrowingRankingStrategy';
import { NewbieRankingStrategy } from './strategies/NewbieRankingStrategy';
import { PersonalizedRankingStrategy } from './strategies/PersonalizedRankingStrategy';
import { VeteranRankingStrategy } from './strategies/VeteranRankingStrategy';
import { WinRateControlledStrategy } from './strategies/WinRateControlledStrategy';
import {
    AIOpponent,
    HumanAnalysis,
    HumanPlayer,
    MatchRankingResult,
    PlayerRankingProfile,
    PlayerRankingResult
} from './types/CommonTypes';
import { DEFAULT_RANKING_CONFIG, RankingConfig } from './types/RankingConfig';
import { RankingCalculator } from './utils/RankingCalculator';

// 获取 DB API 的辅助函数
const getDbApi = () => ((internal as any)['service']['ranking']['managers']['database']['playerProfileDB']);

/**
 * 排名推荐管理器 - 优化版本
 * 
 * @context 要求：
 * 
 * 必需的接口：
 * - ctx.db: 数据库查询接口（必需，用于获取玩家历史数据）
 * 
 * 条件必需的接口（仅在启用个性化策略时）：
 * - ctx.runQuery: 内部查询调用接口（当 config.personalizedStrategy.enabled = true 时必需）
 *   用于个性化策略中查询玩家画像数据
 * 
 * 支持的 Context 类型：
 * - QueryContext (internalQuery 的 handler) ✅
 * - MutationContext (internalMutation 的 handler) ✅
 * 
 * 不支持：
 * - ActionContext (需要使用 scheduler 等替代方案) ❌
 * 
 * 注意：
 * - 如果不启用个性化策略，则只需要 ctx.db
 * - 如果启用个性化策略，则需要同时提供 ctx.db 和 ctx.runQuery
 * 
 * @使用场景：
 * 
 * 场景 1: 创建比赛时生成排名
 * ```typescript
 * export const createMatch = internalMutation({
 *     handler: async (ctx, args) => {
 *         const manager = new RankingRecommendationManagerOptimized(ctx);
 *         const result = await manager.generateMatchRankings(players, aiCount);
 *         // 保存结果到数据库
 *     }
 * });
 * ```
 * 
 * 场景 2: 匹配队列处理
 * ```typescript
 * export const processMatch = internalMutation({
 *     handler: async (ctx, args) => {
 *         const manager = new RankingRecommendationManagerOptimized(ctx, {
 *             personalizedStrategy: { enabled: true }
 *         });
 *         const result = await manager.generateMatchRankings(players, aiCount);
 *     }
 * });
 * ```
 * 
 * 场景 3: 排名预览（查询）
 * ```typescript
 * export const previewRanking = internalQuery({
 *     handler: async (ctx, args) => {
 *         const manager = new RankingRecommendationManagerOptimized(ctx);
 *         return await manager.generateMatchRankings(players, aiCount);
 *     }
 * });
 * ```
 * 
 * 更多场景示例请参考: docs/USAGE_SCENARIOS.md
 * Context 要求详细说明: docs/CTX_REQUIREMENTS.md
 */
export class RankingRecommendationManagerOptimized {
    private ctx: any;
    private config: RankingConfig;
    private static callCounter = 0;

    /**
     * 构造函数
     * @param ctx - Convex context 对象
     *   - 必须提供: ctx.db（用于数据库查询）
     *   - 如果启用个性化策略: 还需要提供 ctx.runQuery（用于查询玩家画像）
     * @param config - 可选的配置覆盖，未提供的项将使用默认值
     */
    constructor(ctx: any, config?: Partial<RankingConfig>) {
        this.ctx = ctx;
        this.config = { ...DEFAULT_RANKING_CONFIG, ...config };
    }

    /**
     * 核心方法：生成完整的比赛排名结果
     * @param humanPlayers - 人类玩家列表
     * @param aiCount - AI对手数量
     * @param gameType - 游戏类型（可选，如果提供则只查询该游戏的历史记录）
     */
    async generateMatchRankings(
        humanPlayers: HumanPlayer[],
        aiCount: number,
        gameType?: string
    ): Promise<MatchRankingResult> {
        try {
            console.log('generateMatchRankings', humanPlayers, aiCount, gameType);
            // 输入验证
            this.validateInputs(humanPlayers, aiCount);

            // 获取玩家档案（带缓存）
            const playerProfiles = await this.getPlayerProfiles(humanPlayers, gameType);
            console.log('playerProfiles', playerProfiles);

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

            return this.buildMatchResult(finalRankings, humanAnalysis, humanPlayers, aiCount, gameType);

        } catch (error) {
            console.error('生成比赛排名失败:', error);
            return this.getDefaultMatchResult(humanPlayers, aiCount, gameType);
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
     * 获取玩家档案
     */
    private async getPlayerProfiles(humanPlayers: HumanPlayer[], gameType?: string): Promise<Map<string, PlayerRankingProfile>> {
        const profiles = new Map<string, PlayerRankingProfile>();

        for (const player of humanPlayers) {
            const profile = await this.fetchPlayerProfile(player.uid, gameType);
            profiles.set(player.uid, profile);
        }

        return profiles;
    }

    /**
     * 获取单个玩家档案
     * @param uid - 玩家ID
     * @param gameType - 游戏类型（可选，如果提供则只查询该游戏的历史记录）
     */
    private async fetchPlayerProfile(uid: string, gameType?: string): Promise<PlayerRankingProfile> {
        // 首先尝试从缓存获取
        if (this.ctx.runQuery) {
            try {
                const cachedMetrics = await this.ctx.runQuery(getDbApi().getPlayerPerformanceMetrics, { uid, gameType });

                // 如果缓存存在且相对新鲜（24小时内），直接使用
                if (cachedMetrics) {
                    const hoursSinceUpdate = (Date.now() - new Date(cachedMetrics.lastUpdated).getTime()) / (1000 * 60 * 60);
                    if (hoursSinceUpdate < 24) {
                        console.log(`使用缓存数据 for ${uid} (${gameType || 'all'}): ${cachedMetrics.totalMatches} matches`);
                        return {
                            uid,
                            segmentName: 'bronze' as const,
                            averageScore: cachedMetrics.averageScore,
                            averageRank: cachedMetrics.averageRank,
                            winRate: cachedMetrics.totalMatches > 0 ? cachedMetrics.totalWins / cachedMetrics.totalMatches : 0.25,
                            totalMatches: cachedMetrics.totalMatches,
                            recentPerformance: {
                                last10Matches: [], // 缓存中不保存最近10场详情，需要时从数据库补充
                                trendDirection: cachedMetrics.trendDirection,
                                consistency: cachedMetrics.consistency
                            }
                        };
                    }
                }
            } catch (error) {
                console.warn(`无法从缓存获取数据 for ${uid}, 回退到实时计算:`, error);
            }
        }

        // 缓存不存在或过期，从数据库实时计算
        let recentMatches;

        if (gameType) {
            // 如果指定了游戏类型，使用复合索引查询
            recentMatches = await this.ctx.db
                .query("player_matches")
                .withIndex("by_uid_gameType_created", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
                .order("desc")
                .take(50);
        } else {
            // 否则查询所有游戏类型的记录
            recentMatches = await this.ctx.db
                .query("player_matches")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(50);
        }

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

        console.log(`实时计算数据 for ${uid} (${gameType || 'all'}): ${recentMatches.length} matches`);

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
        playerProfiles: Map<string, PlayerRankingProfile>
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
        playerProfiles: Map<string, PlayerRankingProfile>,
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
     * 
     * 平衡逻辑：
     * 1. 如果个性化策略和胜率控制都启用：
     *    - 如果配置了组合使用（combineWithWinRateControl=true），两者可以结合
     *    - 如果胜率严重偏离且启用了优先级（winRateControlPriority=true），优先使用胜率控制
     *    - 否则优先使用个性化策略
     * 2. 如果只启用个性化策略，使用个性化策略
     * 3. 如果只启用胜率控制，使用胜率控制策略
     * 4. 否则使用传统策略（新手/成长/成熟）
     */
    private selectRankingStrategy(
        profile: PlayerRankingProfile,
        humanPlayerCount: number
    ) {
        const personalizedEnabled = this.config.personalizedStrategy?.enabled &&
            profile.totalMatches >= (this.config.personalizedStrategy.minMatchesForPersonalization || 15);

        const winRateControlEnabled = this.config.winRateControl?.enabled &&
            profile.totalMatches >= (this.config.winRateControl.minMatchesForControl || 5);

        // 情况1：两者都启用，需要平衡
        if (personalizedEnabled && winRateControlEnabled) {
            return this.selectStrategyWhenBothEnabled(profile);
        }

        // 情况2：只启用个性化策略
        if (personalizedEnabled) {
            return new PersonalizedRankingStrategy(this.config, this.ctx);
        }

        // 情况3：只启用胜率控制
        if (winRateControlEnabled) {
            return new WinRateControlledStrategy(this.config);
        }

        // 情况4：都未启用，使用传统策略
        return this.selectTraditionalStrategy(profile, humanPlayerCount);
    }

    /**
     * 当两个策略都启用时的选择逻辑
     */
    private selectStrategyWhenBothEnabled(profile: PlayerRankingProfile) {
        const personalizedConfig = this.config.personalizedStrategy!;
        const winRateConfig = this.config.winRateControl!;

        // 检查是否配置了组合使用
        if (personalizedConfig.combineWithWinRateControl) {
            // 组合使用：个性化策略会考虑胜率控制
            // 注意：这需要在 PersonalizedRankingStrategy 中实现
            return new PersonalizedRankingStrategy(this.config, this.ctx);
        }

        // 检查是否应该优先使用胜率控制
        if (personalizedConfig.winRateControlPriority !== false) {
            const currentWinRate = profile.winRate;
            const targetWinRate = winRateConfig.targetWinRate || 0.33;
            const deviationThreshold = personalizedConfig.winRateDeviationThreshold || 0.15;
            const winRateDeviation = Math.abs(currentWinRate - targetWinRate);

            // 如果胜率严重偏离，优先使用胜率控制策略来快速纠正
            if (winRateDeviation > deviationThreshold) {
                console.log(
                    `玩家 ${profile.uid} 胜率偏离 ${(winRateDeviation * 100).toFixed(1)}% ` +
                    `(当前: ${(currentWinRate * 100).toFixed(1)}%, 目标: ${(targetWinRate * 100).toFixed(1)}%), ` +
                    `优先使用胜率控制策略`
                );
                return new WinRateControlledStrategy(this.config);
            }
        }

        // 胜率正常，使用个性化策略提供更精细的体验
        console.log(`玩家 ${profile.uid} 胜率正常，使用个性化策略`);
        return new PersonalizedRankingStrategy(this.config, this.ctx);
    }

    /**
     * 选择传统策略（新手/成长/成熟）
     */
    private selectTraditionalStrategy(
        profile: PlayerRankingProfile,
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
        aiCount: number,
        gameType?: string
    ): MatchRankingResult {
        return {
            humanPlayerRankings: finalRankings.humanRankings,
            aiOpponents: finalRankings.aiOpponents,
            matchContext: {
                gameType: gameType || "unknown",
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

    private getDefaultPlayerProfile(uid: string): PlayerRankingProfile {
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

    private getDefaultMatchResult(humanPlayers: HumanPlayer[], aiCount: number, gameType?: string): MatchRankingResult {
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
                gameType: gameType || "unknown",
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

    private calculateSkillDistribution(playerProfiles: Map<string, PlayerRankingProfile>) {
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
    }

    /**
     * 获取当前配置
     */
    getConfig(): RankingConfig {
        return { ...this.config };
    }
}
