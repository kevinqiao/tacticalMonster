import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// 道具系统数据库Schema
// ============================================================================

export const propSchema = {
    // ============================================================================
    // 道具配置表
    // ============================================================================
    prop_configs: defineTable({
        propId: v.string(),           // 道具ID
        name: v.string(),             // 道具名称
        description: v.string(),      // 道具描述
        type: v.string(),            // 道具类型: boost, consumable, cosmetic, special
        effectType: v.string(),      // 效果类型
        effectValue: v.number(),     // 效果值
        duration: v.optional(v.number()), // 持续时间（秒）
        maxStack: v.number(),        // 最大堆叠数量
        rarity: v.string(),          // 稀有度: common, rare, epic, legendary
        icon: v.string(),            // 图标
        price: v.number(),           // 价格（金币）
        isActive: v.boolean(),       // 是否激活
        gameTypes: v.array(v.string()), // 适用的游戏类型
        unlockLevel: v.optional(v.number()), // 解锁等级
        createdAt: v.string(),       // 创建时间
        updatedAt: v.string()        // 更新时间
    })
        .index("by_propId", ["propId"])
        .index("by_type", ["type"])
        .index("by_rarity", ["rarity"])
        .index("by_isActive", ["isActive"])
        .index("by_gameType", ["gameTypes"]),

    // ============================================================================
    // 玩家道具表
    // ============================================================================
    player_props: defineTable({
        uid: v.string(),             // 玩家ID
        propId: v.string(),          // 道具ID
        quantity: v.number(),        // 数量
        lastUsed: v.optional(v.string()), // 最后使用时间
        expiresAt: v.optional(v.string()), // 过期时间
        isActive: v.boolean(),       // 是否激活
        createdAt: v.string(),       // 创建时间
        updatedAt: v.string()        // 更新时间
    })
        .index("by_uid", ["uid"])
        .index("by_uid_propId", ["uid", "propId"])
        .index("by_propId", ["propId"])
        .index("by_expiresAt", ["expiresAt"])
        .index("by_isActive", ["isActive"]),

    // ============================================================================
    // 道具使用记录表
    // ============================================================================
    prop_usage_records: defineTable({
        uid: v.string(),             // 玩家ID
        propId: v.string(),          // 道具ID
        gameId: v.string(),          // 游戏ID
        matchId: v.optional(v.string()), // 比赛ID
        tournamentId: v.optional(v.string()), // 锦标赛ID
        effectType: v.string(),      // 效果类型
        effectValue: v.number(),     // 效果值
        duration: v.optional(v.number()), // 持续时间
        usedAt: v.string(),          // 使用时间
        expiresAt: v.optional(v.string()) // 过期时间
    })
        .index("by_uid", ["uid"])
        .index("by_uid_gameId", ["uid", "gameId"])
        .index("by_propId", ["propId"])
        .index("by_gameId", ["gameId"])
        .index("by_matchId", ["matchId"])
        .index("by_tournamentId", ["tournamentId"])
        .index("by_usedAt", ["usedAt"])
        .index("by_expiresAt", ["expiresAt"]),

    // ============================================================================
    // 道具购买记录表
    // ============================================================================
    prop_purchase_records: defineTable({
        uid: v.string(),             // 玩家ID
        propId: v.string(),          // 道具ID
        quantity: v.number(),        // 购买数量
        price: v.number(),           // 单价
        totalCost: v.number(),       // 总花费
        purchasedAt: v.string()      // 购买时间
    })
        .index("by_uid", ["uid"])
        .index("by_propId", ["propId"])
        .index("by_purchasedAt", ["purchasedAt"]),

    // ============================================================================
    // 商店配置表
    // ============================================================================
    prop_shops: defineTable({
        shopId: v.string(),          // 商店ID
        name: v.string(),            // 商店名称
        description: v.string(),     // 商店描述
        type: v.string(),           // 商店类型: daily, weekly, seasonal, special
        refreshTime: v.string(),    // 刷新时间
        lastRefreshTime: v.optional(v.string()), // 最后刷新时间
        isActive: v.boolean(),      // 是否激活
        createdAt: v.string(),      // 创建时间
        updatedAt: v.string()       // 更新时间
    })
        .index("by_shopId", ["shopId"])
        .index("by_type", ["type"])
        .index("by_isActive", ["isActive"]),

    // ============================================================================
    // 商店商品表
    // ============================================================================
    shop_items: defineTable({
        shopId: v.string(),          // 商店ID
        propId: v.string(),          // 道具ID
        price: v.number(),           // 价格
        originalPrice: v.optional(v.number()), // 原价
        discount: v.optional(v.number()), // 折扣百分比
        isLimited: v.boolean(),      // 是否限量
        maxQuantity: v.optional(v.number()), // 最大数量
        availableQuantity: v.optional(v.number()), // 可用数量
        startTime: v.optional(v.string()), // 开始时间
        endTime: v.optional(v.string()), // 结束时间
        isActive: v.boolean(),       // 是否激活
        createdAt: v.string(),       // 创建时间
        updatedAt: v.string()        // 更新时间
    })
        .index("by_shopId", ["shopId"])
        .index("by_shopId_propId", ["shopId", "propId"])
        .index("by_propId", ["propId"])
        .index("by_isActive", ["isActive"])
        .index("by_startTime", ["startTime"])
        .index("by_endTime", ["endTime"]),

    // ============================================================================
    // 商店购买记录表
    // ============================================================================
    shop_purchase_records: defineTable({
        uid: v.string(),             // 玩家ID
        shopId: v.string(),          // 商店ID
        propId: v.string(),          // 道具ID
        quantity: v.number(),        // 购买数量
        price: v.number(),           // 价格
        totalCost: v.number(),       // 总花费
        originalPrice: v.optional(v.number()), // 原价
        discount: v.optional(v.number()), // 折扣
        purchasedAt: v.string()      // 购买时间
    })
        .index("by_uid", ["uid"])
        .index("by_shopId", ["shopId"])
        .index("by_propId", ["propId"])
        .index("by_purchasedAt", ["purchasedAt"]),

    // ============================================================================
    // 游戏效果状态表
    // ============================================================================
    game_effect_states: defineTable({
        uid: v.string(),             // 玩家ID
        gameId: v.string(),          // 游戏ID
        gameType: v.string(),        // 游戏类型
        effects: v.any(),            // 效果对象
        finalEffects: v.optional(v.any()), // 最终效果对象
        finalScore: v.optional(v.number()), // 最终分数
        baseScore: v.optional(v.number()), // 基础分数
        scoreDifference: v.optional(v.number()), // 分数差异
        startTime: v.string(),       // 开始时间
        endTime: v.optional(v.string()), // 结束时间
        isActive: v.boolean(),       // 是否激活
        createdAt: v.string(),       // 创建时间
        updatedAt: v.optional(v.string()) // 更新时间
    })
        .index("by_uid", ["uid"])
        .index("by_uid_gameId", ["uid", "gameId"])
        .index("by_gameId", ["gameId"])
        .index("by_gameType", ["gameType"])
        .index("by_isActive", ["isActive"])
        .index("by_startTime", ["startTime"]),

    // ============================================================================
    // 道具效果统计表
    // ============================================================================
    prop_effect_statistics: defineTable({
        uid: v.string(),             // 玩家ID
        gameId: v.string(),          // 游戏ID
        effectCount: v.number(),     // 效果数量
        scoreMultiplier: v.number(), // 分数倍数
        timeBoost: v.number(),       // 时间增益
        extraLives: v.number(),      // 额外生命
        shields: v.number(),         // 护盾数量
        rerolls: v.number(),         // 重掷次数
        hints: v.number(),           // 提示次数
        scoreDifference: v.number(), // 分数差异
        multiplierUsed: v.boolean(), // 是否使用了倍数
        gameEndTime: v.string()      // 游戏结束时间
    })
        .index("by_uid", ["uid"])
        .index("by_gameId", ["gameId"])
        .index("by_gameEndTime", ["gameEndTime"]),

    // ============================================================================
    // 效果使用日志表
    // ============================================================================
    effect_usage_logs: defineTable({
        uid: v.string(),             // 玩家ID
        gameId: v.string(),          // 游戏ID
        effectType: v.string(),      // 效果类型
        usedAt: v.string(),          // 使用时间
        remainingValue: v.number()   // 剩余值
    })
        .index("by_uid", ["uid"])
        .index("by_uid_gameId", ["uid", "gameId"])
        .index("by_effectType", ["effectType"])
        .index("by_usedAt", ["usedAt"]),

    // ============================================================================
    // 道具系统日志表
    // ============================================================================
    prop_system_logs: defineTable({
        action: v.string(),          // 操作类型
        uid: v.optional(v.string()), // 玩家ID
        propId: v.optional(v.string()), // 道具ID
        shopId: v.optional(v.string()), // 商店ID
        gameId: v.optional(v.string()), // 游戏ID
        details: v.any(),            // 详细信息
        timestamp: v.string(),       // 时间戳
        success: v.boolean(),        // 是否成功
        error: v.optional(v.string()) // 错误信息
    })
        .index("by_action", ["action"])
        .index("by_uid", ["uid"])
        .index("by_propId", ["propId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_success", ["success"]),

    // ============================================================================
    // 道具奖励配置表
    // ============================================================================
    prop_reward_configs: defineTable({
        rewardId: v.string(),        // 奖励ID
        name: v.string(),            // 奖励名称
        description: v.string(),     // 奖励描述
        propId: v.string(),          // 道具ID
        quantity: v.number(),        // 数量
        probability: v.optional(v.number()), // 概率
        minLevel: v.optional(v.number()), // 最小等级
        maxLevel: v.optional(v.number()), // 最大等级
        isActive: v.boolean(),       // 是否激活
        createdAt: v.string(),       // 创建时间
        updatedAt: v.string()        // 更新时间
    })
        .index("by_rewardId", ["rewardId"])
        .index("by_propId", ["propId"])
        .index("by_isActive", ["isActive"])
        .index("by_minLevel", ["minLevel"])
        .index("by_maxLevel", ["maxLevel"]),

    // ============================================================================
    // 道具奖励发放记录表
    // ============================================================================
    prop_reward_records: defineTable({
        uid: v.string(),             // 玩家ID
        rewardId: v.string(),        // 奖励ID
        propId: v.string(),          // 道具ID
        quantity: v.number(),        // 数量
        source: v.string(),          // 来源: tournament, achievement, daily, etc.
        sourceId: v.optional(v.string()), // 来源ID
        grantedAt: v.string()        // 发放时间
    })
        .index("by_uid", ["uid"])
        .index("by_rewardId", ["rewardId"])
        .index("by_propId", ["propId"])
        .index("by_source", ["source"])
        .index("by_grantedAt", ["grantedAt"])
}; 