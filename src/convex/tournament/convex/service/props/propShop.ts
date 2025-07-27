// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../simpleTimezoneUtils";
import { PropSystem } from "./propSystem";

// ============================================================================
// 道具商店系统
// ============================================================================

/**
 * 商店商品接口
 */
export interface ShopItem {
    propId: string;
    price: number;
    originalPrice?: number;
    discount?: number; // 折扣百分比
    isLimited: boolean;
    maxQuantity?: number;
    availableQuantity?: number;
    startTime?: string;
    endTime?: string;
    isActive: boolean;
}

/**
 * 商店配置接口
 */
export interface ShopConfig {
    shopId: string;
    name: string;
    description: string;
    type: "daily" | "weekly" | "seasonal" | "special";
    refreshTime: string; // 刷新时间
    isActive: boolean;
}

/**
 * 道具商店系统
 */
export class PropShop {

    /**
     * 默认商店配置
     */
    static readonly DEFAULT_SHOPS: ShopConfig[] = [
        {
            shopId: "daily_shop",
            name: "每日商店",
            description: "每日更新的道具商店",
            type: "daily",
            refreshTime: "00:00:00", // 每天0点刷新
            isActive: true
        },
        {
            shopId: "weekly_shop",
            name: "每周商店",
            description: "每周更新的道具商店",
            type: "weekly",
            refreshTime: "00:00:00", // 每周一0点刷新
            isActive: true
        },
        {
            shopId: "seasonal_shop",
            name: "赛季商店",
            description: "赛季限时道具商店",
            type: "seasonal",
            refreshTime: "00:00:00",
            isActive: true
        },
        {
            shopId: "special_shop",
            name: "特殊商店",
            description: "特殊活动道具商店",
            type: "special",
            refreshTime: "00:00:00",
            isActive: true
        }
    ];

    /**
     * 初始化商店
     */
    static async initializeShops(ctx: any) {
        console.log("初始化道具商店");

        try {
            // 清空现有商店
            const existingShops = await ctx.db.query("prop_shops").collect();
            for (const shop of existingShops) {
                await ctx.db.delete(shop._id);
            }

            // 插入默认商店
            for (const shopConfig of this.DEFAULT_SHOPS) {
                await ctx.db.insert("prop_shops", {
                    ...shopConfig,
                    createdAt: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });
            }

            console.log(`成功初始化 ${this.DEFAULT_SHOPS.length} 个商店`);
            return {
                success: true,
                message: `成功初始化 ${this.DEFAULT_SHOPS.length} 个商店`
            };
        } catch (error) {
            console.error("初始化商店失败:", error);
            throw error;
        }
    }

    /**
     * 获取商店信息
     */
    static async getShop(ctx: any, shopId: string) {
        return await ctx.db.query("prop_shops")
            .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
            .unique();
    }

    /**
     * 获取所有商店
     */
    static async getAllShops(ctx: any) {
        return await ctx.db.query("prop_shops")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();
    }

    /**
     * 获取商店商品
     */
    static async getShopItems(ctx: any, shopId: string) {
        const items = await ctx.db.query("shop_items")
            .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        const itemsWithConfig = [];
        for (const item of items) {
            const propConfig = await PropSystem.getPropConfig(ctx, item.propId);
            if (propConfig) {
                itemsWithConfig.push({
                    ...item,
                    propConfig
                });
            }
        }

        return itemsWithConfig;
    }

    /**
     * 添加商品到商店
     */
    static async addShopItem(ctx: any, shopId: string, item: ShopItem) {
        try {
            // 验证商店是否存在
            const shop = await this.getShop(ctx, shopId);
            if (!shop) {
                throw new Error(`商店不存在: ${shopId}`);
            }

            // 验证道具是否存在
            const propConfig = await PropSystem.getPropConfig(ctx, item.propId);
            if (!propConfig) {
                throw new Error(`道具配置不存在: ${item.propId}`);
            }

            // 检查商品是否已存在
            const existingItem = await ctx.db.query("shop_items")
                .withIndex("by_shopId_propId", (q: any) => q.eq("shopId", shopId).eq("propId", item.propId))
                .unique();

            if (existingItem) {
                // 更新现有商品
                await ctx.db.patch(existingItem._id, {
                    ...item,
                    updatedAt: getTorontoDate().iso
                });

                return {
                    success: true,
                    shopId,
                    propId: item.propId,
                    message: "商品已更新"
                };
            } else {
                // 创建新商品
                await ctx.db.insert("shop_items", {
                    shopId,
                    ...item,
                    createdAt: getTorontoDate().iso,
                    updatedAt: getTorontoDate().iso
                });

                return {
                    success: true,
                    shopId,
                    propId: item.propId,
                    message: "商品已添加"
                };
            }
        } catch (error) {
            console.error("添加商店商品失败:", error);
            throw error;
        }
    }

