import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";


export const find = query({
    handler: async (ctx) => {      
            const events = await ctx.db
                .query("event").withIndex("by_sync", (q) => q.eq("isSynced", false)).collect();
        return events.map(event => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined,isSynced:undefined }));
    }

});

export const create = internalMutation({
    args: { uid: v.optional(v.string()), gameId: v.optional(v.string()), name: v.string(), category: v.optional(v.string()), data: v.optional(v.any()) },
    handler: async (ctx, args) => {
        await ctx.db.insert("tm_event", args);
        return
    },  
});
export const update = internalMutation({
    args: { id: v.id("event"), isSynced: v.boolean() },
    handler: async (ctx,{id,isSynced}) => {
        await ctx.db.patch(id, { isSynced: isSynced, syncTime: isSynced ? Date.now() : undefined});
        return
    },
});
