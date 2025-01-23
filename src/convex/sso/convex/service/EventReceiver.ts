"use node";
import { v } from "convex/values";
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
  args: { token: v.string(),events:v.array(v.object({name:v.string(),uid:v.optional(v.string()),data:v.optional(v.any())})) },
  handler: async (ctx, { token,events }) => {
    // 验证 token 逻辑
    // const payload = jwt.verify(token, "12222222");
    // if(!payload || typeof payload !== 'object' || !('uid' in payload)){
    //   throw new Error('Invalid token');
    // }
    // const appid = payload.appid;  
    console.log("token",token);
    for(const event of events){
      console.log("event",event);
      if(event.name === "GameCreated"){
        const challengerEvent = {uid:event.data.challenger,name:"GameCreated",data:{gameId:event.data.id}};
        const challengeeEvent = {uid:event.data.challengee,name:"GameCreated",data:{gameId:event.data.id}};
        await ctx.runMutation(internal.dao.eventDao.create, challengerEvent);
        await ctx.runMutation(internal.dao.eventDao.create, challengeeEvent);
      }else{
        await ctx.runMutation(internal.dao.eventDao.create, event);
      } 
    }
    return true;   
  }
});
