/**
 * 玩家画像数据库操作
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../../../_generated/server";
import { PlayerProfileGenerator } from '../utils/PlayerProfileGenerator';

/**
 * 获取玩家画像
 */
export const getPlayerPersonalizationProfile = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("player_profiles")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .first();

        return profile;
    }
});

/**
 * 创建或更新玩家画像
 */
export const upsertPlayerPersonalizationProfile = internalMutation({
    args: {
        uid: v.string(),
        profile: v.object({
            preferences: v.object({
                challengeLevel: v.union(v.literal("easy"), v.literal("normal"), v.literal("hard"), v.literal("extreme")),
                competitionStyle: v.union(v.literal("conservative"), v.literal("balanced"), v.literal("aggressive")),
                focusArea: v.union(v.literal("ranking"), v.literal("score"), v.literal("improvement"), v.literal("fun")),
                riskTolerance: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
                playTime: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"), v.literal("night")),
                sessionLength: v.union(v.literal("short"), v.literal("medium"), v.literal("long"))
            }),
            behavioralPatterns: v.object({
                playFrequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("casual")),
                retryBehavior: v.union(v.literal("persistent"), v.literal("occasional"), v.literal("rare")),
                goalOrientation: v.union(v.literal("competitive"), v.literal("casual"), v.literal("social")),
                learningStyle: v.union(v.literal("explorer"), v.literal("achiever"), v.literal("socializer"), v.literal("killer")),
                stressResponse: v.union(v.literal("calm"), v.literal("moderate"), v.literal("anxious"))
            }),
            performanceHistory: v.object({
                bestRank: v.number(),
                worstRank: v.number(),
                averageRank: v.number(),
                rankingTrend: v.union(v.literal("improving"), v.literal("declining"), v.literal("stable")),
                consistency: v.number(),
                riskTaking: v.number(),
                comebackAbility: v.number()
            }),
            psychologicalProfile: v.object({
                motivationType: v.union(v.literal("intrinsic"), v.literal("extrinsic"), v.literal("mixed")),
                feedbackPreference: v.union(v.literal("immediate"), v.literal("delayed"), v.literal("detailed")),
                socialInteraction: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
                achievementOrientation: v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
            })
        }),
        confidence: v.number(),
        dataQuality: v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    },
    handler: async (ctx, args) => {
        const existingProfile = await ctx.db
            .query("player_profiles")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .first();

        const now = new Date().toISOString();

        if (existingProfile) {
            // 更新现有画像
            await ctx.db.patch(existingProfile._id, {
                ...args.profile,
                confidence: args.confidence,
                dataQuality: args.dataQuality,
                lastUpdated: now,
                updateCount: existingProfile.updateCount + 1
            });

            return existingProfile._id;
        } else {
            // 创建新画像
            const profileId = await ctx.db.insert("player_profiles", {
                uid: args.uid,
                ...args.profile,
                confidence: args.confidence,
                dataQuality: args.dataQuality,
                lastUpdated: now,
                updateCount: 1,
                createdAt: now
            });

            return profileId;
        }
    }
});

/**
 * 记录玩家行为事件
 */
export const recordBehaviorEvent = internalMutation({
    args: {
        uid: v.string(),
        eventType: v.union(
            v.literal("match_start"),
            v.literal("match_end"),
            v.literal("retry"),
            v.literal("quit"),
            v.literal("session_start"),
            v.literal("session_end")
        ),
        eventData: v.object({
            matchId: v.optional(v.string()),
            score: v.optional(v.number()),
            rank: v.optional(v.number()),
            sessionDuration: v.optional(v.number()),
            retryCount: v.optional(v.number()),
            quitReason: v.optional(v.string())
        })
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        await ctx.db.insert("player_behavior_events", {
            uid: args.uid,
            eventType: args.eventType,
            eventData: args.eventData,
            timestamp: now
        });
    }
});

/**
 * 获取玩家历史数据用于画像生成
 */
