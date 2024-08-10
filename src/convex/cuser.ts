import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const find = query({
  args: { id: v.id("cuser") },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    return { ...user, cuid: user?._id, _id: undefined };
  },
});
export const findByCid = query({
  args: { cid: v.string(), channel: v.number() },
  handler: async (ctx, { cid, channel }) => {
    const cuser = await ctx.db.query("cuser").withIndex("by_channel_cid", (q) => q.eq("channel", channel).eq("cid", cid)).unique();
    return { ...cuser, _id: undefined }
  },
});
export const update = mutation({
  args: { id: v.id("cuser"), data: v.any() },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { ...args.data });
  },
});