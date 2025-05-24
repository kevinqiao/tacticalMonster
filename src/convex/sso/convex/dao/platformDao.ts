import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";



export const find = internalQuery({
    args: {
        pid: v.number(),
    },
    handler: async (ctx, { pid }) => {
        const platform = await ctx.db.query("platform").withIndex("by_pid", (q) => q.eq("pid", pid)).unique();
        return platform;
    },
})
export const findByHost = query({
    args: {
        host: v.string(),
    },
    handler: async (ctx, { host }) => {
        const platform = await ctx.db.query("platform").withIndex("by_host", (q) => q.eq("host", host)).unique();
        if (platform)
            return { ...platform, _id: undefined, _creationTime: undefined }
        return null
    },
})
export const update = internalMutation({
    args: {
        pid: v.number(),
        data: v.any()
    },
    handler: async (ctx, { pid, data }) => {
        const platform = await ctx.db.query("platform").withIndex("by_pid", (q) => q.eq("pid", pid)).unique();
        if (platform) {
            await ctx.db.patch(platform._id, { data });
            return true;
        }
        return false;
    },
})

