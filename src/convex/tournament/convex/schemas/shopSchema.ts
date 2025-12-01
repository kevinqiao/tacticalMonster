import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * 商店系统数据库Schema定义
 */
export const shopSchema = {
    // ============================================================================
    // 商店配置表
    // ============================================================================
    shop_configs: defineTable({
        shopId: v.string(),              // 商店ID
        name: v.string(),                // 商店名称
        description: v.string(),         // 商店描述
        type: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("seasonal"),
            v.literal("special")
        ),                                // 商店类型
        refreshTime: v.string(),         // 刷新时间（格式：HH:MM）
        lastRefreshTime: v.optional(v.string()), // 最后刷新时间
        isActive: v.boolean(),           // 是否激活
        activityId: v.optional(v.string()), // 关联的活动ID（可选）
        createdAt: v.string(),           // 创建时间
        updatedAt: v.string(),           // 更新时间
    })
        .index("by_shopId", ["shopId"])
        .index("by_type", ["type"])
        .index("by_isActive", ["isActive"])
        .index("by_activityId", ["activityId"]),

    // ============================================================================
    // 商店商品表（扩展）
    // ============================================================================
    shop_items: defineTable({
        shopId: v.string(),              // 商店ID
        itemId: v.string(),              // 商品ID（道具ID、怪物ID等）
        itemType: v.union(
            v.literal("prop"),
            v.literal("monster"),
            v.literal("monsterShard"),
            v.literal("energy"),
            v.literal("exclusiveItem")
        ),                                // 商品类型
        quantity: v.number(),            // 商品数量（购买时获得的数量）
        price: v.number(),                // 金币价格
        gemPrice: v.optional(v.number()), // 宝石价格（可选）
        originalPrice: v.optional(v.number()), // 原价
        discount: v.optional(v.number()), // 折扣百分比（0-100）
        discountType: v.optional(v.union(
            v.literal("percentage"),
            v.literal("fixed")
        )),                               // 折扣类型
        isLimited: v.boolean(),           // 是否限量
        maxQuantity: v.optional(v.number()), // 最大数量（全服限量）
        availableQuantity: v.optional(v.number()), // 可用数量（剩余）
        purchaseLimit: v.optional(v.object({
            type: v.union(
                v.literal("daily"),
                v.literal("weekly"),
                v.literal("total")
            ),                            // 限制类型
            maxPurchases: v.number(),     // 最大购买次数
        })),                              // 个人购买限制
        startTime: v.optional(v.string()), // 开始时间
        endTime: v.optional(v.string()),   // 结束时间
        isActive: v.boolean(),            // 是否激活
        activityId: v.optional(v.string()), // 活动专属商品ID（可选）
        createdAt: v.string(),            // 创建时间
        updatedAt: v.string(),            // 更新时间
    })
        .index("by_shopId", ["shopId"])
        .index("by_shopId_itemId", ["shopId", "itemId"])
        .index("by_itemId", ["itemId"])
        .index("by_itemType", ["itemType"])
        .index("by_isActive", ["isActive"])
        .index("by_startTime", ["startTime"])
        .index("by_endTime", ["endTime"])
        .index("by_activityId", ["activityId"]),

    // ============================================================================
    // 玩家购买记录表
    // ============================================================================
    player_shop_purchases: defineTable({
        uid: v.string(),                 // 玩家ID
        shopId: v.string(),              // 商店ID
        itemId: v.string(),              // 商品ID
        itemType: v.string(),            // 商品类型
        quantity: v.number(),            // 购买数量
        price: v.number(),               // 单价（金币）
        gemPrice: v.optional(v.number()), // 单价（宝石）
        totalCost: v.number(),           // 总花费（金币）
        totalGemCost: v.optional(v.number()), // 总花费（宝石）
        paymentType: v.union(
            v.literal("coins"),
            v.literal("gems")
        ),                                // 支付方式
        originalPrice: v.optional(v.number()), // 原价
        discount: v.optional(v.number()), // 折扣
        purchaseDate: v.string(),         // 购买日期（YYYY-MM-DD）
        purchaseTime: v.string(),         // 购买时间（ISO）
        activityId: v.optional(v.string()), // 活动ID（如果通过活动购买）
        createdAt: v.string(),           // 创建时间
    })
        .index("by_uid", ["uid"])
        .index("by_shopId", ["shopId"])
        .index("by_itemId", ["itemId"])
        .index("by_uid_shopId", ["uid", "shopId"])
        .index("by_purchaseDate", ["purchaseDate"])
        .index("by_purchaseTime", ["purchaseTime"])
        .index("by_activityId", ["activityId"]),

    // ============================================================================
    // 玩家购买限制表
    // ============================================================================
    player_shop_limits: defineTable({
        uid: v.string(),                 // 玩家ID
        shopId: v.string(),              // 商店ID
        itemId: v.string(),              // 商品ID
        dailyPurchases: v.number(),       // 今日购买次数
        weeklyPurchases: v.number(),      // 本周购买次数
        totalPurchases: v.number(),       // 总购买次数
        lastResetDate: v.string(),       // 最后重置日期（YYYY-MM-DD）
        lastResetWeek: v.string(),        // 最后重置周（YYYY-MM-DD，周一开始）
        createdAt: v.string(),           // 创建时间
        updatedAt: v.string(),            // 更新时间
    })
        .index("by_uid", ["uid"])
        .index("by_uid_shopId_itemId", ["uid", "shopId", "itemId"])
        .index("by_shopId", ["shopId"])
        .index("by_itemId", ["itemId"]),

    // ============================================================================
    // 商店刷新记录表
    // ============================================================================
    shop_refresh_logs: defineTable({
        shopId: v.string(),              // 商店ID
        refreshTime: v.string(),          // 刷新时间（ISO）
        refreshType: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("seasonal"),
            v.literal("manual"),
            v.literal("activity")
        ),                                // 刷新类型
        itemsRefreshed: v.number(),       // 刷新的商品数量
        previousRefreshTime: v.optional(v.string()), // 上次刷新时间
        createdAt: v.string(),           // 创建时间
    })
        .index("by_shopId", ["shopId"])
        .index("by_refreshTime", ["refreshTime"])
        .index("by_refreshType", ["refreshType"]),
};

