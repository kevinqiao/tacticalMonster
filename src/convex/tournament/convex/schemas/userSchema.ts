import { defineTable } from "convex/server";
import { v } from "convex/values";

// 用户系统相关表
export const userSchema = {
    // 玩家表 - 合并了用户信息和游戏相关功能
    players: defineTable({
        uid: v.string(),
        token: v.optional(v.string()),
        email: v.optional(v.string()),
        displayName: v.optional(v.string()),
        avatar: v.optional(v.string()),
        segmentName: v.optional(v.string()), // "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"
        isActive: v.optional(v.boolean()),
        isSubscribed: v.optional(v.boolean()),
        eloScore: v.optional(v.number()),
        subscriptionExpiry: v.optional(v.string()),
        lastActive: v.optional(v.string()),
        totalPoints: v.optional(v.number()),
        expire: v.optional(v.number()),
        level: v.optional(v.number()),
        exp: v.optional(v.number()),
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
    }).index("by_uid", ["uid"]).index("by_email", ["email"]).index("by_segment", ["segmentName"]),

    // 玩家活动表 - 用于跟踪玩家活跃度
    player_activities: defineTable({
        uid: v.string(),
        activityId: v.string(),
        progress: v.any(), // 活动进度，如 { cumulativeDays: 1, consecutiveDays: 1, interruptions: 0 }
        startDate: v.string(),
        lastLogin: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_uid_activityId", ["uid", "activityId"]),

    // 通知表 - 用于系统通知和用户消息
    notifications: defineTable({
        uid: v.string(),
        message: v.string(),
        type: v.optional(v.string()), // "system", "task", "tournament", "achievement"
        isRead: v.optional(v.boolean()),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_read", ["isRead"]),

    // 错误日志表 - 用于记录系统错误和异常
    error_logs: defineTable({
        error: v.string(),
        context: v.string(),
        uid: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_context", ["context"]).index("by_uid", ["uid"]),

    user_preferences: defineTable({
        uid: v.string(),
        gamePreferences: v.object({
            favoriteGame: v.optional(v.string()),
            notificationSettings: v.object({
                tournamentReminders: v.boolean(),
                achievementNotifications: v.boolean(),
                dailyTaskReminders: v.boolean(),
            }),
            privacySettings: v.object({
                showProfile: v.boolean(),
                allowFriendRequests: v.boolean(),
            }),
        }),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]),

    user_statistics: defineTable({
        uid: v.string(),
        gameType: v.string(),
        totalMatches: v.number(),
        totalWins: v.number(),
        totalLosses: v.number(),
        winRate: v.number(),
        averageScore: v.number(),
        highestScore: v.number(),
        totalPlayTime: v.number(),
        lastPlayedAt: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_game", ["gameType"]),

    user_achievements: defineTable({
        uid: v.string(),
        achievementId: v.string(),
        isUnlocked: v.boolean(),
        unlockedAt: v.optional(v.string()),
        progress: v.number(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_achievement", ["achievementId"]),

    // 玩家库存表 - 存储玩家的金币、道具和门票
    player_inventory: defineTable({
        uid: v.string(),
        coins: v.number(),
        props: v.optional(v.array(v.object({
            gameType: v.string(),
            propType: v.string(),
            quantity: v.number(),
        }))),
        tickets: v.optional(v.array(v.object({
            type: v.string(),
            quantity: v.number(),
        }))),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid", ["uid"]),
}; 