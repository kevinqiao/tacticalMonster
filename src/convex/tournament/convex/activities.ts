/**
 * 活动系统API接口
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ActivityIntegrationService } from "./service/activity/activityIntegrationService";
import { ActivityService } from "./service/activity/activityService";
import { ActivityTemplateService } from "./service/activity/activityTemplateService";

/**
 * 获取玩家活动列表
 */
export const getPlayerActivities = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ActivityService.getActiveActivities(ctx, args.uid);
    },
});

/**
 * 获取活动进度
 */
export const getActivityProgress = query({
    args: {
        uid: v.string(),
        activityId: v.string(),
    },
    handler: async (ctx, args) => {
        const progress = await ActivityService.getPlayerActivityProgress(
            ctx,
            args.uid,
            args.activityId
        );

        if (!progress) {
            return null;
        }

        const template = await ActivityTemplateService.getActivityTemplate(ctx, args.activityId);
        if (!template) {
            return null;
        }

        const availableRewards = ActivityService.calculateAvailableRewards(
            template,
            progress
        );

        return {
            progress,
            template,
            availableRewards,
        };
    },
});

/**
 * 领取活动奖励
 */
export const claimActivityReward = mutation({
    args: {
        uid: v.string(),
        activityId: v.string(),
        milestone: v.string(),
    },
    handler: async (ctx, args) => {
        return await ActivityService.claimActivityReward(
            ctx,
            args.uid,
            args.activityId,
            args.milestone
        );
    },
});

/**
 * 处理活动事件（登录、进度更新等）
 */
export const processActivityEvent = mutation({
    args: {
        uid: v.string(),
        eventType: v.string(), // "login", "progress", "recharge"
        activityId: v.optional(v.string()),
        action: v.optional(v.string()),
        actionData: v.optional(v.any()),
        amount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { uid, eventType, activityId, action, actionData, amount } = args;

        switch (eventType) {
            case "login":
                return await ActivityService.processLoginActivity(ctx, uid);

            case "progress":
                if (!activityId || !action) {
                    return {
                        success: false,
                        message: "进度活动需要提供 activityId 和 action",
                    };
                }
                return await ActivityService.processProgressActivity(
                    ctx,
                    uid,
                    activityId,
                    action,
                    actionData || {}
                );

            case "recharge":
                if (amount === undefined) {
                    return {
                        success: false,
                        message: "充值活动需要提供 amount",
                    };
                }
                return await ActivityService.processRechargeActivity(ctx, uid, amount);

            default:
                return {
                    success: false,
                    message: `未知的事件类型: ${eventType}`,
                };
        }
    },
});

/**
 * 创建活动模板（管理员接口）
 */
export const createActivityTemplate = mutation({
    args: {
        activityId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.union(
            v.literal("login"),
            v.literal("limited_time"),
            v.literal("progress"),
            v.literal("recharge")
        ),
        category: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("event"),
            v.literal("seasonal")
        ),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        priority: v.number(),
        icon: v.optional(v.string()),
        banner: v.optional(v.string()),
        seasonId: v.optional(v.string()), // 赛季ID（仅seasonal类型使用）
        rules: v.any(),
        rewards: v.optional(v.array(v.any())),
        requirements: v.optional(v.any()),
        resetInterval: v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("none")
        ),
        maxCompletions: v.number(),
    },
    handler: async (ctx, args) => {
        return await ActivityTemplateService.createActivityTemplate(ctx, args);
    },
});

/**
 * 更新活动模板（管理员接口）
 */
export const updateActivityTemplate = mutation({
    args: {
        activityId: v.string(),
        updates: v.any(),
    },
    handler: async (ctx, args) => {
        return await ActivityTemplateService.updateActivityTemplate(
            ctx,
            args.activityId,
            args.updates
        );
    },
});

/**
 * 激活活动（管理员接口）
 */
export const activateActivity = mutation({
    args: {
        activityId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ActivityTemplateService.activateActivity(ctx, args.activityId);
    },
});

/**
 * 停用活动（管理员接口）
 */
export const deactivateActivity = mutation({
    args: {
        activityId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ActivityTemplateService.deactivateActivity(ctx, args.activityId);
    },
});

/**
 * 获取所有活动模板（管理员接口）
 */
export const getAllActivityTemplates = query({
    args: {
        type: v.optional(
            v.union(
                v.literal("login"),
                v.literal("limited_time"),
                v.literal("progress"),
                v.literal("recharge")
            )
        ),
        category: v.optional(
            v.union(
                v.literal("daily"),
                v.literal("weekly"),
                v.literal("event"),
                v.literal("seasonal")
            )
        ),
        seasonId: v.optional(v.string()), // 赛季ID（用于筛选seasonal活动）
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return await ActivityTemplateService.getAllActivityTemplates(ctx, args);
    },
});

/**
 * 获取当前赛季的活动
 */
export const getCurrentSeasonActivities = query({
    args: {
        uid: v.string(),
        seasonId: v.optional(v.string()), // 可选，默认使用当前赛季
    },
    handler: async (ctx, args) => {
        return await ActivityService.getCurrentSeasonActivities(ctx, args.uid, args.seasonId);
    },
});

/**
 * 参与活动（明确动作）
 * 用于需要明确参与动作的场景，或手动触发参与
 */
export const joinActivity = mutation({
    args: {
        uid: v.string(),
        activityId: v.string(),
    },
    handler: async (ctx, args) => {
        const template = await ActivityTemplateService.getActivityTemplate(ctx, args.activityId);
        if (!template || !template.isActive) {
            return {
                success: false,
                message: "活动不存在或未激活",
            };
        }

        // 检查活动时间
        const nowISO = new Date().toISOString();
        if (nowISO < template.startDate || nowISO > template.endDate) {
            return {
                success: false,
                message: "活动未开始或已结束",
            };
        }

        // 检查参与条件
        if (template.requirements) {
            const canParticipate = await ActivityService.checkRequirements(ctx, args.uid, template.requirements);
            if (!canParticipate) {
                return {
                    success: false,
                    message: "不满足参与条件",
                };
            }
        }

        // 检查是否已参与
        const existingProgress = await ActivityService.getPlayerActivityProgress(ctx, args.uid, args.activityId);
        if (existingProgress) {
            return {
                success: false,
                message: "已参与该活动",
                progress: existingProgress,
            };
        }

        // 创建进度记录
        const progress = await ActivityService.initializePlayerActivityProgress(
            ctx,
            args.uid,
            args.activityId,
            template
        );

        // 发送活动开始通知
        try {
            await ActivityIntegrationService.sendActivityNotification(ctx, args.uid, args.activityId, "started");
        } catch (error: any) {
            // 通知发送失败不影响参与
            console.error("发送活动开始通知失败:", error);
        }

        return {
            success: true,
            message: "参与活动成功",
            progress,
        };
    },
});

