import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
  args: {
    uid: v.string(),
    token: v.optional(v.string()),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("casual_players", {
      ...args,
      updatedAt: now,
    });
  },
});

export const findByUid = internalQuery({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return ctx.db
      .query("casual_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});

export const patchByUid = internalMutation({
  args: {
    uid: v.string(),
    token: v.optional(v.string()),
    coins: v.optional(v.number()),
    gems: v.optional(v.number()),
  },
  handler: async (ctx, { uid, ...rest }) => {
    const row = await ctx.db
      .query("casual_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    if (!row) return null;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (rest.token !== undefined) patch.token = rest.token;
    if (rest.coins !== undefined) patch.coins = rest.coins;
    if (rest.gems !== undefined) patch.gems = rest.gems;
    await ctx.db.patch(row._id, patch);
    return row._id;
  },
});
