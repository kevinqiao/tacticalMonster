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

// Generate random string function
function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
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
        const token = generateRandomString(36); // 生成36位随机字符串
        await ctx.runMutation(internal.service.playerManager.authenticate, { uid, token });
        return {
          uid,
          token,
          expire: Date.now() + expire
        };
      }
    } catch (error) {
      console.error("signin error", error);
      return null;
    }
  }
});


