/**
 * 活动集成服务
 * 处理活动系统与其他系统的集成
 */

import { ShopService } from "../shop/shopService";
import { ActivityService } from "./activityService";

export class ActivityIntegrationService {
    /**
     * 与任务系统同步
     * 当任务完成时，检查是否触发活动进度
     */
    static async syncWithTaskSystem(
        ctx: any,
        uid: string,
        action: string,
        actionData: any
    ): Promise<{
        success: boolean;
        message: string;
        updatedActivities?: string[];
    }> {
        try {
            // 获取所有进度类型的活动
            const progressActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_type", (q: any) => q.eq("type", "progress"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            const nowISO = new Date().toISOString();
            const updatedActivities: string[] = [];

            for (const activity of progressActivities) {
                // 检查活动时间
                if (nowISO < activity.startDate || nowISO > activity.endDate) {
                    continue;
                }

                // 检查活动规则是否匹配当前动作
                const rules = activity.rules;
                if (rules.type === "progress" && rules.targets) {
                    const matchingTargets = rules.targets.filter((target: any) => target.action === action);
                    if (matchingTargets.length > 0) {
                        // 更新活动进度
                        const result = await ActivityService.processProgressActivity(
                            ctx,
                            uid,
                            activity.activityId,
                            action,
                            actionData
                        );

                        if (result.success) {
                            updatedActivities.push(activity.activityId);
                        }
                    }
                }
            }

            return {
                success: true,
                message: `任务系统同步完成，更新了 ${updatedActivities.length} 个活动`,
                updatedActivities,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `任务系统同步失败: ${error.message}`,
            };
        }
    }

