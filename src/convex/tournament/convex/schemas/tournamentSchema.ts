import { defineTable } from "convex/server";
import { v } from "convex/values";

// 锦标赛系统相关表
export const tournamentSchema = {
    matchingQueue: defineTable({
        // 基础信息
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(),

        // 玩家信息
        playerInfo: v.object({
            uid: v.string(),
            skill: v.number(),
            segmentName: v.string(),
            eloScore: v.optional(v.number()),
            totalPoints: v.optional(v.number()),
            isSubscribed: v.boolean()
        }),

        // 匹配配置
        matchingConfig: v.object({
            algorithm: v.string(), // "skill_based", "segment_based", "elo_based", "random"
            maxWaitTime: v.number(),
            skillRange: v.optional(v.number()),
            eloRange: v.optional(v.number()),
            segmentRange: v.optional(v.number()),
            fallbackToAI: v.optional(v.boolean())
        }),

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

        // 优先级和权重
        priority: v.number(),
        weight: v.number(),

        // 元数据
        metadata: v.optional(v.any()),

        // 系统字段
        createdAt: v.string(),
        updatedAt: v.string()
    }).index("by_tournament", ["tournamentId"]).index("by_tournament_type", ["tournamentType"])
        .index("by_uid", ["uid"])
        .index("by_status_priority", ["status", "priority"])
        .index("by_joined_at", ["joinedAt"])
        .index("by_expired_at", ["expiredAt"]),
    tournaments: defineTable({
        seasonId: v.id("seasons"),
        gameType: v.string(), // "solitaire", "uno", "ludo", "rummy"
        segmentName: v.optional(v.string()), // "Bronze", "Silver", "Gold", "Platinum"
        status: v.string(), // "open", "completed"
        tournamentType: v.string(), // 引用 tournament_types.typeId
        createdAt: v.string(),
        updatedAt: v.string(),
        endTime: v.string(),
    }).index("by_season_game_segment_status", ["seasonId", "gameType", "segmentName", "status"])
        .index("by_type_status", ["tournamentType", "status"])
        .index("by_type_status_createdAt", ["tournamentType", "status", "createdAt"])
        .index("by_type_status_gameType", ["tournamentType", "status", "gameType"])
        .index("by_type_status_gameType_createdAt", ["tournamentType", "status", "gameType", "createdAt"]),

    // 玩家与锦标赛的关系表
    player_tournaments: defineTable({
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(), // 新增：锦标赛类型，用于优化查询
        gameType: v.string(), // 新增：游戏类型，用于优化查询
        status: v.union(v.literal("active"), v.literal("completed"), v.literal("settled"), v.literal("cancelled")), // 新增：参与状态
        gamePoint: v.optional(v.number()), // 新增：累积的比赛点数，基于每场比赛的排名计算
        matchCount: v.optional(v.number()), // 新增：参与的比赛场数
        score: v.optional(v.number()), // 新增：累积的分数
        rewards: v.optional(v.any()),
        lastMatchAt: v.optional(v.string()), // 新增：最后一场比赛时间
        joinedAt: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament_uid", ["tournamentId", "uid"])
        .index("by_uid_status", ["uid", "status"]) // 新增：优化状态查询
        .index("by_uid_tournamentType", ["uid", "tournamentType"]) // 新增：优化按锦标赛类型查询
        .index("by_uid_tournamentType_createdAt", ["uid", "tournamentType", "createdAt"]) // 新增：优化时间范围查询
        .index("by_tournament_gamePoint", ["tournamentId", "gamePoint"]) // 新增：优化按点数排序查询
        .index("by_tournament_matchCount", ["tournamentId", "matchCount"]) // 新增：优化按比赛场数排序查询
        .index("by_tournament_score", ["tournamentId", "score"]),// 新增：优化按最佳分数排序查询

    // 玩家锦标赛状态变更日志表
    player_tournament_status_logs: defineTable({
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        oldStatus: v.string(),
        newStatus: v.string(),
        reason: v.string(),
        metadata: v.optional(v.any()),
        timestamp: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_tournament", ["tournamentId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_uid_timestamp", ["uid", "timestamp"]),

    // 批量处理任务表
    batch_processing_tasks: defineTable({
        tournamentId: v.id("tournaments"),
        taskType: v.string(),
        status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
        batchSize: v.number(),
        maxConcurrency: v.number(),
        processed: v.optional(v.number()),
        completed: v.optional(v.number()),
        expired: v.optional(v.number()),
        errors: v.optional(v.number()),
        progress: v.optional(v.number()),
        error: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_status", ["status"])
        .index("by_createdAt", ["createdAt"]),

    // 锦标赛结算任务表
    tournament_settlement_tasks: defineTable({
        tournamentId: v.id("tournaments"),
        taskId: v.string(),
        totalPlayers: v.number(),
        status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_status", ["status"])
        .index("by_createdAt", ["createdAt"]),

    tournament_types: defineTable({
        // 基础信息
        typeId: v.string(), // 如 "daily_special"
        name: v.string(), // 如 "每日特别锦标赛"
        description: v.string(),
        timeRange: v.optional(v.string()),
        independent: v.optional(v.boolean()),
        // category: v.string(), // "daily", "weekly", "seasonal", "special", "ranked", "casual", "championship", "tournament"

        // 游戏配置
        gameType: v.string(), // "solitaire", "rummy", "uno", "ludo", "chess", "checkers", "puzzle", "arcade"
        isActive: v.boolean(),
        priority: v.number(),

        // 参赛条件
        entryRequirements: v.optional(v.object({
            minSegment: v.optional(v.string()), // "bronze", "silver", "gold", "platinum", "diamond"
            maxSegment: v.optional(v.string()),
            isSubscribedRequired: v.boolean(),
            minLevel: v.optional(v.number()),
            maxLevel: v.optional(v.number()),
            minPoints: v.optional(v.number()),
            maxPoints: v.optional(v.number()),
            entryFee: v.object({
                coins: v.optional(v.number()),
                tickets: v.optional(v.object({
                    type: v.string(),
                    quantity: v.number()
                })),
                props: v.optional(v.array(v.object({
                    gameType: v.string(),
                    propType: v.string(),
                    quantity: v.number()
                })))
            }),
            specialConditions: v.optional(v.array(v.object({
                type: v.string(),
                value: v.any(),
                description: v.string()
            })))
        })),

        // 比赛规则
        matchRules: v.object({
            matchType: v.string(), // "single_match", "multi_match", "best_of_series", "elimination", "round_robin"
            minPlayers: v.number(),
            maxPlayers: v.number(),
            rankingMethod: v.string(), // "highest_score", "total_score", "average_score", "best_of_attempts", "threshold"
            scoreThreshold: v.optional(v.number()),
            timeLimit: v.optional(v.object({
                perMatch: v.number(),
                perTurn: v.optional(v.number()),
                total: v.optional(v.number())
            })),
            matchPoints: v.optional(v.any()),
        }),

        // 奖励配置
        rewards: v.object({
            baseRewards: v.object({
                coins: v.number(),
                gamePoints: v.number(),
                props: v.array(v.object({
                    gameType: v.string(),
                    propType: v.string(),
                    quantity: v.number(),
                    rarity: v.string() // "common", "rare", "epic", "legendary"
                })),
                tickets: v.array(v.object({
                    gameType: v.string(),
                    tournamentType: v.string(),
                    quantity: v.number()
                }))
            }),
            rankRewards: v.array(v.object({
                rankRange: v.array(v.number()),
                multiplier: v.number(),
                bonusProps: v.optional(v.array(v.object({
                    gameType: v.string(),
                    propType: v.string(),
                    quantity: v.number(),
                    rarity: v.string()
                }))),
                bonusTickets: v.optional(v.array(v.object({
                    gameType: v.string(),
                    tournamentType: v.string(),
                    quantity: v.number()
                })))
            })),
            segmentBonus: v.object({
                bronze: v.number(),
                silver: v.number(),
                gold: v.number(),
                platinum: v.number(),
                diamond: v.number()
            }),
            subscriptionBonus: v.number(),
            participationReward: v.object({
                coins: v.number(),
                gamePoints: v.number()
            }),
            streakBonus: v.optional(v.object({
                minStreak: v.number(),
                bonusMultiplier: v.number()
            }))
        }),

        // 时间配置
        schedule: v.object({
            startTime: v.object({
                type: v.string(), // "fixed", "daily", "weekly", "monthly", "seasonal"
                value: v.string()
            }),
            endTime: v.object({
                type: v.string(), // "fixed", "duration", "until_completion"
                value: v.union(v.string(), v.number())
            }),
            duration: v.number(),
            registrationDeadline: v.optional(v.number()),
            repeat: v.optional(v.object({
                enabled: v.boolean(),
                interval: v.string(), // "daily", "weekly", "monthly"
                daysOfWeek: v.optional(v.array(v.number())),
                dayOfMonth: v.optional(v.number())
            })),
            timezone: v.string()
        }),

        // 限制配置
        limits: v.object({
            maxParticipations: v.number(),
            maxTournaments: v.number(),
            maxAttempts: v.number(),
            subscribed: v.object({
                maxParticipations: v.number(),
                maxTournaments: v.number(),
                maxAttempts: v.number()
            })
        }),

        // 高级配置
        advanced: v.optional(v.object({
            matching: v.object({
                algorithm: v.string(), // "skill_based", "random", "segment_based", "elo_based"
                skillRange: v.optional(v.number()),
                maxWaitTime: v.number(),
                fallbackToAI: v.boolean()
            }),
            settlement: v.object({
                autoSettle: v.boolean(),
                settleDelay: v.number(),
                requireMinimumPlayers: v.boolean(),
                minimumPlayers: v.number()
            }),
            notifications: v.object({
                enabled: v.boolean(),
                types: v.array(v.string()),
                channels: v.array(v.string())
            }),
            monitoring: v.object({
                enabled: v.boolean(),
                metrics: v.array(v.string()),
                alerts: v.array(v.string())
            }),
            custom: v.optional(v.any())
        })),
        // 时间戳
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
    }).index("by_typeId", ["typeId"])
        .index("by_isActive", ["isActive"])
        .index("by_gameType", ["gameType"])
        .index("by_priority", ["priority"]),

    // 比赛基础信息表 - 存储比赛的核心信息
    matches: defineTable({
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(),
        gameType: v.string(),
        status: v.string(), // "pending","tomatching", "matched", "completed", "cancelled"
        maxPlayers: v.number(),
        minPlayers: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_status", ["status"])
        .index("by_game_type", ["gameType"])
        .index("by_tournament_status", ["tournamentId", "status"]),

    // 玩家比赛记录表 - 存储每个玩家在比赛中的具体表现
    player_matches: defineTable({
        matchId: v.id("matches"),
        uid: v.string(),
        score: v.number(),
        rank: v.optional(v.number()),
        completed: v.boolean(),
        propsUsed: v.optional(v.array(v.string())), // 如 ["hint", "undo"]
        gameId: v.string(),
        gameSeed: v.optional(v.string()),
        joinTime: v.string(),
        leaveTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_match_uid", ["matchId", "uid"])
        .index("by_uid_createdAt", ["uid", "createdAt"])
        .index("by_player_match", ["uid", "matchId"])
        .index("by_player_game", ["uid", "gameId"])
        .index("by_match", ["matchId"])
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

    // 游戏点数变化日志表
    game_point_changes: defineTable({
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        matchId: v.id("matches"),
        oldGamePoint: v.number(),
        newGamePoint: v.number(),
        pointsEarned: v.number(),
        matchRank: v.number(),
        totalPlayers: v.number(),
        score: v.number(),
        gameData: v.any(),
        timestamp: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_tournament", ["tournamentId"])
        .index("by_uid_tournament", ["uid", "tournamentId"])
        .index("by_match", ["matchId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_uid_timestamp", ["uid", "timestamp"]),

    seasons: defineTable({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_isActive", ["isActive"]),
}; 