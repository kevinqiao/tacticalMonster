// 提交比赛结果并触发任务事件
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";

// 提交比赛结果
export const submitMatchResult = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    uid: v.string(),
    score: v.number(),
    gameData: v.any(),
    propsUsed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // 获取锦标赛
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("锦标赛不存在");
    if (!tournament.playerUids.includes(args.uid)) throw new Error("玩家未加入此锦标赛");

    // 检查现有比赛记录
    const existingMatch = await ctx.db
      .query("matches")
      .withIndex("by_tournament_uid", (q) => q.eq("tournamentId", args.tournamentId).eq("uid", args.uid))
      .first();

    const attemptNumber = existingMatch ? existingMatch.attemptNumber + 1 : 1;

    // 验证道具使用
    const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();
    if (!inventory) throw new Error("玩家库存不存在");
    for (const prop of args.propsUsed) {
      const propInventory = inventory.props.find((p) => p.gameType === tournament.gameType && p.propType === prop);
      if (!propInventory || propInventory.quantity === 0) {
        throw new Error(`道具 ${prop} 不足`);
      }
    }

    // 扣除道具
    await ctx.db.patch(inventory._id, {
      props: inventory.props.map((p) =>
        args.propsUsed.includes(p.propType) && p.gameType === tournament.gameType
          ? { ...p, quantity: p.quantity - 1 }
          : p
      ),
      updatedAt: new Date().toISOString(),
    });

    // 记录比赛结果
    const matchData = {
      tournamentId: args.tournamentId,
      gameType: tournament.gameType,
      uid: args.uid,
      score: args.score,
      completed: true,
      attemptNumber,
      propsUsed: args.propsUsed,
      gameData: args.gameData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingMatch) {
      await ctx.db.patch(existingMatch._id, matchData);
    } else {
      await ctx.db.insert("matches", matchData);
    }

    // 记录任务事件
    await ctx.db.insert("task_events", {
      uid: args.uid,
      action: "complete_match",
      actionData: {
        gameType: tournament.gameType,
        score: args.score,
        tournamentId: args.tournamentId,
      },
      createdAt: new Date().toISOString(),
      processed: false,
      updatedAt: new Date().toISOString(),
    });
    // 异步调度任务处理
    await ctx.scheduler.runAfter(0, internal.service.task.processTaskEvents.processTaskEvents, { uid: args.uid });

    return { success: true, message: "比赛结果提交成功，任务处理已调度" };
  },
});