    /**
     * 从商店购买商品
     */
    static async buyFromShop(ctx: any, uid: string, shopId: string, propId: string, quantity: number = 1) {
        try {
            // 获取商店商品
            const shopItem = await ctx.db.query("shop_items")
                .withIndex("by_shopId_propId", (q: any) => q.eq("shopId", shopId).eq("propId", propId))
                .unique();

            if (!shopItem || !shopItem.isActive) {
                throw new Error("商品不存在或已下架");
            }

            // 检查限时商品
            if (shopItem.startTime && shopItem.endTime) {
                const now = getTorontoDate().iso;
                if (now < shopItem.startTime || now > shopItem.endTime) {
                    throw new Error("商品不在销售时间内");
                }
            }

            // 检查限量商品
            if (shopItem.isLimited && shopItem.availableQuantity !== undefined) {
                if (shopItem.availableQuantity < quantity) {
                    throw new Error(`商品库存不足，剩余 ${shopItem.availableQuantity} 个`);
                }
            }

            // 获取玩家信息
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                throw new Error("玩家不存在");
            }

            const totalCost = shopItem.price * quantity;
            if (player.coins < totalCost) {
                throw new Error(`金币不足，需要 ${totalCost} 金币`);
            }

            // 扣除金币
            await ctx.db.patch(player._id, {
                coins: player.coins - totalCost,
                updatedAt: getTorontoDate().iso
            });

            // 添加道具到玩家
            const addResult = await PropSystem.addPropToPlayer(ctx, uid, propId, quantity);

            // 更新商品库存
            if (shopItem.isLimited && shopItem.availableQuantity !== undefined) {
                await ctx.db.patch(shopItem._id, {
                    availableQuantity: shopItem.availableQuantity - quantity,
                    updatedAt: getTorontoDate().iso
                });
            }

            // 记录购买记录
            await ctx.db.insert("shop_purchase_records", {
                uid,
                shopId,
                propId,
                quantity,
                price: shopItem.price,
                totalCost,
                originalPrice: shopItem.originalPrice,
                discount: shopItem.discount,
                purchasedAt: getTorontoDate().iso
            });

            return {
                success: true,
                shopId,
                propId,
                quantity,
                totalCost,
                remainingCoins: player.coins - totalCost,
                remainingQuantity: shopItem.isLimited ? shopItem.availableQuantity - quantity : undefined,
                message: `成功从商店购买 ${quantity} 个道具`
            };
        } catch (error) {
            console.error("从商店购买失败:", error);
            throw error;
        }
    }

    /**
     * 刷新商店
     */
    static async refreshShop(ctx: any, shopId: string) {
        try {
            const shop = await this.getShop(ctx, shopId);
            if (!shop) {
                throw new Error(`商店不存在: ${shopId}`);
            }

            // 根据商店类型生成新的商品
            const newItems = await this.generateShopItems(ctx, shop);

            // 删除旧商品
            const oldItems = await ctx.db.query("shop_items")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .collect();

            for (const item of oldItems) {
                await ctx.db.delete(item._id);
            }

            // 添加新商品
            for (const item of newItems) {
                await this.addShopItem(ctx, shopId, item);
            }

            // 更新商店刷新时间
            await ctx.db.patch(shop._id, {
                lastRefreshTime: getTorontoDate().iso,
                updatedAt: getTorontoDate().iso
            });

            return {
                success: true,
                shopId,
                newItemCount: newItems.length,
                message: `商店已刷新，新增 ${newItems.length} 个商品`
            };
        } catch (error) {
            console.error("刷新商店失败:", error);
            throw error;
        }
    }

    /**
     * 生成商店商品
     */
    static async generateShopItems(ctx: any, shop: any) {
        const allProps = await PropSystem.getAllPropConfigs(ctx);
        const items = [];

        switch (shop.type) {
            case "daily":
                // 每日商店：3-5个随机商品
                const dailyCount = Math.floor(Math.random() * 3) + 3;
                const dailyProps = this.getRandomProps(allProps, dailyCount);

                for (const prop of dailyProps) {
                    items.push({
                        propId: prop.propId,
                        price: Math.floor(prop.price * (0.8 + Math.random() * 0.4)), // 80%-120%价格
                        isLimited: true,
                        maxQuantity: Math.floor(Math.random() * 10) + 5,
                        availableQuantity: Math.floor(Math.random() * 10) + 5,
                        isActive: true
                    });
                }
                break;

            case "weekly":
                // 每周商店：5-8个商品，可能有折扣
                const weeklyCount = Math.floor(Math.random() * 4) + 5;
                const weeklyProps = this.getRandomProps(allProps, weeklyCount);

                for (const prop of weeklyProps) {
                    const hasDiscount = Math.random() < 0.3; // 30%概率有折扣
                    const discount = hasDiscount ? Math.floor(Math.random() * 30) + 10 : 0; // 10%-40%折扣

                    items.push({
                        propId: prop.propId,
                        price: Math.floor(prop.price * (1 - discount / 100)),
                        originalPrice: prop.price,
                        discount,
                        isLimited: true,
                        maxQuantity: Math.floor(Math.random() * 20) + 10,
                        availableQuantity: Math.floor(Math.random() * 20) + 10,
                        isActive: true
                    });
                }
                break;

            case "seasonal":
                // 赛季商店：稀有和史诗道具
                const seasonalProps = allProps.filter(prop =>
                    prop.rarity === "rare" || prop.rarity === "epic"
                );

                for (const prop of seasonalProps.slice(0, 3)) {
                    items.push({
                        propId: prop.propId,
                        price: Math.floor(prop.price * 0.7), // 70%价格
                        originalPrice: prop.price,
                        discount: 30,
                        isLimited: true,
                        maxQuantity: 3,
                        availableQuantity: 3,
                        isActive: true
                    });
                }
                break;

            case "special":
                // 特殊商店：传奇道具
                const specialProps = allProps.filter(prop => prop.rarity === "legendary");

                for (const prop of specialProps.slice(0, 2)) {
                    items.push({
                        propId: prop.propId,
                        price: Math.floor(prop.price * 0.8),
                        originalPrice: prop.price,
                        discount: 20,
                        isLimited: true,
                        maxQuantity: 1,
                        availableQuantity: 1,
                        isActive: true
                    });
                }
                break;
        }

        return items;
    }

    /**
     * 随机选择道具
     */
    static getRandomProps(props: any[], count: number) {
        const shuffled = [...props].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * 获取玩家商店购买历史
     */
    static async getPlayerShopHistory(ctx: any, uid: string) {
        return await ctx.db.query("shop_purchase_records")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .collect();
    }

    /**
     * 获取商店统计信息
     */
    static async getShopStatistics(ctx: any, shopId: string) {
        const items = await this.getShopItems(ctx, shopId);
        const purchases = await ctx.db.query("shop_purchase_records")
            .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
            .collect();

        const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
        const totalSales = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);

        return {
            totalItems: items.length,
            totalPurchases: purchases.length,
            totalRevenue,
            totalSales,
            averagePrice: purchases.length > 0 ? totalRevenue / purchases.length : 0
        };
    }
}

