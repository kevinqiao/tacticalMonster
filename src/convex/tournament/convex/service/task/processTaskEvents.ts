import { v } from "convex/values";
import { Doc } from "../../_generated/dataModel";
import { internalMutation, query } from "../../_generated/server";

// 获取未处理的任务事件
export const getUnprocessedEvents = query({
  args: {},
  handler: async (ctx) => {
    // 由于索引是 by_uid_processed，我们需要先获取所有未处理的事件
    const allEvents = await ctx.db.query("task_events").collect();
    return allEvents.filter(event => !event.processed).slice(0, 500);
  },
});

// 验证任务条件
async function validateTaskCondition(ctx: any, task: Doc<"tasks">, actionData: any): Promise<boolean> {
  const { action, gameType, minScore } = task.condition;
  if (actionData.action !== action) return false;
  if (gameType && actionData.gameType !== gameType) return false;
  if (minScore && actionData.score && actionData.score < minScore) return false;
  return true;
}

// 发放奖励
async function applyRewards(ctx: any, uid: string, rewards: Doc<"tasks">["rewards"]) {
  const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
  if (!inventory) throw new Error("玩家库存不存在");

  // 更新玩家库存
  await ctx.db.patch(inventory._id, {
    coins: inventory.coins + rewards.coins,
    props: [...inventory.props, ...rewards.props.filter((p) => p.quantity > 0)],
    tickets: [...inventory.tickets, ...rewards.tickets.filter((t) => t.quantity > 0)],
    updatedAt: new Date().toISOString(),
  });

  // 更新赛季积分
  if (rewards.gamePoints > 0) {
    const season = await ctx.db.query("seasons").filter((q: any) => q.eq(q.field("isActive"), true)).first();
    if (season) {
      const playerSeason = await ctx.db
        .query("player_seasons")
        .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", season._id))
        .first();
      if (playerSeason) {
        await ctx.db.patch(playerSeason._id, {
          seasonPoints: playerSeason.seasonPoints + rewards.gamePoints,
          gamePoints: {
            ...playerSeason.gamePoints,
            ["general"]: (playerSeason.gamePoints["general"] || 0) + rewards.gamePoints,
          },
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

// 处理任务事件
export const processTaskEvents = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    // 获取未处理的任务事件
    const events = await ctx.db
      .query("task_events")
      .withIndex("by_uid_processed", (q: any) => q.eq("uid", args.uid).eq("processed", false))
      .collect();

    for (const event of events) {
      // 查找匹配的任务
      const tasks = await ctx.db
        .query("tasks")
        .filter((q) =>
          q.or(
            q.eq(q.field("condition.action"), event.action),
            q.and(
              q.eq(q.field("gameType"), event.actionData.gameType),
              q.eq(q.field("condition.action"), event.action)
            )
          )
        )
        .collect();

      for (const task of tasks) {
        // 验证任务条件
        if (await validateTaskCondition(ctx, task, event.actionData)) {
          const playerTask = await ctx.db
            .query("player_tasks")
            .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", task.taskId))
            .first();

          const now = new Date().toISOString();
          const today = now.split("T")[0];

          // 检查任务重置
          if (playerTask && task.resetInterval === "daily" && playerTask.lastReset !== today) {
            await ctx.db.patch(playerTask._id, {
              progress: 0,
              isCompleted: false,
              lastReset: today,
              updatedAt: now,
            });
          }

          const newProgress = (playerTask?.progress || 0) + 1;

          if (newProgress >= task.condition.count) {
            // 任务完成，发放奖励
            await applyRewards(ctx, args.uid, task.rewards);
            if (playerTask) {
              await ctx.db.patch(playerTask._id, {
                progress: newProgress,
                isCompleted: true,
                lastReset: today,
                updatedAt: now,
              });
            } else {
              await ctx.db.insert("player_tasks", {
                uid: args.uid,
                taskId: task.taskId,
                progress: newProgress,
                isCompleted: true,
                lastReset: today,
                updatedAt: now,
              });
            }
          } else {
            // 更新任务进度
            if (playerTask) {
              await ctx.db.patch(playerTask._id, {
                progress: newProgress,
                updatedAt: now,
              });
            } else {
              await ctx.db.insert("player_tasks", {
                uid: args.uid,
                taskId: task.taskId,
                progress: newProgress,
                isCompleted: false,
                lastReset: today,
                updatedAt: now,
              });
            }
          }
        }
      }

      // 标记事件为已处理
      await ctx.db.patch(event._id, {
        processed: true,
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true, message: "任务事件处理完成" };
  },
});