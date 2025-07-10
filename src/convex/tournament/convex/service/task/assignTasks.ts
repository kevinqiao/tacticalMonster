
import { v } from "convex/values";
import { Doc } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";

export const assignTasks = (internalMutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any) => {
        const now = new Date().toISOString();
        const today = now.split("T")[0];
        const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", args.uid)).first();
        if (!player) {
            throw new Error("玩家不存在");
        }

        // 计算玩家活跃度
        const sevenDaysAgo = new Date(Date.parse(today) - 7 * 24 * 60 * 60 * 1000).toISOString();
        const loginEvents = await ctx.db
            .query("task_events")
            .withIndex("by_uid_processed", (q: any) => q.eq("uid", args.uid))
            .filter((q: any) => q.eq(q.field("action"), "login"))
            .filter((q: any) => q.gte(q.field("createdAt"), sevenDaysAgo))
            .collect();
        const isHighActivity = loginEvents.length >= 5;

        // 活动期间
        const isEventPeriod = today >= "2025-06-21" && today <= "2025-06-30";

        // 获取当前活跃赛季
        const activeSeason = await ctx.db
            .query("seasons")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .first();

        // 获取任务模板，按优先级排序
        const templates = await ctx.db
            .query("task_templates")
            .collect()
            .then((templates: any) => templates.sort((a: any, b: any) => (b.allocationRules?.priority || 0) - (a.allocationRules?.priority || 0)));
        console.log("templates", templates);
        for (const template of templates) {
            // 验证分配规则
            if (!evaluateAllocationRules(template.allocationRules, { player, isHighActivity, today, activeSeason })) {
                console.log("not allocate", template.templateId);
                continue;
            }

            const taskId = template.templateId;
            const existingTask = await ctx.db
                .query("player_tasks")
                .withIndex("by_uid_taskId", (q: any) => q.eq("uid", args.uid).eq("taskId", taskId))
                .first();

            // 根据任务类型处理
            if (template.type === "one_time" && template.resetInterval === "none") {
                if (existingTask) {
                    continue;
                }
            } else if (template.type === "daily" && template.resetInterval === "daily") {
                if (!template.isDynamic || template.validDate !== today) {
                    continue;
                }
                if (existingTask) {
                    continue;
                }
            } else if (template.type === "weekly" && template.resetInterval === "weekly") {
                if (!template.isDynamic || template.validDate !== getWeekStart(today)) {
                    continue;
                }
                if (existingTask && existingTask.lastReset === getWeekStart(today)) {
                    continue;
                }
            } else if (template.type === "season" && template.resetInterval === "season") {
                if (!activeSeason) {
                    continue; // 没有活跃赛季，跳过
                }
                if (!template.isDynamic || template.validDate !== activeSeason._id) {
                    continue; // 检查动态性和当前赛季有效性
                }
                if (existingTask && existingTask.lastReset === activeSeason._id) {
                    continue; // 检查是否本赛季已分配
                }
            } else {
                await ctx.db.insert("error_logs", {
                    error: `未知任务类型: ${template.type}`,
                    context: "assignTasks",
                    uid: args.uid,
                    createdAt: now,
                });
                continue;
            }

            // 动态调整奖励
            const rewards = isEventPeriod
                ? {
                    coins: template.rewards.coins * 2,
                    props: template.rewards.props.map((p: any) => ({ ...p, quantity: p.quantity * 2 })),
                    tickets: template.rewards.tickets.map((t: any) => ({ ...t, quantity: t.quantity * 2 })),
                    gamePoints: template.rewards.gamePoints * 2,
                }
                : template.rewards;

            // 插入新任务
            await ctx.db.insert("player_tasks", {
                uid: args.uid,
                taskId,
                name: template.name,
                type: template.type,
                description: template.description,
                condition: template.condition,
                progress: template.type === "one_time" ? { sub_0: 0, sub_1: 0 } : 0,
                isCompleted: false,
                lastReset: template.type === "weekly" ? getWeekStart(today) :
                    template.type === "season" ? (activeSeason?._id || today) : today,
                rewards,
                createdAt: now,
                updatedAt: now,
            });

            // 插入通知
            await ctx.db.insert("notifications", {
                uid: args.uid,
                message: `新任务"${template.name}"已分配！完成可获 ${rewards.coins} 金币！`,
                createdAt: now,
            });
        }

        return { success: true, message: `任务分配完成 (${args.uid})` };
    },
});

// 评估分配规则
const evaluateAllocationRules = (rules: any, context: { player: Doc<"players">; isHighActivity: boolean; today: string; activeSeason: Doc<"seasons"> | null }): boolean => {
    if (!rules) return true;

    if (rules.and) {
        return rules.and.every((condition: any) => evaluateCondition(condition, context));
    }

    if (rules.or) {
        return rules.or.some((condition: any) => evaluateCondition(condition, context));
    }

    return evaluateCondition(rules, context);
}

// 评估单一条件
const evaluateCondition = (condition: any, { player, isHighActivity, today, activeSeason }: { player: Doc<"players">; isHighActivity: boolean; today: string; activeSeason: Doc<"seasons"> | null }): boolean => {
    if (condition.minSegment) {
        const segments = ["bronze", "silver", "gold", "diamond"];
        if (!segments.includes(condition.minSegment)) {
            return false;
        }
        return segments.indexOf(player.segmentName ?? "") >= segments.indexOf(condition.minSegment);
    }
    // if (condition.gamePreferences) {
    //     return player.gamePreferences?.includes(condition.gamePreferences) ?? false;
    // }
    if (condition.highActivity !== undefined) {
        return condition.highActivity === isHighActivity;
    }
    if (condition.eventPeriod) {
        return today >= condition.eventPeriod.start && today <= condition.eventPeriod.end;
    }
    if (condition.season) {
        return activeSeason?._id === condition.season;
    }
    return false;
}

// 获取本周开始日期（周一）
const getWeekStart = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - (day - 1));
    return date.toISOString().split("T")[0];
}

