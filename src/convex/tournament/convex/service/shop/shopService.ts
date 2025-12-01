/**
 * 商店系统核心服务
 * 处理商品查询、购买、刷新等核心功能
 */

import { CoinRewardHandler } from "../reward/rewardHandlers/coinRewardHandler";
import { GemRewardHandler } from "../reward/rewardHandlers/gemRewardHandler";
import { RewardService } from "../reward/rewardService";
import { UnifiedRewards } from "../reward/rewardTypes";

export interface ShopItem {
    _id: string;
    shopId: string;
    itemId: string;
    itemType: "prop" | "monster" | "monsterShard" | "energy" | "exclusiveItem";
    quantity: number;
    price: number;
    gemPrice?: number;
    originalPrice?: number;
    discount?: number;
    discountType?: "percentage" | "fixed";
    finalPrice: number; // 最终价格（考虑折扣）
    finalGemPrice?: number; // 最终宝石价格（考虑折扣）
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
    canPurchase: boolean; // 是否可以购买
    purchaseCount?: {
        daily: number;
        weekly: number;
        total: number;
    };
}

export interface PurchaseResult {
    success: boolean;
    message: string;
    purchaseId?: string;
    grantedRewards?: Partial<UnifiedRewards>;
}

export class ShopService {
    /**
     * 获取商店商品列表
     */
    static async getShopItems(
        ctx: any,
        shopId: string,
        uid: string
    ): Promise<{
        success: boolean;
        items?: ShopItem[];
        message?: string;
    }> {
        try {
            const nowISO = new Date().toISOString();
            const today = nowISO.split('T')[0];

            // 检查商店是否存在
            const shop = await ctx.db
                .query("shop_configs")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .first();

            if (!shop || !shop.isActive) {
                return {
                    success: false,
                    message: "商店不存在或未激活",
                };
            }

            // 获取商店商品
            const items = await ctx.db
                .query("shop_items")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            // 获取活动折扣（如果有）
            let activityDiscount = 0;
            if (shop.activityId) {
                const activity = await ctx.db
                    .query("activity_templates")
                    .withIndex("by_activityId", (q: any) => q.eq("activityId", shop.activityId))
                    .first();

                if (activity && activity.isActive) {
                    const now = new Date();
                    const startDate = new Date(activity.startDate);
                    const endDate = new Date(activity.endDate);

                    if (now >= startDate && now <= endDate) {
                        // 从活动规则中获取折扣
                        if (activity.rules?.shopDiscount) {
                            activityDiscount = activity.rules.shopDiscount;
                        }
                    }
                }
            }

            // 处理每个商品
            const shopItems: ShopItem[] = [];

            for (const item of items) {
                // 检查时间限制
                if (item.startTime && nowISO < item.startTime) {
                    continue; // 未开始
                }
                if (item.endTime && nowISO > item.endTime) {
                    continue; // 已过期
                }

                // 计算最终价格（考虑折扣和活动折扣）
                let finalPrice = item.price;
                let finalGemPrice = item.gemPrice;

                // 应用商品折扣
                if (item.discount && item.discount > 0) {
                    if (item.discountType === "percentage") {
                        finalPrice = Math.floor(item.price * (1 - item.discount / 100));
                        if (finalGemPrice) {
                            finalGemPrice = Math.floor(finalGemPrice * (1 - item.discount / 100));
                        }
                    } else if (item.discountType === "fixed") {
                        finalPrice = Math.max(0, item.price - item.discount);
                        if (finalGemPrice) {
                            finalGemPrice = Math.max(0, (finalGemPrice || 0) - item.discount);
                        }
                    }
                }

                // 应用活动折扣
                if (activityDiscount > 0) {
                    finalPrice = Math.floor(finalPrice * (1 - activityDiscount / 100));
                    if (finalGemPrice) {
                        finalGemPrice = Math.floor(finalGemPrice * (1 - activityDiscount / 100));
                    }
                }

                // 检查购买限制
                const purchaseLimit = await this.checkPurchaseLimit(ctx, uid, shopId, item.itemId);

                // 检查是否可以购买
                let canPurchase = true;
                if (item.isLimited && item.availableQuantity !== undefined && item.availableQuantity <= 0) {
                    canPurchase = false;
                }
                if (item.purchaseLimit) {
                    const limitType = item.purchaseLimit.type as "daily" | "weekly" | "total";
                    const currentCount = purchaseLimit[limitType] || 0;
                    if (currentCount >= item.purchaseLimit.maxPurchases) {
                        canPurchase = false;
                    }
                }

                shopItems.push({
                    _id: item._id,
                    shopId: item.shopId,
                    itemId: item.itemId,
                    itemType: item.itemType,
                    quantity: item.quantity,
                    price: item.price,
                    gemPrice: item.gemPrice,
                    originalPrice: item.originalPrice,
                    discount: item.discount,
                    discountType: item.discountType,
                    finalPrice,
                    finalGemPrice,
                    isLimited: item.isLimited,
                    maxQuantity: item.maxQuantity,
                    availableQuantity: item.availableQuantity,
                    purchaseLimit: item.purchaseLimit,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    isActive: item.isActive,
                    activityId: item.activityId,
                    canPurchase,
                    purchaseCount: purchaseLimit,
                });
            }

            return {
                success: true,
                items: shopItems,
            };
        } catch (error: any) {
            console.error("获取商店商品失败:", error);
            return {
                success: false,
                message: `获取商店商品失败: ${error.message}`,
            };
        }
    }

