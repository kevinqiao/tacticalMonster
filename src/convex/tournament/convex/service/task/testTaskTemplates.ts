// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

// 测试创建任务模板
export const testCreateTaskTemplate = (mutation as any)({
    args: {
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        gameType: v.optional(v.string()),
        condition: v.any(),
        rewards: v.any(),
        resetInterval: v.string(),
        allocationRules: v.optional(v.any()),
    },
    handler: async (ctx: any, args: any) => {
        const now = new Date().toISOString();

        try {
            const templateId = await ctx.db.insert("task_templates", {
                templateId: args.templateId,
                name: args.name,
                description: args.description,
                type: args.type,
                gameType: args.gameType,
                condition: args.condition,
                rewards: args.rewards,
                resetInterval: args.resetInterval,
                allocationRules: args.allocationRules || {},
                createdAt: now,
                updatedAt: now,
            });

            return {
                success: true,
                templateId,
                message: "任务模板创建成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "任务模板创建失败"
            };
        }
    }
});

// 测试查询任务模板
export const testGetTaskTemplates = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        try {
            const templates = await ctx.db.query("task_templates").collect();

            return {
                success: true,
                templates,
                count: templates.length,
                message: "任务模板查询成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "任务模板查询失败"
            };
        }
    }
});

// 测试按ID查询任务模板
export const testGetTaskTemplateById = (query as any)({
    args: { templateId: v.string() },
    handler: async (ctx: any, args: any) => {
        try {
            const template = await ctx.db
                .query("task_templates")
                .withIndex("by_templateId", (q: any) => q.eq("templateId", args.templateId))
                .first();

            if (!template) {
                return {
                    success: false,
                    message: "任务模板不存在"
                };
            }

            return {
                success: true,
                template,
                message: "任务模板查询成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "任务模板查询失败"
            };
        }
    }
});

// 测试删除任务模板
export const testDeleteTaskTemplate = (mutation as any)({
    args: { templateId: v.string() },
    handler: async (ctx: any, args: any) => {
        try {
            const template = await ctx.db
                .query("task_templates")
                .withIndex("by_templateId", (q: any) => q.eq("templateId", args.templateId))
                .first();

            if (!template) {
                return {
                    success: false,
                    message: "任务模板不存在"
                };
            }

            await ctx.db.delete(template._id);

            return {
                success: true,
                message: "任务模板删除成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "任务模板删除失败"
            };
        }
    }
});

// 测试创建包含SP奖励的任务模板
export const testCreateSPRewardTaskTemplate = (mutation as any)({
    args: {
        templateId: v.string(),
        name: v.string(),
        description: v.string(),
        type: v.string(),
        gameType: v.optional(v.string()),
        condition: v.any(),
        rewards: v.any(),
        resetInterval: v.string(),
        allocationRules: v.optional(v.any()),
    },
    handler: async (ctx: any, args: any) => {
        const now = new Date().toISOString();

        try {
            const templateId = await ctx.db.insert("task_templates", {
                templateId: args.templateId,
                name: args.name,
                description: args.description,
                type: args.type,
                gameType: args.gameType,
                condition: args.condition,
                rewards: args.rewards,
                resetInterval: args.resetInterval,
                allocationRules: args.allocationRules || {},
                createdAt: now,
                updatedAt: now,
            });

            return {
                success: true,
                templateId,
                message: "包含SP奖励的任务模板创建成功"
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "包含SP奖励的任务模板创建失败"
            };
        }
    }
}); 