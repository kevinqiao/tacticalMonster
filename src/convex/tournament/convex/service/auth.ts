"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";
const paymentApi = "https://cool-salamander-393.convex.site/tournament/pay";


export const signin = internalAction({
  args: { access_token: v.string(), expire: v.number() },
  handler: async (ctx, { access_token, expire }) => {
    // 验证 token 逻辑  
    console.log("signin", access_token, expire, Date.now() + expire);
    try {
      const payload = jwt.verify(access_token, "12222222");
      // console.log("payload", payload);

      if (payload && typeof payload === 'object' && 'uid' in payload) {
        const uid = payload.uid;
        // const token = generateRandomString(36); // 生成36位随机字符串
        const player: any = await ctx.runQuery(internal.dao.playerDao.find, { uid });
        if (!player) {
          await ctx.runMutation(internal.dao.playerDao.create, {
            uid,
            token: access_token,
            expire: expire + Date.now(),
            data: {
              avatar: "test",
              name: payload.name,
              level: 0,
              exp: 0,
            }
          });
        } else {
          await ctx.runMutation(internal.dao.playerDao.update, {
            uid: payload.uid,
            data: {
              token: access_token,
              expire: expire + Date.now(),
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

