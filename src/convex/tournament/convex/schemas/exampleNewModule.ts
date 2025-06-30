import { defineTable } from "convex/server";
import { v } from "convex/values";

// 示例：新增游戏统计模块
export const gameStatsSchema = {
    // 游戏统计表
    game_statistics: defineTable({
        gameType: v.string(),
        date: v.string(), // "2025-01-18"
        totalPlayers: v.number(),
        totalMatches: v.number(),
        averageScore: v.number(),
        averagePlayTime: v.number(),
        createdAt: v.string(),
    }).index("by_game_date", ["gameType", "date"]),

    // 玩家游戏历史
    player_game_history: defineTable({
        uid: v.string(),
        gameType: v.string(),
        matchId: v.string(),
        score: v.number(),
        playTime: v.number(),
        propsUsed: v.array(v.string()),
        result: v.string(), // "win", "loss", "draw"
        createdAt: v.string(),
    }).index("by_uid_game", ["uid", "gameType"]).index("by_match", ["matchId"]),

    // 游戏排行榜快照
    game_leaderboard_snapshots: defineTable({
        gameType: v.string(),
        segmentName: v.string(),
        snapshotDate: v.string(),
        leaderboardData: v.array(v.object({
            uid: v.string(),
            rank: v.number(),
            points: v.number(),
            displayName: v.string(),
        })),
        createdAt: v.string(),
    }).index("by_game_segment_date", ["gameType", "segmentName", "snapshotDate"]),
};

// 使用示例：
// 1. 将此文件重命名为 gameStatsSchema.ts
// 2. 在主schema文件中导入：
//    import { gameStatsSchema } from "./schemas/gameStatsSchema";
// 3. 在defineSchema中合并：
//    ...gameStatsSchema, 