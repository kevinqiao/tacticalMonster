import { v } from "convex/values";
import { getMonthDate, getWeekDate } from "../util/Utils";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { sessionAction, sessionMutation, sessionQuery } from "./custom/session";
export const findById = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    // Grab the most recent messages.
    const tournament = await ctx.db.query("tournament").filter((q) => q.eq(q.field("id"), id)).order("asc").first();
    return tournament
  },
});

export const findByType = internalQuery({
  args: { type: v.number() },
  handler: async (ctx, { type }) => {
    // Grab the most recent messages.
    const tournaments = await ctx.db.query("tournament").filter((q) => q.gt(q.field("type"), type)).collect();
    return tournaments
  },
});
export const findAll = sessionQuery({
  args: {},
  handler: async (ctx) => {
    const tournaments = await ctx.db.query("tournament").filter((q) => q.eq(q.field("status"), 0)).collect();
    // const tlist = tournaments.filter((t) => t.type === 0 || (t.type > 0 && t.openTime && t.openTime > 0)).map((t) => ({ ...t, _id: undefined }));
    const tlist = tournaments.map((t) => ({ ...t, _id: undefined }));

    return tlist
  },
});
export const join = sessionAction({
  args: { tid: v.string() },
  handler: async (ctx, { tid }) => {

    const { uid } = ctx.user;
    const result: { ok: boolean, code?: number, message?: string } = { ok: false }
    const qs = await ctx.runQuery(internal.matchqueue.finByUid, { uid });
    if (qs) {
      result.code = 2;
      return result
    }

    const tournament = await ctx.runQuery(internal.tournaments.findById, { id: tid });
    console.log(tournament?.closeTime + "-" + Date.now())
    if (tournament?.type === 0 || (tournament?.closeTime && tournament.closeTime > Date.now())) {

      const game = await ctx.runQuery(internal.games.findUserGame, { uid });
      if (game && !game.status) {
        if (!game.dueTime || Date.now() < game.dueTime)
          result.code = 1;
        return result
      }
      try {
        const entryValid = tournament && tournament.entry?.cost ? await ctx.runMutation(internal.asset.charge, { uid, cost: tournament.entry.cost }) : 1
        console.log("valid:" + entryValid)
        if (entryValid > 0) {
          await ctx.runMutation(internal.matchqueue.create, { uid, tournamentId: tid });
          result.ok = true;
          return result
        }
      } catch (e: any) {
        result.message = e.data;
        result.code = 3;
      }
    }
    return result

  }
})
export const claim = sessionMutation({
  args: { battleId: v.optional(v.string()), leaderboardId: v.optional(v.string()) },
  handler: async (ctx, { battleId, leaderboardId }): Promise<any> => {
    if (ctx.user) {
      const { uid } = ctx.user;
      const hasAssets: any = await ctx.db.query("asset").withIndex("by_user", (q) => q.eq("uid", uid??'1111')).collect();
      let rewardAssets;
      console.log("battleId:" + battleId + " leaderboardId:" + leaderboardId)

      if (leaderboardId) {
        const leaderboard = await ctx.db.get(leaderboardId as Id<"leaderboard">);
        if (leaderboard&&leaderboard?.uid === uid && !leaderboard.collected && leaderboard.reward) {
          rewardAssets = leaderboard.reward;
          leaderboard.collected = 1;
          await ctx.db.patch(leaderboardId as Id<"leaderboard">, { collected: 1 })
        }
      } else if (battleId) {
        const battle = await ctx.db.get(battleId as Id<"battle">);
        if (battle?.rewards) {
          const reward = battle.rewards.find((r) => r.uid === uid);
          if (reward) {
            rewardAssets = reward.assets;
            if (!reward.collected) {
              reward.collected = 1;
              await ctx.db.patch(battleId as Id<"battle">, { rewards: battle.rewards })
            }
          }
        }
      }
      if (rewardAssets) {
        for (const asset of rewardAssets) {
          let hasAsset = hasAssets.find((a: any) => a.asset === asset.asset);
          if (hasAsset) {
            hasAsset.amount = hasAsset.amount + asset.amount;
            await ctx.db.patch(hasAsset._id, { amount: hasAsset.amount })
          } else {
            hasAsset = { asset: asset.asset, amount: asset.amount, uid };
            await ctx.db.insert("asset", { ...hasAsset });
          }
          // await ctx.db.insert("events", { name: "assetCollected", uid, time: Date.now(), data: asset });
        }
      }
      return { ok: true, data: rewardAssets }
    }
  },
});
export const schedule = internalMutation({
  handler: async (ctx) => {

    const tournaments = await ctx.db.query("tournament").withIndex("by_status", (q) => q.eq("status", 0)).filter((q) => q.or(q.eq(q.field("type"), 1), q.eq(q.field("type"), 2))).collect();
    for (const tournament of tournaments) {
      if (!tournament.closeTime || !tournament.openTime) continue;
      //settle leaderboard for tournament
      if (!tournament.settled && tournament.closeTime && tournament.closeTime > 0 && tournament.closeTime < (Date.now() - 300000)) {
        const leaders = await ctx.db.query("leaderboard").withIndex("by_tournament_term_score", (q) => q.eq("tournamentId", tournament.id).eq("term", tournament.currentTerm)).order("desc").take(100);
        for (let i = 0; i < leaders.length; i++) {
          const reward = tournament.rewards.find((r) => r.rank === i);
          if (reward) {
            leaders[i].reward = reward.assets;
            await ctx.db.patch(leaders[i]._id, { rank: reward.rank, reward: reward.assets })
          }
        }
        await ctx.db.patch(tournament._id, { closeTime: -1, openTime: -1, settled: 1 })
      }
      //check if launch new tournament
      if (tournament.scheduler && tournament.closeTime === -1 && tournament.openTime === -1) {
        const scheduler = tournament.scheduler;
        const timeZone = scheduler.timeZone;
        const now = Date.now();
        for (const slot of scheduler.slots) {
          let openTime = -1;
          if (slot.day >= 0) {
            openTime = getMonthDate(timeZone, slot.day, slot.hour, slot.minute).getTime();
          } else if (slot.weekday >= 0) {
            openTime = getWeekDate(timeZone, slot.weekday, slot.hour, slot.minute).getTime();
          }
          if (openTime > 0) {
            const closeTime = openTime + slot.duration * 3600 * 1000;
            if (now > openTime && now < closeTime) {
              if (tournament.settled) {
                const currentTerm = tournament.currentTerm ? tournament.currentTerm + 1 : 1;
                await ctx.db.patch(tournament._id, { openTime, closeTime, currentTerm, settled: 0 });
              } else {
                await ctx.db.patch(tournament._id, { openTime, closeTime, currentTerm: tournament.currentTerm ?? 1 });
              }
              break;
            }
          }
        }
      }
    }
  },
});


