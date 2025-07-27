import { defineTable } from "convex/server";
import { v } from "convex/values";

// 锦标赛系统相关表
export const tournamentSchema = {
    matchingQueue: defineTable({
        // 基础信息
        uid: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        tournamentType: v.optional(v.string()),

        // 玩家信息
        playerInfo: v.object({
            uid: v.string(),
            skill: v.number(),
            segmentName: v.optional(v.string()),
            eloScore: v.optional(v.number()),
            totalPoints: v.optional(v.number()),
            isSubscribed: v.optional(v.boolean())
        }),

        // 匹配配置
        matchingConfig: v.optional(v.object({
            algorithm: v.string(), // "skill_based", "segment_based", "elo_based", "random"
            maxWaitTime: v.number(),
            skillRange: v.optional(v.number()),
            eloRange: v.optional(v.number()),
            segmentRange: v.optional(v.number()),
            fallbackToAI: v.optional(v.boolean())
        })),
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
        priority: v.optional(v.number()),
        weight: v.optional(v.number()),

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
        status: v.number(), // 0:open，1：completed，2：settled,3:cancelled
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
        gameType: v.optional(v.string()), // 新增：游戏类型，用于优化查询
        status: v.optional(v.number()), // 0:open，1：completed，2：collected,3:cancelled
        gamePoint: v.optional(v.number()), // 新增：累积的比赛点数，基于每场比赛的排名计算
        matchCount: v.optional(v.number()), // 新增：参与的比赛场数
        score: v.optional(v.number()), // 新增：累积的分数
        rewards: v.optional(v.any()),
        completed: v.optional(v.boolean()),
        lastMatchAt: v.optional(v.string()), // 新增：最后一场比赛时间
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_tournament_uid", ["tournamentId", "uid"])
        .index("by_uid_gameType_status", ["uid", "gameType", "status", "updatedAt"]) // 新增：优化状态查询
        .index("by_tournament_score", ["tournamentId", "score"])
        .index("by_tournament_point", ["tournamentId", "gamePoint"]),



    tournament_types: defineTable({
        // 基础信息
        typeId: v.string(), // 如 "daily_special"
        name: v.string(), // 如 "每日特别锦标赛"
        description: v.string(),
        timeRange: v.optional(v.string()),
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
            maxAttempts: v.optional(v.number()),
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
        schedule: v.optional(v.object({
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
        })),

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
        tournamentId: v.optional(v.string()),
        tournamentType: v.string(),
        gameType: v.string(),
        status: v.number(), // 0:started,1:tomatching,2:matched,3:completed,4:settled,5:cancelled
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
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(),
        gameType: v.string(),
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
        .index("by_tournamentType_uid_createdAt", ["tournamentType", "uid", "createdAt"])
        .index("by_uid_createdAt", ["uid", "createdAt"])
        .index("by_player_match", ["uid", "matchId"])
        .index("by_player_game", ["uid", "gameId"])
        .index("by_match", ["matchId"])
        .index("by_uid_completed", ["uid", "completed"])
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
}; 