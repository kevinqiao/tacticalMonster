/**
 * 商店配置服务
 * 管理商店配置和商品配置
 */

export interface ShopConfig {
    shopId: string;
    name: string;
    description: string;
    type: "daily" | "weekly" | "seasonal" | "special";
    refreshTime: string; // "HH:MM" 格式
    isActive: boolean;
    activityId?: string;
}

export interface ShopItemConfig {
    shopId: string;
    itemId: string;
    itemType: "prop" | "monster" | "monsterShard" | "energy" | "exclusiveItem";
    quantity: number;
    price: number;
    gemPrice?: number;
    originalPrice?: number;
    discount?: number;
    discountType?: "percentage" | "fixed";
    isLimited: boolean;
    maxQuantity?: number;
    availableQuantity?: number;
    purchaseLimit?: {
        type: "daily" | "weekly" | "total";
        maxPurchases: number;
    };
    startTime?: string;
    endTime?: string;
    isActive: boolean;
    activityId?: string;
}

export class ShopConfigService {
    /**
     * 获取所有商店配置
     */
    static getShopConfigs(): ShopConfig[] {
        // 这里可以返回硬编码的配置，或者从数据库读取
        // 目前返回空数组，实际使用时可以从数据库查询
        return [];
    }

    /**
     * 创建商店
     */
    static async createShop(
        ctx: any,
        config: ShopConfig
    ): Promise<{
        success: boolean;
        message: string;
        shopId?: string;
    }> {
        try {
            const nowISO = new Date().toISOString();

            // 检查商店ID是否已存在
            const existing = await ctx.db
                .query("shop_configs")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", config.shopId))
                .first();

            if (existing) {
                return {
                    success: false,
                    message: `商店ID ${config.shopId} 已存在`,
                };
            }

            // 创建商店
            await ctx.db.insert("shop_configs", {
                shopId: config.shopId,
                name: config.name,
                description: config.description,
                type: config.type,
                refreshTime: config.refreshTime,
                lastRefreshTime: undefined,
                isActive: config.isActive,
                activityId: config.activityId,
                createdAt: nowISO,
                updatedAt: nowISO,
            });

            return {
                success: true,
                message: `商店 ${config.shopId} 创建成功`,
                shopId: config.shopId,
            };
        } catch (error: any) {
            console.error("创建商店失败:", error);
            return {
                success: false,
                message: `创建商店失败: ${error.message}`,
            };
        }
    }

    /**
     * 更新商店
     */
    static async updateShop(
        ctx: any,
        shopId: string,
        updates: Partial<ShopConfig>
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const shop = await ctx.db
                .query("shop_configs")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .first();

            if (!shop) {
                return {
                    success: false,
                    message: "商店不存在",
                };
            }

            const updateData: any = {
                updatedAt: new Date().toISOString(),
            };

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.type !== undefined) updateData.type = updates.type;
            if (updates.refreshTime !== undefined) updateData.refreshTime = updates.refreshTime;
            if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
            if (updates.activityId !== undefined) updateData.activityId = updates.activityId;

            await ctx.db.patch(shop._id, updateData);

