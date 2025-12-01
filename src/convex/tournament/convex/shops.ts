import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { ShopConfigService } from "./service/shop/shopConfigService";
import { ShopService } from "./service/shop/shopService";

// ============================================================================
// 商店查询接口
// ============================================================================

/**
 * 获取商店商品列表
 */
export const getShopItems = query({
    args: {
        shopId: v.string(),
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ShopService.getShopItems(ctx, args.shopId, args.uid);
    },
});

/**
 * 获取玩家可访问的所有商店
 */
export const getPlayerShops = query({
    args: {
        uid: v.string(),
        filters: v.optional(v.object({
            type: v.optional(v.union(
                v.literal("daily"),
                v.literal("weekly"),
                v.literal("seasonal"),
                v.literal("special")
            )),
            isActive: v.optional(v.boolean()),
        })),
    },
    handler: async (ctx, args) => {
        const shopsResult = await ShopConfigService.getAllShops(ctx, args.filters);
        
        if (!shopsResult.success) {
            return shopsResult;
        }

        // 为每个商店获取商品数量
        const shopsWithItems = await Promise.all(
            (shopsResult.shops || []).map(async (shop: any) => {
                const itemsResult = await ShopService.getShopItems(ctx, shop.shopId, args.uid);
                return {
                    ...shop,
                    itemCount: itemsResult.items?.length || 0,
                };
            })
        );

        return {
            success: true,
            shops: shopsWithItems,
        };
    },
});

/**
 * 获取玩家购买历史
 */
export const getPlayerPurchaseHistory = query({
    args: {
        uid: v.string(),
        shopId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ShopService.getPlayerPurchaseHistory(ctx, args.uid, args.shopId);
    },
});

// ============================================================================
// 购买接口
// ============================================================================

/**
 * 购买商品
 */
export const purchaseItem = mutation({
    args: {
        uid: v.string(),
        shopId: v.string(),
        itemId: v.string(),
        quantity: v.number(),
        paymentType: v.union(v.literal("coins"), v.literal("gems")),
    },
    handler: async (ctx, args) => {
        return await ShopService.purchaseItem(ctx, {
            uid: args.uid,
            shopId: args.shopId,
            itemId: args.itemId,
            quantity: args.quantity,
            paymentType: args.paymentType,
        });
    },
});

// ============================================================================
// 管理接口
// ============================================================================

/**
 * 创建商店
 */
export const createShop = mutation({
    args: {
        shopId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("seasonal"),
            v.literal("special")
        ),
        refreshTime: v.string(),
        isActive: v.boolean(),
        activityId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ShopConfigService.createShop(ctx, {
            shopId: args.shopId,
            name: args.name,
            description: args.description,
            type: args.type,
            refreshTime: args.refreshTime,
            isActive: args.isActive,
            activityId: args.activityId,
        });
    },
});

/**
 * 更新商店
 */
export const updateShop = mutation({
    args: {
        shopId: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        type: v.optional(v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("seasonal"),
            v.literal("special")
        )),
        refreshTime: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        activityId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { shopId, ...updates } = args;
        return await ShopConfigService.updateShop(ctx, shopId, updates);
    },
});

/**
 * 添加商店商品
 */
export const addShopItem = mutation({
    args: {
        shopId: v.string(),
        itemId: v.string(),
        itemType: v.union(
            v.literal("prop"),
            v.literal("monster"),
            v.literal("monsterShard"),
            v.literal("energy"),
            v.literal("exclusiveItem")
        ),
        quantity: v.number(),
        price: v.number(),
        gemPrice: v.optional(v.number()),
        originalPrice: v.optional(v.number()),
        discount: v.optional(v.number()),
        discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
        isLimited: v.boolean(),
        maxQuantity: v.optional(v.number()),
        availableQuantity: v.optional(v.number()),
        purchaseLimit: v.optional(v.object({
            type: v.union(v.literal("daily"), v.literal("weekly"), v.literal("total")),
            maxPurchases: v.number(),
        })),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isActive: v.boolean(),
        activityId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ShopConfigService.addShopItem(ctx, args);
    },
});

/**
 * 更新商店商品
 */
export const updateShopItem = mutation({
    args: {
        shopId: v.string(),
        itemId: v.string(),
        itemType: v.optional(v.union(
            v.literal("prop"),
            v.literal("monster"),
            v.literal("monsterShard"),
            v.literal("energy"),
            v.literal("exclusiveItem")
        )),
        quantity: v.optional(v.number()),
        price: v.optional(v.number()),
        gemPrice: v.optional(v.number()),
        originalPrice: v.optional(v.number()),
        discount: v.optional(v.number()),
        discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
        isLimited: v.optional(v.boolean()),
        maxQuantity: v.optional(v.number()),
        availableQuantity: v.optional(v.number()),
        purchaseLimit: v.optional(v.object({
            type: v.union(v.literal("daily"), v.literal("weekly"), v.literal("total")),
            maxPurchases: v.number(),
        })),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        activityId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { shopId, itemId, ...updates } = args;
        return await ShopConfigService.updateShopItem(ctx, shopId, itemId, updates);
    },
});

/**
 * 删除商店商品
 */
export const deleteShopItem = mutation({
    args: {
        shopId: v.string(),
        itemId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ShopConfigService.deleteShopItem(ctx, args.shopId, args.itemId);
    },
});

/**
 * 手动刷新商店
 */
export const refreshShop = mutation({
    args: {
        shopId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ShopService.refreshShop(ctx, args.shopId);
    },
});

// ============================================================================
// 定时任务接口
// ============================================================================

/**
 * 刷新每日商店（定时任务用）
 */
export const refreshDailyShops = internalMutation({
    args: {},
    handler: async (ctx) => {
        const { ShopRefreshService } = await import("./service/shop/shopRefreshService");
        return await ShopRefreshService.refreshDailyShops(ctx);
    },
});

/**
 * 刷新每周商店（定时任务用）
 */
export const refreshWeeklyShops = internalMutation({
    args: {},
    handler: async (ctx) => {
        const { ShopRefreshService } = await import("./service/shop/shopRefreshService");
        return await ShopRefreshService.refreshWeeklyShops(ctx);
    },
});

/**
 * 刷新赛季商店（定时任务用）
 */
export const refreshSeasonalShops = internalMutation({
    args: {},
    handler: async (ctx) => {
        const { ShopRefreshService } = await import("./service/shop/shopRefreshService");
        return await ShopRefreshService.refreshSeasonalShops(ctx);
    },
});

