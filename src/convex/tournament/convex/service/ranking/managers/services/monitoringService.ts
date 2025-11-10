/**
 * 登录触发画像更新的监控和统计服务
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../../../_generated/server";

/**
 * 获取登录触发统计信息（内部函数）
 */
async function getLoginTriggerStatsInternal(ctx: any, args: any) {
    const { timeRange } = args;

    // 获取所有登录事件
    let loginEvents = await ctx.db.query("player_behavior_events")
        .withIndex("by_eventType", (q: any) => q.eq("eventType", "user_login"))
        .collect();

    // 如果指定了时间范围，进行过滤
    if (timeRange) {
        const startTime = new Date(timeRange.startTime);
        const endTime = new Date(timeRange.endTime);

        loginEvents = loginEvents.filter((event: any) => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= startTime && eventTime <= endTime;
        });
    }

    // 统计信息
    const stats = {
        totalLogins: loginEvents.length,
        uniqueUsers: new Set(loginEvents.map((e: any) => e.uid)).size,
        timeRange: timeRange || {
            startTime: loginEvents.length > 0 ? loginEvents[loginEvents.length - 1].timestamp : null,
            endTime: loginEvents.length > 0 ? loginEvents[0].timestamp : null
        },
        deviceDistribution: calculateDeviceDistribution(loginEvents),
        loginMethodDistribution: calculateLoginMethodDistribution(loginEvents),
        hourlyDistribution: calculateHourlyDistribution(loginEvents),
        dailyDistribution: calculateDailyDistribution(loginEvents)
    };

    return stats;
}

/**
 * 获取画像更新统计信息（内部函数）
 */
async function getProfileUpdateStatsInternal(ctx: any, args: any) {
    const { timeRange } = args;

    // 获取所有玩家画像
    const profiles = await ctx.db.query("player_personalization_profiles").collect();

    // 获取最近的更新事件
    let updateEvents = await ctx.db.query("player_behavior_events")
        .withIndex("by_eventType", (q: any) => q.eq("eventType", "profile_update"))
        .collect();

    if (timeRange) {
        const startTime = new Date(timeRange.startTime);
        const endTime = new Date(timeRange.endTime);

        updateEvents = updateEvents.filter((event: any) => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= startTime && eventTime <= endTime;
        });
    }

    const now = new Date();
    const stats = {
        totalProfiles: profiles.length,
        recentlyUpdated: profiles.filter((p: any) => {
            const lastUpdated = new Date(p.lastUpdated);
            const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
            return hoursSinceUpdate < 24;
        }).length,
        updateFrequency: {
            high: profiles.filter((p: any) => p.updateCount > 10).length,
            medium: profiles.filter((p: any) => p.updateCount > 5 && p.updateCount <= 10).length,
            low: profiles.filter((p: any) => p.updateCount <= 5).length
        },
        dataQualityDistribution: {
            high: profiles.filter((p: any) => p.dataQuality === 'high').length,
            medium: profiles.filter((p: any) => p.dataQuality === 'medium').length,
            low: profiles.filter((p: any) => p.dataQuality === 'low').length
        },
        averageConfidence: profiles.length > 0 ?
            profiles.reduce((sum: number, p: any) => sum + p.confidence, 0) / profiles.length : 0,
        updateEvents: updateEvents.length,
        updateTypes: calculateUpdateTypeDistribution(updateEvents)
    };

    return stats;
}

/**
 * 获取系统性能统计（内部函数）
 */