export const getPlayerHistoryForProfile = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        // 获取最近50场比赛结果
        const matchHistory = await ctx.db
            .query("player_matches")
            .withIndex("by_uid_created", (q) => q.eq("uid", args.uid))
            .order("desc")
            .take(50);

        // 获取最近100个行为事件
        const behaviorEvents = await ctx.db
            .query("player_behavior_events")
            .withIndex("by_uid_timestamp", (q) => q.eq("uid", args.uid))
            .order("desc")
            .take(100);

        return {
            matchHistory: matchHistory.map(m => ({
                matchId: m.matchId,
                score: m.score,
                rank: m.rank,
                createdAt: m.createdAt
            })),
            behaviorEvents: behaviorEvents.map(e => ({
                eventType: e.eventType,
                eventData: e.eventData,
                timestamp: e.timestamp
            }))
        };
    }
});

/**
 * 生成并存储玩家画像
 */
export const generateAndStorePlayerPersonalizationProfile = internalMutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        // 1. 获取历史数据
        const matchHistory = await ctx.db
            .query("player_matches")
            .withIndex("by_uid_created", (q) => q.eq("uid", args.uid))
            .order("desc")
            .take(50);

        const behaviorEvents = await ctx.db
            .query("player_behavior_events")
            .withIndex("by_uid_timestamp", (q) => q.eq("uid", args.uid))
            .order("desc")
            .take(100);

        const history = {
            recentMatches: matchHistory,
            recentEvents: behaviorEvents,
            totalMatches: matchHistory.length,
            averageScore: matchHistory.length > 0 ?
                matchHistory.reduce((sum, match) => sum + match.score, 0) / matchHistory.length : 0,
            averageRank: matchHistory.length > 0 ?
                matchHistory.reduce((sum, match) => sum + match.rank, 0) / matchHistory.length : 0,
            bestRank: matchHistory.length > 0 ?
                Math.min(...matchHistory.map(match => match.rank)) : 0,
            worstRank: matchHistory.length > 0 ?
                Math.max(...matchHistory.map(match => match.rank)) : 0
        };

        // 2. 生成画像
        const profile = PlayerProfileGenerator.generateProfile(
            args.uid,
            history
        );

        // 3. 计算数据质量和置信度
        const dataQuality = calculateDataQuality(matchHistory, behaviorEvents);
        const confidence = calculateConfidence(matchHistory, behaviorEvents);

        // 4. 存储画像
        const existingProfile = await ctx.db
            .query("player_profiles")
            .withIndex("by_uid", (q) => q.eq("uid", args.uid))
            .first();

        const now = new Date().toISOString();

        if (existingProfile) {
            // 更新现有画像
            await ctx.db.patch(existingProfile._id, {
                ...profile,
                confidence,
                dataQuality,
                lastUpdated: now,
                updateCount: existingProfile.updateCount + 1
            });
            return existingProfile._id;
        } else {
            // 创建新画像
            const profileId = await ctx.db.insert("player_profiles", {
                ...profile,
                uid: args.uid,
                confidence,
                dataQuality,
                lastUpdated: now,
                updateCount: 1,
                createdAt: now
            });
            return profileId;
        }
    }
});

/**
 * 检查画像是否需要更新
 */
export const shouldUpdatePersonalizationProfile = internalQuery({
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

        // 根据数据质量决定更新频率
        const updateInterval = {
            low: 6,    // 6小时
            medium: 12, // 12小时
            high: 24   // 24小时
        };

        return hoursSinceUpdate >= updateInterval[profile.dataQuality];
    }
});

/**
 * 批量更新过期的玩家画像
 */
