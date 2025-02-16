import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { sessionQuery } from "../custom/session";

export const find = sessionQuery({
    args: { lastTime: v.optional(v.number()) },
    handler: async (ctx, { lastTime }) => {
        const time = lastTime&&lastTime>0 ?lastTime: Date.now();  
        const  events = await ctx.db
                .query("events").withIndex("by_uid", (q) => q.eq("uid", ctx.user?.uid).gt("_creationTime", time)).collect();            
        if (events.length > 0)
            return events.map((event) => Object.assign({}, event, {time: event._creationTime, _creationTime: undefined, _id: undefined }))
        else if (!lastTime)
            return [{name:"####",time:Date.now()}]  
    }

});
export const create = internalMutation({
    args: { uid: v.optional(v.string()),  name: v.string(), data: v.optional(v.any()) },
    handler: async (ctx, args) => {
        await ctx.db.insert("events",args);
        
        return
    },
});


