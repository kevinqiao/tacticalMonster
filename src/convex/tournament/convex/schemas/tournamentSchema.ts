import { defineTable } from "convex/server";
import { v } from "convex/values";

// 锦标赛系统相关表
export const tournamentSchema = {
    tournaments: defineTable({
        seasonId: v.id("seasons"),
        gameType: v.string(), // "solitaire", "uno", "ludo", "rummy"
        segmentName: v.string(), // "Bronze", "Silver", "Gold", "Platinum"
        status: v.string(), // "open", "completed"
        playerUids: v.array(v.string()),
        tournamentType: v.string(), // 引用 tournament_types.typeId
        isSubscribedRequired: v.boolean(),
        isSingleMatch: v.boolean(),
        prizePool: v.number(),
        config: v.any(), // 包含 entryFee, rules, rewards 等
        createdAt: v.string(),
        updatedAt: v.string(),
        endTime: v.string(),
    }).index("by_season_game_segment_status", ["seasonId", "gameType", "segmentName", "status"])
        .index("by_type_status", ["tournamentType", "status", "gameType", "segmentName"]),

    tournament_types: defineTable({
        typeId: v.string(), // 如 "daily_special"
        name: v.string(), // 如 "每日特别赛"
        description: v.string(),
        category: v.string(), // "daily", "weekly", "seasonal", "special"
        handlerModule: v.string(), // 如 "tournamentHandlers/dailySpecial"
        defaultConfig: v.any(), // 包含 entryFee, rules, rewards 等
        isActive: v.boolean(), // 是否激活
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_typeId", ["typeId"])
        .index("by_category", ["category"])
        .index("by_isActive", ["isActive"]),

    // 比赛基础信息表 - 存储比赛的核心信息
    matches: defineTable({
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
        matchType: v.string(), // "single_player", "multi_player", "team"
        status: v.string(), // "pending", "in_progress", "completed", "cancelled"
        maxPlayers: v.number(),
        minPlayers: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        gameData: v.any(), // 游戏通用数据，如规则配置
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_status", ["status"])
        .index("by_game_type", ["gameType"])
        .index("by_tournament_status", ["tournamentId", "status"]),

    // 玩家比赛记录表 - 存储每个玩家在比赛中的具体表现
    player_matches: defineTable({
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
        score: v.number(),
        rank: v.optional(v.number()),
        completed: v.boolean(),
        attemptNumber: v.number(),
        propsUsed: v.array(v.string()), // 如 ["hint", "undo"]
        playerGameData: v.any(), // 玩家特定的游戏数据，如 { moves: 80, timeTaken: 200 }
        joinTime: v.string(),
        leaveTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_match_uid", ["matchId", "uid"])
        .index("by_tournament_uid", ["tournamentId", "uid"])
        .index("by_uid", ["uid"])
        .index("by_match", ["matchId"])
        .index("by_tournament", ["tournamentId"])
        .index("by_completed", ["completed"])
        .index("by_score", ["score"]),

    // 比赛事件日志表 - 记录比赛过程中的重要事件
    match_events: defineTable({
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.optional(v.string()), // 触发事件的玩家，可选
        eventType: v.string(), // "player_join", "player_leave", "score_submit", "prop_used", "match_start", "match_end"
        eventData: v.any(), // 事件相关数据
        timestamp: v.string(),
        createdAt: v.string(),
    }).index("by_match", ["matchId"])
        .index("by_tournament", ["tournamentId"])
        .index("by_uid", ["uid"])
        .index("by_event_type", ["eventType"])
        .index("by_timestamp", ["timestamp"]),

    player_tournament_limits: defineTable({
        uid: v.string(),
        gameType: v.string(),
        tournamentType: v.string(),
        date: v.string(), // "2025-06-18" - 用于每日限制
        weekStart: v.optional(v.string()), // "2025-06-16" - 用于每周限制（周一）
        seasonId: v.optional(v.id("seasons")), // 用于赛季限制
        participationCount: v.number(), // 参与次数
        tournamentCount: v.number(), // 锦标赛数量
        submissionCount: v.number(), // 提交次数
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_game_date", ["uid", "gameType", "date"])
        .index("by_uid_tournament_date", ["uid", "tournamentType", "date"])
        .index("by_uid_tournament_week", ["uid", "tournamentType", "weekStart"])
        .index("by_uid_tournament_season", ["uid", "tournamentType", "seasonId"])
        .index("by_uid_tournament", ["uid", "tournamentType"])
        .index("by_date_tournament", ["date", "tournamentType"]),

    // 玩家锦标赛参与记录
    player_tournament_participation: defineTable({
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(),
        gameType: v.string(),
        participationDate: v.string(), // YYYY-MM-DD 格式
        submissionCount: v.number(), // 在该锦标赛中的提交次数
        bestScore: v.optional(v.number()), // 最佳分数
        lastSubmissionAt: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_uid_tournament", ["uid", "tournamentId"])
        .index("by_uid_date", ["uid", "participationDate"])
        .index("by_tournament_uid", ["tournamentId", "uid"]),

    // 锦标赛道具分配
    tournament_prop_distributions: defineTable({
        uid: v.string(),
        tournamentId: v.string(),
        rewards: v.array(v.any()),
        distributedProps: v.array(v.object({
            gameType: v.string(),
            propType: v.string(),
            quantity: v.number()
        })),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_tournamentId", ["tournamentId"]),

    // 锦标赛参赛费用
    tournament_entry_fees: defineTable({
        uid: v.string(),
        tournamentId: v.string(),
        tournamentTypeId: v.string(),
        entryFee: v.any(),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_tournamentId", ["tournamentId"]),

    // 锦标赛道具效果
    tournament_prop_effects: defineTable({
        uid: v.string(),
        tournamentId: v.string(),
        gameType: v.string(),
        originalResult: v.any(),
        modifiedResult: v.any(),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_tournamentId", ["tournamentId"]),

    seasons: defineTable({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_isActive", ["isActive"]),
}; 