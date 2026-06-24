import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

/**
 * 仅用 `ctx.db` 读写 `portal_players`。勿对本表使用嵌套 `runMutation(create/patch)`，
 * 否则极易触发 OptimisticConcurrencyControlFailure。
 */
export const authenticate = internalMutation({
  args: {
    uid: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { uid, token }) => {
    const existing = await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("portal_players", {
        uid,
        token,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        token,
        updatedAt: now,
      });
    }
    return await ctx.db
      .query("portal_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});
