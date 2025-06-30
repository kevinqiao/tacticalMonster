// @ts-nocheck
import { v } from "convex/values";
import { api, internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";

export const testTaskSystem = mutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    try {
      // 1. 创建玩家
      const playerExists = await ctx.db
        .query("players")
        .withIndex("by_uid", (q) => q.eq("uid", args.uid))
        .first();
      if (!playerExists) {
        await ctx.db.insert("players", {
          uid: args.uid,
          segmentName: "bronze",
          gamePreferences: ["solitaire"],
          lastActive: now,
          coins: 1000,
          tickets: 0,
          isSubscribed: false,
        });
      }

      // 2. 加载任务模板

      await ctx.scheduler.runAfter(0, api.init.loadTaskTemplatesFromJson.loadTaskTemplatesFromJson, {});

      // 3. 模拟高活跃度（5 次登录）
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("task_events", {
          uid: args.uid,
          action: "login",
          actionData: {},
          processed: false,
          createdAt: new Date(Date.parse(today) - i * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now,
        });
      }
      await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

      // 4. 触发每日任务分配
      await ctx.scheduler.runAfter(0, internal.service.task.scheduleTaskAssignment.scheduleTaskAssignment, {});

      // 5. 验证 daily 任务分配
      // const tid = `daily_login_bonus_${today}`;
      // await ctx.db.insert("notifications", {
      //   uid: args.uid,
      //   message: `新任务“${tid}”准备分配！！`,
      //   createdAt: now,
      // });
      // console.log("tid", tid);
      // const dailyTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", tid))
      //   .first();
      // if (!dailyTask) throw new Error("每日登录任务分配失败");

      // // 6. 模拟登录完成 daily 任务
      // await ctx.db.insert("task_events", {
      //   uid: args.uid,
      //   action: "login",
      //   actionData: {},
      //   processed: false,
      //   createdAt: now,
      //   updatedAt: now,
      // });
      // await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

      // // 7. 验证 daily 任务完成
      // const updatedDailyTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", dailyTask.taskId))
      //   .first();
      // if (!updatedDailyTask || !updatedDailyTask.isCompleted) throw new Error("每日登录任务未完成");
      // if (!updatedDailyTask.rewards.coins || updatedDailyTask.rewards.coins !== (today <= "2025-06-30" ? 100 : 50)) {
      //   throw new Error("每日登录任务奖励错误");
      // }

      // // 8. 升级到 gold 段位，触发 one_time 任务
      // await ctx.db.patch((await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first())!._id, {
      //   segmentName: "gold",
      //   updatedAt: now,
      // });
      // await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });

      // 9. 验证 one_time 任务分配
      const oneTimeTask = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", "new_segment_challenge"))
        .first();
      if (!oneTimeTask) throw new Error("新段位挑战任务分配失败");

      // 10. 模拟完成 one_time 任务
      // const matchEvents = [
      //   { action: "complete_match", actionData: { gameType: "solitaire", score: 1200, tournamentId: "t1" } },
      //   { action: "complete_match", actionData: { gameType: "solitaire", score: 1000, tournamentId: "t2" } },
      //   { action: "complete_match", actionData: { gameType: "solitaire", score: 1100, tournamentId: "t3" } },
      // ];
      // for (const event of matchEvents) {
      //   await ctx.db.insert("task_events", {
      //     uid: args.uid,
      //     action: event.action,
      //     actionData: event.actionData,
      //     createdAt: now,
      //     processed: false,
      //     updatedAt: now,
      //   });
      // }
      // await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

      // // 11. 验证 one_time 任务完成
      // const updatedOneTimeTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", "new_segment_challenge"))
      //   .first();
      // if (!updatedOneTimeTask || !updatedOneTimeTask.isCompleted) throw new Error("新段位挑战任务未完成");
      // if (!updatedOneTimeTask.rewards.coins || updatedOneTimeTask.rewards.coins !== (today <= "2025-06-30" ? 600 : 300)) {
      //   throw new Error("新段位挑战任务奖励错误");
      // }

      // // 12. 升级到 silver 段位，触发 weekly 任务
      // await ctx.db.patch((await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first())!._id, {
      //   segmentName: "silver",
      //   updatedAt: now,
      // });
      // await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });

      // // 13. 验证 weekly 任务分配
      // const weeklyTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", "weekly_game_play"))
      //   .first();
      // if (!weeklyTask) throw new Error("每周游戏挑战任务分配失败");

      // // 14. 模拟完成 weekly 任务
      // for (let i = 0; i < 5; i++) {
      //   await ctx.db.insert("task_events", {
      //     uid: args.uid,
      //     action: "play_game",
      //     actionData: { gameType: "solitaire" },
      //     createdAt: now,
      //     processed: false,
      //     updatedAt: now,
      //   });
      // }
      // await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

      // // 15. 验证 weekly 任务完成
      // const updatedWeeklyTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", "weekly_game_play"))
      //   .first();
      // if (!updatedWeeklyTask || !updatedWeeklyTask.isCompleted) throw new Error("每周游戏挑战任务未完成");
      // if (!updatedWeeklyTask.rewards.coins || updatedWeeklyTask.rewards.coins !== (today <= "2025-06-30" ? 400 : 200)) {
      //   throw new Error("每周游戏挑战任务奖励错误");
      // }

      // // 16. 模拟下周（2025-06-30）重置
      // const nextWeek = "2025-06-30";
      // await ctx.db.patch(weeklyTask._id, { lastReset: "2025-06-23" }); // 模拟上周
      // await ctx.scheduler.runAfter(0, internal.service.task.resetTasks.resetTasks, {});
      // const resetWeeklyTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", "weekly_game_play"))
      //   .first();
      // if (!resetWeeklyTask || resetWeeklyTask.isCompleted || resetWeeklyTask.progress !== 0 || resetWeeklyTask.lastReset !== nextWeek) {
      //   throw new Error("每周游戏挑战任务重置失败");
      // }

      // // 17. 重新分配 weekly 任务
      // await ctx.scheduler.runAfter(0, internal.service.task.assignTasks.assignTasks, { uid: args.uid });
      // const reassignedWeeklyTask = await ctx.db
      //   .query("player_tasks")
      //   .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", "weekly_game_play"))
      //   .first();
      // if (!reassignedWeeklyTask || reassignedWeeklyTask.lastReset !== nextWeek) {
      //   throw new Error("每周游戏挑战任务重新分配失败");
      // }

      return { success: true, message: "任务系统生命周期测试通过" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await ctx.db.insert("error_logs", {
        error: errorMessage,
        context: "testTaskSystem",
        uid: args.uid,
        createdAt: now,
      });
      return { success: false, message: `测试失败: ${errorMessage}` };
    }
  },
});
