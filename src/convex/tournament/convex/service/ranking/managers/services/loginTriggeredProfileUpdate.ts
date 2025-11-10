/**
 * 登录触发的玩家画像更新服务
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../../../_generated/server";
import { PlayerProfileGenerator } from '../utils/PlayerProfileGenerator';

/**
 * 登录时检查并更新玩家画像
 */
export const onUserLogin = internalMutation({
    args: {
        uid: v.string(),
        loginData: v.optional(v.object({
            timestamp: v.string(),
            deviceInfo: v.optional(v.string()),
            loginMethod: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        const { uid, loginData } = args;

        try {
            // 1. 记录登录事件
            if (loginData) {
                await recordLoginEventInternal(ctx, uid, loginData);
            }

            // 2. 检查是否需要更新画像
            const updateNeeded = await checkProfileUpdateNeededInternal(ctx, uid);

            if (updateNeeded) {
                // 3. 异步更新画像（不阻塞登录流程）
                updatePlayerProfileOnLoginInternal(ctx, uid);

                return {
                    success: true,
                    uid,
                    profileUpdateTriggered: true,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    success: true,
                    uid,
                    profileUpdateTriggered: false,
                    timestamp: new Date().toISOString()
                };
            }

        } catch (error) {
            console.error(`登录触发画像更新失败 (${uid}):`, error);

            // 登录失败不影响登录流程
            return {
                success: true,
                uid,
                profileUpdateTriggered: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            };
        }
    }
});

/**
 * 记录登录事件（内部函数）
 */
async function recordLoginEventInternal(ctx: any, uid: string, eventData: any) {
    const now = new Date().toISOString();
    await ctx.db.insert("player_behavior_events", {
        uid,
        eventType: 'user_login',
        eventData: {
            ...eventData,
            sessionId: generateSessionId()
        },
        timestamp: now,
        sessionId: undefined
    });
}

/**
 * 记录登录事件
 */
export const recordLoginEvent = internalMutation({
    args: {
        uid: v.string(),
        eventData: v.object({
            timestamp: v.string(),
            deviceInfo: v.optional(v.string()),
            loginMethod: v.optional(v.string())
        })
    },
    handler: async (ctx, args) => {
        const { uid, eventData } = args;

        // 记录到行为事件表
        const now = new Date().toISOString();
        await ctx.db.insert("player_behavior_events", {
            uid,
            eventType: 'user_login',
            eventData: {
                ...eventData,
                sessionId: generateSessionId()
            },
            timestamp: now,
            sessionId: undefined
        });
    }
});

/**
 * 检查是否需要更新玩家画像（内部函数）
 */
async function checkProfileUpdateNeededInternal(ctx: any, uid: string): Promise<boolean> {
    // 1. 检查是否有画像
    const profile = await ctx.db.query("player_personalization_profiles")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    if (!profile) {
        return true; // 首次登录，需要生成画像
    }

    // 2. 检查更新间隔
    const now = new Date();
    const lastUpdated = new Date(profile.lastUpdated);
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    // 3. 根据数据质量决定更新频率
    const updateInterval = {
        high: 24,    // 高质量画像：24小时更新一次
        medium: 12,   // 中等质量：12小时更新一次
        low: 6        // 低质量画像：6小时更新一次
    };

    const interval = updateInterval[profile.dataQuality as keyof typeof updateInterval];
    const needsUpdate = hoursSinceUpdate >= interval;

    // 4. 检查是否有新的重要数据
    const hasNewSignificantData = await checkForNewSignificantData(ctx, uid, profile);

    return needsUpdate || hasNewSignificantData;
}

/**
 * 检查是否需要更新玩家画像（导出函数）
 */
export const checkProfileUpdateNeeded = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await checkProfileUpdateNeededInternal(ctx, args.uid);
    }
});

/**
 * 检查是否有新的重要数据
 */
async function checkForNewSignificantData(ctx: any, uid: string, profile: any): Promise<boolean> {
    // 1. 检查是否有新的比赛数据
    const recentMatches = await ctx.db.query("match_results")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .order("desc")
        .take(5);

    if (recentMatches.length > 0) {
        const latestMatch = recentMatches[0];
        const lastMatchTime = new Date(latestMatch.createdAt);
        const lastProfileUpdate = new Date(profile.lastUpdated);

        // 如果有比赛在画像更新之后
        if (lastMatchTime > lastProfileUpdate) {
            return true;
        }
    }

    // 2. 检查是否有新的行为事件
    const recentEvents = await ctx.db.query("player_behavior_events")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .order("desc")
        .take(10);

    if (recentEvents.length > 0) {
        const latestEvent = recentEvents[0];
        const lastEventTime = new Date(latestEvent.timestamp);
        const lastProfileUpdate = new Date(profile.lastUpdated);

        // 如果有重要事件在画像更新之后
        if (lastEventTime > lastProfileUpdate && isSignificantEvent(latestEvent)) {
            return true;
        }
    }

    return false;
}

