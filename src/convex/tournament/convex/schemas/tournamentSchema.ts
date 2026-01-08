import { defineTable } from "convex/server";
import { v } from "convex/values";

// 宝箱类型权重配置 Schema
const ChestTypeWeightsSchema = v.object({
    silver: v.optional(v.number()),
    gold: v.optional(v.number()),
    purple: v.optional(v.number()),
    orange: v.optional(v.number()),
});

// 锦标赛系统相关表
export const tournamentSchema = {
    matchingQueue: defineTable({
        // 基础信息
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        tournamentType: v.optional(v.string()),

        // 匹配状态
        status: v.union(
            v.literal("waiting"),
            v.literal("matched"),
            v.literal("expired"),
            v.literal("cancelled")
        ),

        // 时间信息
        joinedAt: v.string(),
        matchedAt: v.optional(v.string()),
        expiredAt: v.optional(v.string()),

        // 元数据
        metadata: v.optional(v.any()),

        // 系统字段
        createdAt: v.string(),
        updatedAt: v.string()
    }).index("by_tournament", ["tournamentId"]).index("by_tournament_type", ["tournamentType"])
        .index("by_uid", ["uid"])
        .index("by_joined_at", ["joinedAt"])
        .index("by_expired_at", ["expiredAt"]),

    tournaments: defineTable({
        gameType: v.string(), // "solitaire", "uno", "ludo", "rummy"
        status: v.number(), // 0:open，1：completed，2：settled,3:cancelled
        type: v.string(), // 引用 tournament_types.typeId
        createdAt: v.string(),
        updatedAt: v.string(),
        endTime: v.optional(v.string()),
    }).index("by_type_status", ["type", "status"])
        .index("by_type_status_createdAt", ["type", "status", "createdAt"])
        .index("by_type_status_gameType", ["type", "status", "gameType"])
        .index("by_type_status_gameType_createdAt", ["type", "status", "gameType", "createdAt"]),

    // 玩家与锦标赛的关系表
    player_tournaments: defineTable({
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(), // 新增：锦标赛类型，用于优化查询
        gameType: v.optional(v.string()), // 新增：游戏类型，用于优化查询
        status: v.optional(v.number()), // 0:open，1：completed，2：collected,3:cancelled
        rank: v.optional(v.number()),
        matchCount: v.optional(v.number()), // 新增：参与的比赛场数
        score: v.optional(v.number()), // 新增：累积的分数
        rewards: v.optional(v.any()),
        lastMatchAt: v.optional(v.string()), // 新增：最后一场比赛时间
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_tournament_uid", ["tournamentId", "uid"])
        .index("by_uid_gameType_status", ["uid", "gameType", "status", "updatedAt"]) // 新增：优化状态查询
        .index("by_tournament_score", ["tournamentId", "score"]),
    tournament_types: defineTable({
        // 基础信息
        typeId: v.string(), // 如 "daily_special"
        name: v.string(), // 如 "每日特别锦标赛"
        description: v.string(),
        timeRange: v.optional(v.string()),

        // 游戏配置
        gameType: v.optional(v.string()), // "solitaire", "rummy", "uno", "ludo", "chess", "checkers", "puzzle", "arcade", "tacticalMonster"
        gameRule: v.optional(v.object({
            description: v.string(),
            mode: v.union(
                v.literal("challenge"),
                v.literal("pvp"),
                v.literal("story")
            ),
            ruleId: v.string(),  // 必填：关联到 TacticalMonster 模块的 GameRuleConfig
        })),
        isActive: v.boolean(),

        // 参赛条件
        entryRequirements: v.optional(v.object({
            isSubscribedRequired: v.boolean(),
            // 玩家等级要求（TacticalMonster 游戏使用）
            playerLevel: v.optional(v.number()),
            // 注意：Power 范围（minTeamPower/maxTeamPower）在 GameRuleConfig.unlockConditions 中配置
            // 通过 gameRule.ruleId 关联到 TacticalMonster 模块的 GameRuleConfig 获取 Power 范围
            entryFee: v.object({
                coins: v.optional(v.number()),
                gems: v.optional(v.number()),
                energy: v.optional(v.number()),  // TacticalMonster 特定：能量消耗
            }),
        })),

        // 比赛规则
        matchRules: v.object({
            // 玩家数量
            minPlayers: v.number(),
            maxPlayers: v.number(),

            // 排名规则
            matchPointsType: v.optional(v.union(
                v.literal("by_score"),
                v.literal("by_rank"),
                v.literal("by_performance")
            )),
            rankPoints: v.optional(v.any()), // { [k: string]: number }
            performancePoints: v.optional(v.any()), // { [k: string]: number }
        }),

        rewards: v.object({
            rewardType: v.optional(v.union(
                v.literal("by_points"),
                v.literal("by_rank")
            )),  // 可选：向后兼容

            // 基础奖励 - 参与即可获得
            baseRewards: v.object({
                coins: v.optional(v.number()),        // TacticalMonster 特定奖励
                energy: v.optional(v.number()),
                chestDropRate: v.optional(v.number()),  // 可选：向后兼容，如果没有配置则使用默认值
            }),

            // 排名奖励 - 仅用于多人比赛（minPlayers > 1 或 maxPlayers > 1）
            rankRewards: v.optional(v.array(v.object({
                rankRange: v.array(v.number()), // [minRank, maxRank]
                multiplier: v.number(),
                // TacticalMonster 特定奖励
                coins: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                energy: v.optional(v.number()),
                chestDropRate: v.optional(v.number()),
                chestTypeWeights: v.optional(ChestTypeWeightsSchema),
            }))),

            // 订阅加成 - TacticalMonster 特定
            subscriptionBonus: v.optional(v.object({
                coins: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                energy: v.optional(v.number()),
            })),

            // 表现奖励 - 仅用于单人关卡（minPlayers === 1 && maxPlayers === 1）
            // 基于分数阈值计算奖励，替代排名奖励
            performanceRewards: v.optional(v.object({
                // 基础表现奖励（用于计算各等级奖励）
                baseReward: v.object({
                    coins: v.optional(v.number()),
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    }))),
                    energy: v.optional(v.number()),
                }),
                // levelRewards 使用 v.any() 因为 Record 类型
                // 每个表现等级可以包含：coins, monsterShards, energy, chestDropRate, chestTypeWeights
                levelRewards: v.optional(v.any()),
            })),
            // 首次通关奖励 - 仅用于单人关卡（minPlayers === 1 && maxPlayers === 1）
            firstClearRewards: v.optional(v.object({
                coins: v.optional(v.number()),
                energy: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                monsters: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    level: v.optional(v.number()),
                    stars: v.optional(v.number()),
                }))),
                chestDropRate: v.optional(v.number()),
                chestTypeWeights: v.optional(ChestTypeWeightsSchema),
            })),
        }),

        // 限制配置
        limits: v.optional(v.object({
            // 最大参与次数
            intervalHours: v.optional(v.number()),
            maxAttempts: v.optional(v.number()),  // 最大尝试次数
            // 订阅用户限制
            subscribed: v.optional(v.object({
                maxAttempts: v.optional(v.number()),
            })),
            // 尝试成本
            attemptCost: v.optional(v.object({
                coins: v.optional(v.number()),
                energy: v.optional(v.number()),
            })),
            // 是否允许无限尝试
            unlimitedAttempts: v.optional(v.boolean()),
        })),

        // 时间戳
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
    }).index("by_typeId", ["typeId"])
        .index("by_isActive", ["isActive"])
        .index("by_gameType", ["gameType"])
        .index("by_gameType_isActive", ["gameType", "isActive"]),

    // 比赛基础信息表 - 存储比赛的核心信息
    matches: defineTable({
        tournamentId: v.optional(v.string()),
        tournamentType: v.string(),
        gameType: v.string(),
        completed: v.boolean(),
        maxPlayers: v.number(),
        minPlayers: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_game_type", ["gameType"])
        .index("by_tournament_completed", ["tournamentId", "completed"]),

    // 玩家比赛记录表 - 存储每个玩家在比赛中的具体表现
    player_matches: defineTable({
        matchId: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        tournamentType: v.optional(v.string()),
        gameType: v.optional(v.string()),
        uid: v.string(),
        score: v.number(),
        rank: v.number(),
        status: v.number(),
        gameId: v.optional(v.string()),
        teamPower: v.optional(v.number()),
        stageId: v.optional(v.string()),
        seed: v.optional(v.string()),
        // 比赛结果（主要用于单人关卡挑战）
        // perfect: 完美通关（无伤、满分等）
        // win: 通关成功
        // lose: 失败
        // draw: 平局（超时等情况）
        performance: v.optional(v.union(
            v.literal("perfect"),
            v.literal("win"),
            v.literal("lose"),
            v.literal("draw")
        )),
        joinTime: v.optional(v.string()),
        leaveTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.optional(v.string()),
    }).index("by_uid_status", ["uid", "status"])
        .index("by_match", ["matchId"])
        .index("by_match_uid", ["matchId", "uid"])
        .index("by_uid", ["uid"])
        .index("by_game", ["gameId"])
        .index("by_tournamentType_uid_status", ["tournamentType", "uid", "status"])
        .index("by_tournamentType_uid_createdAt", ["tournamentType", "uid", "createdAt"])
        .index("by_createdAt", ["createdAt"])
        .index("by_score", ["score"])                    // 按得分查询
        .index("by_rank", ["rank"])                      // 按排名查询
        .index("by_uid_created", ["uid", "createdAt"])  // 复合索引，用于玩家历史查询
        .index("by_team_stage", ["teamPower", "stageId"])// 按游戏类型和玩家查询        
        .index("by_uid_gameType", ["uid", "gameType"])   // 复合索引，用于按游戏类型查询玩家历史
        .index("by_uid_gameType_created", ["uid", "gameType", "createdAt"]) // 复合索引，用于按游戏类型查询玩家历史（排序）
        .index("by_uid_performance", ["uid", "performance"]) // 复合索引，用于查询玩家的 perfect/win/lose/draw 次数
        .index("by_tournamentType_performance", ["tournamentType", "performance"]), // 复合索引，用于统计特定锦标赛类型的成绩分布

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

    seasons: defineTable({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_isActive", ["isActive"]),

    // 玩家尝试次数统计表（增量缓存）
    // 用于高效统计玩家在特定时间范围内参与特定类型锦标赛的次数
    player_attempt_stats: defineTable({
        uid: v.string(),
        tournamentType: v.string(),
        timeRange: v.string(), // "daily" | "weekly" | "monthly" | "permanent"
        periodStart: v.string(), // 时间段开始时间（ISO字符串，用于 daily/weekly/monthly）
        attemptCount: v.number(), // 尝试次数
        lastUpdated: v.string(), // 最后更新时间
        createdAt: v.string(),
    }).index("by_uid_tournamentType", ["uid", "tournamentType"])
        .index("by_uid_tournamentType_period", ["uid", "tournamentType", "timeRange", "periodStart"])
        .index("by_tournamentType_period", ["tournamentType", "timeRange", "periodStart"]),
}; 