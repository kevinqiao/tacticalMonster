import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const findByUid = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});

export const patchByUid = internalMutation({
  args: {
    uid: v.string(),
    patch: v.object({
      updatedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { uid, patch }) => {
    const row = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    if (!row) return null;
    await ctx.db.patch(row._id, patch);
    return row._id;
  },
});
