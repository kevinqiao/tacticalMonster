import { v } from "convex/values";
import * as GameEngine from "../service/GameEngine";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { sessionAction } from "./custom/session";


export const getInitGame = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events").withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("name"), "gameInited"))
      .first();
    if (event) {
      const game = await ctx.db.get(args.gameId as Id<"games">);
      return { ...event?.data, seed: game?.seed }
    }
  },
});

export const findInitGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId as Id<"games">)
    const gameId = game?.ref ?? args.gameId;
    const event = await ctx.db
      .query("events").withIndex("by_game", (q) => q.eq("gameId", gameId))
      .filter((q) => q.eq(q.field("name"), "gameInited"))
      .first();
    return event?.data
  },
});

export const findPlayTimesByTournament = internalQuery({
  args: { uid: v.string(), tournamentId: v.string() },
  handler: async (ctx, { uid, tournamentId }) => {
    const tournament = await ctx.db.query("tournament").filter((q) => q.eq(q.field("id"), tournamentId)).unique();
    if (tournament?.openTime) {
      const time = tournament.openTime;
      const games = await ctx.db.query("games").withIndex("by_tournament_user", (q) => q.eq("tid", tournamentId).eq("uid", uid).gte("_creationTime", time)).collect();
      return games.length
    }
    return 0;

  },
});
export const getGame = internalQuery({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }): Promise<any> => {
    const game = await ctx.db.get(gameId);
    if (!game) return
    const diffcult = await ctx.db.query("diffcult")
      .filter((q) => q.eq(q.field("id"), game.diffcult)).unique()
    return { ...game, gameId: game._id, _id: undefined, _creationTime: undefined, defender: diffcult?.data };
  },
});
export const findGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }): Promise<any> => {
    console.log("gameId:" + gameId)
    const game = await ctx.db.get(gameId);
    if (game) {
      const diffcult = await ctx.db.query("diffcult")
        .filter((q) => q.eq(q.field("id"), game.diffcult)).unique()
      return { ...game, gameId: game._id, _id: undefined, _creationTime: undefined, defender: diffcult?.data };
    }
  },
});

export const findReport = sessionAction({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }): Promise<any> => {
    const gid = gameId as Id<"games">
    const game = await ctx.runQuery(internal.games.getGame, { gameId: gid });
    if (!game) return
    if (!game.result) {
      const result = GameEngine.settleGame(game);
      if (result && game.gameId) {
        const score = result['base'] + result['time'] + result['goal'];
        game.result = result;
        game.score = score;
        await ctx.runMutation(internal.games.update, { gameId: gid, data: { result, score } })
      }
    }
    return { result: game.result, score: game.score };
  },
});
export const findUserGame = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const games = await ctx.db
      .query("games")
      .filter((q) => q.eq(q.field("uid"), uid))
      .order("desc").first();
    return games;
  },
});

export const findUserGames = internalQuery({
  args: { uid: v.string(), type: v.number(), status: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, { uid, type, to, status }) => {
    console.log(type + ":" + status)
    let games;
    if (!to)
      games = await ctx.db.query("games").withIndex("by_user_type", (q) => q.eq("uid", uid).eq("type", type)).filter((q) => q.eq(q.field("status"), status ?? 0)).order("desc").take(20);
    else
      games = await ctx.db.query("games").withIndex("by_user_type", (q) => q.eq("uid", uid).eq("type", type)).filter((q) => q.and(q.eq(q.field("status"), status ?? 0), q.lt(q.field("_creationTime"), to))).order("desc").take(20);
    console.log(games.length)
    return games;
  },
});
export const findBattleGames = internalQuery({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }) => {
    const games = await ctx.db
      .query("games")
      .filter((q) => q.eq(q.field("battleId"), battleId))
      .collect();
    if (games?.length > 0) {
      const diffcult = await ctx.db.query("diffcult")
        .filter((q) => q.eq(q.field("id"), games[0].diffcult)).unique();
      if (diffcult)
        return games.map((g) => Object.assign({}, g, { defender: diffcult?.data }))
    }
    return games;
  },
});


export const create = internalMutation({
  args: { game: v.any() },
  handler: async (ctx, { game }) => {
    const gameId = await ctx.db.insert("games", { ...game, laststep: 0 });
    return gameId;
  },
});

export const update = internalMutation({
  args: { gameId: v.id("games"), data: v.any() },
  handler: async (ctx, { gameId, data }) => {
    // console.log(data)
    await ctx.db.patch(gameId, { ...data });
  },
});



export const agent = internalMutation({
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .filter((q) => q.and(q.eq(q.field("status"), 0), q.neq(q.field("ref"), "####"), q.lte(q.field("dueTime"), Date.now()))).order("asc").collect();
    for (const game of games) {
      const { ref, laststep, startTime } = game;
      if (ref && startTime) {
        const curstep = Date.now() - startTime;
        const events = await ctx.db
          .query("events").withIndex("by_game", (q) => q.eq("gameId", ref))
          .filter((q) => q.and(q.gt(q.field("steptime"), laststep ?? 0), q.lte(q.field("steptime"), curstep))).order("desc")
          .collect();
        if (events?.length > 0) {
          await ctx.db.patch(game._id, { laststep: events[0].steptime });
        }
      }
    }
  },
});