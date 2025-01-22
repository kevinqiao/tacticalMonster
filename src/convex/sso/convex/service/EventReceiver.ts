"use node";
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
export interface Event{
  id:string;
  name:string;
  uid?:string;
  time:number;
  data:any;
}

export const save = action({
  args: { token: v.string(),events:v.array(v.object({appid:v.optional(v.string()),id:v.string(),name:v.string(),uid:v.optional(v.string()),data:v.any()})) },
  handler: async (ctx, { token,events }) => {
    // 验证 token 逻辑
    const payload = jwt.verify(token, "12222222");
    if(!payload || typeof payload !== 'object' || !('uid' in payload)){
      throw new Error('Invalid token');
    }
    const appid = payload.appid;   
    await ctx.runMutation(internal.dao.eventDao.create, {
        appid,
        events
    });
    return true;   
  }
});
