import { defineTable } from "convex/server";
import { v } from "convex/values";

// 段位系统相关表
export const segmentSchema = {
    segments: defineTable({
        name: v.string(), // "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"
        tier: v.number(), // 1-5
        minPoints: v.number(),
        maxPoints: v.number(),
        promotionThreshold: v.number(),
        demotionThreshold: v.number(),
        protectionPeriod: v.number(), // 保护期天数
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_name", ["name"]).index("by_tier", ["tier"]),

    player_segments: defineTable({
        uid: v.string(),
        gameType: v.string(),
        segmentName: v.string(),
        currentPoints: v.number(),
        seasonPoints: v.number(),
        globalPoints: v.number(),
        highestPoints: v.number(),
        protectionExpiry: v.string(),
        lastActivityDate: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_game", ["uid", "gameType"]).index("by_segment", ["segmentName"]),

    // 玩家赛季数据 - 用于排行榜
    player_seasons: defineTable({
        uid: v.string(),
        seasonId: v.id("seasons"),
        seasonPoints: v.number(),
        gamePoints: v.object({
            solitaire: v.number(),
            uno: v.number(),
            ludo: v.number(),
            rummy: v.number(),
        }),
        matchesPlayed: v.number(),
        matchesWon: v.number(),
        winRate: v.number(),
        lastMatchAt: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_season", ["uid", "seasonId"]).index("by_season_points", ["seasonId", "seasonPoints"]),

    segment_changes: defineTable({
        uid: v.string(),
        gameType: v.string(),
        oldSegment: v.string(),
        newSegment: v.string(),
        pointsChange: v.number(),
        reason: v.string(), // "promotion", "demotion", "season_reset", "inactivity"
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_gameType", ["gameType"]),

    segment_rewards: defineTable({
        segmentName: v.string(),
        rewardType: v.string(), // "promotion", "maintenance", "season_end"
        rewards: v.array(v.object({
            type: v.string(), // "tickets", "props", "coins"
            itemId: v.string(),
            quantity: v.number()
        })),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_segment", ["segmentName"]),

    leaderboards: defineTable({
        gameType: v.string(),
        segmentName: v.string(),
        uid: v.string(),
        points: v.number(),
        rank: v.number(),
        seasonId: v.optional(v.id("seasons")),
        isGlobal: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_game_segment_rank", ["gameType", "segmentName", "rank"]).index("by_uid", ["uid"]),

    segment_statistics: defineTable({
        gameType: v.string(),
        segmentName: v.string(),
        totalPlayers: v.number(),
        averagePoints: v.number(),
        promotionRate: v.number(),
        demotionRate: v.number(),
        date: v.string(),
        createdAt: v.string(),
    }).index("by_game_segment_date", ["gameType", "segmentName", "date"]),

    inactivity_penalties: defineTable({
        uid: v.string(),
        gameType: v.string(),
        segmentName: v.string(),
        penaltyAmount: v.number(),
        reason: v.string(), // "weekly_inactivity"
        appliedAt: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_gameType", ["gameType"]),

    return_rewards: defineTable({
        uid: v.string(),
        gameType: v.string(),
        rewards: v.array(v.object({
            type: v.string(), // "points", "tickets", "props"
            itemId: v.string(),
            quantity: v.number()
        })),
        appliedAt: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]),

    master_maintenance: defineTable({
        uid: v.string(),
        gameType: v.string(),
        currentPoints: v.number(),
        tournamentsCompleted: v.number(),
        maintenanceRewards: v.array(v.object({
            type: v.string(),
            itemId: v.string(),
            quantity: v.number()
        })),
        checkedAt: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"]).index("by_gameType", ["gameType"]),
}; 