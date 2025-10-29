/**
 * 玩家画像管理服务
 * 提供完整的画像生成、存储和更新功能
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../../../_generated/server";
import { getPlayerProfile as getPlayerProfileFromDB } from '../database/playerProfileDB';
import { PlayerProfile } from '../strategies/PersonalizedRankingStrategy';
import { PlayerProfileGenerator } from '../utils/PlayerProfileGenerator';

/**
 * 将数据库格式的画像转换为 PlayerProfile 接口格式
 */
export function convertDbProfileToPlayerProfile(dbProfile: any): PlayerProfile {
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
 * 获取并验证玩家画像（内部函数，用于服务层内部调用）
 */
export async function getValidatedPlayerProfileInternal(
    ctx: any,
    uid: string,
    minConfidenceThreshold: number = 0.6
): Promise<PlayerProfile | null> {
    try {
        const dbProfile = await ctx.runQuery(getPlayerProfileFromDB, { uid });

        if (!dbProfile) {
            return null;
        }

        if (isProfileQualitySufficient(dbProfile, minConfidenceThreshold)) {
            console.log(`玩家 ${uid} 画像验证通过（数据质量: ${dbProfile.dataQuality}, 置信度: ${dbProfile.confidence.toFixed(2)}）`);
            return convertDbProfileToPlayerProfile(dbProfile);
        } else {
            console.log(`玩家 ${uid} 画像验证失败（数据质量: ${dbProfile.dataQuality}, 置信度: ${dbProfile.confidence.toFixed(2)}, 要求阈值: ${minConfidenceThreshold}）`);
        }

        return null;
    } catch (error) {
        console.warn(`获取玩家 ${uid} 画像失败:`, error);
        return null;
    }
}

/**
 * 记录行为事件
 */
export const recordBehaviorEvent = internalMutation({
    args: {
        uid: v.string(),
        eventType: v.string(),
        eventData: v.any()
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        await ctx.db.insert("player_behavior_events", {
            uid: args.uid,
            eventType: args.eventType,
            eventData: args.eventData,
            timestamp: now,
            sessionId: undefined
        });
    }
});

/**
 * 获取玩家历史数据用于画像生成
 */
export const getPlayerHistoryForProfile = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const { uid } = args;

        // 获取最近50场比赛
        const recentMatches = await ctx.db.query("match_results")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .order("desc")
            .take(50);

        // 获取最近100个行为事件
        const recentEvents = await ctx.db.query("player_behavior_events")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .order("desc")
            .take(100);

        return {
            recentMatches,
            recentEvents,
            totalMatches: recentMatches.length,
            averageScore: recentMatches.length > 0 ?
                recentMatches.reduce((sum, match) => sum + match.score, 0) / recentMatches.length : 0,
            averageRank: recentMatches.length > 0 ?
                recentMatches.reduce((sum, match) => sum + match.rank, 0) / recentMatches.length : 0,
            bestRank: recentMatches.length > 0 ?
                Math.min(...recentMatches.map(match => match.rank)) : 0,
            worstRank: recentMatches.length > 0 ?
                Math.max(...recentMatches.map(match => match.rank)) : 0
        };
    }
});

/**
 * 生成并存储玩家画像
 */
export const generateAndStorePlayerProfile = internalMutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const { uid } = args;

        try {
            // 直接获取历史数据，避免循环调用
            const recentMatches = await ctx.db.query("match_results")
                .withIndex("by_uid", (q) => q.eq("uid", uid))
                .order("desc")
                .take(50);

            const recentEvents = await ctx.db.query("player_behavior_events")
                .withIndex("by_uid", (q) => q.eq("uid", uid))
                .order("desc")
                .take(100);

            const history = {
                recentMatches,
                recentEvents,
                totalMatches: recentMatches.length,
                averageScore: recentMatches.length > 0 ?
                    recentMatches.reduce((sum, match) => sum + match.score, 0) / recentMatches.length : 0,
                averageRank: recentMatches.length > 0 ?
                    recentMatches.reduce((sum, match) => sum + match.rank, 0) / recentMatches.length : 0,
                bestRank: recentMatches.length > 0 ?
                    Math.min(...recentMatches.map(match => match.rank)) : 0,
                worstRank: recentMatches.length > 0 ?
                    Math.max(...recentMatches.map(match => match.rank)) : 0
            };

            // 生成画像
            const profile = PlayerProfileGenerator.generateProfile(uid, history);

            // 存储画像
            const profileId = await ctx.db.insert("player_profiles", {
                ...profile,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                updateCount: 1
            });

            return profileId;
        } catch (error) {
            console.error(`生成玩家画像失败 (${uid}):`, error);
            throw error;
        }
    }
});

/**
 * 检查是否需要更新画像
 */
export const shouldUpdateProfile = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("player_profiles")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .first();

        if (!profile) return true;

        const now = new Date();
        const lastUpdated = new Date(profile.lastUpdated);
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

        const updateInterval = {
            high: 24,
            medium: 12,
            low: 6
        };

        const interval = updateInterval[profile.dataQuality as keyof typeof updateInterval];
        return hoursSinceUpdate >= interval;
    }
});

/**
 * 更新过期画像
 */
export const updateExpiredProfiles = internalMutation({
    args: { maxUpdates: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const { maxUpdates = 10 } = args;

        const profiles = await ctx.db.query("player_profiles").collect();
        const now = new Date();

        const expiredProfiles = profiles.filter(profile => {
            const lastUpdated = new Date(profile.lastUpdated);
            const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

            const updateInterval = {
                high: 24,
                medium: 12,
                low: 6
            };

            const interval = updateInterval[profile.dataQuality as keyof typeof updateInterval];
            return hoursSinceUpdate >= interval;
        }).slice(0, maxUpdates);

        // 直接调用生成函数，避免循环调用
        for (const profile of expiredProfiles) {
            try {
                // 直接获取历史数据，避免循环调用
                const recentMatches = await ctx.db.query("match_results")
                    .withIndex("by_uid", (q) => q.eq("uid", profile.uid))
                    .order("desc")
                    .take(50);

                const recentEvents = await ctx.db.query("player_behavior_events")
                    .withIndex("by_uid", (q) => q.eq("uid", profile.uid))
                    .order("desc")
                    .take(100);

                const history = {
                    recentMatches,
                    recentEvents,
                    totalMatches: recentMatches.length,
                    averageScore: recentMatches.length > 0 ?
                        recentMatches.reduce((sum, match) => sum + match.score, 0) / recentMatches.length : 0,
                    averageRank: recentMatches.length > 0 ?
                        recentMatches.reduce((sum, match) => sum + match.rank, 0) / recentMatches.length : 0,
                    bestRank: recentMatches.length > 0 ?
                        Math.min(...recentMatches.map(match => match.rank)) : 0,
                    worstRank: recentMatches.length > 0 ?
                        Math.max(...recentMatches.map(match => match.rank)) : 0
                };

                const newProfile = PlayerProfileGenerator.generateProfile(profile.uid, history);

                await ctx.db.patch(profile._id, {
                    ...newProfile,
                    lastUpdated: new Date().toISOString(),
                    updateCount: profile.updateCount + 1
                });
            } catch (error) {
                console.error(`更新画像失败 (${profile.uid}):`, error);
            }
        }

        return {
            updated: expiredProfiles.length,
            processed: expiredProfiles.map(p => p.uid)
        };
    }
});

/**
 * 获取画像统计信息
 */
export const getProfileStats = internalQuery({
    args: {},
    handler: async (ctx) => {
        const profiles = await ctx.db.query("player_profiles").collect();

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