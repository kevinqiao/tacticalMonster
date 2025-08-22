/**
 * 智能体验管理器
 * 实现AI难度调节、智能排名分配、学习曲线优化和情感体验管理
 */

import {
    AIStrategy,
    EmotionalState,
    IntelligentRankingStrategy,
    LearningCurveOptimization,
    LearningMilestone,
    LearningPatterns,
    PlayerHistoricalData
} from "../config/types";
import { PlayerHistoricalDataManager } from "./PlayerHistoricalDataManager";

// 定义最近表现分析结果的类型
interface RecentPerformanceAnalysis {
    averageScore: number;
    averageRank: number;
    winRate: number;
    totalMatches: number;
    scoreRange: {
        min: number;
        max: number;
    };
    rankDistribution: {
        top3: number;
        middle: number;
        bottom: number;
    };
}

export class IntelligentExperienceManager {
    private historicalDataManager: PlayerHistoricalDataManager;

    constructor(ctx: any) {
        this.historicalDataManager = new PlayerHistoricalDataManager(ctx);
    }

    // ==================== 1. 智能难度调节 ====================

    /**
     * 基于玩家表现动态调整AI难度
     */
    async adjustAIDifficulty(uid: string, currentScore?: number): Promise<AIStrategy> {
        const historicalData = await this.historicalDataManager.getPlayerHistoricalData(uid);
        if (!historicalData) {
            return this.getDefaultAIStrategy();
        }

        const emotionalState = this.historicalDataManager.analyzeEmotionalState(historicalData);
        const learningPatterns = historicalData.learningPatterns;
        const recentPerformance = this.analyzeRecentPerformance(historicalData.matchHistory.slice(-5));

        // 如果有当前分数，结合历史表现进行更精确的调整
        if (currentScore !== undefined) {
            const scoreAnalysis = this.analyzeCurrentScore(currentScore, recentPerformance, historicalData);
            if (scoreAnalysis.isImproving) {
                return this.getChallengingAIStrategy(recentPerformance, learningPatterns);
            } else if (scoreAnalysis.isDeclining) {
                return this.getSupportiveAIStrategy(recentPerformance);
            }
        }

        // 基于情绪状态和表现调整难度
        if (emotionalState.overallState === 'frustrated') {
            return this.getSupportiveAIStrategy(recentPerformance);
        } else if (emotionalState.overallState === 'encouraged') {
            return this.getChallengingAIStrategy(recentPerformance, learningPatterns);
        } else if (emotionalState.overallState === 'challenged') {
            return this.getBalancedAIStrategy(recentPerformance, learningPatterns);
        } else {
            return this.getBalancedAIStrategy(recentPerformance, learningPatterns);
        }
    }

    /**
     * 获取支持性AI策略（降低难度）
     */
    private getSupportiveAIStrategy(recentPerformance: RecentPerformanceAnalysis): AIStrategy {
        const baseScore = recentPerformance.averageScore || 2000;
        return {
            difficulty: 'easy',
            behavior: 'supportive',
            scoreRange: {
                min: Math.max(500, baseScore * 0.6),
                max: Math.min(8000, baseScore * 1.2)
            },
            rankingBias: 'encouraging'
        };
    }

    /**
     * 获取挑战性AI策略（提高难度）
     */
    private getChallengingAIStrategy(recentPerformance: RecentPerformanceAnalysis, learningPatterns: any): AIStrategy {
        const baseScore = recentPerformance.averageScore || 2000;
        const challengeMultiplier = 1 + learningPatterns.learningEfficiency * 0.5; // 基于学习效率调整

        return {
            difficulty: 'hard',
            behavior: 'challenging',
            scoreRange: {
                min: Math.max(1000, baseScore * 0.8),
                max: Math.min(10000, baseScore * challengeMultiplier)
            },
            rankingBias: 'challenging'
        };
    }

    /**
     * 获取平衡性AI策略
     */
    private getBalancedAIStrategy(recentPerformance: RecentPerformanceAnalysis, learningPatterns: any): AIStrategy {
        const baseScore = recentPerformance.averageScore || 2000;
        return {
            difficulty: 'normal',
            behavior: 'balanced',
            scoreRange: {
                min: Math.max(800, baseScore * 0.7),
                max: Math.min(9000, baseScore * 1.4)
            },
            rankingBias: 'neutral'
        };
    }

    /**
     * 获取默认AI策略
     */
    private getDefaultAIStrategy(): AIStrategy {
        return {
            difficulty: 'normal',
            behavior: 'balanced',
            scoreRange: { min: 1000, max: 5000 },
            rankingBias: 'neutral'
        };
    }

    // ==================== 2. 智能排名分配 ====================

    /**
 * 智能排名分配，提升玩家心理满足感
 * 比赛前调用，制定个性化体验策略
 */
    async intelligentRankingAssignment(
        uid: string,
        playerScore: number,
        participantCount: number
    ): Promise<IntelligentRankingStrategy> {
        try {
            const historicalData: PlayerHistoricalData | null = await this.historicalDataManager.getPlayerHistoricalData(uid);
            if (!historicalData) {
                return this.getDefaultRankingStrategy(participantCount, playerScore);
            }

            // 分析玩家当前状态
            const emotionalState: EmotionalState = this.historicalDataManager.analyzeEmotionalState(historicalData);
            const learningPatterns: LearningPatterns = historicalData.learningPatterns;
            const recentPerformance = this.analyzeRecentPerformance(historicalData.matchHistory.slice(-5));

            // 结合当前分数和历史表现进行综合分析
            const currentScoreAnalysis = this.analyzeCurrentScore(playerScore, recentPerformance, historicalData);

            // 确定体验目标 - 现在考虑当前分数
            const experienceTarget = this.determineExperienceTarget(
                emotionalState,
                learningPatterns,
                recentPerformance,
                currentScoreAnalysis
            );

            // 获取AI策略 - 基于当前分数调整
            const aiStrategy = await this.adjustAIDifficulty(uid, playerScore);

            // 基于体验目标、当前分数和参与者数量制定排名策略
            const rankingStrategy = this.calculateRankingStrategy(
                experienceTarget.primary,
                emotionalState,
                participantCount,
                recentPerformance,
                currentScoreAnalysis
            );

            // 计算学习率调整 - 考虑当前分数水平
            const learningRateAdjustment = this.calculateLearningRateAdjustment(
                experienceTarget.primary,
                learningPatterns,
                currentScoreAnalysis
            );

            // 生成即时行动建议 - 基于当前分数状态
            const immediateActions = this.generateImmediateActions(
                experienceTarget.primary,
                emotionalState,
                participantCount,
                currentScoreAnalysis
            );

            // 计算策略置信度
            const confidence = this.calculateStrategyConfidence(historicalData, emotionalState, currentScoreAnalysis);

            return {
                targetExperience: experienceTarget,
                rankingAdjustment: rankingStrategy.adjustment,
                aiStrategy,
                learningRateAdjustment,
                immediateActions,
                learningMilestones: rankingStrategy.milestones,
                confidence
            };
        } catch (error) {
            console.error(`智能排名分配失败: ${uid}`, error);
            return this.getDefaultRankingStrategy(participantCount, playerScore);
        }
    }