    /**
     * 发送活动通知
     */
    static async sendActivityNotification(
        ctx: any,
        uid: string,
        activityId: string,
        type: "started" | "progress" | "reward_available" | "ending_soon" | "completed"
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            // 获取活动模板
            const template = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .unique();

            if (!template) {
                return {
                    success: false,
                    message: "活动不存在",
                };
            }

            // 构建通知消息
            let message = "";
            switch (type) {
                case "started":
                    message = `新活动开始：${template.name}！快来参与吧！`;
                    break;
                case "progress":
                    message = `活动进度更新：${template.name}，继续加油！`;
                    break;
                case "reward_available":
                    message = `活动奖励可领取：${template.name}，快去领取吧！`;
                    break;
                case "ending_soon":
                    const endDate = new Date(template.endDate);
                    const hoursLeft = Math.floor((endDate.getTime() - Date.now()) / (1000 * 60 * 60));
                    message = `活动即将结束：${template.name}，还剩 ${hoursLeft} 小时！`;
                    break;
                case "completed":
                    message = `恭喜完成活动：${template.name}！`;
                    break;
            }

            // 发送通知
            await ctx.db.insert("notifications", {
                uid,
                message,
                type: "activity",
                isRead: false,
                createdAt: new Date().toISOString(),
            });

            return {
                success: true,
                message: "通知发送成功",
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发送通知失败: ${error.message}`,
            };
        }
    }

    /**
     * 检查并发送活动开始通知
     */
    static async checkAndNotifyActivityStart(
        ctx: any,
        uid: string
    ): Promise<{
        success: boolean;
        message: string;
        notifiedActivities?: string[];
    }> {
        try {
            const nowISO = new Date().toISOString();
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // 获取最近24小时内开始的活动
            const newActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_active", (q: any) => q.eq("isActive", true))
                .filter((q: any) =>
                    q.and(
                        q.gte(q.field("startDate"), oneDayAgo),
                        q.lte(q.field("startDate"), nowISO)
                    )
                )
                .collect();

            const notifiedActivities: string[] = [];

            for (const activity of newActivities) {
                // 检查玩家是否已参与
                const progress = await ActivityService.getPlayerActivityProgress(ctx, uid, activity.activityId);
                if (!progress) {
                    // 发送活动开始通知
                    await this.sendActivityNotification(ctx, uid, activity.activityId, "started");
                    notifiedActivities.push(activity.activityId);
                }
            }

            return {
                success: true,
                message: `检查完成，通知了 ${notifiedActivities.length} 个新活动`,
                notifiedActivities,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `检查活动开始通知失败: ${error.message}`,
            };
        }
    }

    /**
     * 检查并发送活动即将结束通知
     */
    static async checkAndNotifyActivityEnding(
        ctx: any,
        uid: string
    ): Promise<{
        success: boolean;
        message: string;
        notifiedActivities?: string[];
    }> {
        try {
            const nowISO = new Date().toISOString();
            const oneDayLater = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            // 获取24小时内即将结束的活动
            const endingActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_active", (q: any) => q.eq("isActive", true))
                .filter((q: any) =>
                    q.and(
                        q.gte(q.field("endDate"), nowISO),
                        q.lte(q.field("endDate"), oneDayLater)
                    )
                )
                .collect();

            const notifiedActivities: string[] = [];

            for (const activity of endingActivities) {
                // 检查玩家是否参与且未完成
                const progress = await ActivityService.getPlayerActivityProgress(ctx, uid, activity.activityId);
                if (progress && progress.status === "active") {
                    // 发送活动即将结束通知
                    await this.sendActivityNotification(ctx, uid, activity.activityId, "ending_soon");
                    notifiedActivities.push(activity.activityId);
                }
            }

            return {
                success: true,
                message: `检查完成，通知了 ${notifiedActivities.length} 个即将结束的活动`,
                notifiedActivities,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `检查活动结束通知失败: ${error.message}`,
            };
        }
    }

    /**
     * 与排行榜系统同步
     * 当排行榜结算或玩家排名/积分变化时，更新活动进度
     */
    static async syncWithLeaderboard(
        ctx: any,
        uid: string,
        leaderboardData: {
            leaderboardType: "daily" | "weekly" | "seasonal";
            rank?: number;
            score?: number;
            date: string;
            gameType?: string;
            seasonId?: string; // 赛季ID（仅seasonal类型使用）
        }
    ): Promise<{
        success: boolean;
        message: string;
        updatedActivities?: string[];
    }> {
        try {
            // 获取所有进度类型的活动
            const progressActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_type", (q: any) => q.eq("type", "progress"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            const nowISO = new Date().toISOString();
            const updatedActivities: string[] = [];

            for (const activity of progressActivities) {
                // 检查活动时间
                if (nowISO < activity.startDate || nowISO > activity.endDate) {
                    continue;
                }

                // 检查活动规则是否匹配排行榜相关动作
                const rules = activity.rules;
                if (rules.type === "progress" && rules.targets) {
                    const matchingTargets = rules.targets.filter((target: any) => {
                        // 检查是否是排行榜相关的 action
                        const leaderboardActions = [
                            "leaderboard_rank",
                            "weekly_leaderboard_rank",
                            "leaderboard_score",
                            "maintain_leaderboard_rank",
                            "claim_leaderboard_reward"
                        ];
                        return leaderboardActions.includes(target.action);
                    });

                    if (matchingTargets.length > 0) {
                        // 根据不同的 action 类型处理
                        for (const target of matchingTargets) {
                            let actionData: any = {};

                            if (target.action === "leaderboard_rank" || target.action === "weekly_leaderboard_rank") {
                                // 达到特定排名
                                if (leaderboardData.rank !== undefined) {
                                    // 排名越小越好，所以如果当前排名 <= 目标排名值，则达到目标
                                    if (leaderboardData.rank <= target.value) {
                                        actionData = {
                                            value: leaderboardData.rank,
                                            increment: 1,
                                            rank: leaderboardData.rank,
                                            leaderboardType: leaderboardData.leaderboardType,
                                        };
                                    }
                                }
                            } else if (target.action === "leaderboard_score") {
                                // 累计排行榜积分
                                if (leaderboardData.score !== undefined) {
                                    actionData = {
                                        value: leaderboardData.score,
                                        increment: leaderboardData.score,
                                        score: leaderboardData.score,
                                        leaderboardType: leaderboardData.leaderboardType,
                                    };
                                }
                            } else if (target.action === "maintain_leaderboard_rank") {
                                // 保持排名（需要特殊处理，检查连续天数）
                                if (leaderboardData.rank !== undefined && target.actionData?.rankThreshold) {
                                    if (leaderboardData.rank <= target.actionData.rankThreshold) {
                                        actionData = {
                                            value: 1, // 增加连续天数
                                            increment: 1,
                                            rank: leaderboardData.rank,
                                            rankThreshold: target.actionData.rankThreshold,
                                            leaderboardType: leaderboardData.leaderboardType,
                                        };
                                    } else {
                                        // 排名不达标，重置连续天数
                                        actionData = {
                                            value: 0,
                                            increment: 0,
                                            reset: true,
                                            rank: leaderboardData.rank,
                                            rankThreshold: target.actionData.rankThreshold,
                                            leaderboardType: leaderboardData.leaderboardType,
                                        };
                                    }
                                }
                            } else if (target.action === "claim_leaderboard_reward") {
                                // 领取排行榜奖励
                                actionData = {
                                    value: 1,
                                    increment: 1,
                                    leaderboardType: leaderboardData.leaderboardType,
                                    date: leaderboardData.date,
                                };
                            }

                            // 如果有有效的 actionData，更新活动进度
                            if (Object.keys(actionData).length > 0) {
                                const result = await ActivityService.processProgressActivity(
                                    ctx,
                                    uid,
                                    activity.activityId,
                                    target.action,
                                    actionData
                                );

                                if (result.success && !updatedActivities.includes(activity.activityId)) {
                                    updatedActivities.push(activity.activityId);
                                }
                            }
                        }
                    }
                }
            }

            return {
                success: true,
                message: `排行榜系统同步完成，更新了 ${updatedActivities.length} 个活动`,
                updatedActivities,
            };
        } catch (error: any) {
            console.error("排行榜系统同步失败:", error);
            return {
                success: false,
                message: `排行榜系统同步失败: ${error.message}`,
            };
        }
    }

    /**
     * 与商店系统同步
     * 当玩家在商店购买商品时，检查是否触发活动进度
     */
    static async syncWithShop(
        ctx: any,
        uid: string,
        shopId: string,
        purchaseData: {
            itemId: string;
            quantity: number;
            totalCost: number;
            purchaseTime: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        updatedActivities?: string[];
    }> {
        try {
            // 获取商店配置
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
            const updatedActivities: string[] = [];

            // 如果商店关联了活动，更新该活动的进度
            if (shop.activityId) {
                const activity = await ctx.db
                    .query("activity_templates")
                    .withIndex("by_activityId", (q: any) => q.eq("activityId", shop.activityId))
                    .first();

                if (activity && activity.isActive) {
                    const startDate = new Date(activity.startDate);
                    const endDate = new Date(activity.endDate);
                    const now = new Date();

                    if (now >= startDate && now <= endDate) {
                        // 检查活动规则是否包含商店购买相关的目标
                        const rules = activity.rules;
                        if (rules.type === "progress" && rules.targets) {
                            const matchingTargets = rules.targets.filter((target: any) => {
                                const shopActions = [
                                    "shop_purchase",
                                    "shop_purchase_count",
                                    "shop_purchase_cost",
                                    "activity_shop_purchase",
                                ];
                                return shopActions.includes(target.action);
                            });

                            if (matchingTargets.length > 0) {
                                for (const target of matchingTargets) {
                                    let actionData: any = {};

                                    if (target.action === "shop_purchase" || target.action === "activity_shop_purchase") {
                                        // 购买商品（计数）
                                        actionData = {
                                            value: purchaseData.quantity,
                                            increment: purchaseData.quantity,
                                            itemId: purchaseData.itemId,
                                            shopId,
                                        };
                                    } else if (target.action === "shop_purchase_count") {
                                        // 购买次数
                                        actionData = {
                                            value: 1,
                                            increment: 1,
                                            shopId,
                                        };
                                    } else if (target.action === "shop_purchase_cost") {
                                        // 购买花费
                                        actionData = {
                                            value: purchaseData.totalCost,
                                            increment: purchaseData.totalCost,
                                            shopId,
                                        };
                                    }

                                    if (Object.keys(actionData).length > 0) {
                                        const result = await ActivityService.processProgressActivity(
                                            ctx,
                                            uid,
                                            activity.activityId,
                                            target.action,
                                            actionData
                                        );

                                        if (result.success && !updatedActivities.includes(activity.activityId)) {
                                            updatedActivities.push(activity.activityId);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 同时检查是否有其他活动也监听商店购买
            const progressActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_type", (q: any) => q.eq("type", "progress"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            for (const activity of progressActivities) {
                // 跳过已经处理过的活动
                if (activity.activityId === shop.activityId) {
                    continue;
                }

                // 检查活动时间
                if (nowISO < activity.startDate || nowISO > activity.endDate) {
                    continue;
                }

                // 检查活动规则是否包含商店购买相关的目标
                const rules = activity.rules;
                if (rules.type === "progress" && rules.targets) {
                    const matchingTargets = rules.targets.filter((target: any) => {
                        const shopActions = ["shop_purchase", "shop_purchase_count", "shop_purchase_cost"];
                        return shopActions.includes(target.action);
                    });

                    if (matchingTargets.length > 0) {
                        for (const target of matchingTargets) {
                            let actionData: any = {};

                            if (target.action === "shop_purchase") {
                                actionData = {
                                    value: purchaseData.quantity,
                                    increment: purchaseData.quantity,
                                    itemId: purchaseData.itemId,
                                    shopId,
                                };
                            } else if (target.action === "shop_purchase_count") {
                                actionData = {
                                    value: 1,
                                    increment: 1,
                                    shopId,
                                };
                            } else if (target.action === "shop_purchase_cost") {
                                actionData = {
                                    value: purchaseData.totalCost,
                                    increment: purchaseData.totalCost,
                                    shopId,
                                };
                            }

                            if (Object.keys(actionData).length > 0) {
                                const result = await ActivityService.processProgressActivity(
                                    ctx,
                                    uid,
                                    activity.activityId,
                                    target.action,
                                    actionData
                                );

                                if (result.success && !updatedActivities.includes(activity.activityId)) {
                                    updatedActivities.push(activity.activityId);
                                }
                            }
                        }
                    }
                }
            }

            return {
                success: true,
                message: `商店系统同步完成，更新了 ${updatedActivities.length} 个活动`,
                updatedActivities,
            };
        } catch (error: any) {
            console.error("商店系统同步失败:", error);
            return {
                success: false,
                message: `商店系统同步失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取活动关联的商店
     */
    static async getActivityShops(
        ctx: any,
        activityId: string,
        uid?: string
    ): Promise<{
        success: boolean;
        shops?: any[];
        message?: string;
    }> {
        try {
            // 获取关联该活动的商店
            const shops = await ctx.db
                .query("shop_configs")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            // 获取活动配置以应用折扣
            const activity = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .first();

            const activityDiscount = activity?.rules?.shopDiscount || 0;

            // 为每个商店获取商品列表（如果提供了uid）
            const shopsWithItems = await Promise.all(
                shops.map(async (shop: any) => {
                    let items: any[] = [];
                    if (uid) {
                        const itemsResult = await ShopService.getShopItems(ctx, shop.shopId, uid);
                        items = itemsResult.items || [];
                    } else {
                        // 如果没有提供uid，只返回商店基本信息
                        const shopItems = await ctx.db
                            .query("shop_items")
                            .withIndex("by_shopId", (q: any) => q.eq("shopId", shop.shopId))
                            .filter((q: any) => q.eq(q.field("isActive"), true))
                            .collect();
                        items = shopItems;
                    }

                    return {
                        ...shop,
                        items,
                        activityDiscount,
                    };
                })
            );

            return {
                success: true,
                shops: shopsWithItems,
            };
        } catch (error: any) {
            console.error("获取活动商店失败:", error);
            return {
                success: false,
                message: `获取活动商店失败: ${error.message}`,
            };
        }
    }

    /**
     * 应用活动折扣
     * 计算商品的活动折扣价格（实时计算，不预存）
     */
    static async applyActivityDiscount(
        ctx: any,
        shopId: string,
        activityId: string,
        basePrice: number
    ): Promise<{
        success: boolean;
        discountedPrice?: number;
        discount?: number;
        message?: string;
    }> {
        try {
            // 获取活动配置
            const activity = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .first();

            if (!activity || !activity.isActive) {
                return {
                    success: false,
                    message: "活动不存在或未激活",
                };
            }

            // 检查活动时间
            const now = new Date();
            const startDate = new Date(activity.startDate);
            const endDate = new Date(activity.endDate);

            if (now < startDate || now > endDate) {
                return {
                    success: false,
                    message: "活动不在有效期内",
                };
            }

            // 获取活动折扣率
            const discount = activity.rules?.shopDiscount || 0;

            if (discount <= 0) {
                return {
                    success: true,
                    discountedPrice: basePrice,
                    discount: 0,
                };
            }

            // 计算折扣价格
            const discountedPrice = Math.floor(basePrice * (1 - discount / 100));

            return {
                success: true,
                discountedPrice,
                discount,
            };
        } catch (error: any) {
            console.error("应用活动折扣失败:", error);
            return {
                success: false,
                message: `应用活动折扣失败: ${error.message}`,
            };
        }
    }
}

