import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

/**
 * 仅用 `ctx.db` 读写 `casual_players`。勿对本表使用嵌套 `runMutation(create/patch)`，
 * 否则极易触发 OptimisticConcurrencyControlFailure。
 */
export const authenticate = internalMutation({
  args: {
    uid: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { uid, token }) => {
    const existing = await ctx.db
      .query("casual_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("casual_players", {
        uid,
        token,
        coins: 1000,
        gems: 50,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        token,
        updatedAt: now,
      });
    }
    return await ctx.db
      .query("casual_players")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .unique();
  },
});