    /**
     * 确定体验目标
     */
    private determineExperienceTarget(
        emotionalState: EmotionalState,
        learningPatterns: any,
        recentPerformance: RecentPerformanceAnalysis,
        currentScoreAnalysis: any
    ): {
        primary: 'encouragement' | 'challenge' | 'balance' | 'growth';
        secondary: 'skill_development' | 'confidence_building' | 'motivation_maintenance';
        intensity: 'low' | 'medium' | 'high';
        duration: 'short' | 'medium' | 'long';
    } {
        // 基于情绪状态和当前分数分析确定主要目标
        let primary: 'encouragement' | 'challenge' | 'balance' | 'growth';
        let intensity: 'low' | 'medium' | 'high';

        // 结合当前分数状态调整目标
        if (emotionalState.overallState === 'frustrated' || currentScoreAnalysis.isDeclining) {
            primary = 'encouragement';
            intensity = 'low';
        } else if (emotionalState.overallState === 'encouraged' || currentScoreAnalysis.isImproving) {
            primary = 'challenge';
            intensity = 'high';
        } else if (emotionalState.overallState === 'challenged') {
            primary = 'growth';
            intensity = 'medium';
        } else {
            primary = 'balance';
            intensity = 'medium';
        }

        // 基于学习模式和分数水平确定次要目标
        let secondary: 'skill_development' | 'confidence_building' | 'motivation_maintenance';
        if (learningPatterns.learningEfficiency > 0.7 && currentScoreAnalysis.scoreLevel !== 'low') {
            secondary = 'skill_development';
        } else if (emotionalState.confidence < 0.5 || currentScoreAnalysis.scoreLevel === 'low') {
            secondary = 'confidence_building';
        } else {
            secondary = 'motivation_maintenance';
        }

        // 基于表现和分数趋势确定持续时间
        let duration: 'short' | 'medium' | 'long';
        if (recentPerformance.winRate > 0.7 && currentScoreAnalysis.isImproving) {
            duration = 'long';
        } else if (recentPerformance.winRate < 0.3 || currentScoreAnalysis.isDeclining) {
            duration = 'short';
        } else {
            duration = 'medium';
        }

        return { primary, secondary, intensity, duration };
    }

    /**
     * 计算排名策略
     */
    private calculateRankingStrategy(
        experienceType: string,
        emotionalState: EmotionalState,
        participantCount: number,
        recentPerformance: RecentPerformanceAnalysis,
        currentScoreAnalysis: any
    ): {
        adjustment: number[];
        milestones: string[];
    } {
        let adjustment: number[];
        let milestones: string[];

        // 基于当前分数分析调整策略
        const scoreBasedAdjustment = this.getScoreBasedAdjustment(currentScoreAnalysis);

        switch (experienceType) {
            case 'encouragement':
                adjustment = this.calculateEncouragingRankingAdjustment(emotionalState, participantCount);
                // 结合分数分析调整
                adjustment = this.combineAdjustments(adjustment, scoreBasedAdjustment);
                milestones = [
                    '获得前3名，建立信心',
                    '保持稳定表现，避免大幅波动',
                    '逐步提升技能水平'
                ];
                break;
            case 'challenge':
                adjustment = this.calculateChallengingRankingAdjustment(emotionalState, participantCount);
                // 结合分数分析调整
                adjustment = this.combineAdjustments(adjustment, scoreBasedAdjustment);
                milestones = [
                    '突破当前技能瓶颈',
                    '挑战更高难度对手',
                    '学习新的游戏策略'
                ];
                break;
            case 'growth':
                adjustment = this.calculateGrowthRankingAdjustment(emotionalState, participantCount);
                // 结合分数分析调整
                adjustment = this.combineAdjustments(adjustment, scoreBasedAdjustment);
                milestones = [
                    '保持学习热情',
                    '平衡挑战和成功',
                    '建立长期进步目标'
                ];
                break;
            default:
                adjustment = this.calculateBalancedRankingAdjustment(emotionalState, participantCount);
                // 结合分数分析调整
                adjustment = this.combineAdjustments(adjustment, scoreBasedAdjustment);
                milestones = [
                    '保持当前节奏',
                    '适度挑战自我',
                    '享受游戏过程'
                ];
        }

        return { adjustment, milestones };
    }

    /**
     * 获取基于分数的调整
     */
    private getScoreBasedAdjustment(currentScoreAnalysis: any): number[] {
        const adjustment = [0, 0, 0, 0]; // 默认4人比赛

        if (currentScoreAnalysis.isImproving) {
            // 分数提升，适度提高挑战性
            adjustment[0] = -0.05; // 第1名 -5%
            adjustment[1] = 0.1;   // 第2名 +10%
            adjustment[2] = 0.05;  // 第3名 +5%
            adjustment[3] = -0.1;  // 第4名 -10%
        } else if (currentScoreAnalysis.isDeclining) {
            // 分数下降，提高鼓励性
            adjustment[0] = 0.15;  // 第1名 +15%
            adjustment[1] = 0.1;   // 第2名 +10%
            adjustment[2] = 0.05;  // 第3名 +5%
            adjustment[3] = -0.3;  // 第4名 -30%
        }

        return adjustment;
    }

    /**
     * 合并调整因子
     */
    private combineAdjustments(baseAdjustment: number[], scoreAdjustment: number[]): number[] {
        const combined = [...baseAdjustment];

        for (let i = 0; i < Math.min(combined.length, scoreAdjustment.length); i++) {
            combined[i] += scoreAdjustment[i];
            // 限制调整范围在 -1 到 1 之间
            combined[i] = Math.max(-1, Math.min(1, combined[i]));
        }

        return combined;
    }

    /**
     * 计算学习率调整
     */
    private calculateLearningRateAdjustment(
        experienceType: string,
        learningPatterns: any,
        currentScoreAnalysis: any
    ): number {
        let baseAdjustment = 1.0;

        switch (experienceType) {
            case 'encouragement':
                baseAdjustment = 1.2; // 提高学习率，快速建立信心
                break;
            case 'challenge':
                baseAdjustment = 1.0; // 保持学习率，专注技能提升
                break;
            case 'growth':
                baseAdjustment = 1.1; // 适度提高学习率
                break;
            default:
                baseAdjustment = 1.0;
        }

        // 基于学习效率调整
        if (learningPatterns.learningEfficiency > 0.7) {
            baseAdjustment *= 1.1; // 高学习效率，进一步提高
        } else if (learningPatterns.learningEfficiency < 0.3) {
            baseAdjustment *= 0.9; // 低学习效率，适当降低
        }

        // 基于学习效率调整（已在上方处理）
        // 这里主要基于当前分数分析进行调整

        // 基于当前分数分析调整
        if (currentScoreAnalysis.isImproving) {
            baseAdjustment *= 1.05; // 分数提升，适度提高学习率
        } else if (currentScoreAnalysis.isDeclining) {
            baseAdjustment *= 0.95; // 分数下降，适度降低学习率
        }

        // 基于分数水平调整
        if (currentScoreAnalysis.scoreLevel === 'low') {
            baseAdjustment *= 1.1; // 低分数，提高学习率
        } else if (currentScoreAnalysis.scoreLevel === 'high') {
            baseAdjustment *= 0.95; // 高分数，适度降低学习率
        }

        return Math.max(0.8, Math.min(1.5, baseAdjustment));
    }

