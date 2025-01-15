import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";


export const find = query({
    args: { uid: v.optional(v.string()), gameId: v.optional(v.string()), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid, gameId, lastTime }) => {
        const time = lastTime ?? Date.now();
        console.log("event time:" + time + ":" + lastTime)

        if (uid) {
            const events = await ctx.db
                .query("tm_event").withIndex("by_player", (q) => q.eq("uid", uid).gt("_creationTime", time)).collect();
            if (events.length > 0)
                return events.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
            else if (!lastTime)
                return time

        } else if (gameId) {
            const events = await ctx.db
                .query("tm_event").withIndex("by_game", (q) => q.eq("gameId", gameId).gt("_creationTime", time)).collect();
            return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
        }
    }

});
export const findByGame = internalQuery({
    args: { gameId: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { gameId, lastTime }) => {
        const time = lastTime ?? Date.now();
        const events = await ctx.db.query("tm_event").withIndex("by_game", (q) => q.eq("gameId", gameId).gt("_creationTime", time)).collect();
        return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
    }
});
export const findByPlayer = internalQuery({
    args: { uid: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid, lastTime }) => {
        const time = lastTime ?? Date.now();
        const events = await ctx.db.query("tm_event").withIndex("by_player", (q) => q.eq("uid", uid).gt("_creationTime", time)).collect();
        return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
    }
});
export const create = internalMutation({
    args: { uid: v.optional(v.string()), gameId: v.optional(v.string()), name: v.string(), category: v.optional(v.string()), data: v.optional(v.any()) },
    handler: async (ctx, args) => {
        await ctx.db.insert("tm_event", args);
        return
    },
});