export const updateExpiredPersonalizationProfiles = internalMutation({
    args: { maxUpdates: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const { maxUpdates } = args;
        const now = new Date();
        const profiles = await ctx.db.query("player_profiles").collect();

        let expiredProfiles = profiles.filter(profile => {
            const lastUpdated = new Date(profile.lastUpdated);
            const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

            const updateInterval = {
                low: 6,
                medium: 12,
                high: 24
            };

            return hoursSinceUpdate >= updateInterval[profile.dataQuality];
        });

        // 限制更新数量
        if (maxUpdates !== undefined && maxUpdates > 0) {
            expiredProfiles = expiredProfiles.slice(0, maxUpdates);
        }

        const updated: string[] = [];

        // 直接调用函数，避免循环调用
        for (const profile of expiredProfiles) {
            try {
                // 直接调用内部逻辑，避免循环调用
                const matchHistory = await ctx.db
                    .query("player_matches")
                    .withIndex("by_uid_created", (q) => q.eq("uid", profile.uid))
                    .order("desc")
                    .take(50);

                const behaviorEvents = await ctx.db
                    .query("player_behavior_events")
                    .withIndex("by_uid_timestamp", (q) => q.eq("uid", profile.uid))
                    .order("desc")
                    .take(100);

                const history = {
                    recentMatches: matchHistory,
                    recentEvents: behaviorEvents,
                    totalMatches: matchHistory.length,
                    averageScore: matchHistory.length > 0 ?
                        matchHistory.reduce((sum, match) => sum + match.score, 0) / matchHistory.length : 0,
                    averageRank: matchHistory.length > 0 ?
                        matchHistory.reduce((sum, match) => sum + match.rank, 0) / matchHistory.length : 0,
                    bestRank: matchHistory.length > 0 ?
                        Math.min(...matchHistory.map(match => match.rank)) : 0,
                    worstRank: matchHistory.length > 0 ?
                        Math.max(...matchHistory.map(match => match.rank)) : 0
                };

                const newProfile = PlayerProfileGenerator.generateProfile(profile.uid, history);
                const dataQuality = calculateDataQuality(matchHistory, behaviorEvents);
                const confidence = calculateConfidence(matchHistory, behaviorEvents);

                await ctx.db.patch(profile._id, {
                    ...newProfile,
                    confidence,
                    dataQuality,
                    lastUpdated: new Date().toISOString(),
                    updateCount: profile.updateCount + 1
                });
                updated.push(profile.uid);
            } catch (error) {
                console.error(`更新画像失败 (${profile.uid}):`, error);
            }
        }

        return {
            updated: updated.length,
            processed: updated
        };
    }
});

// ========== 工具函数 ==========

function calculateDataQuality(matchHistory: any[], behaviorEvents: any[]): 'low' | 'medium' | 'high' {
    const matchCount = matchHistory.length;
    const eventCount = behaviorEvents.length;

    if (matchCount >= 20 && eventCount >= 50) return 'high';
    if (matchCount >= 10 && eventCount >= 20) return 'medium';

    return 'low';
}

function calculateConfidence(matchHistory: any[], behaviorEvents: any[]): number {
    const matchCount = matchHistory.length;
    const eventCount = behaviorEvents.length;

    let confidence = 0.3; // 基础置信度

    // 比赛数量影响
    if (matchCount >= 30) confidence += 0.3;
    else if (matchCount >= 15) confidence += 0.2;
    else if (matchCount >= 5) confidence += 0.1;

    // 行为事件数量影响
    if (eventCount >= 50) confidence += 0.2;
    else if (eventCount >= 20) confidence += 0.1;

    // 时间跨度影响
    if (matchHistory.length > 0 && behaviorEvents.length > 0) {
        const firstMatch = new Date(matchHistory[matchHistory.length - 1].createdAt);
        const lastMatch = new Date(matchHistory[0].createdAt);
        const daysSpan = (lastMatch.getTime() - firstMatch.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSpan >= 7) confidence += 0.1;
        if (daysSpan >= 30) confidence += 0.1;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
}

// ========== PlayerRankingProfile 缓存机制 ==========

/**
 * 获取玩家性能指标缓存（用于 PlayerRankingProfile）
 */
export const getPlayerPerformanceMetrics = internalQuery({
    args: { uid: v.string(), gameType: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.gameType) {
            // 查询指定游戏类型的缓存
            return await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid_gameType", (q) => q.eq("uid", args.uid).eq("gameType", args.gameType))
                .first();
        } else {
            // 查询所有游戏类型的缓存（取第一个）
            return await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q) => q.eq("uid", args.uid))
                .first();
        }
    }
});

/**
 * 更新或创建玩家性能指标缓存
 */
