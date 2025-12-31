import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const find = internalQuery({
    args: { cid: v.number() },
    handler: async (ctx, { cid }) => {
        const channel = await ctx.db.query("auth_channel").withIndex("by_channel", (q) => q.eq("cid", cid)).unique();
        return channel;
    }
});



