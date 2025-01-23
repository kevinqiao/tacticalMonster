
import { v } from "convex/values";
import { sessionQuery } from "../custom/session";
export interface Event{
  id:string;
  name:string;
  uid?:string;
  time:number;
  data:any;
}
export const findByUser = sessionQuery({
    args: {lastTime: v.optional(v.number()) },
    handler: async (ctx, { lastTime }) => {
        const user = ctx.user;  
        console.log("lastTime",lastTime);
        console.log("user",user)
        if(!user) return [];
        const events = await ctx.db.query("events").withIndex("by_uid", (q) => q.eq("uid", user.uid).gt("_creationTime", lastTime ?? Date.now())).collect();
        return events.map(event => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }));
    }
})
