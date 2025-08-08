import { defineTable } from "convex/server";
import { v } from "convex/values";

// 排行榜系统相关表
export const leaderboardSchema = {
    // 每日综合排行榜积分累积（所有游戏）
    daily_leaderboard_points: defineTable({
        date: v.string(), // YYYY-MM-DD格式
        uid: v.string(),
        totalScore: v.number(), // 累积的总积分（所有游戏）
        matchesPlayed: v.number(), // 参与的对局数（所有游戏）
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_date", ["date"])
        .index("by_uid_date", ["uid", "date"])
        .index("by_date_score", ["date", "totalScore"]),

    // 每日游戏特定排行榜积分累积
    daily_leaderboard_points_by_game: defineTable({
        date: v.string(), // YYYY-MM-DD格式
        uid: v.string(),
        gameType: v.string(), // "solitaire", "chess", etc.
        totalScore: v.number(), // 累积的总积分（特定游戏）
        matchesPlayed: v.number(), // 参与的对局数（特定游戏）
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_date_game", ["date", "gameType"])
        .index("by_uid_date_game", ["uid", "date", "gameType"])
        .index("by_date_game_score", ["date", "gameType", "totalScore"]),

    // 每周综合排行榜积分累积（所有游戏）
    weekly_leaderboard_points: defineTable({
        weekStart: v.string(), // 周开始日期 YYYY-MM-DD
        weekEnd: v.string(), // 周结束日期 YYYY-MM-DD
        uid: v.string(),
        totalScore: v.number(), // 累积的总积分（所有游戏）
        matchesPlayed: v.number(), // 参与的对局数（所有游戏）
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_week", ["weekStart"])
        .index("by_uid_week", ["uid", "weekStart"])
        .index("by_week_score", ["weekStart", "totalScore"]),

    // 每周游戏特定排行榜积分累积
    weekly_leaderboard_points_by_game: defineTable({
        weekStart: v.string(), // 周开始日期 YYYY-MM-DD
        weekEnd: v.string(), // 周结束日期 YYYY-MM-DD
        uid: v.string(),
        gameType: v.string(), // "solitaire", "chess", etc.
        totalScore: v.number(), // 累积的总积分（特定游戏）
        matchesPlayed: v.number(), // 参与的对局数（特定游戏）
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_week_game", ["weekStart", "gameType"])
        .index("by_uid_week_game", ["uid", "weekStart", "gameType"])
        .index("by_week_game_score", ["weekStart", "gameType", "totalScore"]),

    // 排行榜结算记录
    leaderboard_settlements: defineTable({
        leaderboardType: v.string(), // "daily" 或 "weekly"
        date: v.string(), // 日期或周开始日期
        gameType: v.string(),
        uid: v.string(),
        rank: v.number(),
        totalScore: v.number(),
        rankPointsReward: v.number(), // 获得的rankPoints奖励
        seasonPointsReward: v.number(), // 获得的seasonPoints奖励
        coinsReward: v.number(), // 获得的金币奖励
        claimed: v.boolean(), // 是否已领取
        claimedAt: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_type_date_game", ["leaderboardType", "date", "gameType"])
        .index("by_uid_type_date", ["uid", "leaderboardType", "date"])
        .index("by_uid_claimed", ["uid", "claimed"]),

    // 玩家排行榜统计
    player_leaderboard_stats: defineTable({
        uid: v.string(),
        gameType: v.string(),
        totalRankPoints: v.number(), // 总rankPoints
        totalSeasonPoints: v.number(), // 总seasonPoints
        dailyBestRank: v.number(), // 每日最佳排名
        weeklyBestRank: v.number(), // 每周最佳排名
        totalDailyRewards: v.number(), // 总每日奖励次数
        totalWeeklyRewards: v.number(), // 总每周奖励次数
        lastDailyReward: v.optional(v.string()),
        lastWeeklyReward: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_game", ["uid", "gameType"])
        .index("by_game_points", ["gameType", "totalRankPoints"]),

    // 排行榜配置
    leaderboard_configs: defineTable({
        leaderboardType: v.string(), // "daily" 或 "weekly"
        gameType: v.string(),
        isActive: v.boolean(),
        resetTime: v.string(), // "00:00" 格式
        resetDay: v.optional(v.number()), // 周排行榜重置日 (0=周日, 1=周一)
        rewards: v.array(v.object({
            rankRange: v.array(v.number()), // [minRank, maxRank]
            rankPoints: v.number(),
            seasonPoints: v.number(),
            coins: v.number()
        })),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_type_game", ["leaderboardType", "gameType"]),

    // 排行榜重置记录
    leaderboard_resets: defineTable({
        leaderboardType: v.string(), // "daily" 或 "weekly"
        date: v.string(), // 重置日期
        gameType: v.string(),
        totalPlayers: v.number(), // 参与玩家数
        totalRewards: v.number(), // 发放奖励数
        resetAt: v.string(),
        createdAt: v.string(),
    }).index("by_type_date_game", ["leaderboardType", "date", "gameType"])
}; 