    /**
     * 生成即时行动建议
     */
    private generateImmediateActions(
        experienceType: string,
        emotionalState: EmotionalState,
        participantCount: number,
        currentScoreAnalysis: any
    ): string[] {
        const actions: string[] = [];

        switch (experienceType) {
            case 'encouragement':
                actions.push('调整AI对手难度为支持性模式');
                actions.push('提高前3名获得概率');
                actions.push('增加鼓励性反馈');
                break;
            case 'challenge':
                actions.push('提高AI对手难度');
                actions.push('平衡排名分布，增加挑战性');
                actions.push('提供技能提升建议');
                break;
            case 'growth':
                actions.push('保持适中的挑战难度');
                actions.push('平衡成功和失败体验');
                actions.push('提供学习路径指导');
                break;
            default:
                actions.push('保持当前游戏设置');
                actions.push('监控玩家表现变化');
                actions.push('适时调整策略');
        }

        // 基于参与者数量添加特定建议
        if (participantCount > 6) {
            actions.push(`为${participantCount}人比赛优化排名策略`);
        }

        // 基于当前分数分析添加特定建议
        if (currentScoreAnalysis.isImproving) {
            actions.push('保持当前进步节奏');
            actions.push('适度增加挑战难度');
        } else if (currentScoreAnalysis.isDeclining) {
            actions.push('调整游戏策略');
            actions.push('提供更多练习机会');
        }

        // 基于分数水平添加建议
        if (currentScoreAnalysis.scoreLevel === 'low') {
            actions.push('提供基础技能训练');
            actions.push('降低初始难度');
        } else if (currentScoreAnalysis.scoreLevel === 'high') {
            actions.push('提供高级挑战内容');
            actions.push('优化技能组合');
        }

        return actions;
    }

    /**
     * 计算鼓励性排名调整
     */
    private calculateEncouragingRankingAdjustment(emotionalState: EmotionalState, participantCount: number): number[] {
        const adjustment = new Array(participantCount).fill(0);

        // 提高前几名概率，降低后几名概率
        if (participantCount >= 4) {
            adjustment[0] = 0.3;  // 第1名 +30%
            adjustment[1] = 0.2;  // 第2名 +20%
            adjustment[2] = 0.1;  // 第3名 +10%
            adjustment[3] = -0.6; // 第4名 -60%
        }

        return adjustment;
    }

    /**
     * 计算挑战性排名调整
     */
    private calculateChallengingRankingAdjustment(emotionalState: EmotionalState, participantCount: number): number[] {
        const adjustment = new Array(participantCount).fill(0);

        // 适度提高中间名次概率
        if (participantCount >= 4) {
            adjustment[0] = -0.1; // 第1名 -10%
            adjustment[1] = 0.2;  // 第2名 +20%
            adjustment[2] = 0.1;  // 第3名 +10%
            adjustment[3] = -0.2; // 第4名 -20%
        }

        return adjustment;
    }

    /**
     * 计算成长性排名调整
     */
    private calculateGrowthRankingAdjustment(emotionalState: EmotionalState, participantCount: number): number[] {
        const adjustment = new Array(participantCount).fill(0);

        // 平衡的调整，鼓励持续进步
        if (participantCount >= 4) {
            adjustment[0] = 0.1;  // 第1名 +10%
            adjustment[1] = 0.15; // 第2名 +15%
            adjustment[2] = 0.05; // 第3名 +5%
            adjustment[3] = -0.3; // 第4名 -30%
        }

        return adjustment;
    }

    /**
     * 计算平衡性排名调整
     */
    private calculateBalancedRankingAdjustment(emotionalState: EmotionalState, participantCount: number): number[] {
        return new Array(participantCount).fill(0); // 无调整
    }

    /**
     * 计算策略置信度
     */
    private calculateStrategyConfidence(
        historicalData: PlayerHistoricalData,
        emotionalState: EmotionalState,
        currentScoreAnalysis: any
    ): number {
        const dataQuality = Math.min(1, historicalData.matchHistory.length / 20); // 数据质量
        const emotionalStability = 1 - (emotionalState.frustration || 0.3); // 情绪稳定性

        // 基于当前分数分析的置信度
        let scoreConfidence = 0.5; // 默认中等置信度
        if (currentScoreAnalysis.trendStrength > 0.3) {
            scoreConfidence = 0.8; // 趋势明显，高置信度
        } else if (currentScoreAnalysis.trendStrength < 0.1) {
            scoreConfidence = 0.3; // 趋势不明显，低置信度
        }

        return (dataQuality + emotionalStability + scoreConfidence) / 3;
    }

    /**
 * 获取默认排名策略
 */
    private getDefaultRankingStrategy(participantCount: number, playerScore?: number): IntelligentRankingStrategy {
        const defaultAdjustment = new Array(participantCount).fill(0);

        // 基于玩家分数调整默认策略
        let immediateActions = ['保持当前游戏设置', '监控玩家表现变化'];
        let learningMilestones = ['保持当前节奏', '适度挑战自我'];

        if (playerScore !== undefined) {
            if (playerScore < 2000) {
                immediateActions.push('提供基础训练指导');
                learningMilestones.push('掌握基础技能');
            } else if (playerScore > 6000) {
                immediateActions.push('提供高级挑战');
                learningMilestones.push('突破技能瓶颈');
            }
        }

        return {
            targetExperience: {
                primary: 'balance',
                secondary: 'skill_development',
                intensity: 'low',
                duration: 'medium'
            },
            rankingAdjustment: defaultAdjustment,
            aiStrategy: this.getDefaultAIStrategy(),
            learningRateAdjustment: 1.0,
            immediateActions,
            learningMilestones,
            confidence: 0.5
        };
    }

    // ==================== 3. 学习曲线优化 ====================

    /**
     * 基于学习能力优化游戏节奏
     */
    async optimizeLearningCurve(uid: string): Promise<LearningCurveOptimization> {
        const historicalData = await this.historicalDataManager.getPlayerHistoricalData(uid);
        if (!historicalData) {
            return this.getDefaultLearningCurve();
        }

        const learningPatterns = historicalData.learningPatterns;
        const currentSkillLevel = this.assessCurrentSkillLevel(historicalData);
        const targetSkillLevel = this.determineTargetSkillLevel(historicalData);

        // 调整学习率
        const learningRate = this.adjustLearningRate(learningPatterns, currentSkillLevel);

        // 调整挑战频率
        const challengeFrequency = this.adjustChallengeFrequency(learningPatterns, currentSkillLevel, targetSkillLevel);

        // 调整成功概率
        const successProbability = this.adjustSuccessProbability(currentSkillLevel, targetSkillLevel);

        // 生成学习路径
        const learningPath = this.generateLearningPath(currentSkillLevel, targetSkillLevel);

        return {
            currentSkillLevel,
            targetSkillLevel,
            challengeFrequency,
            successProbability,
            learningPath
        };
    }

    /**
     * 评估当前技能水平
     */
    private assessCurrentSkillLevel(historicalData: PlayerHistoricalData): number {
        const recentMatches = historicalData.matchHistory.slice(-10);
        if (recentMatches.length === 0) return 0.5;

        const averageRank = recentMatches.reduce((sum, m) => sum + m.rank, 0) / recentMatches.length;
        const averageScore = recentMatches.reduce((sum, m) => sum + m.score, 0) / recentMatches.length;

        // 基于排名和分数计算技能水平
        const rankScore = Math.max(0, (5 - averageRank) / 4); // 排名分数
        const scoreScore = Math.min(1, averageScore / 10000); // 分数分数

        return (rankScore + scoreScore) / 2;
    }

