import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

export const scheduleTaskAssignment = (internalMutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const now = new Date().toISOString();
        const today = now.split("T")[0];

        // 获取静态任务模板
        const staticTemplates = await ctx.db
            .query("task_templates")
            .filter((q: any) => q.eq(q.field("isDynamic"), false))
            .collect();
        console.log("staticTemplates", staticTemplates);
        // 生成动态任务模板
        for (const template of staticTemplates) {
            if (template.resetInterval === "daily") {
                const dynamicTemplateId = `${template.templateId}_${today}`; // 如 "daily_login_bonus_2025-06-18"
                console.log("dynamicTemplateId", dynamicTemplateId);
                const existingDynamic = await ctx.db
                    .query("task_templates")
                    .withIndex("by_templateId", (q: any) => q.eq("templateId", dynamicTemplateId))
                    .first();
                console.log("existingDynamic", existingDynamic);
                if (!existingDynamic) {
                    console.log("inserting dynamic template", dynamicTemplateId);
                    await ctx.db.insert("task_templates", {
                        templateId: dynamicTemplateId,
                        isDynamic: true,
                        validDate: today,
                        name: template.name,
                        description: template.description,
                        type: template.type,
                        gameType: template.gameType,
                        condition: template.condition,
                        rewards: template.rewards,
                        resetInterval: template.resetInterval,
                        allocationRules: template.allocationRules,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            } else if (template.resetInterval === "weekly") {
                const weekStart = getWeekStart(today);
                const dynamicTemplateId = `${template.templateId}_${weekStart}`; // 如 "weekly_challenge_2025-06-16"
                console.log("weekly dynamicTemplateId", dynamicTemplateId);
                const existingDynamic = await ctx.db
                    .query("task_templates")
                    .withIndex("by_templateId", (q: any) => q.eq("templateId", dynamicTemplateId))
                    .first();
                console.log("existingWeeklyDynamic", existingDynamic);
                if (!existingDynamic) {
                    console.log("inserting weekly dynamic template", dynamicTemplateId);
                    await ctx.db.insert("task_templates", {
                        templateId: dynamicTemplateId,
                        isDynamic: true,
                        validDate: weekStart,
                        name: template.name,
                        description: template.description,
                        type: template.type,
                        gameType: template.gameType,
                        condition: template.condition,
                        rewards: template.rewards,
                        resetInterval: template.resetInterval,
                        allocationRules: template.allocationRules,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            } else if (template.resetInterval === "season") {
                // 获取当前活跃赛季
                const activeSeason = await ctx.db
                    .query("seasons")
                    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
                    .first();

                if (activeSeason) {
                    const dynamicTemplateId = `${template.templateId}_${activeSeason._id}`; // 如 "season_challenge_season123"
                    console.log("season dynamicTemplateId", dynamicTemplateId);
                    const existingDynamic = await ctx.db
                        .query("task_templates")
                        .withIndex("by_templateId", (q: any) => q.eq("templateId", dynamicTemplateId))
                        .first();
                    console.log("existingSeasonDynamic", existingDynamic);
                    if (!existingDynamic) {
                        console.log("inserting season dynamic template", dynamicTemplateId);
                        await ctx.db.insert("task_templates", {
                            templateId: dynamicTemplateId,
                            isDynamic: true,
                            validDate: activeSeason._id,
                            name: template.name,
                            description: template.description,
                            type: template.type,
                            gameType: template.gameType,
                            condition: template.condition,
                            rewards: template.rewards,
                            resetInterval: template.resetInterval,
                            allocationRules: template.allocationRules,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            }
        }

        // 为所有玩家分配任务
        const players = await ctx.db.query("players").collect();
        for (const player of players) {
            console.log("player", player);
            await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: player.uid });
        }

        // 插入系统通知
        // await ctx.db.insert("notifications", {
        //     uid: "system",
        //     message: `每日任务分配完成（${today}）`,
        //     createdAt: now,
        // });

        return { success: true, message: `任务分配调度完成（${today}` };
    },
});

// 获取本周开始日期（周一）
const getWeekStart = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - (day - 1));
    return date.toISOString().split("T")[0];
}
