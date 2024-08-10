import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const find = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const provider = await ctx.db.query("authprovider").withIndex("by_pid", (q) => q.eq("id", id)).unique();
    return { ...provider, _id: undefined };
  },
});

