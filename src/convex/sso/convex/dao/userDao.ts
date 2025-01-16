import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        uid: v.string(),
        cid: v.string(),
        token:v.string(),
        partner:v.number(),
        data:v.any()
     },
    handler: async (ctx, {uid,cid,partner,token,data}) => {    
       const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
       if(!user){ 
            await ctx.db.insert("user",{uid,cid,partner,token,data});
            return {uid,cid,partner,token,data};    
       }
       return null;
    },
});

export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid}) => {
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return user
    },
})
export const findByPartner = internalQuery({
    args: {
        cid: v.string(),
        partner:v.number(),
    },
    handler: async (ctx, { cid,partner}) => {
        const user= await ctx.db.query("user").withIndex("by_partner", (q) =>q.eq("partner",partner).eq("cid", cid)).unique();
        return user;
    },
})
export const update = internalMutation({
    args: {
        uid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { uid, data }) => {
       const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();    
       if(user){
        await ctx.db.patch(user._id, data);     
        return true;
       }
       return false;
    },
})