/**
 * 判断是否为重要事件
 */
function isSignificantEvent(event: any): boolean {
    const significantEventTypes = [
        'match_complete',
        'behavior_change',
        'achievement_unlock',
        'skill_level_change'
    ];

    return significantEventTypes.includes(event.eventType);
}

/**
 * 登录时更新玩家画像（内部函数）
 */
async function updatePlayerProfileOnLoginInternal(ctx: any, uid: string) {
    try {
        // 1. 获取玩家历史数据
        const history = await getPlayerHistoryForProfileInternal(ctx, uid);

        // 2. 检查数据变化程度
        const changeSignificance = await calculateChangeSignificance(ctx, uid, history);

        // 3. 根据变化程度决定更新策略
        if (changeSignificance > 0.3) {
            // 显著变化：完整更新
            await generateAndStorePlayerPersonalizationProfile(ctx, { uid });
            console.log(`玩家 ${uid} 画像完整更新完成`);
        } else if (changeSignificance > 0.1) {
            // 轻微变化：增量更新
            await incrementalProfileUpdate(ctx, uid, history);
            console.log(`玩家 ${uid} 画像增量更新完成`);
        } else {
            // 无显著变化：仅更新时间戳
            await updateProfileTimestamp(ctx, uid);
            console.log(`玩家 ${uid} 画像时间戳更新完成`);
        }

        return {
            success: true,
            uid,
            changeSignificance,
            updateType: changeSignificance > 0.3 ? 'full' : changeSignificance > 0.1 ? 'incremental' : 'timestamp'
        };

    } catch (error) {
        console.error(`玩家 ${uid} 画像更新失败:`, error);
        throw error;
    }
}

/**
 * 登录时更新玩家画像
 */
export const updatePlayerProfileOnLogin = internalMutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await updatePlayerProfileOnLoginInternal(ctx, args.uid);
    }
});

/**
 * 获取玩家历史数据（内部函数）
 */
async function getPlayerHistoryForProfileInternal(ctx: any, uid: string) {
    // 获取最近50场比赛
    const recentMatches = await ctx.db.query("match_results")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .order("desc")
        .take(50);

    // 获取最近100个行为事件
    const recentEvents = await ctx.db.query("player_behavior_events")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .order("desc")
        .take(100);

    return {
        recentMatches,
        recentEvents,
        totalMatches: recentMatches.length,
        averageScore: recentMatches.length > 0 ?
            recentMatches.reduce((sum: number, match: any) => sum + match.score, 0) / recentMatches.length : 0,
        averageRank: recentMatches.length > 0 ?
            recentMatches.reduce((sum: number, match: any) => sum + match.rank, 0) / recentMatches.length : 0,
        bestRank: recentMatches.length > 0 ?
            Math.min(...recentMatches.map((match: any) => match.rank)) : 0,
        worstRank: recentMatches.length > 0 ?
            Math.max(...recentMatches.map((match: any) => match.rank)) : 0
    };
}

/**
 * 生成并存储玩家画像（避免循环调用）
 */
