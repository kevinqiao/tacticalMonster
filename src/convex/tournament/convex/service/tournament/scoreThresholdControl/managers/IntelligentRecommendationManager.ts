/**
 * 智能推荐组合管理器
 * 结合 IncrementalStatisticsManager 和 IntelligentExperienceManager
 * 提供智能化的种子推荐和用户体验管理
 */

import { IncrementalStatisticsManager } from "./IncrementalStatisticsManager";
import { IntelligentExperienceManager } from "./IntelligentExperienceManager";

// 用户偏好接口
interface UserPreferences {
    preferredDifficulty: string;
    learningStyle: string;
    challengeTolerance: number;
    adaptationSpeed: number;
}

// 种子推荐结果接口
interface SeedRecommendation {
    seeds: string[];
    difficultyLevel: string;
    reasoning: string;
    confidence: number;
    alternatives: string[];
    userPreferences: UserPreferences;
}

// 自适应难度结果接口
interface AdaptiveDifficultyResult {
    baseDifficulty: string;
    performanceAdjustment: string;
    userPreferenceAdjustment: string;
    finalDifficulty: string;
    confidence: number;
    reasoning: string;
}

// 用户行为分析结果接口
interface UserBehaviorAnalysis {
    difficultyPreference: string;
    learningPattern: string;
    challengeResponse: string;
    adaptationSpeed: number;
    confidence: number;
}

export class IntelligentRecommendationManager {
    private statsManager: IncrementalStatisticsManager;
    private expManager: IntelligentExperienceManager;
    private ctx: any; // 存储 ctx 引用

    constructor(ctx: any) {
        this.ctx = ctx; // 存储 ctx
        this.statsManager = new IncrementalStatisticsManager(ctx);
        this.expManager = new IntelligentExperienceManager(ctx);
    }

    /**
     * 智能推荐种子（主要方法）
     */
    async intelligentRecommendSeeds(uid: string, limit: number = 5): Promise<{
        playerSkillLevel: string;
        adaptiveDifficulty: string;
        recommendation: SeedRecommendation;
        reasoning: string;
        confidence: number;
        experienceOptimization: any;
    }> {
        try {
            // 1. 获取基础统计
            const playerSkillLevel = await this.statsManager.getPlayerSkillLevel(uid);
            const playerStats = await this.getPlayerSkillStatistics(uid);

            // 2. 获取体验优化建议（增强协作）
            const aiStrategy = await this.expManager.adjustAIDifficulty(uid);
            const emotionalState = await this.getEmotionalState(uid);
            const experienceTarget = await this.getExperienceTarget(uid);

            // 3. 智能分析用户偏好
            const userPreferences = await this.analyzeUserPreferences(uid);
            const adaptiveDifficulty = await this.calculateAdaptiveDifficulty(
                uid,
                playerSkillLevel,
                playerStats,
                aiStrategy,
                emotionalState
            );

            // 4. 生成体验感知的推荐
            const recommendation = await this.generateExperienceAwareRecommendation(
                uid,
                adaptiveDifficulty,
                limit,
                userPreferences,
                aiStrategy,
                emotionalState,
                experienceTarget
            );

            // 5. 生成体验优化建议
            const experienceOptimization = await this.generateExperienceOptimization(
                uid,
                aiStrategy,
                emotionalState,
                experienceTarget
            );

            return {
                playerSkillLevel,
                adaptiveDifficulty: adaptiveDifficulty.finalDifficulty,
                recommendation,
                reasoning: recommendation.reasoning,
                confidence: recommendation.confidence,
                experienceOptimization
            };

        } catch (error) {
            console.error(`智能推荐种子失败: ${uid}`, error);
            throw error;
        }
    }