// ============================================================================
// Convex 函数接口
// ============================================================================

/**
 * 初始化商店
 */
export const initializeShops = mutation({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropShop.initializeShops(ctx);
    }
});

/**
 * 获取所有商店
 */
export const getAllShops = query({
    args: {},
    handler: async (ctx: any, args: any) => {
        return await PropShop.getAllShops(ctx);
    }
});

/**
 * 获取商店商品
 */
export const getShopItems = query({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getShopItems(ctx, args.shopId);
    }
});

/**
 * 添加商店商品
 */
export const addShopItem = mutation({
    args: {
        shopId: v.string(),
        item: v.object({
            propId: v.string(),
            price: v.number(),
            originalPrice: v.optional(v.number()),
            discount: v.optional(v.number()),
            isLimited: v.boolean(),
            maxQuantity: v.optional(v.number()),
            availableQuantity: v.optional(v.number()),
            startTime: v.optional(v.string()),
            endTime: v.optional(v.string()),
            isActive: v.boolean()
        })
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.addShopItem(ctx, args.shopId, args.item);
    }
});

/**
 * 从商店购买
 */
export const buyFromShop = mutation({
    args: {
        uid: v.string(),
        shopId: v.string(),
        propId: v.string(),
        quantity: v.optional(v.number())
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.buyFromShop(ctx, args.uid, args.shopId, args.propId, args.quantity || 1);
    }
});

/**
 * 刷新商店
 */
export const refreshShop = mutation({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.refreshShop(ctx, args.shopId);
    }
});

/**
 * 获取玩家商店历史
 */
export const getPlayerShopHistory = query({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getPlayerShopHistory(ctx, args.uid);
    }
});

/**
 * 获取商店统计
 */
export const getShopStatistics = query({
    args: {
        shopId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        return await PropShop.getShopStatistics(ctx, args.shopId);
    }
}); 