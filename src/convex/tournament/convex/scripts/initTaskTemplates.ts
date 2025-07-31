import { mutation } from "../_generated/server";
import { TASK_TEMPLATES } from "../data/taskTemplate";

// ============================================================================
// 任务模板初始化脚本
// ============================================================================

/**
 * 初始化任务模板到数据库
 */
export const initTaskTemplates = mutation({
    args: {},
    handler: async (ctx, args) => {
        try {
            // 清除现有任务模板
            const existingTemplates = await ctx.db.query("task_templates").collect();
            for (const template of existingTemplates) {
                await ctx.db.delete(template._id);
            }

            // 插入新的任务模板
            const now = new Date().toISOString();
            const insertedTemplates: string[] = [];

            for (const template of TASK_TEMPLATES) {
                const templateId = await ctx.db.insert("task_templates", {
                    ...template,
                    createdAt: now,
                    updatedAt: now
                });
                insertedTemplates.push(templateId);
            }

            return {
                success: true,
                message: `成功初始化 ${insertedTemplates.length} 个任务模板`,
                insertedCount: insertedTemplates.length,
                templateIds: insertedTemplates
            };
        } catch (error) {
            console.error("初始化任务模板失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "初始化任务模板失败",
                insertedCount: 0,
                templateIds: []
            };
        }
    },
});

/**
 * 验证任务模板配置
 */
export const validateTaskTemplates = mutation({
    args: {},
    handler: async (ctx, args) => {
        try {
            const { validateTaskTemplates } = await import("../data/taskTemplate");
            const validation = validateTaskTemplates();

            return {
                success: validation.valid,
                message: validation.valid ? "任务模板配置验证通过" : "任务模板配置验证失败",
                valid: validation.valid,
                errors: validation.errors
            };
        } catch (error) {
            console.error("验证任务模板失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "验证任务模板失败",
                valid: false,
                errors: [error instanceof Error ? error.message : "未知错误"]
            };
        }
    },
});

/**
 * 获取任务模板统计信息
 */
export const getTaskTemplateStats = mutation({
    args: {},
    handler: async (ctx, args) => {
        try {
            const templates = await ctx.db.query("task_templates").collect();

            const stats = {
                total: templates.length,
                byType: {} as { [key: string]: number },
                byCategory: {} as { [key: string]: number },
                active: templates.filter(t => t.isActive).length,
                inactive: templates.filter(t => !t.isActive).length
            };

            // 按类型统计
            templates.forEach(template => {
                const type = template.type;
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            });

            // 按分类统计
            templates.forEach(template => {
                const category = template.category;
                stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
            });

            return {
                success: true,
                message: "获取任务模板统计信息成功",
                stats
            };
        } catch (error) {
            console.error("获取任务模板统计信息失败:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "获取任务模板统计信息失败",
                stats: null
            };
        }
    },
}); 