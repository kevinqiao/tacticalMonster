import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";


export const find = query({
    args: { uid: v.string(), lastUpdate: v.optional(v.string()) },
    handler: async (ctx, { uid, lastUpdate }) => {
        // console.log("gameId", gameId, "lastUpdate", lastUpdate);
        if (!uid || !lastUpdate) {
            return []
        }
        let lastTime = 0;
        if (lastUpdate !== "####") {
            const lastEvent = await ctx.db.get(lastUpdate as Id<"event">);
            lastTime = lastEvent?._creationTime ?? 0;
        }
        // console.log("lastTime",lastTime);
        const events = await ctx.db
            .query("event").withIndex("by_uid", (q) => q.eq("uid", uid).gt("_creationTime", lastTime)).collect();
        // console.log("events", events);
        return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))

    }

});

export const create = internalMutation({
    args: { uid: v.string(), name: v.string(), data: v.optional(v.any()) },
    handler: async (ctx, { uid, name, data }) => {
        await ctx.db.insert("event", { uid, name, data });
        return
    },
});