    /**
     * 确定目标技能水平
     */
    private determineTargetSkillLevel(historicalData: PlayerHistoricalData): number {
        const currentLevel = this.assessCurrentSkillLevel(historicalData);
        const learningPatterns = historicalData.learningPatterns;

        // 基于学习效率确定目标
        if (learningPatterns.learningEfficiency > 0.7) {
            return Math.min(1, currentLevel + 0.3); // 高学习效率，目标更高
        } else if (learningPatterns.learningEfficiency > 0.4) {
            return Math.min(1, currentLevel + 0.2); // 中等学习效率，适度提升
        } else {
            return Math.min(1, currentLevel + 0.1); // 低学习效率，小幅提升
        }
    }

    /**
     * 调整学习率
     */
    private adjustLearningRate(learningPatterns: any, currentSkillLevel: number): number {
        let baseRate = 0.1;

        if (learningPatterns.learningEfficiency > 0.7) {
            baseRate *= 1.3; // 高学习效率，提高学习率
        } else if (learningPatterns.learningEfficiency < 0.3) {
            baseRate *= 0.7; // 低学习效率，降低学习率
        }

        if (currentSkillLevel > 0.8) {
            baseRate *= 0.9; // 高技能水平，降低学习率
        } else if (currentSkillLevel < 0.3) {
            baseRate *= 1.2; // 低技能水平，提高学习率
        }

        return Math.max(0.01, Math.min(0.3, baseRate));
    }

    /**
     * 调整挑战频率
     */
    private adjustChallengeFrequency(learningPatterns: any, currentSkillLevel: number, targetSkillLevel: number): number {
        const skillGap = targetSkillLevel - currentSkillLevel;
        const baseFrequency = 0.5;

        if (skillGap > 0.3) {
            return Math.min(1, baseFrequency * 1.5); // 技能差距大，提高挑战频率
        } else if (skillGap < 0.1) {
            return Math.max(0.2, baseFrequency * 0.7); // 技能差距小，降低挑战频率
        } else {
            return baseFrequency;
        }
    }

    /**
     * 调整成功概率
     */
    private adjustSuccessProbability(currentSkillLevel: number, targetSkillLevel: number): number {
        const skillGap = targetSkillLevel - currentSkillLevel;

        if (skillGap > 0.3) {
            return 0.3; // 技能差距大，降低成功概率
        } else if (skillGap < 0.1) {
            return 0.7; // 技能差距小，提高成功概率
        } else {
            return 0.5; // 平衡状态
        }
    }

    /**
     * 生成学习路径
     */
    private generateLearningPath(currentSkillLevel: number, targetSkillLevel: number): LearningMilestone[] {
        const milestones: LearningMilestone[] = [];
        const steps = Math.ceil((targetSkillLevel - currentSkillLevel) / 0.1);

        for (let i = 0; i < steps; i++) {
            const skillLevel = currentSkillLevel + (i + 1) * 0.1;
            milestones.push({
                skillLevel: Math.min(1, skillLevel),
                challengeType: this.getChallengeType(skillLevel),
                expectedDuration: this.getExpectedDuration(skillLevel),
                successCriteria: this.getSuccessCriteria(skillLevel)
            });
        }

        return milestones;
    }

    /**
     * 获取挑战类型
     */
    private getChallengeType(skillLevel: number): string {
        if (skillLevel < 0.3) return '基础技能练习';
        if (skillLevel < 0.6) return '进阶技能挑战';
        if (skillLevel < 0.8) return '高级技能掌握';
        return '专家级挑战';
    }

    /**
     * 获取预期持续时间
     */
    private getExpectedDuration(skillLevel: number): number {
        if (skillLevel < 0.3) return 3; // 3天
        if (skillLevel < 0.6) return 7; // 7天
        if (skillLevel < 0.8) return 14; // 14天
        return 30; // 30天
    }

    /**
     * 获取成功标准
     */
    private getSuccessCriteria(skillLevel: number): string[] {
        if (skillLevel < 0.3) {
            return ['完成基础训练', '达到最低分数要求'];
        } else if (skillLevel < 0.6) {
            return ['完成进阶挑战', '保持稳定表现', '达到中等排名'];
        } else if (skillLevel < 0.8) {
            return ['掌握高级技能', '在高难度比赛中表现优秀', '达到高排名'];
        } else {
            return ['成为专家级玩家', '在最高难度比赛中获胜', '保持顶级排名'];
        }
    }

    /**
     * 获取默认学习曲线
     */
    private getDefaultLearningCurve(): LearningCurveOptimization {
        return {
            currentSkillLevel: 0.5,
            targetSkillLevel: 0.6,
            challengeFrequency: 0.5,
            successProbability: 0.5,
            learningPath: [{
                skillLevel: 0.6,
                challengeType: '基础技能练习',
                expectedDuration: 7,
                successCriteria: ['完成基础训练', '达到最低分数要求']
            }]
        };
    }

    // ==================== 4. 情感体验管理 ====================

    /**
     * 管理玩家的情感体验
     */
    async manageEmotionalExperience(uid: string): Promise<{
        emotionalState: EmotionalState;
        experienceStrategy: any;
        feedbackMessage: string;
        nextActions: string[];
    }> {
        const historicalData = await this.historicalDataManager.getPlayerHistoricalData(uid);
        if (!historicalData) {
            return this.getDefaultEmotionalManagement();
        }

        const emotionalState = this.historicalDataManager.analyzeEmotionalState(historicalData);
        const experienceStrategy = this.generateExperienceStrategy(emotionalState, historicalData);
        const feedbackMessage = this.generateFeedbackMessage(emotionalState);
        const nextActions = this.suggestNextActions(emotionalState, historicalData);

        return {
            emotionalState,
            experienceStrategy,
            feedbackMessage,
            nextActions
        };
    }

    /**
     * 生成体验策略
     */
    private generateExperienceStrategy(emotionalState: EmotionalState, historicalData: PlayerHistoricalData): any {
        switch (emotionalState.overallState) {
            case 'frustrated':
                return {
                    rankingStrategy: 'encouraging',
                    aiDifficulty: 'reduced',
                    rewardMultiplier: 1.2,
                    protectionLevel: 'high',
                    message: '你正在进步，继续加油！'
                };

            case 'encouraged':
                return {
                    rankingStrategy: 'challenging',
                    aiDifficulty: 'increased',
                    rewardMultiplier: 1.0,
                    protectionLevel: 'normal',
                    message: '挑战更高难度，突破自我！'
                };

            case 'challenged':
                return {
                    rankingStrategy: 'growth',
                    aiDifficulty: 'balanced',
                    rewardMultiplier: 1.1,
                    protectionLevel: 'normal',
                    message: '保持状态，稳步提升！'
                };

            default:
                return {
                    rankingStrategy: 'balanced',
                    aiDifficulty: 'normal',
                    rewardMultiplier: 1.0,
                    protectionLevel: 'normal',
                    message: '保持平衡，持续进步！'
                };
        }
    }

    /**
     * 生成反馈消息
     */
    private generateFeedbackMessage(emotionalState: EmotionalState): string {
        if (emotionalState.confidence > 0.7) {
            return '你的表现非常出色！继续保持这种状态。';
        } else if (emotionalState.frustration > 0.6) {
            return '不要气馁，每个高手都经历过挫折。让我们调整策略，重新开始！';
        } else if (emotionalState.motivation > 0.6) {
            return '你的学习热情很高！这种态度会让你快速进步。';
        } else {
            return '保持耐心，技能提升需要时间。相信自己，你一定能行！';
        }
    }

