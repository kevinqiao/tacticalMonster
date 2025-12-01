/**
 * 商店刷新服务
 * 处理自动刷新逻辑
 */

import { ShopService } from "./shopService";

export class ShopRefreshService {
    /**
     * 刷新每日商店
     */
    static async refreshDailyShops(ctx: any): Promise<{
        success: boolean;
        message: string;
        refreshedShops?: number;
    }> {
        try {
            const nowISO = new Date().toISOString();
            console.log(`[Shop Refresh] 开始刷新每日商店 - ${nowISO}`);

            // 获取所有每日商店
            const dailyShops = await ctx.db
                .query("shop_configs")
                .withIndex("by_type", (q: any) => q.eq("type", "daily"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            let refreshedCount = 0;

            for (const shop of dailyShops) {
                try {
                    await ShopService.refreshShop(ctx, shop.shopId);
                    refreshedCount++;
                    console.log(`[Shop Refresh] 每日商店 ${shop.shopId} 刷新成功`);
                } catch (error: any) {
                    console.error(`[Shop Refresh] 每日商店 ${shop.shopId} 刷新失败:`, error);
                }
            }

            console.log(`[Shop Refresh] 每日商店刷新完成，刷新了 ${refreshedCount} 个商店`);

            return {
                success: true,
                message: `每日商店刷新完成，刷新了 ${refreshedCount} 个商店`,
                refreshedShops: refreshedCount,
            };
        } catch (error: any) {
            console.error("[Shop Refresh] 刷新每日商店失败:", error);
            return {
                success: false,
                message: `刷新每日商店失败: ${error.message}`,
            };
        }
    }

    /**
     * 刷新每周商店
     */
    static async refreshWeeklyShops(ctx: any): Promise<{
        success: boolean;
        message: string;
        refreshedShops?: number;
    }> {
        try {
            const nowISO = new Date().toISOString();
            console.log(`[Shop Refresh] 开始刷新每周商店 - ${nowISO}`);

            // 获取所有每周商店
            const weeklyShops = await ctx.db
                .query("shop_configs")
                .withIndex("by_type", (q: any) => q.eq("type", "weekly"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            let refreshedCount = 0;

            for (const shop of weeklyShops) {
                try {
                    await ShopService.refreshShop(ctx, shop.shopId);
                    refreshedCount++;
                    console.log(`[Shop Refresh] 每周商店 ${shop.shopId} 刷新成功`);
                } catch (error: any) {
                    console.error(`[Shop Refresh] 每周商店 ${shop.shopId} 刷新失败:`, error);
                }
            }

            console.log(`[Shop Refresh] 每周商店刷新完成，刷新了 ${refreshedCount} 个商店`);

            return {
                success: true,
                message: `每周商店刷新完成，刷新了 ${refreshedCount} 个商店`,
                refreshedShops: refreshedCount,
            };
        } catch (error: any) {
            console.error("[Shop Refresh] 刷新每周商店失败:", error);
            return {
                success: false,
                message: `刷新每周商店失败: ${error.message}`,
            };
        }
    }

    /**
     * 刷新赛季商店
     */
    static async refreshSeasonalShops(ctx: any): Promise<{
        success: boolean;
        message: string;
        refreshedShops?: number;
    }> {
        try {
            const nowISO = new Date().toISOString();
            console.log(`[Shop Refresh] 开始刷新赛季商店 - ${nowISO}`);

            // 获取所有赛季商店
            const seasonalShops = await ctx.db
                .query("shop_configs")
                .withIndex("by_type", (q: any) => q.eq("type", "seasonal"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            let refreshedCount = 0;

            for (const shop of seasonalShops) {
                try {
                    await ShopService.refreshShop(ctx, shop.shopId);
                    refreshedCount++;
                    console.log(`[Shop Refresh] 赛季商店 ${shop.shopId} 刷新成功`);
                } catch (error: any) {
                    console.error(`[Shop Refresh] 赛季商店 ${shop.shopId} 刷新失败:`, error);
                }
            }

            console.log(`[Shop Refresh] 赛季商店刷新完成，刷新了 ${refreshedCount} 个商店`);

            return {
                success: true,
                message: `赛季商店刷新完成，刷新了 ${refreshedCount} 个商店`,
                refreshedShops: refreshedCount,
            };
        } catch (error: any) {
            console.error("[Shop Refresh] 刷新赛季商店失败:", error);
            return {
                success: false,
                message: `刷新赛季商店失败: ${error.message}`,
            };
        }
    }

    /**
     * 刷新活动商店
     */
    static async refreshActivityShops(
        ctx: any,
        activityId: string
    ): Promise<{
        success: boolean;
        message: string;
        refreshedShops?: number;
    }> {
        try {
            const nowISO = new Date().toISOString();
            console.log(`[Shop Refresh] 开始刷新活动商店 - ${activityId}`);

            // 获取关联该活动的商店
            const activityShops = await ctx.db
                .query("shop_configs")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            let refreshedCount = 0;

            for (const shop of activityShops) {
                try {
                    await ShopService.refreshShop(ctx, shop.shopId);
                    refreshedCount++;
                    console.log(`[Shop Refresh] 活动商店 ${shop.shopId} 刷新成功`);
                } catch (error: any) {
                    console.error(`[Shop Refresh] 活动商店 ${shop.shopId} 刷新失败:`, error);
                }
            }

            console.log(`[Shop Refresh] 活动商店刷新完成，刷新了 ${refreshedCount} 个商店`);

            return {
                success: true,
                message: `活动商店刷新完成，刷新了 ${refreshedCount} 个商店`,
                refreshedShops: refreshedCount,
            };
        } catch (error: any) {
            console.error("[Shop Refresh] 刷新活动商店失败:", error);
            return {
                success: false,
                message: `刷新活动商店失败: ${error.message}`,
            };
        }
    }
}

