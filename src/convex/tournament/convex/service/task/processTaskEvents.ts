import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Doc } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";

// 任务处理器类型定义
type TaskHandler = {
  validate: (task: Doc<"player_tasks">, event: any) => Promise<boolean>;
  updateProgress: (task: Doc<"player_tasks">, event: any) => any;
  isCompleted: (task: Doc<"player_tasks">, newProgress: any) => boolean;
  getReward?: (task: Doc<"player_tasks">, newProgress: any) => any; // 复杂任务的阶段性奖励
};

// 验证任务条件（通用）
async function validateTaskCondition(task: Doc<"player_tasks">, actionData: any): Promise<boolean> {
  const { action, gameType, minScore } = task.condition;
  if (actionData.action !== action) return false;
  if (gameType && actionData.gameType !== gameType) return false;
  if (minScore && actionData.score && actionData.score < minScore) return false;
  return true;
}

// 验证复杂条件（AND/OR 结构）
async function validateComplexCondition(task: Doc<"player_tasks">, event: any): Promise<boolean> {
  const condition = task.condition as any;

  if (condition.type === "and") {
    return condition.subConditions.every((sub: any) => {
      if (sub.action !== event.action) return false;
      if (sub.gameType && event.actionData?.gameType !== sub.gameType) return false;
      if (sub.minScore && event.actionData?.score && event.actionData.score < sub.minScore) return false;
      return true;
    });
  }

  if (condition.type === "or") {
    return condition.subConditions.some((sub: any) => {
      if (sub.action !== event.action) return false;
      if (sub.gameType && event.actionData?.gameType !== sub.gameType) return false;
      if (sub.minScore && event.actionData?.score && event.actionData.score < sub.minScore) return false;
      return true;
    });
  }

  // 简单条件
  return validateTaskCondition(task, { action: event.action, ...event.actionData });
}

// 验证多阶段任务条件
async function validateMultiStageCondition(task: Doc<"player_tasks">, event: any): Promise<boolean> {
  const condition = task.condition as any;
  if (!condition.stages) return false;

  return condition.stages.some((stage: any) => {
    if (stage.action !== event.action) return false;
    if (stage.gameType && event.actionData?.gameType !== stage.gameType) return false;
    if (stage.minScore && event.actionData?.score && event.actionData.score < stage.minScore) return false;
    return true;
  });
}

// 验证时间相关任务条件
async function validateTimeBasedCondition(task: Doc<"player_tasks">, event: any): Promise<boolean> {
  const condition = task.condition as any;
  if (!condition.actions) return false;

  return condition.actions.some((action: any) => {
    if (action.action !== event.action) return false;
    if (action.gameType && event.actionData?.gameType !== action.gameType) return false;
    return true;
  });
}

// 更新复杂进度结构
function updateComplexProgress(task: Doc<"player_tasks">, event: any): any {
  const progress = task.progress as { sub_0: number; sub_1: number };
  const condition = task.condition as any;

  if (condition.type === "and" || condition.type === "or") {
    const newProgress = { ...progress };
    condition.subConditions.forEach((sub: any, idx: number) => {
      if (sub.action === event.action) {
        const key = `sub_${idx}` as keyof typeof progress;
        newProgress[key] = (newProgress[key] || 0) + 1;
      }
    });
    return newProgress;
  } else {
    // 简单复杂结构
    if (event.action === "login") {
      return { ...progress, sub_0: progress.sub_0 + 1 };
    } else if (event.action === "complete_match") {
      return { ...progress, sub_1: progress.sub_1 + 1 };
    }
    return progress;
  }
}

// 更新多阶段任务进度
function updateMultiStageProgress(task: Doc<"player_tasks">, event: any): any {
  const progress = task.progress as { stages: number[]; currentStage: number };
  const condition = task.condition as any;

  if (!progress.stages) {
    // 初始化进度
    return {
      stages: new Array(condition.stages.length).fill(0),
      currentStage: 0
    };
  }

  const newProgress = { ...progress };

  // 找到匹配的阶段
  condition.stages.forEach((stage: any, idx: number) => {
    if (stage.action === event.action) {
      newProgress.stages[idx] = (newProgress.stages[idx] || 0) + 1;

      // 检查是否完成当前阶段
      if (newProgress.stages[idx] >= stage.count && idx === newProgress.currentStage) {
        newProgress.currentStage = Math.min(idx + 1, condition.stages.length - 1);
      }
    }
  });

  return newProgress;
}

