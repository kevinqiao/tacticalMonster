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
                coins: v.optional(v.number()),
                props: v.optional(v.array(v.any())),
                tickets: v.optional(v.array(v.any())),
                rankPoints: v.optional(v.number()),      // 段位积分 - 用于段位升降级
                seasonPoints: v.optional(v.number()),    // 赛季积分 - 用于Battle Pass升级
                prestigePoints: v.optional(v.number()),  // 声望积分 - 用于特殊成就和奖励
                achievementPoints: v.optional(v.number()), // 成就积分 - 用于成就系统
                tournamentPoints: v.optional(v.number())   // 锦标赛积分 - 用于锦标赛排名
            }),
            rankRewards: v.array(v.object({
                coins: v.optional(v.number()),
                props: v.optional(v.array(v.any())),
                tickets: v.optional(v.array(v.any())),
                rankRange: v.array(v.number()),
                multiplier: v.number(),
                pointRewards: v.optional(v.object({
                    rankPoints: v.optional(v.number()),
                    seasonPoints: v.optional(v.number()),
                    prestigePoints: v.optional(v.number()),
                    achievementPoints: v.optional(v.number()),
                    tournamentPoints: v.optional(v.number())
                })),
                bonusProps: v.optional(v.array(v.object({
                    gameType: v.string(),
                    propId: v.string(),
                    quantity: v.number()
                }))),
                bonusTickets: v.optional(v.array(v.object({
                    gameType: v.string(),
                    tournamentType: v.string(),
                    quantity: v.number()
                })))
            })),
            segmentBonus: v.optional(v.object({
                bronze: v.object({
                    rankPoints: v.optional(v.number()),
                    seasonPoints: v.optional(v.number()),
                    prestigePoints: v.optional(v.number()),
                    achievementPoints: v.optional(v.number()),
                    tournamentPoints: v.optional(v.number())
                }),
                silver: v.object({
                    rankPoints: v.optional(v.number()),
                    seasonPoints: v.optional(v.number()),
                    prestigePoints: v.optional(v.number()),
                    achievementPoints: v.optional(v.number()),
                    tournamentPoints: v.optional(v.number())
                }),
                gold: v.object({
                    rankPoints: v.optional(v.number()),
                    seasonPoints: v.optional(v.number()),
                    prestigePoints: v.optional(v.number()),
                    achievementPoints: v.optional(v.number()),
                    tournamentPoints: v.optional(v.number())
                }),
                platinum: v.object({
                    rankPoints: v.optional(v.number()),
                    seasonPoints: v.optional(v.number()),
                    prestigePoints: v.optional(v.number()),
                    achievementPoints: v.optional(v.number()),
                    tournamentPoints: v.optional(v.number())
                }),
                diamond: v.object({
                    rankPoints: v.optional(v.number()),
                    seasonPoints: v.optional(v.number()),
                    prestigePoints: v.optional(v.number()),
                    achievementPoints: v.optional(v.number()),
                    tournamentPoints: v.optional(v.number())
                })
            })),
            subscriptionBonus: v.optional(v.object({
                coins: v.optional(v.number()),
                props: v.optional(v.array(v.any())),
                tickets: v.optional(v.array(v.any())),
                rankPoints: v.optional(v.number()),
                seasonPoints: v.optional(v.number()),
                prestigePoints: v.optional(v.number()),
                achievementPoints: v.optional(v.number()),
                tournamentPoints: v.optional(v.number())
            })),
            participationReward: v.optional(v.object({
                coins: v.optional(v.number()),
                rankPoints: v.optional(v.number()),
                seasonPoints: v.optional(v.number()),
                prestigePoints: v.optional(v.number()),
                achievementPoints: v.optional(v.number()),
                tournamentPoints: v.optional(v.number())
            })),
            streakBonus: v.optional(v.object({
                minStreak: v.number(),
                bonusMultiplier: v.number()
            }))
        }),

        // 时间配置
        schedule: v.optional(v.object({
            open: v.object({
                day: v.optional(v.string()),
                time: v.string()
            }),
            start: v.object({
                day: v.optional(v.string()),
                time: v.string()
            }),
            end: v.object({
                day: v.optional(v.string()),
                time: v.string()
            }),
            duration: v.optional(v.number()),
            timeZone: v.optional(v.string())
        })),

        // 限制配置
        limits: v.optional(v.object({
            maxParticipations: v.optional(v.number()),
            maxTournaments: v.optional(v.number()),
            maxAttempts: v.optional(v.number()),
            subscribed: v.optional(v.object({
                maxParticipations: v.number(),
                maxTournaments: v.optional(v.number()),
                maxAttempts: v.optional(v.number())
            }))
        })),

        // 积分规则配置
        pointRules: v.optional(v.object({
            // 积分开关
            enableRankPoints: v.boolean(),
            enableSeasonPoints: v.boolean(),
            enablePrestigePoints: v.boolean(),
            enableAchievementPoints: v.boolean(),
            enableTournamentPoints: v.boolean(),

            // 全局积分倍数
            pointMultiplier: v.number(),

            // 段位相关规则
            segmentBasedScoring: v.boolean(),
            segmentBonusMultiplier: v.number(),

            // 排名积分配置
            rankPointConfigs: v.array(v.object({
                rank: v.number(),
                rankPoints: v.object({
                    basePoints: v.number(),
                    bonusMultiplier: v.number(),
                    maxPoints: v.number(),
                    minPoints: v.number()
                }),
                seasonPoints: v.object({
                    basePoints: v.number(),
                    bonusMultiplier: v.number(),
                    maxPoints: v.number(),
                    minPoints: v.number()
                }),
                prestigePoints: v.object({
                    basePoints: v.number(),
                    bonusMultiplier: v.number(),
                    maxPoints: v.number(),
                    minPoints: v.number()
                }),
                achievementPoints: v.object({
                    basePoints: v.number(),
                    bonusMultiplier: v.number(),
                    maxPoints: v.number(),
                    minPoints: v.number()
                }),
                tournamentPoints: v.object({
                    basePoints: v.number(),
                    bonusMultiplier: v.number(),
                    maxPoints: v.number(),
                    minPoints: v.number()
                })
            })),

            // 段位积分规则
            segmentPointRules: v.object({
                bronze: v.object({
                    baseMultiplier: v.number(),
                    bonusMultiplier: v.number(),
                    rankPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    }),
                    seasonPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    })
                }),
                silver: v.object({
                    baseMultiplier: v.number(),
                    bonusMultiplier: v.number(),
                    rankPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    }),
                    seasonPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    })
                }),
                gold: v.object({
                    baseMultiplier: v.number(),
                    bonusMultiplier: v.number(),
                    rankPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    }),
                    seasonPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    })
                }),
                platinum: v.object({
                    baseMultiplier: v.number(),
                    bonusMultiplier: v.number(),
                    rankPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    }),
                    seasonPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    })
                }),
                diamond: v.object({
                    baseMultiplier: v.number(),
                    bonusMultiplier: v.number(),
                    rankPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    }),
                    seasonPointsConfig: v.object({
                        basePoints: v.number(),
                        bonusMultiplier: v.number(),
                        maxPoints: v.number()
                    })
                })
            })
        })),

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
        segmentName: v.optional(v.string()),
        score: v.number(),
        rank: v.number(),
        status: v.number(),
        gameId: v.optional(v.string()),
        seed: v.optional(v.string()),
        joinTime: v.optional(v.string()),
        leaveTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.optional(v.string()),
    }).index("by_uid_status", ["uid", "status"])
        .index("by_match", ["matchId"])
        .index("by_match_uid", ["matchId", "uid"])
        .index("by_seed", ["seed"])
        .index("by_uid", ["uid"])
        .index("by_gameId", ["gameId"])
        .index("by_tournamentType_uid_status", ["tournamentType", "uid", "status"])
        .index("by_tournamentType_uid_createdAt", ["tournamentType", "uid", "createdAt"])
        .index("by_createdAt", ["createdAt"])
        .index("by_seed_created", ["seed", "createdAt"]) // 复合索引，用于增量查询
        .index("by_score", ["score"])                    // 按得分查询
        .index("by_rank", ["rank"])                      // 按排名查询
        .index("by_uid_created", ["uid", "createdAt"])  // 复合索引，用于玩家历史查询
        .index("by_segment", ["segmentName"])            // 按段位查询
        .index("by_gameType", ["gameType"])              // 按游戏类型查询
        .index("by_uid_gameType", ["uid", "gameType"])   // 复合索引，用于按游戏类型查询玩家历史
        .index("by_uid_gameType_created", ["uid", "gameType", "createdAt"]), // 复合索引，用于按游戏类型查询玩家历史（排序）

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