    /**
     * 建议下一步行动
     */
    private suggestNextActions(emotionalState: EmotionalState, historicalData: PlayerHistoricalData): string[] {
        const actions: string[] = [];

        if (emotionalState.overallState === 'frustrated') {
            actions.push('尝试基础练习模式');
            actions.push('调整游戏策略');
            actions.push('休息一下，保持心态');
        } else if (emotionalState.overallState === 'encouraged') {
            actions.push('挑战更高难度');
            actions.push('尝试新的游戏模式');
            actions.push('帮助其他玩家');
        } else if (emotionalState.overallState === 'challenged') {
            actions.push('保持当前节奏');
            actions.push('专注技能提升');
            actions.push('记录学习心得');
        } else {
            actions.push('尝试新的挑战');
            actions.push('平衡练习和挑战');
            actions.push('设定新的目标');
        }

        return actions;
    }

    /**
     * 获取默认情感管理
     */
    private getDefaultEmotionalManagement(): any {
        return {
            emotionalState: {
                confidence: 0.5,
                frustration: 0.3,
                motivation: 0.6,
                satisfaction: 0.5,
                overallState: 'balanced'
            },
            experienceStrategy: {
                rankingStrategy: 'balanced',
                aiDifficulty: 'normal',
                rewardMultiplier: 1.0,
                protectionLevel: 'normal',
                message: '欢迎开始你的游戏之旅！'
            },
            feedbackMessage: '让我们开始探索这个精彩的游戏世界吧！',
            nextActions: ['完成新手教程', '尝试第一场比赛', '熟悉游戏规则']
        };
    }

    // ==================== 辅助方法 ====================

    /**
     * 分析最近表现
     */
    private analyzeRecentPerformance(matches: any[]): RecentPerformanceAnalysis {
        if (matches.length === 0) {
            return {
                averageScore: 2000,
                averageRank: 2.5,
                winRate: 0.5,
                totalMatches: 0,
                scoreRange: { min: 0, max: 0 },
                rankDistribution: { top3: 0, middle: 0, bottom: 0 }
            };
        }

        const scores = matches.map(m => m.score);
        const ranks = matches.map(m => m.rank);
        const wins = matches.filter(m => m.rank === 1).length;

        // 计算分数范围
        const scoreRange = {
            min: Math.min(...scores),
            max: Math.max(...scores)
        };

        // 计算排名分布
        const rankDistribution = {
            top3: ranks.filter(r => r <= 3).length,
            middle: ranks.filter(r => r > 3 && r <= Math.ceil(ranks.length * 0.7)).length,
            bottom: ranks.filter(r => r > Math.ceil(ranks.length * 0.7)).length
        };

        return {
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            averageRank: ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length,
            winRate: wins / matches.length,
            totalMatches: matches.length,
            scoreRange,
            rankDistribution
        };
    }

    /**
     * 分析当前分数状态
     */
    private analyzeCurrentScore(
        currentScore: number,
        recentPerformance: any,
        historicalData: any
    ): {
        isImproving: boolean;
        isDeclining: boolean;
        scoreLevel: 'low' | 'medium' | 'high';
        trendStrength: number;
        relativeToHistory: number;
    } {
        const averageScore = recentPerformance.averageScore || 2000;
        const scoreVariance = this.calculateScoreVariance(historicalData.matchHistory);

        // 判断分数趋势
        const isImproving = currentScore > averageScore * 1.1;
        const isDeclining = currentScore < averageScore * 0.9;

        // 判断分数水平
        let scoreLevel: 'low' | 'medium' | 'high';
        if (currentScore < 2000) {
            scoreLevel = 'low';
        } else if (currentScore < 6000) {
            scoreLevel = 'medium';
        } else {
            scoreLevel = 'high';
        }

        // 计算趋势强度
        const trendStrength = Math.abs(currentScore - averageScore) / averageScore;

        // 相对于历史表现的位置
        const relativeToHistory = (currentScore - averageScore) / (scoreVariance || 1000);

        return {
            isImproving,
            isDeclining,
            scoreLevel,
            trendStrength,
            relativeToHistory
        };
    }

    /**
     * 计算分数方差
     */
    private calculateScoreVariance(matches: any[]): number {
        if (matches.length < 2) return 1000;

        const scores = matches.map(m => m.score);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

        return Math.sqrt(variance);
    }

    // ==================== 5. 智能分数范围推荐 ====================

    /**
     * 基于玩家现有数据推荐下一场比赛的分数范围
     */
    async recommendNextMatchScoreRange(uid: string): Promise<{
        recommendedRange: {
            min: number;
            max: number;
            target: number;
        };
        confidence: number;
        reasoning: string[];
        difficulty: 'easy' | 'normal' | 'hard' | 'expert';
        expectedOutcome: 'likely_win' | 'challenging' | 'learning_experience';
    }> {
        try {
            const historicalData = await this.historicalDataManager.getPlayerHistoricalData(uid);
            if (!historicalData || historicalData.matchHistory.length === 0) {
                return this.getDefaultScoreRangeRecommendation();
            }

            // 分析玩家当前状态
            const recentPerformance = this.analyzeRecentPerformance(historicalData.matchHistory.slice(-10));
            const emotionalState = this.historicalDataManager.analyzeEmotionalState(historicalData);
            const learningPatterns = historicalData.learningPatterns;
            const currentSkillLevel = this.assessCurrentSkillLevel(historicalData);

            // 计算推荐分数范围
            const recommendedRange = this.calculateRecommendedScoreRange(
                recentPerformance,
                emotionalState,
                learningPatterns,
                currentSkillLevel
            );

            // 确定难度等级
            const difficulty = this.determineDifficultyLevel(recommendedRange, recentPerformance);

            // 预测比赛结果
            const expectedOutcome = this.predictMatchOutcome(recommendedRange, recentPerformance, emotionalState);

            // 生成推荐理由
            const reasoning = this.generateScoreRangeReasoning(
                recommendedRange,
                recentPerformance,
                emotionalState,
                learningPatterns
            );

            // 计算推荐置信度
            const confidence = this.calculateScoreRangeConfidence(historicalData, recentPerformance);

            return {
                recommendedRange,
                confidence,
                reasoning,
                difficulty,
                expectedOutcome
            };
        } catch (error) {
            console.error(`推荐分数范围失败: ${uid}`, error);
            return this.getDefaultScoreRangeRecommendation();
        }
    }

    /**
     * 计算推荐的分数范围
     */
    private calculateRecommendedScoreRange(
        recentPerformance: RecentPerformanceAnalysis,
        emotionalState: EmotionalState,
        learningPatterns: any,
        currentSkillLevel: number
    ): {
        min: number;
        max: number;
        target: number;
    } {
        const baseScore = recentPerformance.averageScore;
        const scoreVariance = recentPerformance.scoreRange.max - recentPerformance.scoreRange.min;

        // 基于情绪状态调整挑战程度
        let challengeMultiplier = 1.0;
        if (emotionalState.overallState === 'frustrated') {
            challengeMultiplier = 0.8; // 降低难度，建立信心
        } else if (emotionalState.overallState === 'encouraged') {
            challengeMultiplier = 1.2; // 提高难度，保持挑战
        } else if (emotionalState.overallState === 'challenged') {
            challengeMultiplier = 1.1; // 适度提高难度
        }

        // 基于学习模式调整
        if (learningPatterns.learningEfficiency > 0.7) {
            challengeMultiplier *= 1.1; // 高学习效率，提高挑战
        } else if (learningPatterns.learningEfficiency < 0.3) {
            challengeMultiplier *= 0.9; // 低学习效率，降低挑战
        }

        // 基于技能水平调整
        if (currentSkillLevel > 0.8) {
            challengeMultiplier *= 1.15; // 高技能，大幅提高挑战
        } else if (currentSkillLevel < 0.3) {
            challengeMultiplier *= 0.85; // 低技能，大幅降低挑战
        }

        // 基于最近表现趋势调整
        const recentTrend = this.analyzeRecentTrend(recentPerformance);
        if (recentTrend === 'improving') {
            challengeMultiplier *= 1.05; // 进步中，适度提高
        } else if (recentTrend === 'declining') {
            challengeMultiplier *= 0.95; // 下降中，适度降低
        }

        // 计算目标分数
        const targetScore = Math.round(baseScore * challengeMultiplier);

        // 计算分数范围（基于历史方差和挑战程度）
        const rangeMultiplier = Math.max(0.1, Math.min(0.3, scoreVariance / baseScore));
        const range = Math.round(baseScore * rangeMultiplier * challengeMultiplier);

        const min = Math.max(500, targetScore - range);
        const max = Math.min(10000, targetScore + range);

        return {
            min,
            max,
            target: targetScore
        };
    }

