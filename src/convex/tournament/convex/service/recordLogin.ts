
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";

export const recordLogin = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
        if (!player) {
            throw new Error("Player not found");
        }

        await ctx.db.patch(player._id, { lastActive: now });
        await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });

        // 处理登录活动
        try {
            const { ActivityService } = await import("./activity/activityService");
            await ActivityService.processLoginActivity(ctx, args.uid);
        } catch (error: any) {
            console.error("处理登录活动失败:", error);
        }

        await ctx.db.insert("task_events", {
            uid: args.uid,
            action: "login",
            actionData: {},
            processed: false,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

        return { success: true };
    },
})

