import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Grab the most recent messages.
    const events = await ctx.db.query("events").order("desc").collect();

    return events
  },
});
export const getGameInitEvent = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .filter((q) => q.and(q.eq(q.field("gameId"), args.gameId), q.eq(q.field("name"), "gameInited")))
      .first();
    return event
  },
});
export const findGameInitEvent = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .filter((q) => q.and(q.eq(q.field("gameId"), args.gameId), q.eq(q.field("name"), "gameInited")))
      .first();
    return event
  },
});

export const getByUser = query({
  args: { uid: v.string(), lastTime: v.number() },
  handler: async (ctx, { uid, lastTime }) => {
    console.log(uid + ":" + lastTime)
    if (lastTime > 0) {
      const event = await ctx.db
        .query("events").withIndex("by_uid", (q) => q.eq("uid", uid))
        .filter((q) => q.gt(q.field("time"), lastTime)).order("desc")
        .first();
      if (event) {
        return { ...event, _id: undefined, _creationTime: undefined, id: event._id }
      }
    }
  }
});
export const getByGame = query({
  args: { gameId: v.optional(v.string()), laststep: v.number() },
  handler: async (ctx, args) => {
    if (args.laststep >= 0 && args.gameId) {
      const events = await ctx.db
        .query("events").withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .filter((q) => q.gt(q.field("steptime"), args.laststep)).order("desc")
        .collect();
      return events.map((event) => Object.assign({}, event, { id: event?._id, _creationTime: undefined, _id: undefined }))

    }
  },
});
export const findByBattle = query({
  args: { battleId: v.optional(v.string()) },
  handler: async (ctx, { battleId }) => {
    if (battleId) {
      const battle = await ctx.db.get(battleId as Id<"battle">);
      if (battle) {
        const event = await ctx.db
          .query("events").withIndex("by_battle", (q) => q.eq("battleId", battleId))
          .order("desc")
          .first();
        if (event)
          return Object.assign({}, event, { id: event?._id, _creationTime: undefined, _id: undefined })
      }
    }
  }
});
export const findByGame = query({
  args: { gameId: v.optional(v.string()), laststep: v.number() },
  handler: async (ctx, { gameId, laststep }) => {
    console.log("laststep:" + laststep)
    if (laststep >= 0 && gameId) {
      const game = await ctx.db.get(gameId as Id<"games">);
      if (game?.startTime) {
        const from = laststep;
        // const from = Date.now() - game.startTime;
        const to = game.laststep ?? 0;
        const gid = game['ref'] !== "####" ? game['ref'] : gameId
        console.log("from:" + from + "; to:" + to + " gameId:" + gid)
        const events = await ctx.db
          .query("events").withIndex("by_game", (q) => q.eq("gameId", gid))
          .filter((q) => q.and(q.gt(q.field("steptime"), from), q.lte(q.field("steptime"), to))).order("asc")
          .collect();
        console.log("event size:" + events?.length)
        return events.map((event) => Object.assign({}, event, { id: event?._id, _creationTime: undefined, _id: undefined }))
      }
    }
  },
});
export const findAllByGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    if (gameId !== "0000") {
      const events = await ctx.db
        .query("events")
        .filter((q) => q.and(q.eq(q.field("gameId"), gameId), q.neq(q.field("name"), "gameInited"))).order("asc").collect();
      const elist = events.map((e) => {
        return { id: e._id as string, name: e.name, data: e.data, steptime: e.steptime ?? 0 }
      })
      const gameOverEvent = events.find((e) => e.name === "gameOver");
      if (!gameOverEvent) {
        const game = await ctx.db.get(gameId as Id<"games">);
        if (game?.dueTime && game.startTime)
          elist.push({ id: Date.now() + "", name: "gameOver", data: { result: game.result }, steptime: game['dueTime'] - game['startTime'] })
      }
      return elist
    }
  },
});
export const findStepEvents = query({
  args: { gameId: v.string(), start: v.number(), end: v.number() },
  handler: async (ctx, { gameId, start, end }) => {
    // console.log(start + ":" + end)
    const events = await ctx.db
      .query("events")
      .filter((q) => q.and(q.eq(q.field("gameId"), gameId), q.gt(q.field("steptime"), start), q.lte(q.field("steptime"), end))).order("asc")
      .collect();

    return events
  },
});
export const getStepEvents = internalQuery({
  args: { gameId: v.string(), start: v.number(), end: v.number() },
  handler: async (ctx, { gameId, start, end }) => {
    const events = await ctx.db
      .query("events")
      .filter((q) => q.and(q.eq(q.field("gameId"), gameId), q.gt(q.field("steptime"), start), q.lte(q.field("steptime"), end))).order("asc")
      .collect();
    return events
  },
});
export const findGameEvents = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("gameId"), args.gameId)).order("asc").collect();
    return events
  },
});
export const create = internalMutation({
  args: { name: v.string(), uid: v.optional(v.string()), steptime: v.optional(v.number()), battleId: v.optional(v.string()), gameId: v.optional(v.string()), actionId: v.optional(v.number()), data: v.any() },
  handler: async (ctx, { name, uid, battleId, gameId, actionId, steptime, data }) => {
    await ctx.db.insert("events", { name, uid, battleId, gameId, actionId, steptime, data });
    return
  },
});
export const screate = mutation({
  args: { name: v.string(), uid: v.optional(v.string()), steptime: v.optional(v.number()), gameId: v.optional(v.string()), data: v.any() },
  handler: async (ctx, { name, uid, gameId, steptime, data }) => {
    await ctx.db.insert("events", { name, uid, gameId, steptime, data });
    return
  },
});
export const hi = internalMutation(
  async (ctx) => {
    await ctx.db.insert("events", { name: "test", uid: "kevin", data: {} });
  }
);
export const findByLocale = query({
  args: { locale: v.string() },
  handler: async (ctx, { locale }) => {
    const resources = await ctx.db.query("localization").withIndex("by_locale", (q) => q.eq("locale", locale)).collect();
    return resources;
  },
});

