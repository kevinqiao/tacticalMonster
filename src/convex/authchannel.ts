import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";

export const find = internalQuery({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    const channel = await ctx.db.query("authchannel").withIndex("by_channelId", (q) => q.eq("id", id)).unique();
    return { ...channel, _id: undefined };
  },
});
export const findLastId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const channel = await ctx.db.query("authchannel").withIndex("by_channelId", (q) => q.gte("id", 0)).order("desc").first();
    return channel ? channel.id : 0;
  },
});
export const create = mutation({
  args: { id: v.number(), provider: v.string(), data: v.any() },
  handler: async (ctx, { id, provider, data }) => {
    const docId = await ctx.db.insert("authchannel", { id, provider, data });
    return docId
  },
});

