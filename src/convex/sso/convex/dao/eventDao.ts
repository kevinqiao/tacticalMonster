import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { sessionQuery } from "../custom/session";

export const find = sessionQuery({
    args: { lastTime: v.optional(v.number()) },
    handler: async (ctx, { lastTime }) => {
        const time = lastTime&&lastTime>0 ?lastTime: Date.now();  
        console.log("user uid ", ctx.user?.uid);
        console.log("time", time);  
        const  events = await ctx.db
                .query("events").withIndex("by_uid", (q) => q.eq("uid", ctx.user?.uid).gt("_creationTime", time)).collect();            
        console.log("events", events);
        if (events.length > 0)
            return events.map((event) => Object.assign({}, event, {time: event._creationTime, _creationTime: undefined, _id: undefined }))
        else if (!lastTime)
            return [{name:"####",time:Date.now()}]  
    }

});
export const create = internalMutation({
    args: { uid: v.optional(v.string()),  name: v.string(), data: v.optional(v.any()) },
    handler: async (ctx, args) => {
        await ctx.db.insert("events",args);
        
        return
    },
});
// export const create = internalMutation({
//     args: { appid: v.string(), events: v.array(v.object({
//         id: v.string(),
//         name: v.string(),
//         uid: v.optional(v.string()),
//         data: v.any()
//     })) },
//     handler: async (ctx, { appid, events }) => {
//         for(const event of events) {
//             if(event.name==="gameCreated"){
//                 const {gameId,challenger,challengee}= event.data as GameModel;
//                 const attacker = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", challengee)).unique();
//                 if(attacker){
//                     const data = attacker.data ?? {};   
//                     await ctx.db.patch(attacker._id, { data:{...data,gameId} });
//                 }
//                 const defender = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", challenger)).unique();
//                 if(defender){
//                     const data = defender.data ?? {};   
//                     await ctx.db.patch(defender._id, { data:{...data,gameId} });
//                 }
//                 await ctx.db.insert("events", { ...event, appid });
//             }
//             await ctx.db.insert("events", { ...event, appid });
//         }
//         return true;
//     }
// });