    /**
     * 购买商品
     */
    static async purchaseItem(
        ctx: any,
        params: {
            uid: string;
            shopId: string;
            itemId: string;
            quantity: number;
            paymentType: "coins" | "gems";
        }
    ): Promise<PurchaseResult> {
        const { uid, shopId, itemId, quantity } = params;
        const nowISO = new Date().toISOString();
        const today = nowISO.split('T')[0];

        try {
            // 获取商品信息
            const item = await ctx.db
                .query("shop_items")
                .withIndex("by_shopId_itemId", (q: any) => q.eq("shopId", shopId).eq("itemId", itemId))
                .first();

            if (!item || !item.isActive) {
                return {
                    success: false,
                    message: "商品不存在或未激活",
                };
            }

            // 检查时间限制
            if (item.startTime && nowISO < item.startTime) {
                return {
                    success: false,
                    message: "商品尚未开始销售",
                };
            }
            if (item.endTime && nowISO > item.endTime) {
                return {
                    success: false,
                    message: "商品已过期",
                };
            }

            // 检查限量
            if (item.isLimited && item.availableQuantity !== undefined) {
                if (item.availableQuantity < quantity) {
                    return {
                        success: false,
                        message: `商品库存不足，剩余 ${item.availableQuantity} 件`,
                    };
                }
            }

            // 检查购买限制
            const purchaseLimit = await this.checkPurchaseLimit(ctx, uid, shopId, itemId);
            if (item.purchaseLimit) {
                const limitType = item.purchaseLimit.type as "daily" | "weekly" | "total";
                const currentCount = purchaseLimit[limitType] || 0;
                if (currentCount + quantity > item.purchaseLimit.maxPurchases) {
                    return {
                        success: false,
                        message: `已达到购买限制，最多可购买 ${item.purchaseLimit.maxPurchases} 次`,
                    };
                }
            }

            // 获取商店配置（用于活动折扣）
            const shop = await ctx.db
                .query("shop_configs")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .first();

            let activityDiscount = 0;
            if (shop?.activityId) {
                const activity = await ctx.db
                    .query("activity_templates")
                    .withIndex("by_activityId", (q: any) => q.eq("activityId", shop.activityId))
                    .first();

                if (activity && activity.isActive) {
                    const now = new Date();
                    const startDate = new Date(activity.startDate);
                    const endDate = new Date(activity.endDate);

                    if (now >= startDate && now <= endDate) {
                        if (activity.rules?.shopDiscount) {
                            activityDiscount = activity.rules.shopDiscount;
                        }
                    }
                }
            }

            // 计算价格
            let finalPrice = item.price;
            let finalGemPrice = item.gemPrice;

            // 应用商品折扣
            if (item.discount && item.discount > 0) {
                if (item.discountType === "percentage") {
                    finalPrice = Math.floor(item.price * (1 - item.discount / 100));
                    if (finalGemPrice) {
                        finalGemPrice = Math.floor(finalGemPrice * (1 - item.discount / 100));
                    }
                } else if (item.discountType === "fixed") {
                    finalPrice = Math.max(0, item.price - item.discount);
                    if (finalGemPrice) {
                        finalGemPrice = Math.max(0, (finalGemPrice || 0) - item.discount);
                    }
                }
            }

            // 应用活动折扣
            if (activityDiscount > 0) {
                finalPrice = Math.floor(finalPrice * (1 - activityDiscount / 100));
                if (finalGemPrice) {
                    finalGemPrice = Math.floor(finalGemPrice * (1 - activityDiscount / 100));
                }
            }

            const totalCost = finalPrice * quantity;
            const totalGemCost = finalGemPrice ? finalGemPrice * quantity : undefined;

            // 检查支付方式
            if (params.paymentType === "coins") {
                const coinBalance = await CoinRewardHandler.getBalance(ctx, uid);
                if (coinBalance < totalCost) {
                    return {
                        success: false,
                        message: `金币不足，需要 ${totalCost}，当前只有 ${coinBalance}`,
                    };
                }
            } else if (params.paymentType === "gems") {
                if (!finalGemPrice) {
                    return {
                        success: false,
                        message: "该商品不支持宝石支付",
                    };
                }
                const gemBalance = await GemRewardHandler.getBalance(ctx, uid);
                if (gemBalance < (totalGemCost || 0)) {
                    return {
                        success: false,
                        message: `宝石不足，需要 ${totalGemCost}，当前只有 ${gemBalance}`,
                    };
                }
            }

            // 扣除支付货币
            if (params.paymentType === "coins") {
                const deductResult = await CoinRewardHandler.deduct(ctx, {
                    uid,
                    coins: totalCost,
                    source: "shop",
                    sourceId: `${shopId}_${itemId}`,
                });
                if (!deductResult.success) {
                    return {
                        success: false,
                        message: deductResult.message,
                    };
                }
            } else {
                const deductResult = await GemRewardHandler.deduct(ctx, {
                    uid,
                    gems: totalGemCost || 0,
                    source: "shop",
                    sourceId: `${shopId}_${itemId}`,
                });
                if (!deductResult.success) {
                    return {
                        success: false,
                        message: deductResult.message,
                    };
                }
            }

            // 构建奖励
            const rewards: UnifiedRewards = {};

            if (item.itemType === "prop") {
                rewards.props = [{
                    gameType: "solitaire", // TODO: 从商品配置中获取
                    propType: item.itemId,
                    quantity: item.quantity * quantity,
                }];
            } else if (item.itemType === "monster") {
                // 创建多个怪物实例（根据quantity）
                const monsterCount = item.quantity * quantity;
                rewards.monsters = Array(monsterCount).fill(null).map(() => ({
                    monsterId: item.itemId,
                    level: 1,
                    stars: 1,
                }));
            } else if (item.itemType === "monsterShard") {
                rewards.monsterShards = [{
                    monsterId: item.itemId,
                    quantity: item.quantity * quantity,
                }];
            } else if (item.itemType === "energy") {
                rewards.energy = item.quantity * quantity;
            } else if (item.itemType === "exclusiveItem") {
                rewards.exclusiveItems = [{
                    itemId: item.itemId,
                    itemType: "exclusive",
                    quantity: item.quantity * quantity,
                }];
            }

            // 发放奖励
            const rewardResult = await RewardService.grantRewards(ctx, {
                uid,
                rewards,
                source: {
                    source: "shop",
                    sourceId: `${shopId}_${itemId}`,
                    metadata: {
                        shopId,
                        itemId,
                        quantity,
                        paymentType: params.paymentType,
                    },
                },
                gameType: item.itemType === "monster" || item.itemType === "monsterShard" || item.itemType === "energy"
                    ? "tacticalMonster"
                    : undefined,
            });

            if (!rewardResult.success) {
                // 回滚支付
                if (params.paymentType === "coins") {
                    await CoinRewardHandler.grant(ctx, {
                        uid,
                        coins: totalCost,
                        source: "shop_refund",
                        sourceId: `${shopId}_${itemId}`,
                    });
                } else {
                    await GemRewardHandler.grant(ctx, {
                        uid,
                        gems: totalGemCost || 0,
                        source: "shop_refund",
                        sourceId: `${shopId}_${itemId}`,
                    });
                }
                return {
                    success: false,
                    message: `奖励发放失败: ${rewardResult.message}`,
                };
            }

            // 更新商品库存
            if (item.isLimited && item.availableQuantity !== undefined) {
                await ctx.db.patch(item._id, {
                    availableQuantity: item.availableQuantity - quantity,
                    updatedAt: nowISO,
                });
            }

            // 记录购买
            const purchaseRecord = await ctx.db.insert("player_shop_purchases", {
                uid,
                shopId,
                itemId,
                itemType: item.itemType,
                quantity,
                price: finalPrice,
                gemPrice: finalGemPrice,
                totalCost,
                totalGemCost,
                paymentType: params.paymentType,
                originalPrice: item.originalPrice,
                discount: item.discount,
                purchaseDate: today,
                purchaseTime: nowISO,
                activityId: shop?.activityId,
                createdAt: nowISO,
            });

            // 更新购买限制
            await this.updatePurchaseLimit(ctx, uid, shopId, itemId, quantity, today);

            // 同步活动进度（如果关联活动）
            if (shop?.activityId) {
                try {
                    const { ActivityIntegrationService } = await import("../activity/activityIntegrationService");
                    await ActivityIntegrationService.syncWithShop(ctx, uid, shopId, {
                        itemId,
                        quantity,
                        totalCost,
                        purchaseTime: nowISO,
                    });
                } catch (error: any) {
                    console.error("活动同步失败:", error);
                }
            }

            return {
                success: true,
                message: `成功购买 ${quantity} 个 ${itemId}`,
                purchaseId: purchaseRecord,
                grantedRewards: rewardResult.grantedRewards,
            };
        } catch (error: any) {
            console.error("购买商品失败:", error);
            return {
                success: false,
                message: `购买商品失败: ${error.message}`,
            };
        }
    }

