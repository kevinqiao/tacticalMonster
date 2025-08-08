import { defineTable } from "convex/server";
import { v } from "convex/values";

// Battle Pass系统相关表
export const battlePassSchema = {
    // 玩家Battle Pass表
    player_battle_pass: defineTable({
        uid: v.string(),
        seasonId: v.string(),
        currentLevel: v.number(),
        currentSeasonPoints: v.number(), // 当前赛季积分
        totalSeasonPoints: v.number(), // 总赛季积分
        isPremium: v.boolean(),
        purchasedAt: v.optional(v.string()),
        lastUpdated: v.string(),
        progress: v.object({
            tournamentSeasonPoints: v.number(),
            quickMatchSeasonPoints: v.number(),
            propMatchSeasonPoints: v.number(),
            taskSeasonPoints: v.number(),
            socialSeasonPoints: v.number(),
            achievementSeasonPoints: v.number(),
            segmentUpgradeSeasonPoints: v.number(),
            dailySeasonPoints: v.any(), // { [date: string]: number }
            weeklySeasonPoints: v.any(), // { [week: string]: number }
            monthlySeasonPoints: v.any(), // { [month: string]: number }
        }),
        claimedLevels: v.array(v.number()), // 已领取的等级
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_season", ["uid", "seasonId"])
        .index("by_season", ["seasonId"])
        .index("by_season_totalSeasonPoints", ["seasonId", "totalSeasonPoints"])
        .index("by_season_currentLevel", ["seasonId", "currentLevel"])
        .index("by_is_premium", ["isPremium"]),

    // 赛季积分日志表
    battle_pass_season_points_logs: defineTable({
        uid: v.string(),
        seasonPointsAmount: v.number(),
        source: v.string(), // "tournament", "quick_match", "task", "social", "achievement", "segment_upgrade"
        currentLevel: v.number(),
        totalSeasonPoints: v.number(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_source", ["source"])
        .index("by_created_at", ["createdAt"])
        .index("by_uid_created_at", ["uid", "createdAt"]),

    // Battle Pass购买日志表
    battle_pass_purchase_logs: defineTable({
        uid: v.string(),
        seasonId: v.string(),
        price: v.number(),
        purchasedAt: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_season", ["seasonId"])
        .index("by_purchased_at", ["purchasedAt"])
        .index("by_uid_season", ["uid", "seasonId"]),

    // Battle Pass奖励领取日志表
    battle_pass_reward_claims: defineTable({
        uid: v.string(),
        seasonId: v.string(),
        level: v.number(),
        rewards: v.object({
            coins: v.optional(v.number()),
            tickets: v.optional(v.array(v.object({
                type: v.string(),
                quantity: v.number()
            }))),
            props: v.optional(v.array(v.object({
                gameType: v.string(),
                propType: v.string(),
                quantity: v.number(),
                rarity: v.string()
            }))),
            seasonPoints: v.optional(v.number()),
            prestige: v.optional(v.number()),
            rankPoints: v.optional(v.number()),
            exclusiveItems: v.optional(v.array(v.object({
                itemId: v.string(),
                itemType: v.string(),
                name: v.string(),
                description: v.string(),
                rarity: v.string(),
                previewUrl: v.optional(v.string())
            })))
        }),
        claimedAt: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_season", ["seasonId"])
        .index("by_level", ["level"])
        .index("by_claimed_at", ["claimedAt"])
        .index("by_uid_season_level", ["uid", "seasonId", "level"]),

    // Battle Pass配置表
    battle_pass_configs: defineTable({
        seasonId: v.string(),
        seasonName: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        seasonPointsPerLevel: v.number(),
        maxLevel: v.number(),
        price: v.number(),
        description: v.string(),
        theme: v.string(),
        freeTrack: v.object({
            trackType: v.string(),
            levels: v.array(v.object({
                level: v.number(),
                seasonPointsRequired: v.number(),
                rewards: v.object({
                    coins: v.optional(v.number()),
                    tickets: v.optional(v.array(v.object({
                        type: v.string(),
                        quantity: v.number()
                    }))),
                    props: v.optional(v.array(v.object({
                        gameType: v.string(),
                        propType: v.string(),
                        quantity: v.number(),
                        rarity: v.string()
                    }))),
                    seasonPoints: v.optional(v.number()),
                    prestige: v.optional(v.number()),
                    rankPoints: v.optional(v.number()),
                    exclusiveItems: v.optional(v.array(v.object({
                        itemId: v.string(),
                        itemType: v.string(),
                        name: v.string(),
                        description: v.string(),
                        rarity: v.string(),
                        previewUrl: v.optional(v.string())
                    })))
                }),
                isUnlocked: v.boolean(),
                isClaimed: v.boolean(),
                progress: v.number()
            })),
            totalRewards: v.object({
                coins: v.optional(v.number()),
                tickets: v.optional(v.array(v.object({
                    type: v.string(),
                    quantity: v.number()
                }))),
                props: v.optional(v.array(v.object({
                    gameType: v.string(),
                    propType: v.string(),
                    quantity: v.number(),
                    rarity: v.string()
                }))),
                seasonPoints: v.optional(v.number()),
                prestige: v.optional(v.number()),
                rankPoints: v.optional(v.number()),
                exclusiveItems: v.optional(v.array(v.object({
                    itemId: v.string(),
                    itemType: v.string(),
                    name: v.string(),
                    description: v.string(),
                    rarity: v.string(),
                    previewUrl: v.optional(v.string())
                })))
            }),
            description: v.string()
        }),
        premiumTrack: v.object({
            trackType: v.string(),
            levels: v.array(v.object({
                level: v.number(),
                seasonPointsRequired: v.number(),
                rewards: v.object({
                    coins: v.optional(v.number()),
                    tickets: v.optional(v.array(v.object({
                        type: v.string(),
                        quantity: v.number()
                    }))),
                    props: v.optional(v.array(v.object({
                        gameType: v.string(),
                        propType: v.string(),
                        quantity: v.number(),
                        rarity: v.string()
                    }))),
                    seasonPoints: v.optional(v.number()),
                    prestige: v.optional(v.number()),
                    rankPoints: v.optional(v.number()),
                    exclusiveItems: v.optional(v.array(v.object({
                        itemId: v.string(),
                        itemType: v.string(),
                        name: v.string(),
                        description: v.string(),
                        rarity: v.string(),
                        previewUrl: v.optional(v.string())
                    })))
                }),
                isUnlocked: v.boolean(),
                isClaimed: v.boolean(),
                progress: v.number()
            })),
            totalRewards: v.object({
                coins: v.optional(v.number()),
                tickets: v.optional(v.array(v.object({
                    type: v.string(),
                    quantity: v.number()
                }))),
                props: v.optional(v.array(v.object({
                    gameType: v.string(),
                    propType: v.string(),
                    quantity: v.number(),
                    rarity: v.string()
                }))),
                seasonPoints: v.optional(v.number()),
                prestige: v.optional(v.number()),
                rankPoints: v.optional(v.number()),
                exclusiveItems: v.optional(v.array(v.object({
                    itemId: v.string(),
                    itemType: v.string(),
                    name: v.string(),
                    description: v.string(),
                    rarity: v.string(),
                    previewUrl: v.optional(v.string())
                })))
            }),
            description: v.string()
        }),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_season_id", ["seasonId"])
        .index("by_is_active", ["isActive"])
        .index("by_start_date", ["startDate"])
        .index("by_end_date", ["endDate"]),

    // Battle Pass统计表
    battle_pass_stats: defineTable({
        seasonId: v.string(),
        totalPlayers: v.number(),
        averageLevel: v.number(),
        averageSeasonPoints: v.number(),
        premiumPlayers: v.number(),
        maxLevel: v.number(),
        totalSeasonPoints: v.number(),
        levelDistribution: v.any(), // { [level: number]: number }
        sourceDistribution: v.object({
            tournament: v.number(),
            quickMatch: v.number(),
            propMatch: v.number(),
            task: v.number(),
            social: v.number(),
            achievement: v.number(),
            segmentUpgrade: v.number()
        }),
        completionRate: v.number(),
        premiumConversionRate: v.number(),
        date: v.string(), // 统计日期
        createdAt: v.string(),
    }).index("by_season", ["seasonId"])
        .index("by_date", ["date"])
        .index("by_season_date", ["seasonId", "date"]),

    // Battle Pass专属物品表
    battle_pass_exclusive_items: defineTable({
        itemId: v.string(),
        itemType: v.string(), // "avatar", "frame", "emote", "title", "background", "effect"
        name: v.string(),
        description: v.string(),
        rarity: v.string(), // "common", "rare", "epic", "legendary"
        previewUrl: v.optional(v.string()),
        seasonId: v.string(),
        trackType: v.string(), // "free", "premium"
        level: v.number(),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_item_id", ["itemId"])
        .index("by_season", ["seasonId"])
        .index("by_track_type", ["trackType"])
        .index("by_level", ["level"])
        .index("by_is_active", ["isActive"])
        .index("by_rarity", ["rarity"]),

    // Battle Pass进度快照表（用于历史记录）
    battle_pass_snapshots: defineTable({
        uid: v.string(),
        seasonId: v.string(),
        currentLevel: v.number(),
        currentSeasonPoints: v.number(),
        totalSeasonPoints: v.number(),
        isPremium: v.boolean(),
        claimedLevels: v.array(v.number()),
        progress: v.object({
            tournamentSeasonPoints: v.number(),
            quickMatchSeasonPoints: v.number(),
            propMatchSeasonPoints: v.number(),
            taskSeasonPoints: v.number(),
            socialSeasonPoints: v.number(),
            achievementSeasonPoints: v.number(),
            segmentUpgradeSeasonPoints: v.number(),
            dailySeasonPoints: v.any(),
            weeklySeasonPoints: v.any(),
            monthlySeasonPoints: v.any(),
        }),
        snapshotDate: v.string(),
        createdAt: v.string(),
    }).index("by_uid_season", ["uid", "seasonId"])
        .index("by_snapshot_date", ["snapshotDate"])
        .index("by_season_date", ["seasonId", "snapshotDate"])
}; 