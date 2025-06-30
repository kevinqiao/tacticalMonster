// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";

// 记录分享行为并触发任务事件
export const recordShare = mutation({
  args: {
    uid: v.string(),
    gameType: v.string(),
    content: v.string(),
    platform: v.string(),
    inviteUid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 记录分享
    await ctx.db.insert("player_shares", {
      uid: args.uid,
      gameType: args.gameType,
      content: args.content,
      platform: args.platform,
      inviteUid: args.inviteUid,
      createdAt: new Date().toISOString(),
    });

    // 记录任务事件
    await ctx.db.insert("task_events", {
      uid: args.uid,
      action: "share",
      actionData: {
        platform: args.platform,
        gameType: args.gameType,
      },
      createdAt: new Date().toISOString(),
      processed: false,
      updatedAt: new Date().toISOString(),
    });
    // 异步调度任务处理
    await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

    return { success: true, message: "分享记录成功，任务处理已调度" };
  }
});