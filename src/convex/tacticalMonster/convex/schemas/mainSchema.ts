import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * StatusEffect Schema 定义
 * 与 StatusEffect 类型保持一致
 */
const statusEffectSchema = v.object({
    id: v.string(),                      // 效果ID
    name: v.string(),                    // 效果名称
    type: v.string(),                    // 效果类型（'buff' | 'debuff' | 'dot' | 'hot' | 'stun' | 'shield' | 'mp_drain' | 'mp_restore' | 'damage' | 'heal' | 'movement' | 'teleport'）
    duration: v.optional(v.number()),    // 持续时间（回合数，0表示立即生效）
    remaining_duration: v.number(),      // 剩余持续时间（运行时使用，必需）

    // 数值修改
    modifiers: v.optional(v.any()),      // 属性修改器 { [key: string]: number }
    modifier_type: v.optional(v.union(v.literal("add"), v.literal("multiply"))),  // 修改类型：加法或乘法

    // 直接数值
    value: v.optional(v.number()),       // 直接数值（伤害值、治疗值等）

    // UI相关
    icon: v.optional(v.string()),        // 效果图标路径

    // 范围相关
    damage_falloff: v.optional(v.object({ // 伤害衰减
        full_damage_range: v.number(),
        min_damage_percent: v.number(),
    })),
    area_type: v.optional(v.union(v.literal("single"), v.literal("circle"), v.literal("line"))),  // 作用范围类型
    area_size: v.optional(v.number()),   // 作用范围大小

    // 伤害类型
    damage_type: v.optional(v.union(v.literal("physical"), v.literal("magical"))),  // 伤害类型

    // 目标属性
    target_attribute: v.optional(v.string()),  // 目标属性（如 "attack", "defense", "hp", "mp"）
});

