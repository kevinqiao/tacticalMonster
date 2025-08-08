import { defineTable } from "convex/server";
import { v } from "convex/values";

// 段位系统相关表
export const segmentSchema = {
    // 玩家段位表
    player_segments: defineTable({
        uid: v.string(),
        segmentName: v.string(), // "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"
        rankPoints: v.number(), // 段位积分
        seasonId: v.string(), // 赛季ID
        lastUpdated: v.string(),
        upgradeHistory: v.array(v.object({
            fromSegment: v.string(),
            toSegment: v.string(),
            rankPoints: v.number(),
            upgradeDate: v.string(),
            rewards: v.object({
                coins: v.number(),
                seasonPoints: v.number(),
                tickets: v.array(v.object({
                    type: v.string(),
                    quantity: v.number()
                })),
                props: v.array(v.object({
                    gameType: v.string(),
                    propType: v.string(),
                    quantity: v.number()
                }))
            })
        })),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_uid_season", ["uid", "seasonId"])
        .index("by_season", ["seasonId"])
        .index("by_segment", ["segmentName"])
        .index("by_rank_points", ["rankPoints"]),

    // 段位升级记录表
    segment_upgrade_logs: defineTable({
        uid: v.string(),
        fromSegment: v.string(),
        toSegment: v.string(),
        rankPoints: v.number(),
        upgradeDate: v.string(),
        seasonId: v.string(),
        rewards: v.object({
            coins: v.number(),
            seasonPoints: v.number(),
            tickets: v.array(v.object({
                type: v.string(),
                quantity: v.number()
            })),
            props: v.array(v.object({
                gameType: v.string(),
                propType: v.string(),
                quantity: v.number()
            }))
        }),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_season", ["seasonId"])
        .index("by_upgrade_date", ["upgradeDate"]),

    // 段位积分获得记录表
    segment_points_logs: defineTable({
        uid: v.string(),
        points: v.number(), // 获得的积分
        source: v.string(), // 积分来源: "tournament", "quick_match", "leaderboard", "task"
        sourceDetails: v.optional(v.object({
            gameType: v.optional(v.string()),
            tournamentId: v.optional(v.string()),
            matchId: v.optional(v.string()),
            taskId: v.optional(v.string()),
            leaderboardType: v.optional(v.string()),
            leaderboardDate: v.optional(v.string())
        })),
        seasonId: v.string(),
        createdAt: v.string(),
    }).index("by_uid", ["uid"])
        .index("by_season", ["seasonId"])
        .index("by_source", ["source"])
        .index("by_created_at", ["createdAt"]),

    // 段位配置表（可选，用于动态配置）
    segment_configs: defineTable({
        segmentName: v.string(),
        displayName: v.string(),
        minRankPoints: v.number(),
        maxRankPoints: v.number(),
        color: v.string(),
        icon: v.string(),
        upgradeRewards: v.object({
            coins: v.number(),
            seasonPoints: v.number(),
            tickets: v.array(v.object({
                type: v.string(),
                quantity: v.number()
            })),
            props: v.array(v.object({
                gameType: v.string(),
                propType: v.string(),
                quantity: v.number()
            }))
        }),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_segment_name", ["segmentName"])
        .index("by_is_active", ["isActive"]),

    // 段位统计表
    segment_stats: defineTable({
        seasonId: v.string(),
        segmentName: v.string(),
        playerCount: v.number(), // 该段位玩家数量
        averageRankPoints: v.number(), // 平均积分
        totalUpgrades: v.number(), // 升级到该段位的次数
        totalDowngrades: v.number(), // 从该段位降级的次数
        date: v.string(), // 统计日期
        createdAt: v.string(),
    }).index("by_season_segment", ["seasonId", "segmentName"])
        .index("by_date", ["date"])
        .index("by_segment_date", ["segmentName", "date"])
}; 