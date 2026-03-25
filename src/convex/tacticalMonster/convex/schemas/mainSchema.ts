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

export const mainSchema = {
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
            character_id: v.optional(v.string()),  // 实例ID（召唤单位必填；玩家初始怪物可选，默认可从 monsterId 推导）

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
                energy: v.optional(v.object({
                    current: v.number(),
                    max: v.number(),
                })),
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
        boss: v.object({
            bossId: v.string(),             // Boss数据（统一使用stats）
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
                speed: v.number(),
                shield: v.optional(v.object({
                    current: v.number(),
                    max: v.number()
                })),
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
        scoringConfigVersion: v.optional(v.string()),
        round: v.optional(v.number()),  // ✅ 当前回合编号（用于快速访问，GameModel.currentRound 是运行时构建的 GameRound 对象）
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
        dueTimeAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_ruleId", ["ruleId"])
        .index("by_stageId", ["stageId"])
        .index("by_createdAt", ["createdAt"])
        .index("by_updatedAt", ["ruleId", "updatedAt"]),
    mr_stage_stats: defineTable({
        ruleId: v.string(),
        stageId: v.string(),
        powerLevel: v.number(),//1-5
        attempts: v.number(),
    })
        .index("by_ruleId", ["ruleId"])  // ✅ 添加 by_ruleId 索引
        .index("by_power_attempts", ["powerLevel", "attempts"])
        .index("by_stage", ["stageId"]),
    /** 玩家体力（关卡体力与奖励机制） */
    mr_player_stamina: defineTable({
        uid: v.string(),
        current: v.number(),           // 当前体力
        lastRecoveredAt: v.string(),  // 上次恢复时间（ISO）
        maxStamina: v.optional(v.number()),  // 体力上限，默认 100
    })
        .index("by_uid", ["uid"]),

    mr_player_first_clear: defineTable({
        uid: v.string(),
        ruleId: v.string(),
        stageId: v.string(),
        score: v.number(),
        performance: v.number(),//1-4
        createdAt: v.string(),
    })
        .index("by_uid_ruleId", ["uid", "ruleId"])
        .index("by_uid_ruleId_stageId", ["uid", "ruleId", "stageId"]),
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
        best_score: v.optional(v.number()),
        best_performance: v.optional(v.union(v.literal(4), v.literal(3), v.literal(2), v.literal(1))),
        lastPlayAt: v.optional(v.string()),
        attempts: v.optional(v.number()),
        createdAt: v.string(),
    })
        .index("by_best_score", ["uid", "ruleId", "best_score"])
        .index("by_performance", ["uid", "ruleId", "best_performance"])
        .index("by_lastPlayAt", ["uid", "ruleId", "lastPlayAt"])
        .index("by_stage", ["uid", "ruleId", "stageId"])
        .index("by_uid_ruleId", ["uid", "ruleId"]),

    mr_game_event: defineTable({
        gameId: v.string(),
        name: v.string(),
        type: v.optional(v.number()),
        data: v.optional(v.any()),
        time: v.number(),  // 绝对时间戳（Date.now()）
        stepTime: v.optional(v.number()),  // ✅ 相对时间位置（从游戏开始，毫秒数），用于去重和排序（可选以兼容旧数据）
    }).index("by_game", ["gameId"])
        .index("by_name", ["name"])
        .index("by_game_stepTime", ["gameId", "stepTime"]),  // ✅ 新增索引：用于按 stepTime 排序

    // ✅ 游戏回合表：存储每个 round 的 turns 数据
    mr_stage_simulation_overrides: defineTable({
        ruleId: v.string(),
        suggestedRecommendedPower: v.optional(v.number()),
        suggestedDifficultyMultiplier: v.optional(v.number()),
        expectedWinRate: v.optional(v.number()),
        reasoning: v.optional(v.string()),
        strategyId: v.string(),
        teamPower: v.number(),
        simulationRunAt: v.string(),
        status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    }).index("by_ruleId", ["ruleId"]),

    mr_game_round: defineTable({
        gameId: v.string(),
        no: v.number(),  // 回合编号
        status: v.number(),  // 回合状态：0: 进行中, 1: 已完成, 2: 已结束
        turns: v.array(v.object({  // GameTurn 数组；character_id 统一表示该 turn 对应角色的实例 id（玩家/Boss/小怪）
            uid: v.string(),
            character_id: v.string(),
            skillSelect: v.optional(v.string()),
            status: v.number(),  // Turn 状态：0: OPEN, 1: IN_PROGRESS, 2: COMPLETED
            dueTime: v.optional(v.number()),
            order: v.optional(v.number()),
            actionOrder: v.optional(v.number()),  // 实际出手顺序（完成时写入），用于 roundEnd.lastRound 排序
            stepsUsed: v.optional(v.number()),
        })),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
    })
        .index("by_game_round", ["gameId", "no"]),

};