async function generateAndStorePlayerPersonalizationProfile(ctx: any, args: { uid: string }) {
    const { uid } = args;

    try {
        // 获取玩家历史数据
        const history = await getPlayerHistoryForProfileInternal(ctx, uid);

        // 生成画像
        const profile = PlayerProfileGenerator.generateProfile(uid, history);

        // 存储画像
        const profileId = await ctx.db.insert("player_personalization_profiles", {
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

/**
 * 计算数据变化程度
 */
async function calculateChangeSignificance(ctx: any, uid: string, newHistory: any): Promise<number> {
    const profile = await ctx.db.query("player_personalization_profiles")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    if (!profile) return 1.0; // 首次生成

    let significance = 0;

    // 1. 新比赛场次影响
    const recentMatches = newHistory.recentMatches || [];
    if (recentMatches.length > 0) {
        significance += Math.min(0.5, recentMatches.length * 0.1);
    }

    // 2. 分数变化影响
    const avgScoreChange = Math.abs(newHistory.averageScore - profile.performanceHistory.averageScore);
    if (avgScoreChange > 100) {
        significance += 0.3;
    } else if (avgScoreChange > 50) {
        significance += 0.15;
    }

    // 3. 排名变化影响
    const rankChange = Math.abs(newHistory.averageRank - profile.performanceHistory.averageRank);
    if (rankChange > 1) {
        significance += 0.2;
    } else if (rankChange > 0.5) {
        significance += 0.1;
    }

    // 4. 行为模式变化影响
    const behaviorChange = calculateBehaviorChange(profile.behavioralPatterns, newHistory);
    significance += behaviorChange * 0.2;

    return Math.min(1.0, significance);
}

/**
 * 计算行为模式变化
 */
function calculateBehaviorChange(oldPatterns: any, newHistory: any): number {
    let change = 0;

    // 游戏频率变化
    const oldFrequency = oldPatterns.playFrequency;
    const newFrequency = calculatePlayFrequency(newHistory);
    if (oldFrequency !== newFrequency) {
        change += 0.3;
    }

    // 重试行为变化
    const oldRetry = oldPatterns.retryBehavior;
    const newRetry = calculateRetryBehavior(newHistory);
    if (oldRetry !== newRetry) {
        change += 0.2;
    }

    return Math.min(1.0, change);
}

/**
 * 增量更新玩家画像
 */
async function incrementalProfileUpdate(ctx: any, uid: string, newHistory: any) {
    const profile = await ctx.db.query("player_personalization_profiles")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    if (!profile) {
        // 如果没有画像，生成完整画像
        return await generateAndStorePlayerPersonalizationProfile(ctx, { uid });
    }

    // 只更新变化的部分
    const updatedProfile = {
        ...profile,
        lastUpdated: new Date().toISOString(),
        updateCount: profile.updateCount + 1,

        // 更新历史表现
        performanceHistory: {
            ...profile.performanceHistory,
            averageScore: newHistory.averageScore,
            averageRank: newHistory.averageRank,
            totalMatches: newHistory.totalMatches,
            bestRank: Math.min(profile.performanceHistory.bestRank, newHistory.bestRank),
            worstRank: Math.max(profile.performanceHistory.worstRank, newHistory.worstRank)
        },

        // 更新行为模式
        behavioralPatterns: updateBehavioralPatterns(profile.behavioralPatterns, newHistory),

        // 重新计算置信度
        confidence: calculateUpdatedConfidence(profile, newHistory)
    };

    await ctx.db.patch(profile._id, updatedProfile);
}

/**
 * 更新行为模式
 */
function updateBehavioralPatterns(oldPatterns: any, newHistory: any): any {
    return {
        ...oldPatterns,
        playFrequency: calculatePlayFrequency(newHistory),
        retryBehavior: calculateRetryBehavior(newHistory),
        goalOrientation: calculateGoalOrientation(newHistory),
        learningStyle: calculateLearningStyle(newHistory)
    };
}

/**
 * 计算更新的置信度
 */
function calculateUpdatedConfidence(profile: any, newHistory: any): number {
    let confidence = profile.confidence;

    // 新数据增加置信度
    if (newHistory.totalMatches > profile.performanceHistory.totalMatches) {
        confidence += 0.05;
    }

    // 数据一致性影响置信度
    const consistency = calculateConsistency(newHistory);
    confidence += consistency * 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * 更新时间戳
 */
async function updateProfileTimestamp(ctx: any, uid: string) {
    const profile = await ctx.db.query("player_personalization_profiles")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    if (profile) {
        await ctx.db.patch(profile._id, {
            lastUpdated: new Date().toISOString(),
            updateCount: profile.updateCount + 1
        });
    }
}

/**
 * 生成会话ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 计算游戏频率
 */
function calculatePlayFrequency(history: any): string {
    const recentDays = 7;
    const recentMatches = history.recentMatches || [];
    const matchesPerDay = recentMatches.length / recentDays;

    if (matchesPerDay >= 1) return 'daily';
    if (matchesPerDay >= 0.3) return 'weekly';
    return 'casual';
}

/**
 * 计算重试行为
 */
function calculateRetryBehavior(history: any): string {
    const retryRate = history.retryRate || 0;

    if (retryRate > 0.7) return 'persistent';
    if (retryRate > 0.3) return 'occasional';
    return 'rare';
}

/**
 * 计算目标导向
 */
function calculateGoalOrientation(history: any): string {
    const winRate = history.winRate || 0;
    const scoreImprovement = history.scoreImprovement || 0;

    if (winRate > 0.6 && scoreImprovement > 0) return 'competitive';
    if (winRate < 0.3) return 'casual';
    return 'social';
}

/**
 * 计算学习风格
 */
function calculateLearningStyle(history: any): string {
    const explorationRate = history.explorationRate || 0;
    const consistency = history.consistency || 0;

    if (explorationRate > 0.7) return 'explorer';
    if (consistency > 0.8) return 'achiever';
    if (explorationRate > 0.5) return 'socializer';
    return 'killer';
}

/**
 * 计算一致性
 */
function calculateConsistency(history: any): number {
    const scores = history.recentScores || [];
    if (scores.length < 2) return 0.5;

    const mean = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return Math.max(0, 1 - (stdDev / mean));
}