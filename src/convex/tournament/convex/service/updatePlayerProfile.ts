// @ts-nocheck
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";

// 更新玩家资料并重新分配任务
export const updatePlayerProfile = mutation({
  args: {
    uid: v.string(), // 玩家 ID
    segmentName: v.optional(v.string()), // 新段位，如 "bronze", "silver"
    gamePreferences: v.optional(v.array(v.string())), // 新游戏偏好，如 ["solitaire", "rummy"]
  },
  handler: async (ctx, args) => {
    try {
      // 验证玩家存在
      const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
      if (!player) throw new Error("玩家不存在");

      // 准备更新数据
      const updateData: any = { updatedAt: new Date().toISOString() };
      if (args.segmentName) updateData.segmentName = args.segmentName;
      if (args.gamePreferences) updateData.gamePreferences = args.gamePreferences;

      // 更新玩家资料
      await ctx.db.patch(player._id, updateData);
      // 异步调用 assignTasks 重新分配任务
      await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });

      return { success: true, message: "玩家资料更新成功，任务重新分配已调度" };
    } catch (error) {
      // 记录错误
      await ctx.db.insert("error_logs", {
        error: error instanceof Error ? error.message : String(error),
        context: "updatePlayerProfile",
        uid: args.uid,
        createdAt: new Date().toISOString(),
      });
      return { success: false, message: `玩家资料更新失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});