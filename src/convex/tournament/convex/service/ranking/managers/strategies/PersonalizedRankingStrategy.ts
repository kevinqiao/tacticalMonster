import { getValidatedPersonalizationProfileInternal } from '../services/playerPersonalizationProfileService';
import { HumanAnalysis, HumanPlayer, PlayerPerformanceProfile, PlayerRankingResult } from '../types/CommonTypes';
import { RankingConfig } from '../types/RankingConfig';
import { ReasoningGenerator } from '../utils/ReasoningGenerator';
import { BaseRankingStrategy } from './BaseRankingStrategy';

/**
 * 玩家画像接口
 */
export interface PlayerPersonalizationProfile {
    uid: string;

    // 偏好设置
    preferences: {
        challengeLevel: 'easy' | 'normal' | 'hard' | 'extreme';
        competitionStyle: 'conservative' | 'balanced' | 'aggressive';
        focusArea: 'ranking' | 'score' | 'improvement' | 'fun';
        riskTolerance: 'low' | 'medium' | 'high';
        playTime: 'morning' | 'afternoon' | 'evening' | 'night';
        sessionLength: 'short' | 'medium' | 'long';
    };

    // 行为模式
    behavioralPatterns: {
        playFrequency: 'daily' | 'weekly' | 'casual';
        retryBehavior: 'persistent' | 'occasional' | 'rare';
        goalOrientation: 'competitive' | 'casual' | 'social';
        learningStyle: 'explorer' | 'achiever' | 'socializer' | 'killer';
        stressResponse: 'calm' | 'moderate' | 'anxious';
    };

    // 历史表现
    performanceHistory: {
        bestRank: number;
        worstRank: number;
        averageRank: number;
        rankingTrend: 'improving' | 'declining' | 'stable';
        consistency: number;
        riskTaking: number;
        comebackAbility: number;  // 逆风翻盘能力
    };

    // 心理特征
    psychologicalProfile: {
        motivationType: 'intrinsic' | 'extrinsic' | 'mixed';
        feedbackPreference: 'immediate' | 'delayed' | 'detailed';
        socialInteraction: 'high' | 'medium' | 'low';
        achievementOrientation: 'high' | 'medium' | 'low';
    };
}

/**
 * 个性化排名权重
 */
export interface PersonalizedWeights {
    skill: number;
    score: number;
}

/**
 * 个性化策略
 * 基于玩家画像和行为模式，为每个玩家定制专属排名策略
 */
export class PersonalizedRankingStrategy extends BaseRankingStrategy {
    private ctx: any;

    constructor(config: RankingConfig, ctx: any) {
        super(config);
        this.ctx = ctx;
    }

    async calculateRanking(
        player: HumanPlayer,
        profile: PlayerPerformanceProfile,
        humanAnalysis: HumanAnalysis,
        totalParticipants: number,
        humanPlayers: HumanPlayer[]
    ): Promise<PlayerRankingResult> {
        // 1. 获取玩家画像
        const playerProfile = await this.getPlayerPersonalizationProfile(player.uid);

        // 2. 计算个性化权重
        const weights = this.calculatePersonalizedWeights(playerProfile);

        // 3. 计算组合因子
        const combinedFactor = this.calculateCombinedFactor(
            profile, weights, playerProfile
        );

        // 4. 计算基础排名
        const baseRank = this.calculateHumanRank(player, humanPlayers);

        // 5. 应用个性化调整
        const adjustment = this.calculatePersonalizedAdjustment(
            playerProfile, combinedFactor, profile, totalParticipants
        );

        // 6. 计算最终排名
        const adjustedRank = Math.max(1, Math.min(totalParticipants, baseRank + adjustment));

        const aiCount = totalParticipants - humanPlayers.length;

        // 7. 生成个性化推理
        const reasoning = ReasoningGenerator.generatePersonalizedReasoning(
            player,
            profile,
            adjustedRank,
            totalParticipants,
            playerProfile,
            weights
        );

        return this.buildRankingResult(
            player,
            profile,
            adjustedRank,
            humanAnalysis,
            totalParticipants,
            aiCount,
            humanPlayers,
            reasoning
        );
    }

    /**
     * 获取玩家画像
     * 通过服务层获取并验证玩家画像，如果不存在或数据质量不足则生成默认画像
     */
    private async getPlayerPersonalizationProfile(uid: string): Promise<PlayerPersonalizationProfile> {
        const minConfidenceThreshold = this.config.personalizedStrategy?.confidenceThreshold || 0.6;

        // 通过服务层获取并验证玩家画像
        const validatedProfile = await getValidatedPersonalizationProfileInternal(
            this.ctx,
            uid,
            minConfidenceThreshold
        );

        if (validatedProfile) {
            console.log(`获取玩家 ${uid} 的画像（使用数据库画像）`);
            return validatedProfile;
        }

        // 如果数据库中没有高质量画像，生成默认画像
        console.log(`玩家 ${uid} 的画像不存在或数据质量不足，使用默认画像`);
        return this.generateDefaultProfile(uid);
    }