// 更新时间相关任务进度
function updateTimeBasedProgress(task: Doc<"player_tasks">, event: any): any {
  const progress = task.progress as {
    actions: { [key: string]: number }[];
    lastActionDate: string;
    consecutiveDays: number;
  };
  const condition = task.condition as any;

  if (!progress.actions) {
    // 初始化进度
    return {
      actions: condition.actions.map((action: any) => ({ [action.action]: 0 })),
      lastActionDate: new Date().toISOString().split('T')[0],
      consecutiveDays: 1
    };
  }

  const newProgress = { ...progress };
  const today = new Date().toISOString().split('T')[0];

  // 更新连续天数
  if (newProgress.lastActionDate !== today) {
    const lastDate = new Date(newProgress.lastActionDate);
    const currentDate = new Date(today);
    const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newProgress.consecutiveDays += 1;
    } else if (diffDays > 1) {
      newProgress.consecutiveDays = 1;
    }
    newProgress.lastActionDate = today;
  }

  // 更新动作进度
  condition.actions.forEach((action: any, idx: number) => {
    if (action.action === event.action) {
      newProgress.actions[idx][action.action] = (newProgress.actions[idx][action.action] || 0) + 1;
    }
  });

  return newProgress;
}

// 检查复杂任务是否完成
function isComplexTaskCompleted(task: Doc<"player_tasks">, newProgress: any): boolean {
  const progress = newProgress as { sub_0: number; sub_1: number };
  const condition = task.condition as any;

  if (condition.type === "and") {
    return condition.subConditions.every((sub: any, idx: number) => {
      const key = `sub_${idx}` as keyof typeof progress;
      const subProgress = progress[key] || 0;
      return subProgress >= sub.count;
    });
  } else if (condition.type === "or") {
    return condition.subConditions.some((sub: any, idx: number) => {
      const key = `sub_${idx}` as keyof typeof progress;
      const subProgress = progress[key] || 0;
      return subProgress >= sub.count;
    });
  } else {
    // 简单复杂结构
    return progress.sub_0 >= condition.count || progress.sub_1 >= condition.count;
  }
}

// 检查多阶段任务是否完成
function isMultiStageTaskCompleted(task: Doc<"player_tasks">, newProgress: any): boolean {
  const progress = newProgress as { stages: number[]; currentStage: number };
  const condition = task.condition as any;

  return progress.stages.every((stageProgress, idx) => {
    return stageProgress >= condition.stages[idx].count;
  });
}

// 检查时间相关任务是否完成
function isTimeBasedTaskCompleted(task: Doc<"player_tasks">, newProgress: any): boolean {
  const progress = newProgress as {
    actions: { [key: string]: number }[];
    consecutiveDays: number;
  };
  const condition = task.condition as any;

  return condition.actions.every((action: any, idx: number) => {
    const actionProgress = progress.actions[idx][action.action] || 0;

    if (action.consecutive) {
      return progress.consecutiveDays >= action.count;
    } else if (action.within_days) {
      // 检查在指定天数内的进度
      return actionProgress >= action.count;
    } else {
      return actionProgress >= action.count;
    }
  });
}

// 获取多阶段任务的阶段性奖励
function getMultiStageReward(task: Doc<"player_tasks">, newProgress: any): any {
  const progress = newProgress as { stages: number[]; currentStage: number };
  const condition = task.condition as any;

  // 检查是否有新完成的阶段
  for (let i = 0; i < progress.stages.length; i++) {
    if (progress.stages[i] >= condition.stages[i].count) {
      return condition.stages[i].reward || 0;
    }
  }

  return 0;
}

