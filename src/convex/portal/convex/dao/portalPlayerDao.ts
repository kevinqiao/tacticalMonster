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

const walletFields = {
  coins: v.optional(v.number()),
  gems: v.optional(v.number()),
  tickets: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
};

/**
 * Patch wallet fields.
 * Accepts both:
 * - `{ uid, coins?, gems?, tickets? }` (casualPlatform-compatible)
 * - `{ uid, patch: { coins?, gems?, tickets?, updatedAt? } }` (legacy portal shape)
 */
export const patchByUid = internalMutation({
  args: {
    uid: v.string(),
    ...walletFields,
    patch: v.optional(v.object(walletFields)),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .unique();
    if (!row) return null;

    const src = args.patch ?? args;
    const patch: Record<string, unknown> = {
      updatedAt: src.updatedAt ?? Date.now(),
    };
    if (src.coins !== undefined) patch.coins = src.coins;
    if (src.gems !== undefined) patch.gems = src.gems;
    if (src.tickets !== undefined) patch.tickets = src.tickets;

    if (Object.keys(patch).length === 1 && patch.updatedAt != null) {
      // Only updatedAt — still apply so legacy empty-ish patches work.
    }
    await ctx.db.patch(row._id, patch);
    return row._id;
  },
});
