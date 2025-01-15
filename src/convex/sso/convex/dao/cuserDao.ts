import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        cuid:v.string(),
        channel:v.number(),
        data:v.optional(v.any())
     },
    handler: async (ctx, {cuid,channel,data}) => {
        const doc = await ctx.db.query("cuser").withIndex("by_cuid", (q) => q.eq("channel", channel).eq("cuid", cuid)).unique();
        if(!doc){
            const cid = cuid+"-"+channel;
            await ctx.db.insert("cuser",{cid,cuid,channel,data});
            return true;
        }   
        return false;    
    },
});

export const find = internalQuery({
    args: {
        cid: v.string(),
    },
    handler: async (ctx, { cid}) => {
        const doc = await ctx.db.query("cuser").withIndex("by_cid", (q) => q.eq("cid", cid)).unique();
        if(doc){    
            return {...doc,_id:undefined,_creationTime:undefined};
        }
        return null;
    },
})

export const update = internalMutation({
    args: {
        cuid: v.string(),
        channel:v.number(),
        data: v.any()
    },
    handler: async (ctx, { cuid,channel,data }) => {
        const doc = await ctx.db.query("cuser").withIndex("by_cuid", (q) => q.eq("channel",channel).eq("cuid",cuid)).unique();
        if(doc){
            await ctx.db.patch(doc._id, data);
        }else{
            const cid = cuid+"-"+channel;
            await ctx.db.insert("cuser",{cid,cuid,channel,data});   
        }   
        return true;    
    },
})
