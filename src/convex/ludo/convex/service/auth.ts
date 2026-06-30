"use node";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { authedAction } from "../custom/session";
import { verifyPlatformAccessToken } from "../../../shared/platformAuth/platformJwtVerify";

/** Legacy bridge: platform JWT → ensure game_player row. */
export const signin = internalAction({
  args: { access_token: v.string(), expire: v.number() },
  handler: async (ctx, { access_token, expire }) => {
    const uid = verifyPlatformAccessToken(access_token);
    if (!uid) return null;
    const player: unknown = await ctx.runQuery(internal.dao.gamePlayerDao.find, { uid });
    if (!player) {
      await ctx.runMutation(internal.dao.gamePlayerDao.create, { uid, expire });
    } else {
      await ctx.runMutation(internal.dao.gamePlayerDao.update, {
        uid,
        data: { expire },
      });
    }
    return { uid };
  },
});

export const refresh = authedAction({
  args: {},
  handler: async (ctx) => {
    return { uid: ctx.uid };
  },
});

export const signout = authedAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.dao.gamePlayerDao.update, {
      uid: ctx.uid,
      data: { expire: Date.now() },
    });
    return { ok: true };
  },
});
