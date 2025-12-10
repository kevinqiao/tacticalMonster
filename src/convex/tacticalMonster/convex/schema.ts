import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { bossSchema } from "./schemas/bossSchema";
import { chestSchema } from "./schemas/chestSchema";
import { levelSchema } from "./schemas/levelSchema";
import { monsterRumbleSchema } from "./schemas/monsterRumbleSchema";
import { monsterSchema } from "./schemas/monsterSchema";
import { tierSchema } from "./schemas/tierSchema";

export default defineSchema({
    // ============================================
    // 统一的游戏主表（支持单玩家和 Monster Rumble 模式）
    // ============================================
    tacticalMonster_game: defineTable({
        // 公共字段
        gameId: v.string(),

        // 状态字段（统一为字符串）
        status: v.string(),  // "waiting", "playing", "settling", "ended", "won", "lost"

        // 游戏核心字段（公共）
        round: v.optional(v.number()),           // 回合数
        score: v.optional(v.number()),           // 游戏分数
        map: v.optional(v.string()),             // 地图ID
        lastUpdate: v.optional(v.number()),      // 最后更新时间

        // 单玩家模式字段
        playerUid: v.optional(v.string()),       // 单玩家模式的玩家UID

        // Monster Rumble Tournament 模式字段
        // 注意：如果有 matchId，说明是 Tournament 模式；否则是单玩家模式
        matchId: v.optional(v.string()),         // Tournament 匹配 ID（用于区分模式）
        tier: v.optional(v.string()),            // "bronze", "silver", "gold", "platinum"
        bossId: v.optional(v.string()),          // Boss ID
        maxPlayers: v.optional(v.number()),      // 最大玩家数
        currentPlayers: v.optional(v.number()),  // 当前玩家数
        startedAt: v.optional(v.string()),       // 开始时间
        endedAt: v.optional(v.string()),         // 结束时间
        timeoutAt: v.optional(v.string()),       // 超时时间

        // 其他字段
        seed: v.optional(v.string()),            // 随机种子
        config: v.optional(v.any()),             // 游戏配置
        createdAt: v.optional(v.string()),       // 创建时间
    })
        .index("by_gameId", ["gameId"])
        .index("by_matchId", ["matchId"])              // Tournament 模式索引
        .index("by_playerUid", ["playerUid"])          // 单玩家模式索引
        .index("by_tier_status", ["tier", "status"])   // Tournament 模式索引
        .index("by_status_timeoutAt", ["status", "timeoutAt"]) // Tournament 模式索引
        .index("by_createdAt", ["createdAt"]),

    tacticalMonster_game_character: defineTable({
        gameId: v.string(),
        character_id: v.string(),
        uid: v.string(),
        name: v.string(),
        level: v.number(),
        stats: v.any(),
        q: v.number(),
        r: v.number(),
        facing: v.optional(v.number()),
        scaleX: v.optional(v.number()),
        skills: v.optional(v.array(v.string())),
        statusEffects: v.optional(v.array(v.any())),
        cooldowns: v.optional(v.any()),
        asset: v.optional(v.any()),
        class: v.optional(v.string()),
        race: v.optional(v.string()),
        move_range: v.optional(v.number()),
        attack_range: v.object({
            min: v.number(),
            max: v.number(),
        }),
    }).index("by_game", ["gameId"])
        .index("by_game_character", ["gameId", "uid", "character_id"]),

    tacticalMonster_game_round: defineTable({
        gameId: v.string(),
        no: v.number(),
        status: v.number(),
        turns: v.array(v.object({
            uid: v.string(),
            character_id: v.string(),
            skills: v.optional(v.array(v.string())),
            skillSelect: v.optional(v.string()),
            status: v.number(),
            startTime: v.optional(v.number()),
            endTime: v.optional(v.number()),
        })),
        endTime: v.optional(v.number()),
    }).index("by_game_round", ["gameId", "no"]),

    tacticalMonster_event: defineTable({
        uid: v.optional(v.string()),
        gameId: v.string(),
        name: v.string(),
        type: v.optional(v.number()),
        data: v.optional(v.any()),
        isSynced: v.boolean(),
        time: v.number(),
    }).index("by_game", ["gameId"])
        .index("by_player", ["uid"])
        .index("by_sync", ["isSynced"])
        .index("by_name", ["name", "isSynced"]),

    tacticalMonster_map_data: defineTable({
        map_id: v.string(),
        rows: v.number(),
        cols: v.number(),
        obstacles: v.array(v.object({
            q: v.number(),
            r: v.number(),
            type: v.number(),
            asset: v.string(),
        })),
        disables: v.array(v.object({
            q: v.number(),
            r: v.number(),
        })),
    }).index("by_map_id", ["map_id"]),

    // ============================================
    // Monster Rumble Tournament 相关表
    // 注意：游戏主表（mr_games）已合并到 tacticalMonster_game
    // ============================================
    ...monsterRumbleSchema,  // 只包含 mr_game_participants
    ...chestSchema,
    ...monsterSchema,
    ...tierSchema,
    ...levelSchema,
    ...bossSchema,
});