export const upsertPlayerPerformanceMetrics = internalMutation({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        metrics: v.object({
            totalMatches: v.number(),
            totalWins: v.number(),
            totalLosses: v.number(),
            averageScore: v.number(),
            averageRank: v.number(),
            currentWinStreak: v.number(),
            currentLoseStreak: v.number(),
            bestScore: v.number(),
            worstScore: v.number(),
            bestRank: v.number(),
            worstRank: v.number(),
            consistency: v.number(),
            trendDirection: v.union(v.literal("improving"), v.literal("declining"), v.literal("stable"))
        })
    },
    handler: async (ctx, args) => {
        const { uid, gameType, metrics } = args;

        // 查找现有缓存
        const existing = gameType
            ? await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid_gameType", (q) => q.eq("uid", uid).eq("gameType", gameType))
                .first()
            : await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q) => q.eq("uid", uid))
                .first();

        const now = new Date().toISOString();

        if (existing) {
            // 更新现有缓存
            await ctx.db.patch(existing._id, {
                ...metrics,
                gameType,
                lastUpdated: now
            });
            return existing._id;
        } else {
            // 创建新缓存
            const id = await ctx.db.insert("player_performance_metrics", {
                uid,
                gameType,
                ...metrics,
                lastUpdated: now
            });
            return id;
        }
    }
});

/**
 * 增量更新玩家性能指标缓存（在比赛结束时调用）
 * 用于实时更新缓存，无需重新计算全部历史数据
 */
export const incrementPlayerPerformanceMetrics = internalMutation({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        score: v.number(),
        rank: v.number()
    },
    handler: async (ctx, args) => {
        const { uid, gameType, score, rank } = args;

        // 查找现有缓存
        const existing = gameType
            ? await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid_gameType", (q) => q.eq("uid", uid).eq("gameType", gameType))
                .first()
            : await ctx.db
                .query("player_performance_metrics")
                .withIndex("by_uid", (q) => q.eq("uid", uid))
                .first();

        const now = new Date().toISOString();

        if (existing) {
            // 增量更新
            const newTotalMatches = existing.totalMatches + 1;
            const newTotalWins = rank === 1 ? existing.totalWins + 1 : existing.totalWins;
            const newTotalLosses = rank === 1 ? existing.totalLosses : existing.totalLosses + 1;

            // 更新平均值（使用移动平均算法，更重视最新数据）
            const weight = 0.3; // 新数据权重30%
            const newAverageScore = existing.averageScore * (1 - weight) + score * weight;
            const newAverageRank = existing.averageRank * (1 - weight) + rank * weight;

            // 更新连胜/连败
            let newWinStreak = existing.currentWinStreak;
            let newLoseStreak = existing.currentLoseStreak;
            if (rank === 1) {
                newWinStreak = existing.currentWinStreak + 1;
                newLoseStreak = 0;
            } else {
                newWinStreak = 0;
                newLoseStreak = existing.currentLoseStreak + 1;
            }

            // 更新最佳/最差
            const newBestScore = Math.max(existing.bestScore, score);
            const newWorstScore = Math.min(existing.worstScore, score);
            const newBestRank = Math.min(existing.bestRank, rank);
            const newWorstRank = Math.max(existing.worstRank, rank);

            await ctx.db.patch(existing._id, {
                totalMatches: newTotalMatches,
                totalWins: newTotalWins,
                totalLosses: newTotalLosses,
                averageScore: newAverageScore,
                averageRank: newAverageRank,
                currentWinStreak: newWinStreak,
                currentLoseStreak: newLoseStreak,
                bestScore: newBestScore,
                worstScore: newWorstScore,
                bestRank: newBestRank,
                worstRank: newWorstRank,
                lastUpdated: now
            });

            return existing._id;
        } else {
            // 创建初始缓存
            const id = await ctx.db.insert("player_performance_metrics", {
                uid,
                gameType,
                totalMatches: 1,
                totalWins: rank === 1 ? 1 : 0,
                totalLosses: rank === 1 ? 0 : 1,
                averageScore: score,
                averageRank: rank,
                currentWinStreak: rank === 1 ? 1 : 0,
                currentLoseStreak: rank === 1 ? 0 : 1,
                bestScore: score,
                worstScore: score,
                bestRank: rank,
                worstRank: rank,
                consistency: 0.5, // 初始一致性
                trendDirection: 'stable' as const,
                lastUpdated: now
            });
            return id;
        }
    }
});
