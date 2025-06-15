import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    player: defineTable({
        uid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        segmentName: v.optional(v.string()), // 段位："Bronze", "Silver", "Gold"
        isSubscribed: v.optional(v.boolean()), // 是否订阅
        data: v.optional(v.any()),
    }).index("by_uid", ["uid"]),
    tournamentRule: defineTable({
        ruleId: v.string(),
        name: v.string(),
        type: v.number(),//0-single match,1-quick,2-seasonal,3-knockout
        max_players: v.number(),
        rules: v.optional(v.any()),
        rewards: v.optional(v.any()),
        status: v.optional(v.number()),
    }).index("by_ruleId", ["ruleId"]),

    // match: defineTable({
    //     tournamentId: v.string(),
    //     start_time: v.number(),
    //     end_time: v.number(),
    //     duration: v.optional(v.number()),
    //     players: v.array(v.object({
    //         uid: v.string(),
    //         score: v.number(),
    //         rank: v.number(),
    //     })),
    //     status: v.optional(v.number()),
    // }).index("by_tournament", ["tournamentId"]),

    match_queue: defineTable({
        uid: v.string(),
        level: v.number(),
        game: v.string(),
        elo: v.number(),
        status: v.optional(v.number()),
    }).index("by_uid", ["uid"]).index("by_status", ["status"]),

    seasons: defineTable({
        startDate: v.string(), // 赛季开始时间（ISODate，例如 "2025-06-01T00:00:00Z"）
        endDate: v.string(), // 赛季结束时间（ISODate，例如 "2025-06-29T23:59:59Z"）
        name: v.string(), // 赛季名称（例如 "Summer 2025"）
        createdAt: v.string(), // 创建时间（ISODate）
    }).index("by_startDate", ["startDate"]),

    // 锦标赛表，存储每日锦标赛元数据
    tournaments: defineTable({
        seasonId: v.id("seasons"), // 关联赛季
        tournamentType: v.string(), // 类型："free", "challenge", "master", "daily"
        segmentNames: v.array(v.string()), // 可参与段位：["Bronze", "Silver", "Gold"]
        isSubscribedRequired: v.boolean(), // 是否需订阅（大师锦标赛）
        maxAttempts: v.number(), // 最大尝试次数（3）
        rules: v.object({
            propLimit: v.array(
                v.object({
                    propType: v.string(), // 道具类型："hint", "undo"
                    max: v.number(), // 最大使用次数
                })
            ),
            gameDuration: v.number(), // 游戏时长（秒，600）
        }),
        rewards: v.array(
            v.object({
                rank: v.number(), // 排名：1-4
                points: v.number(), // 积分奖励
                coins: v.number(), // 金币奖励
                props: v.array(
                    v.object({
                        propType: v.string(), // 道具类型
                        quantity: v.number(), // 数量
                    })
                ),
            })
        ),
        startDate: v.string(), // 开始时间（ISODate，例如 "2025-06-15T00:00:00.000-04:00"）
        endDate: v.string(), // 结束时间（ISODate，例如 "2025-06-15T23:59:59.999-04:00"）
        createdAt: v.string(), // 创建时间（ISODate）
    })
        .index("by_season_startDate", ["seasonId", "startDate"])
        .index("by_tournamentType", ["tournamentType"]),

    // 玩家锦标赛表，记录玩家在锦标赛的参与
    player_tournaments: defineTable({
        uid: v.string(), // 关联玩家
        tournamentId: v.id("tournaments"), // 关联锦标赛
        seasonId: v.id("seasons"), // 关联赛季
        totalAttempts: v.number(), // 总尝试次数（0-3）
        attempts: v.array(
            v.object({
                matchId: v.id("matches"), // 关联对局
                createdAt: v.string(), // 尝试时间（ISODate）
            })
        ),
        createdAt: v.string(), // 创建时间（ISODate）
        updatedAt: v.string(), // 最后更新时间（ISODate，用于冷却）
    })
        .index("by_player_tournament", ["uid", "tournamentId"])
        .index("by_player_updatedAt", ["uid", "updatedAt"]),

    // 玩家表，存储玩家信息
    // players: defineTable({
    //     platformId: v.string(), // 平台ID（iOS/Android）
    //     segmentName: v.string(), // 段位："Bronze", "Silver", "Gold"
    //     isSubscribed: v.boolean(), // 是否订阅
    //     createdAt: v.string(), // 创建时间（ISODate）
    // }).index("by_platformId", ["platformId"]),

    // 对局表，存储对局信息
    matches: defineTable({
        tournamentId: v.id("tournaments"), // 关联锦标赛
        seasonId: v.id("seasons"), // 关联赛季
        matchType: v.string(), // 对局类型："free", "challenge", "master", "daily"
        players: v.array(
            v.object({
                playerId: v.union(v.id("players"), v.string()), // 真人玩家ID或AI标识
                score: v.number(), // 分数
                rank: v.number(), // 排名（0 表示未完成）
                segmentName: v.string(), // 段位
                isAI: v.boolean(), // 是否为AI
            })
        ),
        status: v.number(), // 状态：0-started,1-completed,2-dropped,3-cancelled
        seed: v.number(), // 随机种子（游戏一致性）
        createdAt: v.string(), // 创建时间（ISODate）
    }).index("by_tournamentId", ["tournamentId"]),

    // 玩家对局表，记录玩家在对局的表现
    player_matches: defineTable({
        playerId: v.string(), // 关联玩家
        tournamentId: v.id("tournaments"), // 关联锦标赛
        matchId: v.id("matches"), // 关联对局
        seasonId: v.id("seasons"), // 关联赛季
        attemptNumber: v.number(), // 第几次尝试（1-3）
        score: v.number(), // 分数
        rank: v.number(), // 排名（1-4，0 表示未完成）
        pointsEarned: v.number(), // 积分奖励
        coinsEarned: v.number(), // 金币奖励
        propsEarned: v.array(
            v.object({
                propType: v.string(), // 道具类型："hint", "undo"
                quantity: v.number(), // 数量
            })
        ),
        propsUsed: v.array(
            v.object({
                propType: v.string(), // 道具类型
                quantity: v.number(), // 使用数量
            })
        ),
        createdAt: v.string(), // 创建时间（ISODate）
    })
        .index("by_player_tournament", ["playerId", "tournamentId"])
        .index("by_player_createdAt", ["playerId", "createdAt"]),

    // 玩家库存表，管理玩家资源
    player_inventory: defineTable({
        uid: v.string(), // 关联玩家
        coins: v.number(), // 金币
        points: v.number(), // 积分
        props: v.array(
            v.object({
                propType: v.string(), // 道具类型："hint", "undo"
                quantity: v.number(), // 数量
            })
        ),
        updatedAt: v.string(), // 最后更新时间（ISODate）
    }).index("by_uid", ["uid"]),

    // 玩家赛季表，跟踪玩家在赛季的段位和积分
    player_seasons: defineTable({
        uid: v.string(), // 关联玩家
        seasonId: v.id("seasons"), // 关联赛季
        segmentName: v.string(), // 当前段位
        seasonPoints: v.number(), // 赛季积分
        createdAt: v.string(), // 创建时间（ISODate）
        updatedAt: v.string(), // 最后更新时间（ISODate）
    }).index("by_player_season", ["uid", "seasonId"]),

    // 玩家分享表，记录玩家分享内容
    player_shares: defineTable({
        uid: v.string(), // 关联玩家
        matchId: v.id("matches"), // 关联对局
        content: v.string(), // 分享内容（例如 "1185 分 #1！#SolitaireClash"）
        platform: v.string(), // 平台："x"
        createdAt: v.string(), // 创建时间（ISODate）
    }).index("by_player_createdAt", ["uid", "createdAt"]),
});

