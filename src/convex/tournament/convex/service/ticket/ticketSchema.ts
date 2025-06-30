// @ts-nocheck
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// 门票系统数据库Schema
export const ticketSchema = defineSchema({
    // 门票表
    tickets: defineTable({
        // 基础信息
        ticketType: v.string(), // 门票类型: normal, advanced, event, master_exclusive, elite_exclusive, season_exclusive
        name: v.string(), // 门票名称
        uid: v.string(), // 用户ID
        gameType: v.string(), // 游戏类型: ludo, solitaire, tournament

        // 时间信息
        createdAt: v.string(), // 创建时间
        expiryDate: v.string(), // 过期时间

        // 状态信息
        isUsed: v.boolean(), // 是否已使用
        usedAt: v.optional(v.string()), // 使用时间
        tournamentId: v.optional(v.string()), // 使用的锦标赛ID

        // 配置信息
        config: v.object({
            tournaments: v.array(v.string()), // 适用的锦标赛类型
            msRequirement: v.object({
                min: v.number(),
                max: v.number()
            }), // MS要求
            segmentRequirement: v.array(v.string()), // 段位要求
            eloRequirement: v.object({
                min: v.number(),
                max: v.number()
            }), // ELO要求
            rewardMultiplier: v.number() // 奖励倍数
        })
    })
        .index("by_uid_game", ["uid", "gameType"])
        .index("by_ticket_type", ["ticketType"])
        .index("by_created_at", ["createdAt"])
        .index("by_expiry_date", ["expiryDate"])
        .index("by_usage_status", ["isUsed"])
        .index("by_tournament", ["tournamentId"]),

    // 门票使用记录表
    ticket_usage_logs: defineTable({
        // 基础信息
        ticketId: v.string(), // 门票ID
        uid: v.string(), // 用户ID
        gameType: v.string(), // 游戏类型
        tournamentId: v.string(), // 锦标赛ID

        // 使用信息
        usedAt: v.string(), // 使用时间

        // 玩家状态
        playerMS: v.number(), // 玩家MS分数
        playerSegment: v.string(), // 玩家段位
        playerELO: v.number(), // 玩家ELO分数

        // 资格检查结果
        eligibilityCheck: v.object({
            msEligible: v.boolean(), // MS资格检查
            segmentEligible: v.boolean(), // 段位资格检查
            eloEligible: v.boolean(), // ELO资格检查
            overallEligible: v.boolean() // 总体资格
        }),

        // 奖励信息
        rewardInfo: v.optional(v.object({
            baseReward: v.number(), // 基础奖励
            ticketMultiplier: v.number(), // 门票倍数
            performanceMultiplier: v.number(), // 表现倍数
            finalReward: v.number() // 最终奖励
        })),

        // 时间信息
        createdAt: v.string() // 创建时间
    })
        .index("by_uid_game", ["uid", "gameType"])
        .index("by_ticket_id", ["ticketId"])
        .index("by_tournament_id", ["tournamentId"])
        .index("by_used_at", ["usedAt"])
        .index("by_eligibility", ["eligibilityCheck.overallEligible"]),

    // 门票统计表
    ticket_statistics: defineTable({
        // 基础信息
        uid: v.string(), // 用户ID
        gameType: v.string(), // 游戏类型

        // 统计信息
        totalTickets: v.number(), // 总门票数
        usedTickets: v.number(), // 已使用门票数
        availableTickets: v.number(), // 可用门票数
        expiredTickets: v.number(), // 过期门票数

        // 各类型门票统计
        ticketTypes: v.object({
            normal: v.object({
                total: v.number(),
                used: v.number(),
                available: v.number()
            }),
            advanced: v.object({
                total: v.number(),
                used: v.number(),
                available: v.number()
            }),
            event: v.object({
                total: v.number(),
                used: v.number(),
                available: v.number()
            }),
            master_exclusive: v.object({
                total: v.number(),
                used: v.number(),
                available: v.number()
            }),
            elite_exclusive: v.object({
                total: v.number(),
                used: v.number(),
                available: v.number()
            }),
            season_exclusive: v.object({
                total: v.number(),
                used: v.number(),
                available: v.number()
            })
        }),

        // 时间信息
        lastUpdated: v.string() // 最后更新时间
    })
        .index("by_uid_game", ["uid", "gameType"])
        .index("by_last_updated", ["lastUpdated"]),

    // 门票资格检查记录表
    ticket_eligibility_logs: defineTable({
        // 基础信息
        uid: v.string(), // 用户ID
        gameType: v.string(), // 游戏类型
        ticketType: v.string(), // 门票类型

        // 玩家状态
        playerMS: v.number(), // 玩家MS分数
        playerSegment: v.string(), // 玩家段位
        playerELO: v.number(), // 玩家ELO分数

        // 检查结果
        eligibilityResult: v.object({
            eligible: v.boolean(), // 是否合格
            msEligible: v.boolean(), // MS检查结果
            segmentEligible: v.boolean(), // 段位检查结果
            eloEligible: v.boolean(), // ELO检查结果
            reason: v.string() // 不合格原因
        }),

        // 时间信息
        checkedAt: v.string() // 检查时间
    })
        .index("by_uid_game", ["uid", "gameType"])
        .index("by_ticket_type", ["ticketType"])
        .index("by_eligibility", ["eligibilityResult.eligible"])
        .index("by_checked_at", ["checkedAt"]),

    // 门票推荐记录表
    ticket_recommendations: defineTable({
        // 基础信息
        uid: v.string(), // 用户ID
        gameType: v.string(), // 游戏类型

        // 推荐信息
        recommendedTickets: v.array(v.object({
            ticketType: v.string(), // 门票类型
            name: v.string(), // 门票名称
            description: v.string(), // 描述
            reason: v.string(), // 推荐原因
            priority: v.number() // 推荐优先级 (1-10)
        })),

        // 玩家状态
        playerMS: v.number(), // 玩家MS分数
        playerSegment: v.string(), // 玩家段位
        playerELO: v.number(), // 玩家ELO分数

        // 时间信息
        recommendedAt: v.string(), // 推荐时间
        expiresAt: v.string() // 推荐过期时间
    })
        .index("by_uid_game", ["uid", "gameType"])
        .index("by_recommended_at", ["recommendedAt"])
        .index("by_expires_at", ["expiresAt"]),

    // 门票系统配置表
    ticket_system_config: defineTable({
        // 配置键
        configKey: v.string(), // 配置键名

        // 配置值
        configValue: v.any(), // 配置值

        // 配置描述
        description: v.string(), // 配置描述

        // 时间信息
        createdAt: v.string(), // 创建时间
        updatedAt: v.string() // 更新时间
    })
        .index("by_config_key", ["configKey"])
        .index("by_updated_at", ["updatedAt"]),

    // 门票活动表
    ticket_events: defineTable({
        // 活动信息
        eventId: v.string(), // 活动ID
        eventName: v.string(), // 活动名称
        eventDescription: v.string(), // 活动描述

        // 活动类型
        eventType: v.string(), // 活动类型: special, season, exclusive

        // 门票要求
        requiredTicketType: v.string(), // 需要的门票类型
        ticketRequirements: v.object({
            msRequirement: v.object({
                min: v.number(),
                max: v.number()
            }),
            segmentRequirement: v.array(v.string()),
            eloRequirement: v.object({
                min: v.number(),
                max: v.number()
            })
        }),

        // 活动时间
        startTime: v.string(), // 开始时间
        endTime: v.string(), // 结束时间

        // 活动状态
        isActive: v.boolean(), // 是否激活
        maxParticipants: v.number(), // 最大参与人数
        currentParticipants: v.number(), // 当前参与人数

        // 奖励信息
        rewards: v.object({
            baseReward: v.number(), // 基础奖励
            bonusMultiplier: v.number(), // 奖励倍数
            specialRewards: v.array(v.string()) // 特殊奖励
        }),

        // 时间信息
        createdAt: v.string() // 创建时间
    })
        .index("by_event_id", ["eventId"])
        .index("by_event_type", ["eventType"])
        .index("by_required_ticket", ["requiredTicketType"])
        .index("by_start_time", ["startTime"])
        .index("by_end_time", ["endTime"])
        .index("by_is_active", ["isActive"]),

    // 门票活动参与记录表
    ticket_event_participants: defineTable({
        // 基础信息
        eventId: v.string(), // 活动ID
        uid: v.string(), // 用户ID
        gameType: v.string(), // 游戏类型

        // 参与信息
        ticketId: v.string(), // 使用的门票ID
        ticketType: v.string(), // 门票类型

        // 参与状态
        joinedAt: v.string(), // 参与时间
        isActive: v.boolean(), // 是否仍在参与
        leftAt: v.optional(v.string()), // 离开时间

        // 表现信息
        performance: v.optional(v.object({
            wins: v.number(), // 胜利次数
            losses: v.number(), // 失败次数
            draws: v.number(), // 平局次数
            totalGames: v.number(), // 总游戏次数
            finalRank: v.optional(v.number()) // 最终排名
        })),

        // 奖励信息
        rewardsEarned: v.optional(v.object({
            baseReward: v.number(), // 基础奖励
            bonusReward: v.number(), // 奖励倍数
            specialRewards: v.array(v.string()), // 特殊奖励
            totalReward: v.number() // 总奖励
        })),

        // 时间信息
        createdAt: v.string() // 创建时间
    })
        .index("by_event_id", ["eventId"])
        .index("by_uid_game", ["uid", "gameType"])
        .index("by_ticket_id", ["ticketId"])
        .index("by_joined_at", ["joinedAt"])
        .index("by_is_active", ["isActive"])
});

