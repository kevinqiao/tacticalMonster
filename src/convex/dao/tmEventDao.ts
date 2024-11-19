import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

export const find = query({
    args: { gameId: v.string(), lasttime: v.number() },
    handler: async (ctx, { gameId, lasttime }) => {
        const events = await ctx.db
            .query("tm_game_event").withIndex("by_game_time", (q) => q.eq("gameId", gameId).gte("time", lasttime)).collect();
        console.log("event size:" + events?.length)
        return events.map((event) => Object.assign({}, event, { id: event?._id, _creationTime: undefined, _id: undefined }))
    },
});
export const findByCategory = query({
    args: { gameId: v.string(), category: v.string() },
    handler: async (ctx, { gameId, category }) => {
        const events = await ctx.db
            .query("tm_game_event").withIndex("by_category", (q) => q.eq("gameId", gameId).eq("category", category)).collect();
        console.log("event size:" + events?.length)
        return events.map((event) => Object.assign({}, event, { id: event?._id, _creationTime: undefined, _id: undefined }))
    },
});
export const create = internalMutation({
    args: { gameId: v.string(), name: v.string(), category: v.string(), time: v.number(), data: v.any() },
    handler: async (ctx, { name, gameId, time, category, data }) => {
        await ctx.db.insert("tm_game_event", { name, gameId, time, category, data });
        return
    },
});