// 任务处理器注册
const taskHandlers: Record<string, TaskHandler> = {
  one_time: {
    validate: validateTaskCondition,
    updateProgress: (task, event) => (task.progress as number) + 1,
    isCompleted: (task, newProgress) => newProgress >= (task.condition as any).count
  },
  daily: {
    validate: validateTaskCondition,
    updateProgress: (task, event) => (task.progress as number) + 1,
    isCompleted: (task, newProgress) => newProgress >= (task.condition as any).count
  },
  weekly: {
    validate: validateTaskCondition,
    updateProgress: (task, event) => (task.progress as number) + 1,
    isCompleted: (task, newProgress) => newProgress >= (task.condition as any).count
  },
  season: {
    validate: validateTaskCondition,
    updateProgress: (task, event) => (task.progress as number) + 1,
    isCompleted: (task, newProgress) => newProgress >= (task.condition as any).count
  },
  // 复杂任务类型
  complex: {
    validate: validateComplexCondition,
    updateProgress: updateComplexProgress,
    isCompleted: isComplexTaskCompleted
  },
  multi_stage: {
    validate: validateMultiStageCondition,
    updateProgress: updateMultiStageProgress,
    isCompleted: isMultiStageTaskCompleted,
    getReward: getMultiStageReward
  },
  time_based: {
    validate: validateTimeBasedCondition,
    updateProgress: updateTimeBasedProgress,
    isCompleted: isTimeBasedTaskCompleted
  },
  conditional: {
    validate: validateComplexCondition,
    updateProgress: updateComplexProgress,
    isCompleted: isComplexTaskCompleted
  }
};

