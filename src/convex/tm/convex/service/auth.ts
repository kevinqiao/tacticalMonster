"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

function generateRandomString(length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export const signin = action({
  args: { access_token: v.string() },
  handler: async (ctx, { access_token }) => {
    // 验证 token 逻辑
    const payload = jwt.verify(access_token, "12222222");
    if(payload && typeof payload === 'object' && 'uid' in payload){
      const uid = payload.uid;
      const token = generateRandomString(36); // 生成36位随机字符串
      const player:any = await ctx.runQuery(internal.dao.tmPlayerDao.find, { uid });
      if(!player){
        await ctx.runMutation(internal.dao.tmPlayerDao.create, { 
          uid,
          token,
         
        });
      }else{
        await ctx.runMutation(internal.dao.tmPlayerDao.update, { 
          uid: payload.uid,
          data: {
            token,
          } 
        });
      }
      return { uid, token };
    }
    return null;
  }
});