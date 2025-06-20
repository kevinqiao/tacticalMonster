import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  }).index("by_season_game_segment_status", ["seasonId", "gameType", "segmentName", "status"]),

  tournament_types: defineTable({
    typeId: v.string(), // 如 "daily_special"
    name: v.string(), // 如 "每日特别赛"
    description: v.string(),
    handlerModule: v.string(), // 如 "tournamentHandlers/dailySpecial"
    defaultConfig: v.any(), // 包含 entryFee, rules, rewards 等
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_typeId", ["typeId"]),

  matches: defineTable({
    tournamentId: v.id("tournaments"),
    gameType: v.string(),
    uid: v.string(),
    score: v.number(),
    completed: v.boolean(),
    attemptNumber: v.number(),
    propsUsed: v.array(v.string()), // 如 ["hint", "undo"]
    gameData: v.any(), // 如 { moves: 80, timeTaken: 200 }
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_uid", ["uid"]).index("by_tournament_uid", ["tournamentId", "uid"]),

  player_tournament_limits: defineTable({
    uid: v.string(),
    gameType: v.string(),
    tournamentType: v.string(),
    date: v.string(), // "2025-06-18"
    participationCount: v.number(),
    updatedAt: v.string(),
  }).index("by_uid_game_date", ["uid", "gameType", "date"]).index("by_uid_game_type_date", ["uid", "gameType", "tournamentType", "date"]),

  players: defineTable({
    uid: v.string(),
    token: v.optional(v.string()),
    segmentName: v.string(), // "Bronze", "Silver", "Gold", "Platinum"
    isSubscribed: v.boolean(),
    createdAt: v.string(),
    lastActive: v.string(),
    invitedBy: v.optional(v.string()),
  }).index("by_uid", ["uid"]),

  player_inventory: defineTable({
    uid: v.string(),
    coins: v.number(),
    cashBalance: v.optional(v.number()),
    props: v.array(
      v.object({
        gameType: v.string(),
        propType: v.string(), // 如 "hint", "undo"
        quantity: v.number(),
      }),
    ),
    tickets: v.array(
      v.object({
        gameType: v.string(),
        tournamentType: v.string(),
        quantity: v.number(),
      }),
    ),
    updatedAt: v.string(),
  }).index("by_uid", ["uid"]),

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
    updatedAt: v.string(),
  }).index("by_uid_season", ["uid", "seasonId"]),

  player_shares: defineTable({
    uid: v.string(),
    gameType: v.string(),
    content: v.string(),
    platform: v.string(), // "x"
    inviteUid: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_uid_game_platform", ["uid", "gameType", "platform"]),

  seasons: defineTable({
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_isActive", ["isActive"]),

  tasks: defineTable({
    taskId: v.string(), // 如 "daily_login"
    name: v.string(), // 如 "每日登录"
    description: v.string(),
    type: v.string(), // "daily", "weekly"
    gameType: v.optional(v.string()), // 如 "solitaire"
    condition: v.any(), // 如 { action: "login", count: 1 }
    rewards: v.object({
      coins: v.number(),
      props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
      tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
      gamePoints: v.number(),
    }),
    resetInterval: v.string(), // "daily", "weekly"
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_taskId", ["taskId"]),

  player_tasks: defineTable({
    uid: v.string(),
    taskId: v.string(),
    progress: v.number(), // 完成进度，如 2/3
    isCompleted: v.boolean(),
    lastReset: v.string(), // 最后重置时间
    updatedAt: v.string(),
  }).index("by_uid_taskId", ["uid", "taskId"]),
  task_events: defineTable({
    uid: v.string(), // 玩家 ID
    action: v.string(), // 行为类型，如 "complete_match", "share", "login"
    actionData: v.any(), // 行为数据，如 { gameType: "solitaire", score: 1200 }
    createdAt: v.string(), // 事件创建时间
    processed: v.boolean(), // 是否已处理
    updatedAt: v.string(), // 更新时间
  }).index("by_uid_processed", ["uid", "processed"]), // 按玩家和处理状态索引
});