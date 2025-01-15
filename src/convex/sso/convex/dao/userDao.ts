import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        cid: v.string(),
        token:v.string(),
        partner:v.number(),
        name:v.optional(v.string()),
        email:v.optional(v.string()),
        phone:v.optional(v.string()),
     },
    handler: async (ctx, args) => {
       const uid = await ctx.db.insert("user", args);
       if(uid){ 
        await ctx.db.patch(uid,{uid});
        return {cid:args.cid,uid,token:args.token,partner:args.partner,name:args.name,email:args.email,phone:args.phone};
       }
       return null;
    },
});

export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid}) => {
        const levels = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return levels
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
