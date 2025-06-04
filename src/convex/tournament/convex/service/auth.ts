"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";
const paymentApi = "https://cool-salamander-393.convex.site/tournament/pay";
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
export const joinMatch = action({
  args: { signed: v.string(), token: v.string() },
  handler: async (ctx, { signed, token }) => {


    const payload = jwt.verify(signed, ACCESS_TOKEN_SECRET);
    console.log("payload", payload);
    if (payload && typeof payload === 'object' && 'uid' in payload) {

      const match = await ctx.runQuery(internal.dao.matchQueueDao.find, { uid: payload.uid });
      if (match) {
        console.log("match", "玩家已加入匹配队列");
        return { ok: false, message: "玩家已加入匹配队列" };
      }
      const response = await fetch(paymentApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: payload.uid, token: token, amount: 100 })
      });
      const data = await response.json();
      if (data.ok) {
        await ctx.runMutation(internal.dao.matchQueueDao.create, { uid: payload.uid, level: payload.level, game: payload.game, elo: payload.elo });
        return { ok: true, message: "玩家已加入匹配队列" };
      }
    }
    return { ok: false, message: "玩家未登录" };
  }
});
