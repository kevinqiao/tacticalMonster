"use node";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
export interface Event {
  id: string;
  name: string;
  uid?: string;
  time: number;
  data: any;
}

export const save = action({
  args: { events: v.array(v.object({ name: v.string(), uid: v.optional(v.string()), data: v.optional(v.any()) })) },
  handler: async (ctx, { events }) => {
    // 验证 token 逻辑
    // const payload = jwt.verify(token, "12222222");
    // if(!payload || typeof payload !== 'object' || !('uid' in payload)){
    //   throw new Error('Invalid token');
    // }
    // const appid = payload.appid;  

    for (const event of events) {
      if (event.name === "GameMatched") {
        for (const uid of event.data.uids) {
          await ctx.runMutation(internal.dao.eventDao.create, { uid, name: "GameMatched", data: event.data });
        }
      }
    }
    return true;
  }
});