    /**
     * 分析最近表现趋势
     */
    private analyzeRecentTrend(recentPerformance: RecentPerformanceAnalysis): 'improving' | 'stable' | 'declining' {
        // 这里可以基于更多历史数据计算趋势
        // 暂时基于胜率判断
        if (recentPerformance.winRate > 0.6) {
            return 'improving';
        } else if (recentPerformance.winRate < 0.4) {
            return 'declining';
        } else {
            return 'stable';
        }
    }

    /**
     * 确定难度等级
     */
    private determineDifficultyLevel(
        recommendedRange: { min: number; max: number; target: number },
        recentPerformance: RecentPerformanceAnalysis
    ): 'easy' | 'normal' | 'hard' | 'expert' {
        const targetScore = recommendedRange.target;
        const averageScore = recentPerformance.averageScore;

        const difficultyRatio = targetScore / averageScore;

        if (difficultyRatio < 0.7) {
            return 'easy';
        } else if (difficultyRatio < 0.9) {
            return 'normal';
        } else if (difficultyRatio < 1.3) {
            return 'hard';
        } else {
            return 'expert';
        }
    }

    /**
     * 预测比赛结果
     */
    private predictMatchOutcome(
        recommendedRange: { min: number; max: number; target: number },
        recentPerformance: RecentPerformanceAnalysis,
        emotionalState: EmotionalState
    ): 'likely_win' | 'challenging' | 'learning_experience' {
        const targetScore = recommendedRange.target;
        const averageScore = recentPerformance.averageScore;

        // 基于目标分数与平均分数的比例预测
        const scoreRatio = targetScore / averageScore;

        if (scoreRatio < 0.8) {
            return 'likely_win'; // 目标分数低于平均，很可能获胜
        } else if (scoreRatio < 1.1) {
            return 'challenging'; // 目标分数接近平均，有挑战性
        } else {
            return 'learning_experience'; // 目标分数高于平均，主要是学习体验
        }
    }

    /**
     * 生成分数范围推荐理由
     */
    private generateScoreRangeReasoning(
        recommendedRange: { min: number; max: number; target: number },
        recentPerformance: RecentPerformanceAnalysis,
        emotionalState: EmotionalState,
        learningPatterns: any
    ): string[] {
        const reasoning: string[] = [];
        const targetScore = recommendedRange.target;
        const averageScore = recentPerformance.averageScore;

        // 基于分数差异的理由
        if (targetScore < averageScore * 0.9) {
            reasoning.push('建议选择较低难度，帮助建立信心和稳定表现');
        } else if (targetScore > averageScore * 1.1) {
            reasoning.push('建议选择较高难度，挑战自我并提升技能水平');
        } else {
            reasoning.push('建议选择适中难度，保持平衡的挑战和成功体验');
        }

        // 基于情绪状态的理由
        if (emotionalState.overallState === 'frustrated') {
            reasoning.push('考虑到当前情绪状态，建议选择支持性难度');
        } else if (emotionalState.overallState === 'encouraged') {
            reasoning.push('基于积极的情绪状态，建议选择挑战性难度');
        }

        // 基于学习模式的理由
        if (learningPatterns.learningEfficiency > 0.7) {
            reasoning.push('由于学习效率较高，建议适度提高挑战难度');
        } else if (learningPatterns.learningEfficiency < 0.3) {
            reasoning.push('考虑到学习效率较低，建议选择基础难度');
        }

        // 基于历史表现的理由
        if (recentPerformance.winRate > 0.7) {
            reasoning.push('基于良好的胜率表现，建议选择更高难度');
        } else if (recentPerformance.winRate < 0.3) {
            reasoning.push('考虑到较低的胜率，建议选择基础难度');
        }

        // 基于分数稳定性的理由
        const scoreStability = recentPerformance.scoreRange.max - recentPerformance.scoreRange.min;
        if (scoreStability < averageScore * 0.2) {
            reasoning.push('分数表现稳定，建议选择挑战性难度');
        } else if (scoreStability > averageScore * 0.5) {
            reasoning.push('分数波动较大，建议选择稳定难度');
        }

        return reasoning;
    }

    /**
     * 计算分数范围推荐置信度
     */
    private calculateScoreRangeConfidence(
        historicalData: PlayerHistoricalData,
        recentPerformance: RecentPerformanceAnalysis
    ): number {
        // 基于数据量的置信度
        const dataQuality = Math.min(1, historicalData.matchHistory.length / 20);

        // 基于最近表现的稳定性
        const scoreStability = 1 - Math.min(1, (recentPerformance.scoreRange.max - recentPerformance.scoreRange.min) / 5000);

        // 基于胜率的稳定性
        const winRateStability = recentPerformance.winRate > 0.3 && recentPerformance.winRate < 0.7 ? 0.8 : 0.6;

        return (dataQuality + scoreStability + winRateStability) / 3;
    }

    /**
     * 获取默认分数范围推荐
     */
    private getDefaultScoreRangeRecommendation(): {
        recommendedRange: { min: number; max: number; target: number };
        confidence: number;
        reasoning: string[];
        difficulty: 'easy' | 'normal' | 'hard' | 'expert';
        expectedOutcome: 'likely_win' | 'challenging' | 'learning_experience';
    } {
        return {
            recommendedRange: {
                min: 1500,
                max: 2500,
                target: 2000
            },
            confidence: 0.5,
            reasoning: [
                '基于默认配置推荐',
                '建议从基础难度开始',
                '逐步调整到适合的挑战水平'
            ],
            difficulty: 'normal',
            expectedOutcome: 'challenging'
        };
    }

    // ==================== 6. Seed难度分析系统 ====================

