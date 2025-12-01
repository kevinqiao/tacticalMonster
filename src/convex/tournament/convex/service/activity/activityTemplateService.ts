/**
 * 活动模板服务
 * 处理活动模板的CRUD操作
 */

import { ActivityTemplate } from "./activityService";

export class ActivityTemplateService {
    /**
     * 创建活动模板
     */
    static async createActivityTemplate(
        ctx: any,
        template: Omit<ActivityTemplate, "createdAt" | "updatedAt">
    ): Promise<{ success: boolean; message: string; activityId?: string }> {
        try {
            const nowISO = new Date().toISOString();

            // 检查活动ID是否已存在
            const existing = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", template.activityId))
                .unique();

            if (existing) {
                return {
                    success: false,
                    message: `活动ID已存在: ${template.activityId}`,
                };
            }

            // 创建活动模板
            await ctx.db.insert("activity_templates", {
                ...template,
                createdAt: nowISO,
                updatedAt: nowISO,
            });

            return {
                success: true,
                message: "活动模板创建成功",
                activityId: template.activityId,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `创建活动模板失败: ${error.message}`,
            };
        }
    }

    /**
     * 更新活动模板
     */
    static async updateActivityTemplate(
        ctx: any,
        activityId: string,
        updates: Partial<Omit<ActivityTemplate, "activityId" | "createdAt">>
    ): Promise<{ success: boolean; message: string }> {
        try {
            const template = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .unique();

            if (!template) {
                return {
                    success: false,
                    message: "活动模板不存在",
                };
            }

            await ctx.db.patch(template._id, {
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            return {
                success: true,
                message: "活动模板更新成功",
            };
        } catch (error: any) {
            return {
                success: false,
                message: `更新活动模板失败: ${error.message}`,
            };
        }
    }

    /**
     * 激活活动
     */
    static async activateActivity(
        ctx: any,
        activityId: string
    ): Promise<{ success: boolean; message: string }> {
        return await this.updateActivityTemplate(ctx, activityId, { isActive: true });
    }

    /**
     * 停用活动
     */
    static async deactivateActivity(
        ctx: any,
        activityId: string
    ): Promise<{ success: boolean; message: string }> {
        return await this.updateActivityTemplate(ctx, activityId, { isActive: false });
    }

    /**
     * 获取活动模板
     */
    static async getActivityTemplate(
        ctx: any,
        activityId: string
    ): Promise<ActivityTemplate | null> {
        const template = await ctx.db
            .query("activity_templates")
            .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
            .unique();

        return template as ActivityTemplate | null;
    }

    /**
     * 获取所有活动模板
     */
    static async getAllActivityTemplates(
        ctx: any,
        filters?: {
            type?: ActivityTemplate["type"];
            category?: ActivityTemplate["category"];
            seasonId?: string; // 赛季ID（用于筛选seasonal活动）
            isActive?: boolean;
        }
    ): Promise<ActivityTemplate[]> {
        let query = ctx.db.query("activity_templates");

        if (filters?.type) {
            query = query.withIndex("by_type", (q: any) => q.eq("type", filters.type));
        } else if (filters?.category) {
            query = query.withIndex("by_category", (q: any) => q.eq("category", filters.category));
        } else if (filters?.isActive !== undefined) {
            query = query.withIndex("by_active", (q: any) => q.eq("isActive", filters.isActive));
        }

        const templates = await query.collect();
        let filtered = templates as ActivityTemplate[];

        if (filters?.category) {
            filtered = filtered.filter((t) => t.category === filters.category);
        }

        if (filters?.seasonId) {
            filtered = filtered.filter((t) => t.seasonId === filters.seasonId);
        }

        // 按优先级排序
        filtered.sort((a, b) => b.priority - a.priority);

        return filtered;
    }

    /**
     * 删除活动模板
     */
    static async deleteActivityTemplate(
        ctx: any,
        activityId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const template = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .unique();

            if (!template) {
                return {
                    success: false,
                    message: "活动模板不存在",
                };
            }

            // 检查是否有玩家参与该活动
            const playerProgress = await ctx.db
                .query("player_activity_progress")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .first();

            if (playerProgress) {
                return {
                    success: false,
                    message: "存在玩家参与记录，无法删除活动模板",
                };
            }

            await ctx.db.delete(template._id);

            return {
                success: true,
                message: "活动模板删除成功",
            };
        } catch (error: any) {
            return {
                success: false,
                message: `删除活动模板失败: ${error.message}`,
            };
        }
    }
}