    /**
     * 检查购买限制
     */
    static async checkPurchaseLimit(
        ctx: any,
        uid: string,
        shopId: string,
        itemId: string
    ): Promise<{
        daily: number;
        weekly: number;
        total: number;
    }> {
        const today = new Date().toISOString().split('T')[0];

        // 计算本周开始日期（周一）
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysToMonday);
        const weekStart = monday.toISOString().split('T')[0];

        const limit = await ctx.db
            .query("player_shop_limits")
            .withIndex("by_uid_shopId_itemId", (q: any) =>
                q.eq("uid", uid).eq("shopId", shopId).eq("itemId", itemId)
            )
            .first();

        if (!limit) {
            return { daily: 0, weekly: 0, total: 0 };
        }

        // 检查是否需要重置每日限制
        if (limit.lastResetDate !== today) {
            await ctx.db.patch(limit._id, {
                dailyPurchases: 0,
                lastResetDate: today,
                updatedAt: new Date().toISOString(),
            });
            limit.dailyPurchases = 0;
        }

        // 检查是否需要重置每周限制
        if (limit.lastResetWeek !== weekStart) {
            await ctx.db.patch(limit._id, {
                weeklyPurchases: 0,
                lastResetWeek: weekStart,
                updatedAt: new Date().toISOString(),
            });
            limit.weeklyPurchases = 0;
        }