    /**
     * 生成默认玩家画像
     */
    private generateDefaultProfile(uid: string): PlayerPersonalizationProfile {
        // 基于玩家ID的哈希值生成一致的画像
        const hash = this.simpleHash(uid);

        return {
            uid,
            preferences: {
                challengeLevel: ['easy', 'normal', 'hard', 'extreme'][hash % 4] as any,
                competitionStyle: ['conservative', 'balanced', 'aggressive'][(hash >> 2) % 3] as any,
                focusArea: ['ranking', 'score', 'improvement', 'fun'][(hash >> 4) % 4] as any,
                riskTolerance: ['low', 'medium', 'high'][(hash >> 6) % 3] as any,
                playTime: ['morning', 'afternoon', 'evening', 'night'][(hash >> 8) % 4] as any,
                sessionLength: ['short', 'medium', 'long'][(hash >> 10) % 3] as any,
            },
            behavioralPatterns: {
                playFrequency: ['daily', 'weekly', 'casual'][(hash >> 12) % 3] as any,
                retryBehavior: ['persistent', 'occasional', 'rare'][(hash >> 14) % 3] as any,
                goalOrientation: ['competitive', 'casual', 'social'][(hash >> 16) % 3] as any,
                learningStyle: ['explorer', 'achiever', 'socializer', 'killer'][(hash >> 18) % 4] as any,
                stressResponse: ['calm', 'moderate', 'anxious'][(hash >> 20) % 3] as any,
            },
            performanceHistory: {
                bestRank: 1 + (hash >> 22) % 3,
                worstRank: 3 + (hash >> 24) % 2,
                averageRank: 1.5 + (hash >> 26) % 1.5,
                rankingTrend: ['improving', 'declining', 'stable'][(hash >> 28) % 3] as any,
                consistency: 0.6 + (hash >> 30) % 0.4,
                riskTaking: 0.3 + (hash >> 32) % 0.4,
                comebackAbility: 0.4 + (hash >> 34) % 0.4,
            },
            psychologicalProfile: {
                motivationType: ['intrinsic', 'extrinsic', 'mixed'][(hash >> 36) % 3] as any,
                feedbackPreference: ['immediate', 'delayed', 'detailed'][(hash >> 38) % 3] as any,
                socialInteraction: ['high', 'medium', 'low'][(hash >> 40) % 3] as any,
                achievementOrientation: ['high', 'medium', 'low'][(hash >> 42) % 3] as any,
            }
        };
    }

    /**
     * 简单哈希函数
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }

    /**
     * 计算个性化权重
     */
    private calculatePersonalizedWeights(playerProfile: PlayerPersonalizationProfile): PersonalizedWeights {
        let skillWeight = 0.5;
        let scoreWeight = 0.5;

        // 1. 根据挑战偏好调整
        switch (playerProfile.preferences.challengeLevel) {
            case 'easy':
                scoreWeight += 0.2;  // 更重视当前表现
                skillWeight -= 0.2;
                break;
            case 'hard':
            case 'extreme':
                skillWeight += 0.2;  // 更重视历史技能
                scoreWeight -= 0.2;
                break;
        }

        // 2. 根据竞争风格调整
        switch (playerProfile.preferences.competitionStyle) {
            case 'conservative':
                skillWeight += 0.15;  // 保守型更重视历史
                scoreWeight -= 0.15;
                break;
            case 'aggressive':
                scoreWeight += 0.15;  // 激进型更重视当前
                skillWeight -= 0.15;
                break;
        }

        // 3. 根据专注领域调整
        switch (playerProfile.preferences.focusArea) {
            case 'ranking':
                skillWeight += 0.2;  // 排名导向更重视历史
                break;
            case 'score':
                scoreWeight += 0.2;  // 分数导向更重视当前
                break;
            case 'improvement':
                skillWeight += 0.1;  // 进步导向平衡
                scoreWeight += 0.1;
                break;
            case 'fun':
                scoreWeight += 0.1;  // 娱乐导向当前
                skillWeight -= 0.1;
                break;
        }

        // 4. 根据风险承受度调整
        if (playerProfile.preferences.riskTolerance === 'high') {
            scoreWeight += 0.1;  // 高风险承受度更重视当前
        } else if (playerProfile.preferences.riskTolerance === 'low') {
            skillWeight += 0.1;  // 低风险承受度更重视历史
        }

        // 5. 根据行为模式调整
        if (playerProfile.behavioralPatterns.goalOrientation === 'competitive') {
            skillWeight += 0.1;  // 竞争型更重视历史
        } else if (playerProfile.behavioralPatterns.goalOrientation === 'casual') {
            scoreWeight += 0.1;  // 休闲型更重视当前
        }

        // 6. 根据学习风格调整
        switch (playerProfile.behavioralPatterns.learningStyle) {
            case 'explorer':
                scoreWeight += 0.1;  // 探索型更重视当前
                break;
            case 'achiever':
                skillWeight += 0.1;  // 成就型更重视历史
                break;
            case 'killer':
                skillWeight += 0.15;  // 杀手型更重视历史
                scoreWeight -= 0.15;
                break;
        }

        return {
            skill: Math.max(0.1, Math.min(0.9, skillWeight)),
            score: Math.max(0.1, Math.min(0.9, scoreWeight))
        };
    }

