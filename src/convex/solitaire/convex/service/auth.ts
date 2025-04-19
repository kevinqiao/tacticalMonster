"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";

function generateRandomString(length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export const signin = internalAction({
  args: { access_token: v.string(), expire: v.number() },
  handler: async (ctx, { access_token, expire }) => {
    // 验证 token 逻辑  
    console.log("signin", access_token, expire);
    try {
      const payload = jwt.verify(access_token, "12222222");
      // console.log("payload", payload);

      if (payload && typeof payload === 'object' && 'uid' in payload) {
        const uid = payload.uid;
        // const token = generateRandomString(36); // 生成36位随机字符串
        const player: any = await ctx.runQuery(internal.dao.gamePlayerDao.find, { uid });
        if (!player) {
          await ctx.runMutation(internal.dao.gamePlayerDao.create, {
            uid,
            token: access_token,
            expire,
          });
        } else {
          await ctx.runMutation(internal.dao.gamePlayerDao.update, {
            uid: payload.uid,
            data: {
              token: access_token,
              expire,
            }
          });
        }
        return player;
      }
    } catch (error) {
      console.error("signin error", error);
      return null;
    }
  }
});
// export const refresh = action({
//   args: { uid: v.string(), token: v.string() },
//   handler: async (ctx, { uid, token }) => {
//     const player: any = await ctx.runQuery(internal.dao.gamePlayerDao.find, { uid });
//     if (player && player.token === token) {
//       const newToken = generateRandomString(36);
//       await ctx.runMutation(internal.dao.gamePlayerDao.update, {
//         uid,
//         data: {
//           token: newToken,
//         }
//       });
//       return { uid, token: newToken };
//     }
//     return null;
//   }
// });
export const signout = action({
  args: { uid: v.string(), token: v.string() },
  handler: async (ctx, { uid, token }) => {
    const player: any = await ctx.runQuery(internal.dao.gamePlayerDao.find, { uid });
    if (player && player.token === token) {
      await ctx.runMutation(internal.dao.gamePlayerDao.update, {
        uid,
        data: {
          token: null,
        }
      });
      return { ok: true };
    }
    return null;
  }
});