            return {
                success: true,
                message: `商店 ${shopId} 更新成功`,
            };
        } catch (error: any) {
            console.error("更新商店失败:", error);
            return {
                success: false,
                message: `更新商店失败: ${error.message}`,
            };
        }
    }

    /**
     * 添加商店商品
     */
    static async addShopItem(
        ctx: any,
        itemConfig: ShopItemConfig
    ): Promise<{
        success: boolean;
        message: string;
        itemId?: string;
    }> {
        try {
            // 检查商店是否存在
            const shop = await ctx.db
                .query("shop_configs")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", itemConfig.shopId))
                .first();

            if (!shop) {
                return {
                    success: false,
                    message: "商店不存在",
                };
            }

            // 检查商品是否已存在
            const existing = await ctx.db
                .query("shop_items")
                .withIndex("by_shopId_itemId", (q: any) => 
                    q.eq("shopId", itemConfig.shopId).eq("itemId", itemConfig.itemId)
                )
                .first();

            if (existing) {
                return {
                    success: false,
                    message: `商品 ${itemConfig.itemId} 已存在于商店 ${itemConfig.shopId}`,
                };
            }

            const nowISO = new Date().toISOString();

            // 创建商品
            await ctx.db.insert("shop_items", {
                shopId: itemConfig.shopId,
                itemId: itemConfig.itemId,
                itemType: itemConfig.itemType,
                quantity: itemConfig.quantity,
                price: itemConfig.price,
                gemPrice: itemConfig.gemPrice,
                originalPrice: itemConfig.originalPrice,
                discount: itemConfig.discount,
                discountType: itemConfig.discountType,
                isLimited: itemConfig.isLimited,
                maxQuantity: itemConfig.maxQuantity,
                availableQuantity: itemConfig.availableQuantity || itemConfig.maxQuantity,
                purchaseLimit: itemConfig.purchaseLimit,
                startTime: itemConfig.startTime,
                endTime: itemConfig.endTime,
                isActive: itemConfig.isActive,
                activityId: itemConfig.activityId,
                createdAt: nowISO,
                updatedAt: nowISO,
            });

            return {
                success: true,
                message: `商品 ${itemConfig.itemId} 添加成功`,
                itemId: itemConfig.itemId,
            };
        } catch (error: any) {
            console.error("添加商店商品失败:", error);
            return {
                success: false,
                message: `添加商店商品失败: ${error.message}`,
            };
        }
    }

    /**
     * 更新商店商品
     */
    static async updateShopItem(
        ctx: any,
        shopId: string,
        itemId: string,
        updates: Partial<ShopItemConfig>
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const item = await ctx.db
                .query("shop_items")
                .withIndex("by_shopId_itemId", (q: any) => 
                    q.eq("shopId", shopId).eq("itemId", itemId)
                )
                .first();

            if (!item) {
                return {
                    success: false,
                    message: "商品不存在",
                };
            }

            const updateData: any = {
                updatedAt: new Date().toISOString(),
            };

            if (updates.itemType !== undefined) updateData.itemType = updates.itemType;
            if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
            if (updates.price !== undefined) updateData.price = updates.price;
            if (updates.gemPrice !== undefined) updateData.gemPrice = updates.gemPrice;
            if (updates.originalPrice !== undefined) updateData.originalPrice = updates.originalPrice;
            if (updates.discount !== undefined) updateData.discount = updates.discount;
            if (updates.discountType !== undefined) updateData.discountType = updates.discountType;
            if (updates.isLimited !== undefined) updateData.isLimited = updates.isLimited;
            if (updates.maxQuantity !== undefined) updateData.maxQuantity = updates.maxQuantity;
            if (updates.availableQuantity !== undefined) updateData.availableQuantity = updates.availableQuantity;
            if (updates.purchaseLimit !== undefined) updateData.purchaseLimit = updates.purchaseLimit;
            if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
            if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
            if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
            if (updates.activityId !== undefined) updateData.activityId = updates.activityId;

            await ctx.db.patch(item._id, updateData);

            return {
                success: true,
                message: `商品 ${itemId} 更新成功`,
            };
        } catch (error: any) {
            console.error("更新商店商品失败:", error);
            return {
                success: false,
                message: `更新商店商品失败: ${error.message}`,
            };
        }
    }

    /**
     * 删除商店商品
     */
    static async deleteShopItem(
        ctx: any,
        shopId: string,
        itemId: string
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const item = await ctx.db
                .query("shop_items")
                .withIndex("by_shopId_itemId", (q: any) => 
                    q.eq("shopId", shopId).eq("itemId", itemId)
                )
                .first();

            if (!item) {
                return {
                    success: false,
                    message: "商品不存在",
                };
            }

            await ctx.db.delete(item._id);

            return {
                success: true,
                message: `商品 ${itemId} 删除成功`,
            };
        } catch (error: any) {
            console.error("删除商店商品失败:", error);
            return {
                success: false,
                message: `删除商店商品失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取商店配置
     */
    static async getShopConfig(
        ctx: any,
        shopId: string
    ): Promise<{
        success: boolean;
        shop?: any;
        message?: string;
    }> {
        try {
            const shop = await ctx.db
                .query("shop_configs")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .first();

            if (!shop) {
                return {
                    success: false,
                    message: "商店不存在",
                };
            }

            return {
                success: true,
                shop,
            };
        } catch (error: any) {
            console.error("获取商店配置失败:", error);
            return {
                success: false,
                message: `获取商店配置失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取所有商店
     */
    static async getAllShops(
        ctx: any,
        filters?: {
            type?: "daily" | "weekly" | "seasonal" | "special";
            isActive?: boolean;
            activityId?: string;
        }
    ): Promise<{
        success: boolean;
        shops?: any[];
        message?: string;
    }> {
        try {
            let query = ctx.db.query("shop_configs");

            if (filters?.type) {
                query = query.withIndex("by_type", (q: any) => q.eq("type", filters.type));
            } else if (filters?.isActive !== undefined) {
                query = query.withIndex("by_isActive", (q: any) => q.eq("isActive", filters.isActive));
            }

            const shops = await query.collect();

            let filtered = shops;
            if (filters?.type) {
                filtered = filtered.filter((s: any) => s.type === filters.type);
            }
            if (filters?.isActive !== undefined) {
                filtered = filtered.filter((s: any) => s.isActive === filters.isActive);
            }
            if (filters?.activityId) {
                filtered = filtered.filter((s: any) => s.activityId === filters.activityId);
            }

            return {
                success: true,
                shops: filtered,
            };
        } catch (error: any) {
            console.error("获取所有商店失败:", error);
            return {
                success: false,
                message: `获取所有商店失败: ${error.message}`,
            };
        }
    }
}