    /**
     * 计算组合因子（使用个性化权重）
     */
    private calculateCombinedFactor(
        profile: PlayerPerformanceProfile,
        weights: PersonalizedWeights,
        playerProfile: PlayerPersonalizationProfile
    ): number {
        const skillFactor = this.calculateSkillFactor(profile);
        const scoreFactor = this.calculateScoreFactor(profile.averageScore, {
            averageScore: profile.averageScore,
            scoreDistribution: { highest: profile.averageScore * 1.2, lowest: profile.averageScore * 0.8, median: profile.averageScore },
            skillDistribution: { beginner: 0.1, intermediate: 0.5, advanced: 0.9 },
            overallSkillLevel: 'intermediate',
            scoreVariance: 100
        });

        // 使用个性化权重组合
        let combinedFactor = skillFactor * weights.skill + scoreFactor * weights.score;

        // 根据玩家画像进行微调
        const { consistency, rankingTrend } = playerProfile.performanceHistory;

        if (consistency >= 0.8 && rankingTrend === 'improving') {
            // 稳定进步型：额外奖励
            combinedFactor *= 1.1;
        } else if (consistency < 0.5 && rankingTrend === 'declining') {
            // 不稳定下降型：适度惩罚
            combinedFactor *= 0.95;
        }

        return Math.max(0, Math.min(1, combinedFactor));
    }

    /**
     * 计算个性化调整
     */
    private calculatePersonalizedAdjustment(
        playerProfile: PlayerPersonalizationProfile,
        combinedFactor: number,
        profile: PlayerPerformanceProfile,
        totalParticipants: number
    ): number {
        let adjustment = (combinedFactor - 0.5) * this.config.veteranAdjustmentMultiplier;

        // 1. 根据玩家目标调整
        const { focusArea, challengeLevel } = playerProfile.preferences;

        if (focusArea === 'ranking' && challengeLevel === 'hard') {
            // 排名+挑战型：更严格的排名
            adjustment *= 0.9;
        } else if (focusArea === 'score' && challengeLevel === 'easy') {
            // 分数+轻松型：更宽松的排名
            adjustment *= 1.1;
        }

        // 2. 根据行为模式调整
        const { retryBehavior, goalOrientation } = playerProfile.behavioralPatterns;

        if (retryBehavior === 'persistent' && goalOrientation === 'competitive') {
            // 坚持+竞争型：奖励韧性
            adjustment *= 1.15;
        }

        // 3. 根据历史表现调整
        const { consistency, rankingTrend } = playerProfile.performanceHistory;

        if (consistency >= 0.8 && rankingTrend === 'improving') {
            // 稳定进步型：额外奖励
            adjustment *= 1.1;
        }

        // 4. 根据心理特征调整
        const { motivationType, achievementOrientation } = playerProfile.psychologicalProfile;

        if (motivationType === 'intrinsic' && achievementOrientation === 'high') {
            // 内在动机+高成就导向：适度奖励
            adjustment *= 1.05;
        }

        // 5. 根据风险承受度调整调整幅度
        const maxAdjustment = Math.floor(totalParticipants * 0.3); // 个性化策略允许更大调整
        adjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));

        return Math.round(adjustment);
    }

    /**
     * 计算信心度（个性化版本）
     */
    protected calculateConfidence(profile: PlayerPerformanceProfile, humanAnalysis: HumanAnalysis): number {
        let confidence = 0.6; // 个性化策略基础信心度较低

        // 比赛场次影响
        if (profile.totalMatches >= 30) {
            confidence += 0.2;
        } else if (profile.totalMatches >= 15) {
            confidence += 0.15;
        } else if (profile.totalMatches >= 5) {
            confidence += 0.1;
        }

        // 表现一致性影响
        confidence += profile.recentPerformance.consistency * 0.15;

        // 个性化策略需要更多数据才能准确
        if (profile.totalMatches < 10) {
            confidence *= 0.8; // 数据不足时降低信心度
        }

        return Math.max(0.2, Math.min(0.9, confidence));
    }
}