// 发放奖励
async function applyRewards(ctx: any, uid: string, rewards: Doc<"player_tasks">["rewards"]) {
  const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
  if (!inventory) throw new Error("玩家库存不存在");

  await ctx.db.patch(inventory._id, {
    coins: inventory.coins + rewards.coins,
    props: [...inventory.props, ...rewards.props.filter((p: any) => p.quantity > 0)],
    tickets: [...inventory.tickets, ...rewards.tickets.filter((t: any) => t.quantity > 0)],
    updatedAt: new Date().toISOString(),
  });

  // 处理游戏积分
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
            solitaire: (playerSeason.gamePoints.solitaire || 0) + rewards.gamePoints,
          },
          updatedAt: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert("player_seasons", {
          uid: uid,
          seasonId: season._id,
          seasonPoints: rewards.gamePoints,
          gamePoints: {
            solitaire: rewards.gamePoints,
            uno: 0,
            ludo: 0,
            rummy: 0
          },
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // 处理段位积分(SP)
  if (rewards.segmentPoints > 0) {
    const playerSegment = await ctx.db
      .query("player_segments")
      .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", "solitaire"))
      .first();

    if (playerSegment) {
      await ctx.db.patch(playerSegment._id, {
        points: playerSegment.points + rewards.segmentPoints,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // 如果玩家段位记录不存在，创建一个新的
      await ctx.db.insert("player_segments", {
        uid: uid,
        gameType: "solitaire",
        segment: "bronze",
        points: rewards.segmentPoints,
        elo: 1000,
        lastUpdated: new Date().toISOString(),
      });
    }
  }
}

// 处理任务事件
export const processTaskEvents = (internalMutation as any)({
  args: { uid: v.string() },
  handler: async (ctx: any, args: any) => {
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const events = await ctx.db
      .query("task_events")
      .withIndex("by_uid_processed", (q: any) => q.eq("uid", args.uid).eq("processed", false))
      .collect();
    console.log(`Found ${events.length} events for player ${args.uid}`);
    let updated = false;
    for (const event of events) {
      // 查找所有可能匹配的任务
      const possibleTasks = await ctx.db
        .query("player_tasks")
        .withIndex("by_uid_taskId", (q: any) => q.eq("uid", args.uid))
        .filter((q: any) => q.eq(q.field("condition.action"), event.action))
        .collect();

      for (const task of possibleTasks) {
        if (task.isCompleted) continue;

        // 获取任务类型，直接从 player_tasks 中获取
        const taskType = task.type || "daily";
        const handler = taskHandlers[taskType] || taskHandlers.one_time;

        if (await handler.validate(task, event)) {
          const newProgress = handler.updateProgress(task, event);

          if (handler.isCompleted(task, newProgress)) {
            if (!task.rewards || typeof task.rewards.coins !== "number") {
              await ctx.db.insert("notifications", {
                uid: args.uid,
                message: `任务"${task.name}"奖励配置错误，请联系支持`,
                createdAt: now,
              });
              continue;
            }

            await applyRewards(ctx, args.uid, task.rewards);
            await ctx.db.patch(task._id, {
              progress: newProgress,
              isCompleted: true,
              updatedAt: now,
            });
            await ctx.db.insert("notifications", {
              uid: args.uid,
              message: `完成任务"${task.name}"，获得 ${task.rewards.coins} 金币${task.rewards.gamePoints > 0 ? `、${task.rewards.gamePoints} 积分` : ''}${task.rewards.segmentPoints > 0 ? `、${task.rewards.segmentPoints} SP` : ''}！`,
              createdAt: now,
            });

            // 更新活动进度
            await ctx.scheduler.runAfter(0, internal.service.updateActivity.updateActivity, {
              uid: args.uid,
              activityId: "login_7_days_hybrid",
              makeupDate: event.createdAt.split("T")[0] !== today ? event.createdAt.split("T")[0] : undefined,
            });
          } else {
            await ctx.db.patch(task._id, {
              progress: newProgress,
              updatedAt: now,
            });
          }
          updated = true;
        }
      }

      await ctx.db.patch(event._id, {
        processed: true,
        updatedAt: now,
      });
    }

    return { success: updated, message: updated ? "任务事件处理完成" : "无匹配任务" };
  },
});

// export default mutation(async ({ db }, { playerId, event }: { playerId: Id<"players">, event: any }) => {
//   console.log(`Processing task event for player ${playerId}:`, event);

//   // 获取玩家的所有活跃任务
//   const playerTasks = await db
//     .query("player_tasks")
//     .withIndex("by_uid_taskId", (q) => q.eq("uid", playerId))
//     .filter((q) => q.eq(q.field("isCompleted"), false))
//     .collect();

//   console.log(`Found ${playerTasks.length} active tasks for player ${playerId}`);

//   const results = [];

//   for (const task of playerTasks) {
//     try {
//       // 获取任务处理器
//       const handler = taskHandlers[task.type || "daily"] || taskHandlers.one_time;

//       console.log(`Processing task ${task._id} of type ${task.type}`);

//       // 验证事件是否适用于此任务
//       const isValid = await handler.validate(task, event);
//       if (!isValid) {
//         console.log(`Event not valid for task ${task._id}`);
//         continue;
//       }

//       // 更新任务进度
//       const newProgress = handler.updateProgress(task, event);
//       console.log(`Updated progress for task ${task._id}:`, { old: task.progress, new: newProgress });

//       // 检查任务是否完成
//       const isCompleted = handler.isCompleted(task, newProgress);

//       // 获取阶段性奖励（如果支持）
//       let stageReward = 0;
//       if (handler.getReward && isCompleted) {
//         stageReward = handler.getReward(task, newProgress);
//       }

//       // 更新任务状态
//       const updateData: any = { progress: newProgress };

//       if (isCompleted) {
//         updateData.status = "completed";
//         updateData.completedAt = new Date().toISOString();

//         // 计算总奖励
//         const totalReward = (task.rewards.coins || 0) + stageReward;
//         updateData.actualReward = totalReward;

//         console.log(`Task ${task._id} completed with reward ${totalReward}`);
//       }

//       // 更新数据库
//       await db.patch(task._id, updateData);

//       results.push({
//         taskId: task._id,
//         taskType: task.type,
//         oldProgress: task.progress,
//         newProgress,
//         isCompleted,
//         reward: isCompleted ? (task.rewards.coins || 0) + stageReward : 0,
//         stageReward
//       });

//     } catch (error) {
//       console.error(`Error processing task ${task._id}:`, error);
//       results.push({
//         taskId: task._id,
//         error: error instanceof Error ? error.message : "Unknown error"
//       });
//     }
//   }

//   console.log(`Task processing completed for player ${playerId}. Results:`, results);
//   return results;
// });