    /**
     * 分析指定seed的难度系数
     */
    async analyzeSeedDifficulty(seed: string): Promise<{
        seed: string;
        difficultyScore: number;
        difficultyLevel: 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard';
        confidence: number;
        statistics: {
            totalMatches: number;
            averageScore: number;
            averageRank: number;
            winRate: number;
            scoreDistribution: {
                low: number;      // 0-2000
                medium: number;   // 2000-6000
                high: number;     // 6000-10000
            };
            rankDistribution: {
                top3: number;
                middle: number;
                bottom: number;
            };
        };
        playerSkillImpact: {
            beginner: number;     // 新手玩家影响
            intermediate: number; // 中级玩家影响
            advanced: number;     // 高级玩家影响
        };
        recommendations: string[];
    }> {
        try {
            // 获取该seed的所有比赛记录
            const seedMatches = await this.getSeedMatchHistory(seed);

            if (seedMatches.length === 0) {
                return this.getDefaultSeedDifficulty(seed);
            }

            // 计算基础统计数据
            const statistics = this.calculateSeedStatistics(seedMatches);

            // 计算难度系数
            const difficultyScore = this.calculateSeedDifficultyScore(statistics);

            // 确定难度等级
            const difficultyLevel = this.determineSeedDifficultyLevel(difficultyScore);

            // 分析不同技能水平玩家的影响
            const playerSkillImpact = this.analyzePlayerSkillImpact(seedMatches);

            // 计算置信度
            const confidence = this.calculateSeedAnalysisConfidence(seedMatches);

            // 生成建议
            const recommendations = this.generateSeedRecommendations(
                difficultyLevel,
                statistics,
                playerSkillImpact
            );

            return {
                seed,
                difficultyScore,
                difficultyLevel,
                confidence,
                statistics,
                playerSkillImpact,
                recommendations
            };
        } catch (error) {
            console.error(`分析seed难度失败: ${seed}`, error);
            return this.getDefaultSeedDifficulty(seed);
        }
    }

    /**
     * 批量分析多个seed的难度
     */
    async analyzeMultipleSeedDifficulties(seeds: string[]): Promise<{
        totalSeeds: number;
        analyzedSeeds: number;
        difficultyDistribution: {
            very_easy: number;
            easy: number;
            normal: number;
            hard: number;
            very_hard: number;
        };
        results: Array<{
            seed: string;
            difficultyScore: number;
            difficultyLevel: string;
            confidence: number;
        }>;
        recommendations: string[];
    }> {
        const results = [];
        const difficultyCounts = {
            very_easy: 0,
            easy: 0,
            normal: 0,
            hard: 0,
            very_hard: 0
        };

        for (const seed of seeds) {
            try {
                const analysis = await this.analyzeSeedDifficulty(seed);
                results.push({
                    seed: analysis.seed,
                    difficultyScore: analysis.difficultyScore,
                    difficultyLevel: analysis.difficultyLevel,
                    confidence: analysis.confidence
                });

                difficultyCounts[analysis.difficultyLevel]++;
            } catch (error) {
                console.error(`分析seed ${seed} 失败:`, error);
            }
        }

        // 生成整体建议
        const recommendations = this.generateOverallSeedRecommendations(difficultyCounts, results);

        return {
            totalSeeds: seeds.length,
            analyzedSeeds: results.length,
            difficultyDistribution: difficultyCounts,
            results,
            recommendations
        };
    }

    /**
     * 基于seed难度推荐比赛配置
     */
    async recommendMatchConfigBySeed(
        seed: string,
        targetDifficulty: 'easy' | 'normal' | 'hard' | 'auto' = 'auto'
    ): Promise<{
        seed: string;
        recommendedConfig: {
            aiDifficulty: 'easy' | 'normal' | 'hard' | 'extreme';
            scoreMultiplier: number;
            rankingAdjustment: number[];
            specialRules: string[];
        };
        reasoning: string[];
        confidence: number;
    }> {
        try {
            const seedAnalysis = await this.analyzeSeedDifficulty(seed);

            // 如果指定了目标难度，调整配置
            let targetDifficultyLevel: 'easy' | 'normal' | 'hard';
            if (targetDifficulty === 'auto') {
                targetDifficultyLevel = this.convertDifficultyLevel(seedAnalysis.difficultyLevel);
            } else {
                targetDifficultyLevel = targetDifficulty;
            }

            // 基于seed难度和目标难度计算推荐配置
            const recommendedConfig = this.calculateRecommendedMatchConfig(
                seedAnalysis,
                targetDifficultyLevel
            );

            // 生成推荐理由
            const reasoning = this.generateMatchConfigReasoning(
                seedAnalysis,
                targetDifficultyLevel,
                recommendedConfig
            );

            return {
                seed,
                recommendedConfig,
                reasoning,
                confidence: seedAnalysis.confidence
            };
        } catch (error) {
            console.error(`基于seed推荐比赛配置失败: ${seed}`, error);
            return this.getDefaultMatchConfigRecommendation(seed);
        }
    }

    /**
     * 获取seed的比赛历史
     */
    private async getSeedMatchHistory(seed: string): Promise<any[]> {
        try {
            // 使用PlayerHistoricalDataManager获取seed的比赛历史
            return await this.historicalDataManager.getSeedMatchHistory(seed);
        } catch (error) {
            console.error(`获取seed比赛历史失败: ${seed}`, error);
            return [];
        }
    }

    /**
     * 计算seed的基础统计数据
     */
    private calculateSeedStatistics(matches: any[]): any {
        if (matches.length === 0) {
            return {
                totalMatches: 0,
                averageScore: 2000,
                averageRank: 2.5,
                winRate: 0.5,
                scoreDistribution: { low: 0, medium: 0, high: 0 },
                rankDistribution: { top3: 0, middle: 0, bottom: 0 }
            };
        }

        const scores = matches.map(m => m.score);
        const ranks = matches.map(m => m.rank);
        const wins = matches.filter(m => m.rank === 1).length;

        // 计算分数分布
        const scoreDistribution = {
            low: scores.filter(s => s < 2000).length,
            medium: scores.filter(s => s >= 2000 && s < 6000).length,
            high: scores.filter(s => s >= 6000).length
        };

        // 计算排名分布
        const rankDistribution = {
            top3: ranks.filter(r => r <= 3).length,
            middle: ranks.filter(r => r > 3 && r <= Math.ceil(ranks.length * 0.7)).length,
            bottom: ranks.filter(r => r > Math.ceil(ranks.length * 0.7)).length
        };

        return {
            totalMatches: matches.length,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            averageRank: ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length,
            winRate: wins / matches.length,
            scoreDistribution,
            rankDistribution
        };
    }

    /**
     * 计算seed难度系数
     */
    private calculateSeedDifficultyScore(statistics: any): number {
        const { averageScore, averageRank, winRate, scoreDistribution } = statistics;

        // 基础难度分数 (0-100)
        let difficultyScore = 50;

        // 基于平均分数调整
        if (averageScore < 1500) {
            difficultyScore += 30; // 分数低，难度高
        } else if (averageScore > 6000) {
            difficultyScore -= 20; // 分数高，难度低
        }

        // 基于平均排名调整
        if (averageRank > 3) {
            difficultyScore += 25; // 排名低，难度高
        } else if (averageRank < 2) {
            difficultyScore -= 15; // 排名高，难度低
        }

        // 基于胜率调整
        if (winRate < 0.3) {
            difficultyScore += 20; // 胜率低，难度高
        } else if (winRate > 0.7) {
            difficultyScore -= 15; // 胜率高，难度低
        }

        // 基于分数分布调整
        const lowScoreRatio = scoreDistribution.low / statistics.totalMatches;
        if (lowScoreRatio > 0.6) {
            difficultyScore += 15; // 低分比例高，难度高
        }

        // 限制在0-100范围内
        return Math.max(0, Math.min(100, difficultyScore));
    }

