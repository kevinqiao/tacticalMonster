import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { authedQuery } from "../../custom/session";

/** Ensure portal_players row exists for platform identity uid. */
export const ensurePlayer = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const existing = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("portal_players", {
        uid,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, { updatedAt: now });
    }
    return await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});

/** @deprecated Use ensurePlayer — kept as alias for internal callers during migration. */
export const authenticate = ensurePlayer;

export const getPortalPlayerWallet = authedQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", ctx.uid))
      .unique();
    return {
      coins: row?.coins ?? 0,
      gems: row?.gems ?? 0,
    };
  },
});
