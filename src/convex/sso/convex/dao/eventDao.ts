import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
interface GameModel{
    gameId:string;
    challenger:string;
    challengee:string;
}
export const find = query({
    args: { uid: v.optional(v.string()), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid,  lastTime }) => {
        const time = lastTime ?? Date.now();
        console.log("event time:" + time + ":" + lastTime);      
        const  events = await ctx.db
                .query("events").withIndex("by_uid", (q) => q.eq("uid", uid).gt("_creationTime", time)).collect();            
        
        if (events.length > 0)
            return events.map((event) => Object.assign({}, event, { id: event?._id, time: event._creationTime, _creationTime: undefined, _id: undefined }))
        else if (!lastTime)
            return time    
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