    /**
     * 确定seed难度等级
     */
    private determineSeedDifficultyLevel(difficultyScore: number): 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard' {
        if (difficultyScore < 20) return 'very_easy';
        if (difficultyScore < 35) return 'easy';
        if (difficultyScore < 65) return 'normal';
        if (difficultyScore < 80) return 'hard';
        return 'very_hard';
    }

    /**
     * 分析不同技能水平玩家的影响
     */
    private analyzePlayerSkillImpact(matches: any[]): {
        beginner: number;
        intermediate: number;
        advanced: number;
    } {
        // 这里应该基于玩家的历史表现来分类技能水平
        // 暂时返回模拟数据
        return {
            beginner: 0.8,    // 新手玩家影响系数
            intermediate: 1.0, // 中级玩家影响系数
            advanced: 1.2      // 高级玩家影响系数
        };
    }

    /**
     * 计算seed分析置信度
     */
    private calculateSeedAnalysisConfidence(matches: any[]): number {
        const totalMatches = matches.length;

        // 基于数据量的置信度
        if (totalMatches < 10) return 0.3;
        if (totalMatches < 50) return 0.6;
        if (totalMatches < 100) return 0.8;
        return 0.95;
    }

    /**
     * 生成seed建议
     */
    private generateSeedRecommendations(
        difficultyLevel: string,
        statistics: any,
        playerSkillImpact: any
    ): string[] {
        const recommendations = [];

        switch (difficultyLevel) {
            case 'very_easy':
                recommendations.push('此seed适合新手玩家练习');
                recommendations.push('建议增加AI难度以提供挑战');
                break;
            case 'easy':
                recommendations.push('此seed适合初学者建立信心');
                recommendations.push('可以适度增加挑战元素');
                break;
            case 'normal':
                recommendations.push('此seed难度适中，适合大多数玩家');
                recommendations.push('保持当前配置即可');
                break;
            case 'hard':
                recommendations.push('此seed具有挑战性，适合有经验的玩家');
                recommendations.push('建议为新手玩家提供辅助');
                break;
            case 'very_hard':
                recommendations.push('此seed难度极高，适合专家级玩家');
                recommendations.push('建议为普通玩家降低难度');
                break;
        }

        return recommendations;
    }

    /**
     * 转换难度等级
     */
    private convertDifficultyLevel(seedLevel: string): 'easy' | 'normal' | 'hard' {
        switch (seedLevel) {
            case 'very_easy':
            case 'easy':
                return 'easy';
            case 'normal':
                return 'normal';
            case 'hard':
            case 'very_hard':
                return 'hard';
            default:
                return 'normal';
        }
    }

    /**
     * 计算推荐的比赛配置
     */
    private calculateRecommendedMatchConfig(
        seedAnalysis: any,
        targetDifficulty: 'easy' | 'normal' | 'hard'
    ): any {
        const { difficultyLevel, statistics } = seedAnalysis;

        let aiDifficulty: 'easy' | 'normal' | 'hard' | 'extreme';
        let scoreMultiplier: number;
        let rankingAdjustment: number[];

        // 基于seed难度和目标难度计算配置
        if (targetDifficulty === 'easy') {
            aiDifficulty = 'easy';
            scoreMultiplier = 1.2; // 提高分数
            rankingAdjustment = [0.3, 0.2, 0.1, -0.6]; // 提高排名
        } else if (targetDifficulty === 'hard') {
            aiDifficulty = 'hard';
            scoreMultiplier = 0.8; // 降低分数
            rankingAdjustment = [-0.2, -0.1, 0.1, 0.2]; // 降低排名
        } else {
            aiDifficulty = 'normal';
            scoreMultiplier = 1.0; // 保持原样
            rankingAdjustment = [0, 0, 0, 0]; // 无调整
        }

        // 基于seed难度调整
        if (difficultyLevel === 'very_hard') {
            aiDifficulty = 'extreme';
            scoreMultiplier *= 1.3; // 大幅提高分数
        } else if (difficultyLevel === 'very_easy') {
            aiDifficulty = 'easy';
            scoreMultiplier *= 0.8; // 大幅降低分数
        }

        const specialRules = this.generateSpecialRules(seedAnalysis, targetDifficulty);

        return {
            aiDifficulty,
            scoreMultiplier,
            rankingAdjustment,
            specialRules
        };
    }

    /**
     * 生成特殊规则
     */
    private generateSpecialRules(seedAnalysis: any, targetDifficulty: string): string[] {
        const rules = [];

        if (seedAnalysis.difficultyLevel === 'very_hard') {
            rules.push('启用新手保护机制');
            rules.push('提供额外提示和帮助');
        } else if (seedAnalysis.difficultyLevel === 'very_easy') {
            rules.push('增加挑战性元素');
            rules.push('限制辅助功能使用');
        }

        if (targetDifficulty === 'easy') {
            rules.push('启用鼓励模式');
        } else if (targetDifficulty === 'hard') {
            rules.push('启用挑战模式');
        }

        return rules;
    }

    /**
     * 生成比赛配置推荐理由
     */
    private generateMatchConfigReasoning(
        seedAnalysis: any,
        targetDifficulty: string,
        recommendedConfig: any
    ): string[] {
        const reasoning = [];

        reasoning.push(`基于seed难度分析：${seedAnalysis.difficultyLevel}`);
        reasoning.push(`目标难度：${targetDifficulty}`);

        if (recommendedConfig.scoreMultiplier > 1.1) {
            reasoning.push('提高分数倍率以平衡seed难度');
        } else if (recommendedConfig.scoreMultiplier < 0.9) {
            reasoning.push('降低分数倍率以增加挑战性');
        }

        if (recommendedConfig.aiDifficulty === 'extreme') {
            reasoning.push('启用极限AI难度以匹配seed挑战性');
        } else if (recommendedConfig.aiDifficulty === 'easy') {
            reasoning.push('降低AI难度以平衡seed简单性');
        }

        return reasoning;
    }

    /**
     * 生成整体seed建议
     */
    private generateOverallSeedRecommendations(
        difficultyCounts: any,
        results: any[]
    ): string[] {
        const recommendations = [];

        const totalSeeds = Object.values(difficultyCounts).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number;

        if (difficultyCounts.very_hard > totalSeeds * 0.3) {
            recommendations.push('检测到大量高难度seed，建议增加新手保护机制');
        }

        if (difficultyCounts.very_easy > totalSeeds * 0.3) {
            recommendations.push('检测到大量简单seed，建议增加挑战性元素');
        }

        if (difficultyCounts.normal < totalSeeds * 0.2) {
            recommendations.push('中等难度seed偏少，建议优化seed生成算法');
        }

        return recommendations;
    }

    /**
     * 获取默认seed难度分析
     */
    private getDefaultSeedDifficulty(seed: string): any {
        return {
            seed,
            difficultyScore: 50,
            difficultyLevel: 'normal' as const,
            confidence: 0.5,
            statistics: {
                totalMatches: 0,
                averageScore: 2000,
                averageRank: 2.5,
                winRate: 0.5,
                scoreDistribution: { low: 0, medium: 0, high: 0 },
                rankDistribution: { top3: 0, middle: 0, bottom: 0 }
            },
            playerSkillImpact: {
                beginner: 1.0,
                intermediate: 1.0,
                advanced: 1.0
            },
            recommendations: ['数据不足，建议收集更多比赛数据']
        };
    }

    /**
     * 获取默认比赛配置推荐
     */
    private getDefaultMatchConfigRecommendation(seed: string): any {
        return {
            seed,
            recommendedConfig: {
                aiDifficulty: 'normal' as const,
                scoreMultiplier: 1.0,
                rankingAdjustment: [0, 0, 0, 0],
                specialRules: ['使用默认配置']
            },
            reasoning: ['seed数据不足，使用默认配置'],
            confidence: 0.5
        };
    }
}
