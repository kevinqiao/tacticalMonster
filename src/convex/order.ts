import { v } from "convex/values";
import { mutation, query } from "./_generated/server";


export const update = mutation({
  args: { id: v.id("order"), data: v.any() },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...data });
  },
});
export const find = query({
  args: { oid: v.string(), partnerId: v.number() },
  handler: async (ctx, { oid, partnerId }) => {
    const order = await ctx.db.query("order").withIndex("by_partner_oid", (q) => q.eq("partnerId", partnerId).eq("oid", oid)).unique();
    if (order)
      return { ...order, id: order._id, _id: undefined, _creationTime: undefined };
  },
});