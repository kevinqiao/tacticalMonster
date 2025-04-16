import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        cuid: v.string(),
        channel: v.string(),
        data: v.optional(v.any())
    },
    handler: async (ctx, { cuid, channel, data }) => {
        const doc = await ctx.db.query("cuser").withIndex("by_cuid", (q) => q.eq("cid", channel).eq("cuid", cuid)).unique();
        if (!doc) {
            const cid = cuid + "-" + channel;
            await ctx.db.insert("cuser", { cid, cuid, data });
            return true;
        }
        return false;
    },
});

export const find = internalQuery({
    args: {
        cid: v.string(),
        cuid: v.string(),
    },
    handler: async (ctx, { cuid, cid }) => {
        const doc = await ctx.db.query("cuser").withIndex("by_cuid", (q) => q.eq("cid", cid).eq("cuid", cuid)).unique();
        if (doc) {
            return { ...doc, _id: undefined, _creationTime: undefined };
        }
        return null;
    },
})

export const update = internalMutation({
    args: {
        cuid: v.string(),
        cid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { cuid, cid, data }) => {
        console.log(data);
        const doc = await ctx.db.query("cuser").withIndex("by_cuid", (q) => q.eq("cid", cid).eq("cuid", cuid)).unique();
        if (doc) {
            await ctx.db.patch(doc._id, { data });
        } else {
            await ctx.db.insert("cuser", { cid, cuid, data });
        }
        return true;
    },
})
