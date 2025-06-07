"use node";
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
const TELEGRAM_BOT_TOKEN_SECRET = "5369641667:AAGdoOdBJaZVi2QsAHOunEX0DuEhezjFYLQ";
const debitApi = "https://cool-salamander-393.convex.site/asset/debit";
const creditApi = "https://cool-salamander-393.convex.site/asset/credit";
export const joinMatch = action({
  args: { signed: v.string(), token: v.string() },
  handler: async (ctx, { signed, token }) => {

    const payload = jwt.verify(signed, ACCESS_TOKEN_SECRET);
    console.log("payload", payload);
    if (payload && typeof payload === 'object' && 'uid' in payload) {
      console.log("queue", payload.uid);
      const match = await ctx.runQuery(internal.dao.matchQueueDao.find, { uid: payload.uid });
      console.log("match", match);
      if (match) {
        console.log("match", "玩家已加入匹配队列");
        return { ok: false, message: "玩家已加入匹配队列" };
      }
      try {
        const response = await fetch(debitApi, {
          method: "POST",
          body: JSON.stringify({ uid: payload.uid, token: token, amount: 100 })
        });
        const data = await response.json();
        console.log("data", data);
        if (data.ok) {
          const lastUpdate = Date.now();
          const docId: Id<"match_queue"> = await ctx.runMutation(internal.dao.matchQueueDao.create, { uid: payload.uid, level: payload.level, game: payload.game, elo: payload.elo });
          return { ok: true, message: "玩家成功加入匹配队列", matchId: docId.toString(), lastUpdate };
        }
      } catch (error) {
        console.error("error", error);
        return { ok: false, message: "玩家未登录" };
      }
    }
  }
});