async function getSystemPerformanceStatsInternal(ctx: any) {
    // 获取最近的登录和更新事件
    const recentLogins = await ctx.db.query("player_behavior_events")
        .withIndex("by_eventType", (q: any) => q.eq("eventType", "user_login"))
        .order("desc")
        .take(100);

    const recentUpdates = await ctx.db.query("player_behavior_events")
        .withIndex("by_eventType", (q: any) => q.eq("eventType", "profile_update"))
        .order("desc")
        .take(100);

    const stats = {
        recentActivity: {
            loginsLast100: recentLogins.length,
            updatesLast100: recentUpdates.length,
            averageLoginInterval: calculateAverageInterval(recentLogins),
            averageUpdateInterval: calculateAverageInterval(recentUpdates)
        },
        errorRates: {
            loginErrors: recentLogins.filter((e: any) => e.eventData?.error).length,
            updateErrors: recentUpdates.filter((e: any) => e.eventData?.error).length
        },
        systemHealth: {
            activeUsers: await getActiveUserCount(ctx),
            profileCompleteness: await getProfileCompleteness(ctx),
            dataFreshness: await getDataFreshness(ctx)
        }
    };

    return stats;
}

/**
 * 获取登录触发统计信息
 */
export const getLoginTriggerStats = internalQuery({
    args: {
        timeRange: v.optional(v.object({
            startTime: v.string(),
            endTime: v.string()
        }))
    },
    handler: async (ctx, args) => {
        return await getLoginTriggerStatsInternal(ctx, args);
    }
});

/**
 * 获取画像更新统计信息
 */
export const getProfileUpdateStats = internalQuery({
    args: {
        timeRange: v.optional(v.object({
            startTime: v.string(),
            endTime: v.string()
        }))
    },
    handler: async (ctx, args) => {
        return await getProfileUpdateStatsInternal(ctx, args);
    }
});

/**
 * 获取系统性能统计
 */
export const getSystemPerformanceStats = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await getSystemPerformanceStatsInternal(ctx);
    }
});

/**
 * 记录系统监控事件
 */
export const recordSystemMonitoringEvent = internalMutation({
    args: {
        eventType: v.string(),
        eventData: v.any(),
        timestamp: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { eventType, eventData, timestamp } = args;

        await ctx.db.insert("system_monitoring_events", {
            eventType,
            eventData,
            timestamp: timestamp || new Date().toISOString(),
            severity: eventData.severity || 'info'
        });
    }
});

/**
 * 获取系统监控事件
 */
export const getSystemMonitoringEvents = internalQuery({
    args: {
        eventType: v.optional(v.string()),
        severity: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const { eventType, severity, limit = 100 } = args;

        let query = ctx.db.query("system_monitoring_events");

        if (eventType) {
            query = query.filter(q => q.eq(q.field("eventType"), eventType));
        }

        if (severity) {
            query = query.filter(q => q.eq(q.field("severity"), severity));
        }

        const events = await query
            .order("desc")
            .take(limit);

        return events;
    }
});

/**
 * 计算设备分布
 */
function calculateDeviceDistribution(events: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    events.forEach(event => {
        const deviceInfo = event.eventData?.deviceInfo || 'unknown';
        distribution[deviceInfo] = (distribution[deviceInfo] || 0) + 1;
    });

    return distribution;
}

/**
 * 计算登录方法分布
 */
function calculateLoginMethodDistribution(events: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    events.forEach(event => {
        const loginMethod = event.eventData?.loginMethod || 'unknown';
        distribution[loginMethod] = (distribution[loginMethod] || 0) + 1;
    });

    return distribution;
}

/**
 * 计算小时分布
 */
function calculateHourlyDistribution(events: any[]): Record<number, number> {
    const distribution: Record<number, number> = {};

    events.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        distribution[hour] = (distribution[hour] || 0) + 1;
    });

    return distribution;
}

/**
 * 计算天分布
 */
function calculateDailyDistribution(events: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    events.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        distribution[date] = (distribution[date] || 0) + 1;
    });

    return distribution;
}

/**
 * 计算更新类型分布
 */
function calculateUpdateTypeDistribution(events: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    events.forEach(event => {
        const updateType = event.eventData?.updateType || 'unknown';
        distribution[updateType] = (distribution[updateType] || 0) + 1;
    });

    return distribution;
}

/**
 * 计算平均间隔
 */
function calculateAverageInterval(events: any[]): number {
    if (events.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < events.length; i++) {
        const prevTime = new Date(events[i].timestamp).getTime();
        const currTime = new Date(events[i - 1].timestamp).getTime();
        intervals.push(currTime - prevTime);
    }

    return intervals.length > 0 ?
        intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;
}