        return {
            daily: limit.dailyPurchases || 0,
            weekly: limit.weeklyPurchases || 0,
            total: limit.totalPurchases || 0,
        };
    }

    /**
     * 更新购买限制
     */
    static async updatePurchaseLimit(
        ctx: any,
        uid: string,
        shopId: string,
        itemId: string,
        quantity: number,
        today: string
    ): Promise<void> {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysToMonday);
        const weekStart = monday.toISOString().split('T')[0];

        const limit = await ctx.db
            .query("player_shop_limits")
            .withIndex("by_uid_shopId_itemId", (q: any) =>
                q.eq("uid", uid).eq("shopId", shopId).eq("itemId", itemId)
            )
            .first();

        const nowISO = new Date().toISOString();

        if (limit) {
            // 重置每日/每周限制（如果需要）
            let dailyPurchases = limit.dailyPurchases || 0;
            let weeklyPurchases = limit.weeklyPurchases || 0;
            let lastResetDate = limit.lastResetDate || today;
            let lastResetWeek = limit.lastResetWeek || weekStart;

            if (lastResetDate !== today) {
                dailyPurchases = 0;
                lastResetDate = today;
            }
            if (lastResetWeek !== weekStart) {
                weeklyPurchases = 0;
                lastResetWeek = weekStart;
            }

            await ctx.db.patch(limit._id, {
                dailyPurchases: dailyPurchases + quantity,
                weeklyPurchases: weeklyPurchases + quantity,
                totalPurchases: (limit.totalPurchases || 0) + quantity,
                lastResetDate,
                lastResetWeek,
                updatedAt: nowISO,
            });
        } else {
            await ctx.db.insert("player_shop_limits", {
                uid,
                shopId,
                itemId,
                dailyPurchases: quantity,
                weeklyPurchases: quantity,
                totalPurchases: quantity,
                lastResetDate: today,
                lastResetWeek: weekStart,
                createdAt: nowISO,
                updatedAt: nowISO,
            });
        }
    }

    /**
     * 获取玩家购买历史
     */
    static async getPlayerPurchaseHistory(
        ctx: any,
        uid: string,
        shopId?: string
    ): Promise<{
        success: boolean;
        purchases?: any[];
        message?: string;
    }> {
        try {
            let query = ctx.db
                .query("player_shop_purchases")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid));

            if (shopId) {
                query = query.filter((q: any) => q.eq(q.field("shopId"), shopId));
            }

            const purchases = await query
                .order("desc")
                .collect();

            return {
                success: true,
                purchases,
            };
        } catch (error: any) {
            console.error("获取购买历史失败:", error);
            return {
                success: false,
                message: `获取购买历史失败: ${error.message}`,
            };
        }
    }

    /**
     * 刷新商店（重置购买限制等）
     */
    static async refreshShop(
        ctx: any,
        shopId: string
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

            const nowISO = new Date().toISOString();

            // 更新最后刷新时间
            await ctx.db.patch(shop._id, {
                lastRefreshTime: nowISO,
                updatedAt: nowISO,
            });

            // 记录刷新日志
            const items = await ctx.db
                .query("shop_items")
                .withIndex("by_shopId", (q: any) => q.eq("shopId", shopId))
                .collect();

            await ctx.db.insert("shop_refresh_logs", {
                shopId,
                refreshTime: nowISO,
                refreshType: shop.type === "daily" ? "daily"
                    : shop.type === "weekly" ? "weekly"
                        : shop.type === "seasonal" ? "seasonal"
                            : "manual",
                itemsRefreshed: items.length,
                previousRefreshTime: shop.lastRefreshTime,
                createdAt: nowISO,
            });

            return {
                success: true,
                message: `商店 ${shopId} 刷新成功`,
            };
        } catch (error: any) {
            console.error("刷新商店失败:", error);
            return {
                success: false,
                message: `刷新商店失败: ${error.message}`,
            };
        }
    }
}

