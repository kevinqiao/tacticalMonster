import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";

export const resetTasks = (internalMutation as any)({
  args: {},
  handler: async (ctx: any) => {
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // 清理过期的动态 task_templates
    const expiredTemplates = await ctx.db
      .query("task_templates")
      .withIndex("by_validDate", (q: any) => q.lt("validDate", today))
      .filter((q: any) => q.eq(q.field("isDynamic"), true))
      .collect();

    for (const template of expiredTemplates) {
      await ctx.db.delete(template._id);
    }

    // 触发任务分配（assignTasks 会处理任务重置逻辑）
    await ctx.scheduler.runAfter(0, internal.service.task.scheduleTaskAssignment.scheduleTaskAssignment);

    await ctx.db.insert("notifications", {
      uid: "system",
      message: `每日任务重置完成（${today}）`,
      createdAt: now,
    });

    return { success: true, message: `任务重置完成（${today}）` };
  },
});

