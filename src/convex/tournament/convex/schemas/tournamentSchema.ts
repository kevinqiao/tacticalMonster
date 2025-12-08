import { defineTable } from "convex/server";
import { v } from "convex/values";

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
            // TacticalMonster 特定：Power 范围（基于队伍 Power）
            minPower: v.optional(v.number()),
            maxPower: v.optional(v.number()),
            // TacticalMonster 特定：Tier 要求
            tier: v.optional(v.union(
                v.literal("bronze"),
                v.literal("silver"),
                v.literal("gold"),
                v.literal("platinum")
            )),
            entryFee: v.object({
                coins: v.optional(v.number()),
                energy: v.optional(v.number()),  // TacticalMonster 特定：能量消耗
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
                energy: v.optional(v.number()),  // TacticalMonster 特定：能量奖励
                rankPoints: v.optional(v.number()),      // 段位积分 - 用于段位升降级
                seasonPoints: v.optional(v.number()),    // 赛季积分 - 用于Battle Pass升级
                prestigePoints: v.optional(v.number()),  // 声望积分 - 用于特殊成就和奖励
                achievementPoints: v.optional(v.number()), // 成就积分 - 用于成就系统
                tournamentPoints: v.optional(v.number())   // 锦标赛积分 - 用于锦标赛排名
            }),
            rankRewards: v.array(v.object({
                coins: v.optional(v.number()),
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
            // Tier 加成 - TacticalMonster 特定（基于 Tier 的奖励加成）
            tierBonus: v.optional(v.object({
                bronze: v.optional(v.object({
                    coins: v.optional(v.number()),
                    energy: v.optional(v.number()),
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    })))
                })),
                silver: v.optional(v.object({
                    coins: v.optional(v.number()),
                    energy: v.optional(v.number()),
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    })))
                })),
                gold: v.optional(v.object({
                    coins: v.optional(v.number()),
                    energy: v.optional(v.number()),
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    })))
                })),
                platinum: v.optional(v.object({
                    coins: v.optional(v.number()),
                    energy: v.optional(v.number()),
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    })))
                }))
            })),
            subscriptionBonus: v.optional(v.object({
                coins: v.optional(v.number()),
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
            // 表现奖励 - 仅用于单人关卡（soloChallenge，minPlayers === 1 && maxPlayers === 1）
            // 基于分数阈值计算奖励，替代排名奖励
            performanceRewards: v.optional(v.object({
                // 基础表现奖励（用于计算各等级奖励）
                baseReward: v.object({
                    coins: v.optional(v.number()),
                    energy: v.optional(v.number()),  // TacticalMonster 特定：能量奖励
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    })))
                }),
                // 分数阈值配置
                scoreThresholds: v.object({
                    excellent: v.number(),  // 优秀阈值（≥此分数获得100%奖励）
                    good: v.number(),      // 良好阈值（≥此分数获得80%奖励）
                    average: v.number()   // 一般阈值（≥此分数获得50%奖励）
                })
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

        // 单人挑战配置（当 matchRules.minPlayers === 1 && maxPlayers === 1 时使用）
        soloChallenge: v.optional(v.object({
            // 关卡类型和进度
            levelType: v.union(
                v.literal("story"),
                v.literal("challenge"),
                v.literal("boss_rush"),
                v.literal("endless")
            ),
            chapter: v.optional(v.number()),
            levelNumber: v.optional(v.number()),
            worldId: v.optional(v.string()),
            sortOrder: v.optional(v.number()),

            // 连续关卡配置
            levelChain: v.optional(v.object({
                nextLevels: v.optional(v.array(v.string())),
                previousLevels: v.optional(v.array(v.string())),
                levelGroup: v.optional(v.string()),
                unlockMode: v.optional(v.union(
                    v.literal("sequential"),
                    v.literal("parallel"),
                    v.literal("any")
                )),
                autoUnlockNext: v.optional(v.boolean()),
                chainId: v.optional(v.string()),
                chainOrder: v.optional(v.number())
            })),

            // 解锁条件
            unlockConditions: v.optional(v.object({
                requiredTypeIds: v.optional(v.array(v.string())),
                minPlayerLevel: v.optional(v.number()),
                customConditions: v.optional(v.array(v.object({
                    type: v.string(),
                    value: v.any()
                })))
            })),

            // 关卡内容配置
            levelContent: v.optional(v.object({
                bossConfig: v.optional(v.object({
                    bossId: v.optional(v.string()),
                    bossPool: v.optional(v.array(v.string())),
                    bossLevel: v.optional(v.number()),
                    bossDifficulty: v.optional(v.union(
                        v.literal("easy"),
                        v.literal("medium"),
                        v.literal("hard"),
                        v.literal("expert")
                    ))
                })),
                levelConfigId: v.optional(v.string()),
                mapConfig: v.optional(v.object({
                    mapSize: v.object({
                        rows: v.number(),
                        cols: v.number()
                    }),
                    generationType: v.union(
                        v.literal("template"),
                        v.literal("procedural"),
                        v.literal("random")
                    ),
                    templateId: v.optional(v.string())
                })),
                difficultyAdjustment: v.optional(v.object({
                    powerBasedScaling: v.optional(v.boolean()),
                    scalingFactor: v.optional(v.number()),
                    adaptiveDifficulty: v.optional(v.boolean()),
                    difficultyMultiplier: v.optional(v.number()),
                    minMultiplier: v.optional(v.number()),
                    maxMultiplier: v.optional(v.number())
                }))
            })),

            // 首次通关奖励
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
                    stars: v.optional(v.number())
                }))),
                unlocks: v.optional(v.array(v.object({
                    typeId: v.string()
                })))
            })),

            // 星级评价系统
            starRating: v.optional(v.object({
                criteria: v.array(v.object({
                    stars: v.number(),
                    condition: v.object({
                        type: v.union(
                            v.literal("score"),
                            v.literal("time"),
                            v.literal("damage_taken"),
                            v.literal("turns"),
                            v.literal("combo")
                        ),
                        operator: v.union(
                            v.literal(">="),
                            v.literal("<="),
                            v.literal("==")
                        ),
                        value: v.number()
                    })
                })),
                starRewards: v.optional(v.any())
            })),

            // 重试配置
            retryConfig: v.optional(v.object({
                maxAttempts: v.optional(v.number()),
                retryCost: v.optional(v.object({
                    coins: v.optional(v.number()),
                    energy: v.optional(v.number())
                })),
                unlimitedRetries: v.optional(v.boolean())
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
        opponentQuantity: v.optional(v.number()),
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
        .index("by_game", ["gameId"])
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