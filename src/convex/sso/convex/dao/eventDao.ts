import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

export const find = query({
    args: { uid: v.optional(v.string()), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid,  lastTime }) => {
        const time = lastTime ?? Date.now();
        console.log("event time:" + time + ":" + lastTime);      
        const  events = await ctx.db
                .query("events").withIndex("by_uid", (q) => q.eq("uid", uid).gt("_creationTime", time)).collect();            
        
        if (events.length > 0)
            return events.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
        else if (!lastTime)
            return time    
    }

});
export const create = internalMutation({
    args: { appid: v.string(), events: v.array(v.object({
        appid: v.optional(v.string()),
        id: v.string(),
        name: v.string(),
        uid: v.optional(v.string()),
        data: v.any()
    })) },
    handler: async (ctx, { appid, events }) => {
        for(const event of events) {
            await ctx.db.insert("events", { ...event, appid });
        }
        return true;
    }
});