// 门票系统配置默认值
export const defaultTicketSystemConfig = {
    // 门票类型配置
    ticketTypes: {
        normal: {
            id: "normal",
            name: "普通门票",
            description: "基础锦标赛门票",
            tournaments: ["基础", "进阶", "白银赛季"],
            msRequirement: { min: 0, max: 399 },
            segmentRequirement: ["bronze", "silver"],
            eloRequirement: { min: 800, max: 1200 },
            targetAudience: "新手/休闲玩家",
            rewardMultiplier: 1.0
        },
        advanced: {
            id: "advanced",
            name: "高级门票",
            description: "高级锦标赛门票",
            tournaments: ["高级", "精英", "黄金赛季"],
            msRequirement: { min: 400, max: 699 },
            segmentRequirement: ["gold", "platinum", "diamond"],
            eloRequirement: { min: 1200, max: 1600 },
            targetAudience: "中高级段位玩家",
            rewardMultiplier: 1.5
        },
        event: {
            id: "event",
            name: "活动门票",
            description: "活动锦标赛门票",
            tournaments: ["活动", "钻石赛季", "大师赛季"],
            msRequirement: { min: 700, max: 999 },
            segmentRequirement: ["diamond", "master"],
            eloRequirement: { min: 1400, max: 9999 },
            targetAudience: "高段位玩家",
            rewardMultiplier: 2.0
        },
        master_exclusive: {
            id: "master_exclusive",
            name: "大师专属门票",
            description: "大师专属锦标赛门票",
            tournaments: ["大师专属"],
            msRequirement: { min: 1000, max: 9999 },
            segmentRequirement: ["master"],
            eloRequirement: { min: 1400, max: 9999 },
            targetAudience: "仅大师段位",
            rewardMultiplier: 3.0
        },
        elite_exclusive: {
            id: "elite_exclusive",
            name: "精英专属门票",
            description: "精英专属锦标赛门票",
            tournaments: ["精英专属"],
            msRequirement: { min: 400, max: 9999 },
            segmentRequirement: ["gold", "platinum", "diamond", "master"],
            eloRequirement: { min: 1200, max: 9999 },
            targetAudience: "黄金I+段位",
            rewardMultiplier: 2.5
        },
        season_exclusive: {
            id: "season_exclusive",
            name: "赛季专属门票",
            description: "赛季专属锦标赛门票",
            tournaments: ["钻石赛季", "大师赛季"],
            msRequirement: { min: 700, max: 9999 },
            segmentRequirement: ["diamond", "master"],
            eloRequirement: { min: 1400, max: 9999 },
            targetAudience: "钻石+段位",
            rewardMultiplier: 2.5
        }
    },

    // 系统配置
    systemConfig: {
        defaultTicketExpiryDays: 30, // 默认门票有效期（天）
        maxTicketsPerUser: 100, // 每个用户最大门票数量
        eligibilityCheckCacheMinutes: 5, // 资格检查缓存时间（分钟）
        recommendationExpiryHours: 24, // 推荐过期时间（小时）
        maxEventParticipants: 1000, // 最大活动参与人数
        minPlayersForTournament: 8, // 锦标赛最少玩家数
        maxWaitTimeForMatch: 300, // 最大匹配等待时间（秒）
        rewardCalculationPrecision: 2 // 奖励计算精度
    },

    // 段位配置
    segmentConfig: {
        bronze: { minMS: 0, maxMS: 199, eloRange: { min: 800, max: 1000 } },
        silver: { minMS: 200, maxMS: 399, eloRange: { min: 1000, max: 1200 } },
        gold: { minMS: 400, maxMS: 599, eloRange: { min: 1200, max: 1400 } },
        platinum: { minMS: 600, maxMS: 799, eloRange: { min: 1400, max: 1600 } },
        diamond: { minMS: 800, maxMS: 999, eloRange: { min: 1600, max: 1800 } },
        master: { minMS: 1000, maxMS: 9999, eloRange: { min: 1800, max: 9999 } }
    },

    // 奖励配置
    rewardConfig: {
        baseRewards: {
            win: 100,
            draw: 50,
            lose: 10
        },
        performanceMultipliers: {
            win: 1.0,
            draw: 0.5,
            lose: 0.1
        },
        bonusMultipliers: {
            streak: 0.1, // 连胜奖励
            participation: 0.05, // 参与奖励
            season: 0.2 // 赛季奖励
        }
    }
};

// 导出Schema和配置
export default {
    schema: ticketSchema,
    defaultConfig: defaultTicketSystemConfig
}; 