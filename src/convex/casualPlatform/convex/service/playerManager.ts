import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const authenticate = internalMutation({
  args: {
    uid: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { uid, token }) => {
    const existing = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, {
      uid,
    });
    if (!existing) {
      await ctx.runMutation(internal.dao.casualPlayerDao.create, {
        uid,
        token,
        coins: 1000,
        gems: 50,
        stamina: 100,
        seasonXp: 0,
      });
    } else {
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        token,
      });
    }
    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, {
      uid,
    });
    return player;
  },
});