export const tacticalMonsterSchema = {
    // ============================================
    // tacticalMonster  相关表
    // ============================================
    // mr_player_teams: defineTable({
    //     uid: v.string(),
    //     teamPower: v.number(),
    //     team: v.array(v.object({             // 玩家选择的4个怪物
    //         monsterId: v.string(),
    //         level: v.number(),
    //         stars: v.number(),
    //         position: v.object({                 // Hex位置
    //             q: v.number(),
    //             r: v.number()
    //         })
    //     })),
    // }),
    mr_games: defineTable({
        uid: v.string(),
        teamPower: v.number(),
        team: v.array(v.object({             // 玩家选择的4个怪物（统一使用stats，与GameMonster保持一致）
            // ========== 基础标识 ==========
            uid: v.string(),                   // 玩家UID
            monsterId: v.string(),            // 怪物配置ID

            // ========== 从 PlayerMonster 组合的字段 ==========
            level: v.number(),                 // 等级
            stars: v.number(),                 // 星级

            // ========== 位置信息（战斗中）==========
            q: v.optional(v.number()),         // Hex坐标 q
            r: v.optional(v.number()),         // Hex坐标 r

            // ========== 实时战斗状态（运行时数据）==========
            stats: v.object({                  // 详细属性（必需：统一使用stats）
                hp: v.object({
                    current: v.number(),
                    max: v.number()
                }),
                attack: v.number(),
                defense: v.number(),
                speed: v.number(),
                // 可选字段
                mp: v.optional(v.object({
                    current: v.number(),
                    max: v.number()
                })),
                stamina: v.optional(v.number()),
                crit_rate: v.optional(v.number()),
                evasion: v.optional(v.number()),
                shield: v.optional(v.object({
                    current: v.number(),
                    max: v.number()
                })),
                intelligence: v.optional(v.number()),
                status_resistance: v.optional(v.number()),
            }),
            statusEffects: v.optional(v.array(statusEffectSchema)),  // 状态效果列表（与StatusEffect类型一致）
            skillCooldowns: v.optional(v.any()),          // 技能冷却时间
            status: v.optional(v.string()),               // 角色状态（'normal' | 'stunned' | 'dead'）

            // ========== 移动和战斗 ==========
            move_range: v.optional(v.number()),           // 移动范围
            attack_range: v.optional(v.object({          // 攻击范围
                min: v.number(),
                max: v.number()
            })),
        })),
        boss: v.object({             // Boss数据（统一使用stats）
            monsterId: v.string(),
            position: v.object({      // Hex位置
                q: v.number(),
                r: v.number()
            }),
            minions: v.array(v.object({  // 小怪数据
                monsterId: v.string(),
                hp: v.number(),
                damage: v.number(),
                defense: v.number(),
                speed: v.number(),
                position: v.object({     // Hex位置
                    q: v.number(),
                    r: v.number()
                }),
                // 可选：小怪的运行时状态
                stats: v.optional(v.any()),
                statusEffects: v.optional(v.array(statusEffectSchema)),  // 状态效果列表（与StatusEffect类型一致）
                cooldowns: v.optional(v.any()),
            })),
            // 实时战斗状态（必需：统一使用stats）
            stats: v.object({         // 详细属性（必需：用于区分当前HP和最大HP，计算血量百分比）
                hp: v.object({
                    current: v.number(),
                    max: v.number()
                }),
                attack: v.number(),
                defense: v.number(),
                speed: v.number()
            }),
            statusEffects: v.optional(v.array(statusEffectSchema)),  // 状态效果列表（与StatusEffect类型一致）
            cooldowns: v.optional(v.any()),           // 技能冷却
            skills: v.optional(v.array(v.string())), // 可用技能列表
            currentPhase: v.optional(v.string()),     // 当前阶段
            behaviorSeed: v.optional(v.string()),     // 行为随机种子
        }),
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
        matchId: v.optional(v.string()),
        gameId: v.string(),
        status: v.number(),
        score: v.number(),
        lastUpdate: v.string(),
        createdAt: v.string(),
        // Boss阶段管理（可选，也可以存储在 boss.currentPhase 中）
        bossCurrentPhase: v.optional(v.string()),
    }).index("by_uid_ruleId", ["uid", "ruleId"])
        .index("by_uid_rule_stage", ["uid", "ruleId", "stageId"])
        .index("by_matchId", ["matchId"])
        .index("by_gameId", ["gameId"])
        .index("by_status", ["status"]),
    mr_arena_stage: defineTable({
        ruleId: v.string(),
        stageId: v.string(),
        createdAt: v.string(),
    })
        .index("by_ruleId", ["ruleId"])
        .index("by_stageId", ["stageId"])
        .index("by_createdAt", ["createdAt"]),
    mr_stage: defineTable({
        stageId: v.string(),
        bossId: v.string(),
        map: v.object({
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
        }),
        difficulty: v.number(),//boss power/player team power ratio(after scaling)
        seed: v.string(),
        attempts: v.number(),
        createdAt: v.string(),
    })
        .index("by_stageId", ["stageId"])
        .index("by_bossId", ["bossId"])
        .index("by_createdAt", ["createdAt"]),
    mr_player_stages: defineTable({
        uid: v.string(),
        ruleId: v.string(),
        stageId: v.string(),
        lastUpdate: v.optional(v.string()),
        createdAt: v.string(),
    })
        .index("by_uid", ["uid"])
        .index("by_uid_ruleId", ["uid", "ruleId"])
        .index("by_stageId", ["stageId"]),

    // mr_map: defineTable({
    //     mapId: v.string(),
    //     rows: v.number(),
    //     cols: v.number(),
    //     obstacles: v.array(v.object({
    //         q: v.number(),
    //         r: v.number(),
    //         type: v.number(),
    //         asset: v.string(),
    //     })),
    //     disables: v.array(v.object({
    //         q: v.number(),
    //         r: v.number(),
    //     })),
    // }).index("by_mapId", ["mapId"]),
    // mr_map_templates: defineTable({
    //     templateId: v.string(),
    //     name: v.string(),
    //     tier: v.string(),  // 适用的Tier列表（逗号分隔或单个）
    //     mapSize: v.object({
    //         rows: v.number(),
    //         cols: v.number(),
    //     }),

    //     // 核心障碍物（不可调整的关键地形）
    //     coreObstacles: v.array(v.object({
    //         q: v.number(),
    //         r: v.number(),
    //         type: v.number(),
    //         asset: v.string(),
    //     })),

    //     // 可选障碍物（可随机调整的障碍物）
    //     optionalObstacles: v.array(v.object({
    //         q: v.number(),
    //         r: v.number(),
    //         type: v.number(),
    //         asset: v.string(),
    //     })),

    //     // 障碍物禁区（玩家区域、Boss区域、关键路径）
    //     restrictedZones: v.array(v.object({
    //         type: v.string(),  // "player" | "boss" | "path"
    //         region: v.object({
    //             minQ: v.number(),
    //             maxQ: v.number(),
    //             minR: v.number(),
    //             maxR: v.number(),
    //         }),
    //     })),

    //     configVersion: v.number(),
    // })
    //     .index("by_templateId", ["templateId"])
    //     .index("by_tier", ["tier"]),
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

