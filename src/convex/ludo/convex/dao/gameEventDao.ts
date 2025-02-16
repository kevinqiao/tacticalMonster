import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";


export const find = query({
    args: { uid: v.optional(v.string()), gameId: v.optional(v.string()), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid, gameId, lastTime }) => {
        if(!lastTime)
            return [{id:"0000",time:Date.now(),name:"####",actor:"0000",data:{}}]
     
        console.log("event time:" +  lastTime+":"+gameId)
        if (gameId) {
            const events = await ctx.db
                .query("game_event").withIndex("by_game", (q) => q.eq("gameId", "123").gt("_creationTime", lastTime)).collect();
            return events?.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
        }
    }

});

export const findByGame = internalQuery({
    args: { gameId: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { gameId, lastTime }) => {
        const time = lastTime ?? Date.now();
        const events = await ctx.db.query("game_event").withIndex("by_game", (q) => q.eq("gameId", gameId).gt("_creationTime", time)).collect();
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
    args: { actor: v.optional(v.string()), gameId: v.optional(v.string()), name: v.string(),data: v.optional(v.any()) },
    handler: async (ctx, args) => {
        await ctx.db.insert("game_event",args);        
        return
    },
});