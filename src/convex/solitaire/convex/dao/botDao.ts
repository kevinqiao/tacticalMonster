import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";


export const get = internalQuery({
    args: { uid: v.string()},
    handler: async (ctx, { uid }) => {
        const bot = await ctx.db.query("bot").withIndex("by_uid",(q)=>q.eq("uid",uid)).unique();
        return bot;
    },
});



export const create = internalMutation({
    args: {uid:v.string(),name:v.string(),avatar:v.string()},
    handler: async (ctx, { uid,name,avatar }) => {
        const docId = await ctx.db.insert("bot", {uid,name,avatar,level:0,exp:0});
        return docId
    },
});
export const update = internalMutation({
    args: {
        uid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { uid, data }) => {
        const bot = await ctx.db.query("bot").withIndex("by_uid",(q)=>q.eq("uid",uid)).unique();    
        if(bot){
            await ctx.db.patch(bot._id,data );
            return true
        }
        return false
    },
})


