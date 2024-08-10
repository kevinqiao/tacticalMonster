import { v } from "convex/values";
import { CellItem } from "../model/CellItem";
import { BATTLE_COUNT_DOWN_TIME } from "../model/Constants";
import { createGame } from "../service/GameEngine";
import * as Utils from "../util/Utils";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { sessionAction } from "./custom/session";
export const finByUid = internalQuery({
  args: {
    uid: v.string()
  },
  handler: async (ctx, { uid }) => {
    const ms = await ctx.db.query("matchqueue").filter((q) => q.eq(q.field("uid"), uid)).unique();
    return ms;
  },
});
export const findAll = internalQuery({
  handler: async (ctx) => {
    const ms = await ctx.db.query("matchqueue").collect();
    return ms
  },
});
export const create = internalMutation({
  args: { uid: v.string(), tournamentId: v.string(), term: v.optional(v.number()) },
  handler: async (ctx, { uid, tournamentId, term }) => {
    const t = term ? term : 0;
    const qid = await ctx.db.insert("matchqueue", { uid, tournamentId });
    return qid;
  },
});
export const remove = internalMutation({
  args: { id: v.id("matchqueue") },
  handler: async (ctx, { id }) => {
    const mid = await ctx.db.delete(id);
    return mid;
  },
});


export const settleMatch = internalMutation({
  handler: async (ctx) => {
    const allToMatch = await ctx.db.query("matchqueue").collect();
    if (allToMatch.length == 1) {
      const waitTime = Date.now() - allToMatch[0]['_creationTime'];
      if (waitTime < 8000) return
    }
    if (allToMatch.length > 0) {
      const tournamentId = allToMatch[0]['tournamentId']
      const diffcult = await ctx.db.query("diffcult")
        .filter((q) => q.and(q.eq(q.field("level"), 1), q.eq(q.field("hard"), 1))).unique();
      const tournament = await ctx.db.query("tournament").filter((q) => q.eq(q.field("id"), tournamentId)).order("asc").first();
      if (tournament && diffcult) {
        const startTime = Date.now() + BATTLE_COUNT_DOWN_TIME;
        const battle: any = { tournamentId: tournament.id, participants: tournament.participants, diffcult: diffcult?.id, startTime, duration: tournament.battle.duration };
        battle['duration'] = 120000;
        battle['dueTime'] = startTime + battle['duration'];

        const battleId = await ctx.db.insert("battle", { ...battle, status: 0, type: tournament.type });
        const seed = Utils.getRandomSeed(10);

        const m = allToMatch[0];
        await ctx.db.delete(m._id);

        let opponentGame;
        const gameData: { seed: string; data: { cells: CellItem[]; lastCellId: number } } | null = createGame(diffcult.data);

        if (!gameData) return;
        const game: any = { diffcult: diffcult.id, battleId, tid: tournament.id, data: { cells: gameData?.data.cells, lastCellId: gameData.data.lastCellId }, seed, type: tournament.type, laststep: 0, uid: m.uid, startTime, dueTime: battle['dueTime'], ref: "####" };
        game.data['skillBuff'] = [{ skill: 1, progress: 85 }, { skill: 2, progress: 98 }, { skill: 3, progress: 100 }]
        game.data['move'] = 0

        let gameId = await ctx.db.insert("games", game);
        await ctx.db.insert("events", { name: "gameInited", gameId, data: { gameId, ...game } });
        await ctx.db.insert("events", { name: "battleCreated", uid: m.uid, time: Date.now(), data: { id: battleId } });
        if (tournament.battle.players > 1) {
          if (allToMatch.length === 1) {
            // const gameData: { gameId: string; data: any; seed: string; diffcult: string } | null = await findGameInitData(ctx, m.uid, tournament);
            const opponent = await findOpponent(ctx);
            opponentGame = { ...game, uid: opponent, ref: "####" }
          } else {
            await ctx.db.delete(allToMatch[1]._id);
            opponentGame = { ...game, uid: allToMatch[1].uid, ref: "####" }
          }
          gameId = await ctx.db.insert("games", opponentGame);
          await ctx.db.insert("events", { name: "gameInited", gameId, data: { gameId, ...opponentGame } });
          await ctx.db.insert("events", { name: "battleCreated", uid: opponentGame['uid'], time: Date.now(), data: { id: battleId } });
        }
      }
    }
  },
});
export const exit = sessionAction({
  args: {},
  handler: async (ctx, args) => {
    const { uid } = ctx.user
    const qs = await ctx.runQuery(internal.matchqueue.finByUid, { uid });
    if (qs) {
      const tournament = await ctx.runQuery(internal.tournaments.findById, { id: qs.tournamentId });
      if (tournament && tournament.entry) {
        const mid = await ctx.runMutation(internal.matchqueue.remove, { id: qs._id });
        await ctx.runMutation(internal.asset.chargeBack, { uid, cost: tournament.entry.cost })
        return { ok: true }
      }
    }
  }
})
const findOpponent = async (ctx: any) => {
  const users = await ctx.db.query("user").filter((q: any) => q.eq(q.field("tenant"), "####")).collect();
  if (users.length > 0) {
    const r = Utils.getRandom(users.length - 1);
    return users[r]._id;
  }
  return null
}