import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const ensurePlayer = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const existing = await ctx.db
      .query("casual_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("casual_players", {
        uid,
        coins: 1000,
        gems: 50,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, { updatedAt: now });
    }
    return await ctx.db
      .query("casual_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});

export const authenticate = ensurePlayer;
