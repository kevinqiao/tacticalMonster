import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../_generated/server";


export const find = query({
    args: { gameId: v.optional(v.string()), lastUpdate: v.optional(v.string()) },
    handler: async (ctx, { gameId, lastUpdate }) => {
        // console.log("gameId", gameId, "lastUpdate", lastUpdate);
        if (!gameId || !lastUpdate) {
            return []
        }
        let lastTime = 0;
        if (lastUpdate !== "####") {
            const lastEvent = await ctx.db.get(lastUpdate as Id<"game_event">);
            lastTime = lastEvent?._creationTime ?? 0;
        }
        // console.log("lastTime",lastTime);
        const events = await ctx.db
            .query("game_event").withIndex("by_game", (q) => q.eq("gameId", gameId).gt("_creationTime", lastTime)).collect();
        // console.log("events", events);
        return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))

    }

});

export const findByGame = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const events = await ctx.db.query("game_event").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
        return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
    }
});
export const findByPlayer = internalQuery({
    args: { uid: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid, lastTime }) => {
        const time = lastTime ?? Date.now();
        const events = await ctx.db.query("game_event").withIndex("by_actor", (q) => q.eq("actor", uid).gt("_creationTime", time)).collect();
        return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
    }
});
export const create = internalMutation({
    args: { actor: v.optional(v.string()), gameId: v.optional(v.string()), name: v.string(), data: v.optional(v.any()), time: v.number() },
    handler: async (ctx, args) => {
        await ctx.db.insert("game_event", args);
        return
    },
});