    /**
     * 获取玩家技能统计
     */
    private async getPlayerSkillStatistics(uid: string): Promise<any> {
        try {
            // 直接获取基础统计，因为缓存访问是私有的
            const recentMatches = await this.ctx.db
                .query("match_results")
                .withIndex("by_uid")
                .filter((q: any) => q.eq(q.field("uid"), uid))
                .order("desc")
                .take(20);

            if (recentMatches.length === 0) {
                return null;
            }

            // 计算基础统计
            const ranks = recentMatches.map((m: any) => m.rank);
            const scores = recentMatches.map((m: any) => m.score);
            const wins = ranks.filter((rank: number) => rank === 1).length;

            return {
                totalMatches: recentMatches.length,
                averageRank: ranks.reduce((sum: number, rank: number) => sum + rank, 0) / ranks.length,
                averageScore: scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length,
                wins,
                winRate: wins / ranks.length
            };

        } catch (error) {
            console.error(`获取玩家技能统计失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 分析用户偏好
     */
    private async analyzeUserPreferences(uid: string): Promise<UserPreferences> {
        try {
            // 分析用户历史选择、行为模式等
            const userBehavior = await this.analyzeUserBehavior(uid);
            const learningPattern = await this.analyzeLearningPattern(uid);

            return {
                preferredDifficulty: this.inferDifficultyPreference(userBehavior),
                learningStyle: this.inferLearningStyle(learningPattern),
                challengeTolerance: this.calculateChallengeTolerance(userBehavior),
                adaptationSpeed: this.calculateAdaptationSpeed(learningPattern)
            };

        } catch (error) {
            console.error(`分析用户偏好失败: ${uid}`, error);
            return this.getDefaultUserPreferences();
        }
    }

    /**
     * 分析用户行为
     */
    private async analyzeUserBehavior(uid: string): Promise<UserBehaviorAnalysis> {
        try {
            // 获取用户最近的比赛记录
            const recentMatches = await this.ctx.db
                .query("match_results")
                .withIndex("by_uid")
                .filter((q: any) => q.eq(q.field("uid"), uid))
                .order("desc")
                .take(50);

            if (recentMatches.length === 0) {
                return this.getDefaultUserBehavior();
            }

            // 分析难度偏好
            const difficultyPreference = this.analyzeDifficultyPreference(recentMatches);

            // 分析学习模式
            const learningPattern = this.analyzeLearningPatternFromMatches(recentMatches);

            // 分析挑战响应
            const challengeResponse = this.analyzeChallengeResponse(recentMatches);

            // 计算适应速度
            const adaptationSpeed = this.calculateAdaptationSpeedFromMatches(recentMatches);

            return {
                difficultyPreference,
                learningPattern,
                challengeResponse,
                adaptationSpeed,
                confidence: this.calculateBehaviorConfidence(recentMatches)
            };

        } catch (error) {
            console.error(`分析用户行为失败: ${uid}`, error);
            return this.getDefaultUserBehavior();
        }
    }

    /**
     * 分析学习模式
     */
    private async analyzeLearningPattern(uid: string): Promise<any> {
        try {
            // 这里可以调用 IntelligentExperienceManager 的相关方法
            // 或者实现自己的学习模式分析逻辑
            // 暂时使用默认值，后续可以扩展
            return {
                learningEfficiency: 0.5,
                adaptationSpeed: 0.5,
                challengeResponse: 'balanced'
            };

        } catch (error) {
            console.error(`分析学习模式失败: ${uid}`, error);
            return {
                learningEfficiency: 0.5,
                adaptationSpeed: 0.5,
                challengeResponse: 'balanced'
            };
        }
    }



    /**
     * 生成个性化推荐
     */
    private async generatePersonalizedRecommendation(
        uid: string,
        adaptiveDifficulty: AdaptiveDifficultyResult,
        limit: number,
        userPreferences: UserPreferences
    ): Promise<SeedRecommendation> {
        try {
            // 结合统计数据和智能分析生成推荐
            const candidateSeeds = await this.statsManager.getSeedsByDifficultyLevel(
                adaptiveDifficulty.finalDifficulty,
                limit * 2
            );

            // 智能排序和筛选
            const rankedSeeds = await this.rankSeedsByUserPreference(
                uid,
                candidateSeeds,
                userPreferences
            );

            // 生成备选方案
            const alternatives = await this.generateAlternatives(
                uid,
                adaptiveDifficulty.finalDifficulty,
                limit
            );

            return {
                seeds: rankedSeeds.slice(0, limit),
                difficultyLevel: adaptiveDifficulty.finalDifficulty,
                reasoning: this.generateRecommendationReasoning(
                    uid,
                    adaptiveDifficulty,
                    userPreferences
                ),
                confidence: adaptiveDifficulty.confidence,
                alternatives,
                userPreferences
            };

        } catch (error) {
            console.error(`生成个性化推荐失败: ${uid}`, error);
            return this.getDefaultRecommendation(limit);
        }
    }

    /**
     * 学习用户反馈
     */
    async learnFromUserFeedback(
        uid: string,
        seedId: string,
        feedback: any
    ): Promise<void> {
        try {
            // 记录用户反馈，用于改进推荐算法
            await this.recordUserFeedback(uid, seedId, feedback);
            await this.updateUserPreferenceModel(uid, feedback);
            await this.optimizeRecommendationStrategy(uid);
        } catch (error) {
            console.error(`学习用户反馈失败: ${uid}`, error);
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 映射技能等级到基础难度
     */
    private mapSkillToBaseDifficulty(skillLevel: string): string {
        const skillToDifficulty: { [key: string]: string } = {
            'bronze': 'very_easy',
            'silver': 'easy',
            'gold': 'normal',
            'platinum': 'hard',
            'diamond': 'very_hard'
        };
        return skillToDifficulty[skillLevel] || 'normal';
    }

    /**
     * 计算性能调整
     */
    private calculatePerformanceAdjustment(playerStats: any): string {
        if (!playerStats) return 'normal';

        const { averageRank, winRate } = playerStats;

        if (averageRank <= 1.5 && winRate >= 0.6) return 'harder';
        if (averageRank <= 2.0 && winRate >= 0.5) return 'slightly_harder';
        if (averageRank <= 2.5 && winRate >= 0.4) return 'normal';
        if (averageRank <= 3.0 && winRate >= 0.3) return 'slightly_easier';
        return 'easier';
    }

    /**
     * 获取用户偏好调整
     */
    private async getUserPreferenceAdjustment(uid: string): Promise<string> {
        try {
            // 这里可以实现更复杂的用户偏好分析
            // 暂时返回默认值
            return 'normal';
        } catch (error) {
            return 'normal';
        }
    }



    /**
     * 增加难度
     */
    private increaseDifficulty(difficulty: string): string {
        const difficultyOrder = ['very_easy', 'easy', 'normal', 'hard', 'very_hard'];
        const currentIndex = difficultyOrder.indexOf(difficulty);
        return difficultyOrder[Math.min(currentIndex + 1, difficultyOrder.length - 1)];
    }

    /**
     * 降低难度
     */
    private decreaseDifficulty(difficulty: string): string {
        const difficultyOrder = ['very_easy', 'easy', 'normal', 'hard', 'very_hard'];
        const currentIndex = difficultyOrder.indexOf(difficulty);
        return difficultyOrder[Math.max(currentIndex - 1, 0)];
    }

    /**
     * 按用户偏好排序种子
     */
    private async rankSeedsByUserPreference(
        uid: string,
        seeds: string[],
        userPreferences: UserPreferences
    ): Promise<string[]> {
        try {
            // 这里可以实现更复杂的排序算法
            // 暂时返回原始顺序
            return seeds;
        } catch (error) {
            return seeds;
        }
    }

    /**
     * 生成备选方案
     */
    private async generateAlternatives(
        uid: string,
        difficulty: string,
        limit: number
    ): Promise<string[]> {
        try {
            // 获取相近难度的种子作为备选
            const alternativeDifficulties = this.getAlternativeDifficulties(difficulty);
            const alternatives: string[] = [];

            for (const altDifficulty of alternativeDifficulties) {
                const altSeeds = await this.statsManager.getSeedsByDifficultyLevel(altDifficulty, 2);
                alternatives.push(...altSeeds);
            }

            return alternatives.slice(0, limit);
        } catch (error) {
            return [];
        }
    }

    /**
     * 获取备选难度
     */
    private getAlternativeDifficulties(difficulty: string): string[] {
        const difficultyMap: { [key: string]: string[] } = {
            'very_easy': ['easy'],
            'easy': ['very_easy', 'normal'],
            'normal': ['easy', 'hard'],
            'hard': ['normal', 'very_hard'],
            'very_hard': ['hard']
        };
        return difficultyMap[difficulty] || ['normal'];
    }

    // ==================== 默认值方法 ====================

    private getDefaultUserPreferences(): UserPreferences {
        return {
            preferredDifficulty: 'balanced',
            learningStyle: 'balanced',
            challengeTolerance: 0.5,
            adaptationSpeed: 0.5
        };
    }

    private getDefaultUserBehavior(): UserBehaviorAnalysis {
        return {
            difficultyPreference: 'balanced',
            learningPattern: 'balanced',
            challengeResponse: 'balanced',
            adaptationSpeed: 0.5,
            confidence: 0.3
        };
    }

    private getDefaultAdaptiveDifficulty(skillLevel: string): AdaptiveDifficultyResult {
        const baseDifficulty = this.mapSkillToBaseDifficulty(skillLevel);
        return {
            baseDifficulty,
            performanceAdjustment: 'normal',
            userPreferenceAdjustment: 'normal',
            finalDifficulty: baseDifficulty,
            confidence: 0.5,
            reasoning: '使用默认难度设置'
        };
    }

    private getDefaultRecommendation(limit: number): SeedRecommendation {
        return {
            seeds: [],
            difficultyLevel: 'normal',
            reasoning: '推荐生成失败，使用默认设置',
            confidence: 0.3,
            alternatives: [],
            userPreferences: this.getDefaultUserPreferences()
        };
    }

    // ==================== 辅助分析方法 ====================

    private inferDifficultyPreference(userBehavior: UserBehaviorAnalysis): string {
        return userBehavior.difficultyPreference;
    }

    private inferLearningStyle(learningPattern: any): string {
        return learningPattern?.learningEfficiency > 0.7 ? 'fast' : 'balanced';
    }

    private calculateChallengeTolerance(userBehavior: UserBehaviorAnalysis): number {
        return userBehavior.challengeResponse === 'challenge' ? 0.8 : 0.5;
    }

    private calculateAdaptationSpeed(learningPattern: any): number {
        return learningPattern?.adaptationSpeed || 0.5;
    }

    private analyzeDifficultyPreference(matches: any[]): string {
        // 分析用户选择的种子难度偏好
        return 'balanced';
    }

    private analyzeLearningPatternFromMatches(matches: any[]): string {
        // 从比赛记录分析学习模式
        return 'balanced';
    }

    private analyzeChallengeResponse(matches: any[]): string {
        // 分析用户对挑战的响应
        return 'balanced';
    }

    private calculateAdaptationSpeedFromMatches(matches: any[]): number {
        // 从比赛记录计算适应速度
        return 0.5;
    }

    private calculateBehaviorConfidence(matches: any[]): number {
        // 计算行为分析的置信度
        return Math.min(matches.length / 50, 1.0);
    }





    private generateRecommendationReasoning(
        uid: string,
        adaptiveDifficulty: AdaptiveDifficultyResult,
        userPreferences: UserPreferences
    ): string {
        return `基于玩家技能等级和${userPreferences.preferredDifficulty}偏好，结合${adaptiveDifficulty.reasoning}，推荐${adaptiveDifficulty.finalDifficulty}难度的种子`;
    }

    // ==================== 反馈学习方法 ====================

    private async recordUserFeedback(uid: string, seedId: string, feedback: any): Promise<void> {
        // 记录用户反馈到数据库
        try {
            await this.ctx.db.insert("user_feedback", {
                uid,
                seedId,
                feedback,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error(`记录用户反馈失败: ${uid}`, error);
        }
    }

    private async updateUserPreferenceModel(uid: string, feedback: any): Promise<void> {
        // 更新用户偏好模型
        // 这里可以实现更复杂的机器学习逻辑
    }

    private async optimizeRecommendationStrategy(uid: string): Promise<void> {
        // 优化推荐策略
        // 这里可以实现更复杂的优化逻辑
    }

    // ==================== 体验管理协作方法 ====================

    /**
     * 获取玩家情绪状态
     */
    private async getEmotionalState(uid: string): Promise<any> {
        try {
            // 使用公共方法获取情绪状态
            return await this.expManager.getPlayerEmotionalState(uid);
        } catch (error) {
            console.error(`获取情绪状态失败: ${uid}`, error);
            return { overallState: 'balanced', confidence: 0.5, motivation: 0.5 };
        }
    }

    /**
     * 获取体验目标
     */
    private async getExperienceTarget(uid: string): Promise<any> {
        try {
            // 使用公共方法获取体验目标
            return await this.expManager.getPlayerExperienceTarget(uid);
        } catch (error) {
            console.error(`获取体验目标失败: ${uid}`, error);
            return { primary: 'balance', secondary: 'skill_development', intensity: 'low' };
        }
    }

    /**
     * 计算自适应难度（增强版）
     */
    private async calculateAdaptiveDifficulty(
        uid: string,
        skillLevel: string,
        playerStats: any,
        aiStrategy: any,
        emotionalState: any
    ): Promise<AdaptiveDifficultyResult> {
        try {
            // 基于多个因素动态调整难度
            const baseDifficulty = this.mapSkillToBaseDifficulty(skillLevel);
            const performanceAdjustment = this.calculatePerformanceAdjustment(playerStats);
            const userPreferenceAdjustment = await this.getUserPreferenceAdjustment(uid);

            // 新增：基于AI策略和情绪状态的调整
            const aiStrategyAdjustment = this.calculateAIStrategyAdjustment(aiStrategy);
            const emotionalAdjustment = this.calculateEmotionalAdjustment(emotionalState);

            const finalDifficulty = this.combineDifficultyFactors(
                baseDifficulty,
                performanceAdjustment,
                userPreferenceAdjustment,
                aiStrategyAdjustment,
                emotionalAdjustment
            );

            const confidence = this.calculateDifficultyConfidence(
                skillLevel,
                playerStats,
                userPreferenceAdjustment,
                aiStrategy,
                emotionalState
            );

            return {
                baseDifficulty,
                performanceAdjustment,
                userPreferenceAdjustment,
                finalDifficulty,
                confidence,
                reasoning: this.generateEnhancedDifficultyReasoning(
                    baseDifficulty,
                    performanceAdjustment,
                    userPreferenceAdjustment,
                    aiStrategyAdjustment,
                    emotionalAdjustment
                )
            };

        } catch (error) {
            console.error(`计算自适应难度失败: ${uid}`, error);
            return this.getDefaultAdaptiveDifficulty(skillLevel);
        }
    }

    /**
     * 生成体验感知的推荐
     */
    private async generateExperienceAwareRecommendation(
        uid: string,
        adaptiveDifficulty: AdaptiveDifficultyResult,
        limit: number,
        userPreferences: UserPreferences,
        aiStrategy: any,
        emotionalState: any,
        experienceTarget: any
    ): Promise<SeedRecommendation> {
        try {
            // 结合统计数据和智能分析生成推荐
            const candidateSeeds = await this.statsManager.getSeedsByDifficultyLevel(
                adaptiveDifficulty.finalDifficulty,
                limit * 2
            );

            // 智能排序和筛选（考虑体验因素）
            const rankedSeeds = await this.rankSeedsByExperience(
                uid,
                candidateSeeds,
                userPreferences,
                aiStrategy,
                emotionalState,
                experienceTarget
            );

            // 生成备选方案
            const alternatives = await this.generateAlternatives(
                uid,
                adaptiveDifficulty.finalDifficulty,
                limit
            );

            return {
                seeds: rankedSeeds.slice(0, limit),
                difficultyLevel: adaptiveDifficulty.finalDifficulty,
                reasoning: this.generateExperienceAwareReasoning(
                    uid,
                    adaptiveDifficulty,
                    userPreferences,
                    aiStrategy,
                    emotionalState,
                    experienceTarget
                ),
                confidence: adaptiveDifficulty.confidence,
                alternatives,
                userPreferences
            };

        } catch (error) {
            console.error(`生成体验感知推荐失败: ${uid}`, error);
            return this.getDefaultRecommendation(limit);
        }
    }

    /**
     * 生成体验优化建议
     */
    private async generateExperienceOptimization(
        uid: string,
        aiStrategy: any,
        emotionalState: any,
        experienceTarget: any
    ): Promise<any> {
        try {
            return {
                aiStrategy: {
                    difficulty: aiStrategy.difficulty,
                    behavior: aiStrategy.behavior,
                    scoreRange: aiStrategy.scoreRange,
                    rankingBias: aiStrategy.rankingBias
                },
                emotionalSupport: {
                    currentState: emotionalState.overallState,
                    confidence: emotionalState.confidence,
                    motivation: emotionalState.motivation,
                    recommendations: this.generateEmotionalRecommendations(emotionalState)
                },
                experienceTarget: {
                    primary: experienceTarget.primary,
                    secondary: experienceTarget.secondary,
                    intensity: experienceTarget.intensity,
                    duration: experienceTarget.duration
                },
                optimizationTips: this.generateOptimizationTips(aiStrategy, emotionalState, experienceTarget)
            };
        } catch (error) {
            console.error(`生成体验优化建议失败: ${uid}`, error);
            return {};
        }
    }

    // ==================== 辅助计算方法 ====================

    /**
     * 计算AI策略调整
     */
    private calculateAIStrategyAdjustment(aiStrategy: any): string {
        if (!aiStrategy) return 'normal';

        switch (aiStrategy.difficulty) {
            case 'easy': return 'easier';
            case 'hard': return 'harder';
            default: return 'normal';
        }
    }

    /**
     * 计算情绪调整
     */
    private calculateEmotionalAdjustment(emotionalState: any): string {
        if (!emotionalState) return 'normal';

        switch (emotionalState.overallState) {
            case 'frustrated': return 'easier';
            case 'encouraged': return 'harder';
            case 'challenged': return 'slightly_harder';
            default: return 'normal';
        }
    }

    /**
     * 组合难度因素（增强版）
     */
    private combineDifficultyFactors(
        baseDifficulty: string,
        performanceAdjustment: string,
        userPreferenceAdjustment: string,
        aiStrategyAdjustment: string,
        emotionalAdjustment: string
    ): string {
        // 简化的难度组合逻辑
        let finalDifficulty = baseDifficulty;

        // 应用各种调整
        if (performanceAdjustment === 'harder' && userPreferenceAdjustment === 'challenge') {
            finalDifficulty = this.increaseDifficulty(finalDifficulty);
        } else if (performanceAdjustment === 'easier' && userPreferenceAdjustment === 'practice') {
            finalDifficulty = this.decreaseDifficulty(finalDifficulty);
        }

        // 应用AI策略调整
        if (aiStrategyAdjustment === 'harder') {
            finalDifficulty = this.increaseDifficulty(finalDifficulty);
        } else if (aiStrategyAdjustment === 'easier') {
            finalDifficulty = this.decreaseDifficulty(finalDifficulty);
        }

        // 应用情绪调整
        if (emotionalAdjustment === 'easier') {
            finalDifficulty = this.decreaseDifficulty(finalDifficulty);
        } else if (emotionalAdjustment === 'harder') {
            finalDifficulty = this.increaseDifficulty(finalDifficulty);
        }

        return finalDifficulty;
    }

    /**
     * 按体验因素排序种子
     */
    private async rankSeedsByExperience(
        uid: string,
        seeds: string[],
        userPreferences: UserPreferences,
        aiStrategy: any,
        emotionalState: any,
        experienceTarget: any
    ): Promise<string[]> {
        try {
            // 这里可以实现更复杂的排序算法，考虑体验因素
            // 暂时返回原始顺序，后续可以扩展
            return seeds;
        } catch (error) {
            return seeds;
        }
    }

    /**
     * 生成增强的难度推理
     */
    private generateEnhancedDifficultyReasoning(
        baseDifficulty: string,
        performanceAdjustment: string,
        userPreferenceAdjustment: string,
        aiStrategyAdjustment: string,
        emotionalAdjustment: string
    ): string {
        const reasons = [];

        if (performanceAdjustment !== 'normal') {
            reasons.push(`基于表现调整: ${performanceAdjustment}`);
        }

        if (userPreferenceAdjustment !== 'normal') {
            reasons.push(`基于用户偏好: ${userPreferenceAdjustment}`);
        }

        if (aiStrategyAdjustment !== 'normal') {
            reasons.push(`基于AI策略: ${aiStrategyAdjustment}`);
        }

        if (emotionalAdjustment !== 'normal') {
            reasons.push(`基于情绪状态: ${emotionalAdjustment}`);
        }

        return reasons.length > 0 ? reasons.join(', ') : '使用基础难度设置';
    }

    /**
     * 生成体验感知的推理
     */
    private generateExperienceAwareReasoning(
        uid: string,
        adaptiveDifficulty: AdaptiveDifficultyResult,
        userPreferences: UserPreferences,
        aiStrategy: any,
        emotionalState: any,
        experienceTarget: any
    ): string {
        return `基于玩家技能等级和${userPreferences.preferredDifficulty}偏好，结合${adaptiveDifficulty.reasoning}，AI策略(${aiStrategy.difficulty})，情绪状态(${emotionalState.overallState})，体验目标(${experienceTarget.primary})，推荐${adaptiveDifficulty.finalDifficulty}难度的种子`;
    }

    /**
     * 生成情绪建议
     */
    private generateEmotionalRecommendations(emotionalState: any): string[] {
        const recommendations = [];

        if (emotionalState.overallState === 'frustrated') {
            recommendations.push('建议选择较简单的种子，建立信心');
            recommendations.push('可以尝试练习模式，巩固基础技能');
        } else if (emotionalState.overallState === 'encouraged') {
            recommendations.push('可以挑战更高难度的种子');
            recommendations.push('尝试新的策略和技巧');
        } else if (emotionalState.overallState === 'challenged') {
            recommendations.push('保持当前挑战水平，稳步提升');
            recommendations.push('注意休息，避免过度疲劳');
        }

        return recommendations;
    }

    /**
     * 生成优化建议
     */
    private generateOptimizationTips(aiStrategy: any, emotionalState: any, experienceTarget: any): string[] {
        const tips = [];

        // 基于AI策略的建议
        if (aiStrategy.difficulty === 'easy') {
            tips.push('AI将提供支持性体验，适合学习新技能');
        } else if (aiStrategy.difficulty === 'hard') {
            tips.push('AI将提供挑战性体验，适合技能提升');
        }

        // 基于情绪状态的建议
        if (emotionalState.overallState === 'frustrated') {
            tips.push('建议选择支持性游戏体验');
        } else if (emotionalState.overallState === 'encouraged') {
            tips.push('可以尝试更具挑战性的内容');
        }

        // 基于体验目标的建议
        if (experienceTarget.primary === 'encouragement') {
            tips.push('游戏将重点提供鼓励和支持');
        } else if (experienceTarget.primary === 'challenge') {
            tips.push('游戏将重点提供挑战和成长机会');
        }

        return tips;
    }

    /**
     * 计算难度置信度（增强版）
     */
    private calculateDifficultyConfidence(
        skillLevel: string,
        playerStats: any,
        userPreferenceAdjustment: string,
        aiStrategy: any,
        emotionalState: any
    ): number {
        // 计算难度调整的置信度
        let confidence = 0.5;

        if (playerStats && playerStats.totalMatches >= 10) {
            confidence += 0.2;
        }

        if (skillLevel !== 'bronze') {
            confidence += 0.15;
        }

        // 新增：基于AI策略和情绪状态的置信度调整
        if (aiStrategy && aiStrategy.difficulty !== 'normal') {
            confidence += 0.1;
        }

        if (emotionalState && emotionalState.overallState !== 'balanced') {
            confidence += 0.05;
        }

        return Math.min(confidence, 1.0);
    }
}
