import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tacticalMonster_game: defineTable({
        gameId: v.string(),
        playerUid: v.string(),              // 玩家 UID（替代 challenger）
        map: v.string(),
        round: v.number(),
        status: v.number(),                 // 0: playing, 1: won, 2: lost, 3: game over
        score: v.number(),                  // 游戏分数
        lastUpdate: v.number(),
        seed: v.optional(v.string()),
    }).index("by_gameId", ["gameId"])
        .index("by_player", ["playerUid"]),

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
});


