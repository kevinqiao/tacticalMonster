/**
 * 玩家画像管理服务
 * 
 * 职责：
 * 1. 业务逻辑转换（格式转换、验证）
 * 2. 统计和分析功能
 * 3. 重新导出 DB 层函数，提供统一入口
 * 
 * 注意：数据库操作统一使用 playerProfileDB.ts
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { internalMutation, internalQuery } from "../../../../_generated/server";
import {
    generateAndStorePlayerPersonalizationProfile as generateAndStorePlayerPersonalizationProfileFromDB,
    getPlayerHistoryForProfile as getPlayerHistoryForProfileFromDB,
    recordBehaviorEvent as recordBehaviorEventFromDB,
    shouldUpdatePersonalizationProfile as shouldUpdatePersonalizationProfileFromDB,
    updateExpiredPersonalizationProfiles as updateExpiredPersonalizationProfilesFromDB
} from '../database/playerProfileDB';
import { PlayerPersonalizationProfile } from '../strategies/PersonalizedRankingStrategy';
const DB = (internal as any)['service']['ranking']['managers']['database']['playerProfileDB'];
/**
 * 将数据库格式的画像转换为 PlayerPersonalizationProfile 接口格式
 */
export function convertDbProfileToPersonalizationProfile(dbProfile: any): PlayerPersonalizationProfile {
    return {
        uid: dbProfile.uid,
        preferences: {
            challengeLevel: dbProfile.preferences.challengeLevel,
            competitionStyle: dbProfile.preferences.competitionStyle,
            focusArea: dbProfile.preferences.focusArea,
            riskTolerance: dbProfile.preferences.riskTolerance,
            playTime: dbProfile.preferences.playTime,
            sessionLength: dbProfile.preferences.sessionLength
        },
        behavioralPatterns: {
            playFrequency: dbProfile.behavioralPatterns.playFrequency,
            retryBehavior: dbProfile.behavioralPatterns.retryBehavior,
            goalOrientation: dbProfile.behavioralPatterns.goalOrientation,
            learningStyle: dbProfile.behavioralPatterns.learningStyle,
            stressResponse: dbProfile.behavioralPatterns.stressResponse
        },
        performanceHistory: {
            bestRank: dbProfile.performanceHistory.bestRank,
            worstRank: dbProfile.performanceHistory.worstRank,
            averageRank: dbProfile.performanceHistory.averageRank,
            rankingTrend: dbProfile.performanceHistory.rankingTrend,
            consistency: dbProfile.performanceHistory.consistency,
            riskTaking: dbProfile.performanceHistory.riskTaking,
            comebackAbility: dbProfile.performanceHistory.comebackAbility
        },
        psychologicalProfile: {
            motivationType: dbProfile.psychologicalProfile.motivationType,
            feedbackPreference: dbProfile.psychologicalProfile.feedbackPreference,
            socialInteraction: dbProfile.psychologicalProfile.socialInteraction,
            achievementOrientation: dbProfile.psychologicalProfile.achievementOrientation
        }
    };
}

/**
 * 检查画像数据质量是否足够用于个性化策略
 */
export function isProfileQualitySufficient(
    dbProfile: any,
    minConfidenceThreshold: number = 0.6,
    minConfidenceForMedium: number = 0.5
): boolean {
    if (!dbProfile) return false;

    const isDataQualityHigh = dbProfile.dataQuality === 'high' ||
        (dbProfile.dataQuality === 'medium' && dbProfile.confidence >= minConfidenceForMedium);

    const isConfidenceHigh = dbProfile.confidence >= minConfidenceThreshold;

    return isDataQualityHigh && isConfidenceHigh;
}

/**
 * 获取并验证玩家个性化画像（内部函数，用于服务层内部调用）
 */
