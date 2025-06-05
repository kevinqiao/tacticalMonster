import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";


export const find = query({
    args: { uid: v.optional(v.string()), lastUpdate: v.optional(v.number()) },
    handler: async (ctx, { uid, lastUpdate }) => {
        // console.log("gameId", gameId, "lastUpdate", lastUpdate);
        if (!uid || !lastUpdate) {
            return []
        }

        // console.log("lastTime",lastTime);
        const events = await ctx.db
            .query("event").withIndex("by_uid", (q) => q.eq("uid", uid).gt("_creationTime", lastUpdate)).collect();
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