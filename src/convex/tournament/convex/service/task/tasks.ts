import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";


export const createTask = mutation({
  args: {
    taskId: v.string(),
    name: v.string(),
    description: v.string(),
    type: v.string(),
    gameType: v.optional(v.string()),
    condition: v.any(),
    rewards: v.object({
      coins: v.number(),
      props: v.array(v.object({ gameType: v.string(), propType: v.string(), quantity: v.number() })),
      tickets: v.array(v.object({ gameType: v.string(), tournamentType: v.string(), quantity: v.number() })),
      gamePoints: v.number(),
    }),
    resetInterval: v.string(),
  },
  handler: async (ctx, args) => {
    const now = getTorontoDate();
    await ctx.db.insert("tasks", {
      ...args,
      createdAt: now.iso,
      updatedAt: now.iso,
    });
    return { success: true };
  },
});

export const updateTaskProgress = mutation({
  args: {
    uid: v.string(),
    taskId: v.string(),
    increment: v.number(),
  },
  handler: async (ctx, args) => {
    const now = getTorontoDate();
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .first();
    if (!task) throw new Error("任务不存在");

    const playerTask = await ctx.db
      .query("player_tasks")
      .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid).eq("taskId", args.taskId))
      .first();

    if (!playerTask || shouldReset(task.resetInterval, playerTask.lastReset)) {
      await ctx.db.insert("player_tasks", {
        uid: args.uid,
        taskId: args.taskId,
        progress: args.increment,
        isCompleted: false,
        lastReset: now.iso,
        updatedAt: now.iso,
      });
    } else {
      const newProgress = playerTask.progress + args.increment;
      const isCompleted = newProgress >= task.condition.count && !playerTask.isCompleted;
      await ctx.db.patch(playerTask._id, {
        progress: newProgress,
        isCompleted,
        updatedAt: now.iso,
      });

      if (isCompleted) {
        const inventory = await ctx.db
          .query("player_inventory")
          .withIndex("by_uid", (q) => q.eq("uid", args.uid))
          .first();
        if (!inventory) throw new Error("玩家库存不存在");
        await ctx.db.patch(inventory._id, {
          coins: inventory.coins + task.rewards.coins,
          props: updateProps(inventory.props, task.rewards.props),
          tickets: updateTickets(inventory.tickets, task.rewards.tickets),
          updatedAt: now.iso,
        });

        const season = await ctx.db.query("seasons").filter((q) => q.eq(q.field("isActive"), true)).first();
        if (!season) throw new Error("赛季不存在");
        const playerSeason = await ctx.db
          .query("player_seasons")
          .withIndex("by_uid_season", (q) => q.eq("uid", args.uid).eq("seasonId", season._id))
          .first();
        if (!playerSeason) throw new Error("玩家赛季不存在");
        await ctx.db.patch(playerSeason._id, {
          seasonPoints: playerSeason.seasonPoints + task.rewards.gamePoints,
          gamePoints: {
            ...playerSeason.gamePoints,
            [(task.gameType || "solitaire") as keyof typeof playerSeason.gamePoints]:
              playerSeason.gamePoints[(task.gameType || "solitaire") as keyof typeof playerSeason.gamePoints] + task.rewards.gamePoints,
          },
          updatedAt: now.iso,
        });
      }
    }
  },
});

export const getPlayerTasks = query({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const now = getTorontoDate();
    const tasks = await ctx.db.query("tasks").collect();
    const playerTasks = await ctx.db
      .query("player_tasks")
      .withIndex("by_uid_taskId", (q) => q.eq("uid", args.uid))
      .collect();

    return tasks.map((task) => {
      const playerTask = playerTasks.find((pt) => pt.taskId === task.taskId);
      if (!playerTask || shouldReset(task.resetInterval, playerTask.lastReset)) {
        return {
          ...task,
          progress: 0,
          isCompleted: false,
          lastReset: now.iso,
        };
      }
      return {
        ...task,
        progress: playerTask.progress,
        isCompleted: playerTask.isCompleted,
        lastReset: playerTask.lastReset,
      };
    });
  },
});

function shouldReset(interval: string, lastReset: string): boolean {
  const now = getTorontoDate();
  const last = new Date(lastReset);
  if (interval === "daily") {
    return now.localDate.toISOString().split("T")[0] !== last.toISOString().split("T")[0];
  } else if (interval === "weekly") {
    const nowWeek = Math.floor(now.localDate.getTime() / (7 * 24 * 60 * 60 * 1000));
    const lastWeek = Math.floor(last.getTime() / (7 * 24 * 60 * 60 * 1000));
    return nowWeek !== lastWeek;
  }
  return false;
}

function updateProps(existing: any[], newProps: any[]) {
  const propMap = new Map(existing.map((p) => [`${p.gameType}_${p.propType}`, p.quantity]));
  for (const prop of newProps) {
    const key = `${prop.gameType}_${prop.propType}`;
    propMap.set(key, (propMap.get(key) || 0) + prop.quantity);
  }
  return Array.from(propMap.entries()).map(([key, quantity]) => {
    const [gameType, propType] = key.split("_");
    return { gameType, propType, quantity };
  });
}

function updateTickets(existing: any[], newTickets: any[]) {
  const ticketMap = new Map(existing.map((t) => [`${t.gameType}_${t.tournamentType}`, t.quantity]));
  for (const ticket of newTickets) {
    const key = `${ticket.gameType}_${ticket.tournamentType}`;
    ticketMap.set(key, (ticketMap.get(key) || 0) + ticket.quantity);
  }
  return Array.from(ticketMap.entries()).map(([key, quantity]) => {
    const [gameType, tournamentType] = key.split("_");
    return { gameType, tournamentType, quantity };
  });
}