/**
 * 获取活跃用户数量
 */
async function getActiveUserCount(ctx: any): Promise<number> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogins = await ctx.db.query("player_behavior_events")
        .withIndex("by_eventType", (q: any) => q.eq("eventType", "user_login"))
        .filter((q: any) => q.gte(q.field("timestamp"), oneDayAgo.toISOString()))
        .collect();

    return new Set(recentLogins.map((e: any) => e.uid)).size;
}

/**
 * 获取画像完整性
 */
async function getProfileCompleteness(ctx: any): Promise<number> {
    const profiles = await ctx.db.query("player_personalization_profiles").collect();

    if (profiles.length === 0) return 0;

    const completeProfiles = profiles.filter((profile: any) => {
        return profile.preferences &&
            profile.behavioralPatterns &&
            profile.performanceHistory &&
            profile.psychologicalProfile;
    });

    return completeProfiles.length / profiles.length;
}

/**
 * 获取数据新鲜度
 */
async function getDataFreshness(ctx: any): Promise<number> {
    const profiles = await ctx.db.query("player_personalization_profiles").collect();

    if (profiles.length === 0) return 0;

    const now = new Date();
    const freshProfiles = profiles.filter((profile: any) => {
        const lastUpdated = new Date(profile.lastUpdated);
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        return hoursSinceUpdate < 24; // 24小时内的数据认为是新鲜的
    });

    return freshProfiles.length / profiles.length;
}

/**
 * 清理旧的监控事件
 */
export const cleanupOldMonitoringEvents = internalMutation({
    args: {
        daysToKeep: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const { daysToKeep = 30 } = args;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const oldEvents = await ctx.db.query("system_monitoring_events")
            .filter(q => q.lt(q.field("timestamp"), cutoffDate.toISOString()))
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

/**
 * 生成系统健康报告
 */
export const generateSystemHealthReport = internalQuery({
    args: {},
    handler: async (ctx) => {
        const loginStats = await getLoginTriggerStatsInternal(ctx, {});
        const updateStats = await getProfileUpdateStatsInternal(ctx, {});
        const performanceStats = await getSystemPerformanceStatsInternal(ctx);

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalUsers: loginStats.uniqueUsers,
                activeUsers: performanceStats.systemHealth.activeUsers,
                totalProfiles: updateStats.totalProfiles,
                recentlyUpdated: updateStats.recentlyUpdated
            },
            health: {
                profileCompleteness: performanceStats.systemHealth.profileCompleteness,
                dataFreshness: performanceStats.systemHealth.dataFreshness,
                averageConfidence: updateStats.averageConfidence
            },
            activity: {
                totalLogins: loginStats.totalLogins,
                recentUpdates: updateStats.updateEvents,
                errorRates: performanceStats.errorRates
            },
            recommendations: generateRecommendations(loginStats, updateStats, performanceStats)
        };

        return report;
    }
});

/**
 * 生成建议
 */
function generateRecommendations(loginStats: any, updateStats: any, performanceStats: any): string[] {
    const recommendations: string[] = [];

    // 基于画像完整性
    if (performanceStats.systemHealth.profileCompleteness < 0.8) {
        recommendations.push("画像完整性较低，建议检查数据收集流程");
    }

    // 基于数据新鲜度
    if (performanceStats.systemHealth.dataFreshness < 0.7) {
        recommendations.push("数据新鲜度较低，建议增加更新频率");
    }

    // 基于错误率
    const totalEvents = loginStats.totalLogins + updateStats.updateEvents;
    const errorRate = (performanceStats.errorRates.loginErrors + performanceStats.errorRates.updateErrors) / totalEvents;
    if (errorRate > 0.05) {
        recommendations.push("错误率较高，建议检查错误处理机制");
    }

    // 基于更新频率
    if (updateStats.updateFrequency.low > updateStats.updateFrequency.high) {
        recommendations.push("大部分用户更新频率较低，建议优化触发机制");
    }

    return recommendations;
}
