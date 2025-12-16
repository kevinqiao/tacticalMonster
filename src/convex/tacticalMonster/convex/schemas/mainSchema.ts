import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tacticalMonsterSchema = {
    // ============================================
    // tacticalMonster  相关表
    // ============================================
    mr_games: defineTable({
        uid: v.string(),
        teamPower: v.number(),
        team: v.array(v.object({             // 玩家选择的4个怪物
            monsterId: v.string(),
            level: v.number(),
            stars: v.number(),
            hp: v.number(),
            position: v.object({                 // Hex位置
                q: v.number(),
                r: v.number()
            })
        })),
        boss: v.array(v.object({             // 玩家选择的4个怪物
            monsterId: v.string(),
            hp: v.number(),
            damage: v.number(),
            defense: v.number(),
            speed: v.number(),
            position: v.object({                 // Hex位置
                q: v.number(),
                r: v.number()
            }),
            minions: v.array(v.object({             // 玩家选择的4个怪物
                monsterId: v.string(),
                hp: v.number(),
                damage: v.number(),
                defense: v.number(),
                speed: v.number(),
                position: v.object({                 // Hex位置
                    q: v.number(),
                    r: v.number()
                })
            })),
        })),
        map: v.object({
            rows: v.number(),
            cols: v.number(),
            obstacles: v.array(v.object({
                q: v.number(),
                r: v.number(),
            })),
            disables: v.array(v.object({
                q: v.number(),
                r: v.number(),
            })),
        }),
        stageId: v.string(),
        ruleId: v.string(),
        matchId: v.string(),
        gameId: v.string(),
        status: v.number(),
        score: v.number(),
        lastUpdate: v.string(),
        createdAt: v.string(),
    }).index("by_uid_ruleId", ["uid", "ruleId"])
        .index("by_uid_rule_stage", ["uid", "ruleId", "stageId"])
        .index("by_matchId", ["matchId"])
        .index("by_gameId", ["gameId"])
        .index("by_status", ["status"]),
    mr_arena_stage: defineTable({
        ruleId: v.string(),
        stageId: v.string(),
        openAt: v.string(),
    })
        .index("by_ruleId", ["ruleId"])
        .index("by_stageId", ["stageId"])
        .index("by_openAt", ["openAt"]),
    mr_stage: defineTable({
        stageId: v.string(),
        bossId: v.string(),
        mapId: v.string(),
        difficulty: v.number(),//boss power/player team power ratio(after scaling)
        seed: v.string(),
        attempts: v.number(),
        createdAt: v.string(),
    })
        .index("by_stageId", ["stageId"])
        .index("by_bossId", ["bossId"])
        .index("by_mapId", ["mapId"])
        .index("by_createdAt", ["createdAt"]),
    mr_map: defineTable({
        mapId: v.string(),
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
    }).index("by_mapId", ["mapId"]),
    mr_map_templates: defineTable({
        templateId: v.string(),
        name: v.string(),
        tier: v.string(),  // 适用的Tier列表（逗号分隔或单个）
        mapSize: v.object({
            rows: v.number(),
            cols: v.number(),
        }),

        // 核心障碍物（不可调整的关键地形）
        coreObstacles: v.array(v.object({
            q: v.number(),
            r: v.number(),
            type: v.number(),
            asset: v.string(),
        })),

        // 可选障碍物（可随机调整的障碍物）
        optionalObstacles: v.array(v.object({
            q: v.number(),
            r: v.number(),
            type: v.number(),
            asset: v.string(),
        })),

        // 障碍物禁区（玩家区域、Boss区域、关键路径）
        restrictedZones: v.array(v.object({
            type: v.string(),  // "player" | "boss" | "path"
            region: v.object({
                minQ: v.number(),
                maxQ: v.number(),
                minR: v.number(),
                maxR: v.number(),
            }),
        })),

        configVersion: v.number(),
    })
        .index("by_templateId", ["templateId"])
        .index("by_tier", ["tier"]),
    mr_game_event: defineTable({
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

};