export async function getValidatedPersonalizationProfileInternal(
    ctx: any,
    uid: string,
    minConfidenceThreshold: number = 0.6
): Promise<PlayerPersonalizationProfile | null> {
    try {
        const dbProfile = await ctx.runQuery(DB.getPlayerPersonalizationProfile, { uid });

        if (!dbProfile) {
            return null;
        }

        if (isProfileQualitySufficient(dbProfile, minConfidenceThreshold)) {
            console.log(`玩家 ${uid} 画像验证通过（数据质量: ${dbProfile.dataQuality}, 置信度: ${dbProfile.confidence.toFixed(2)}）`);
            return convertDbProfileToPersonalizationProfile(dbProfile);
        } else {
            console.log(`玩家 ${uid} 画像验证失败（数据质量: ${dbProfile.dataQuality}, 置信度: ${dbProfile.confidence.toFixed(2)}, 要求阈值: ${minConfidenceThreshold}）`);
        }

        return null;
    } catch (error) {
        console.warn(`获取玩家 ${uid} 画像失败:`, error);
        return null;
    }
}

// ========== 重新导出 DB 层函数，提供统一入口 ==========

/**
 * 记录行为事件
 * 注意：此函数已移至 playerProfileDB.ts，这里重新导出以保持向后兼容
 */
export const recordBehaviorEvent = recordBehaviorEventFromDB;

/**
 * 获取玩家历史数据用于画像生成
 * 注意：此函数已移至 playerProfileDB.ts，这里重新导出以保持向后兼容
 */
export const getPlayerHistoryForProfile = getPlayerHistoryForProfileFromDB;

/**
 * 生成并存储玩家画像
 * 注意：此函数已移至 playerProfileDB.ts（包含完整的数据质量计算），这里重新导出以保持向后兼容
 */
export const generateAndStorePlayerPersonalizationProfile = generateAndStorePlayerPersonalizationProfileFromDB;

/**
 * 检查是否需要更新画像
 * 注意：此函数已移至 playerProfileDB.ts，这里重新导出以保持向后兼容
 */
export const shouldUpdatePersonalizationProfile = shouldUpdatePersonalizationProfileFromDB;

/**
 * 更新过期画像
 * 注意：此函数已移至 playerProfileDB.ts（包含完整的数据质量计算），这里重新导出以保持向后兼容
 */
export const updateExpiredPersonalizationProfiles = updateExpiredPersonalizationProfilesFromDB;

/**
 * 获取画像统计信息
 */
export const getProfileStats = internalQuery({
    args: {},
    handler: async (ctx) => {
        const profiles = await ctx.db.query("player_personalization_profiles").collect();

        const now = new Date();
        const stats = {
            totalProfiles: profiles.length,
            recentlyUpdated: profiles.filter(p => {
                const lastUpdated = new Date(p.lastUpdated);
                const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
                return hoursSinceUpdate < 24;
            }).length,
            updateFrequency: {
                high: profiles.filter(p => p.updateCount > 10).length,
                medium: profiles.filter(p => p.updateCount > 5 && p.updateCount <= 10).length,
                low: profiles.filter(p => p.updateCount <= 5).length
            },
            dataQualityDistribution: {
                high: profiles.filter(p => p.dataQuality === 'high').length,
                medium: profiles.filter(p => p.dataQuality === 'medium').length,
                low: profiles.filter(p => p.dataQuality === 'low').length
            },
            averageConfidence: profiles.length > 0 ?
                profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length : 0
        };

        return stats;
    }
});

/**
 * 清理旧的行为事件
 */
export const cleanupOldBehaviorEvents = internalMutation({
    args: { daysToKeep: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const { daysToKeep = 30 } = args;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const oldEvents = await ctx.db.query("player_behavior_events")
            .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoffDate.toISOString()))
            .collect();

        for (const event of oldEvents) {
            await ctx.db.delete(event._id);
        }

        return {
            deletedCount: oldEvents.length,
            cutoffDate: cutoffDate.toISOString()
        };
    }
});
