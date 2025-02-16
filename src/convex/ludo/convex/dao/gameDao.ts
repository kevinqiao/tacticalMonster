import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../custom/session";
const query = async (ctx:any,gameId:string)=>{
    console.log("query",gameId);    
        const id = gameId as Id<"game">;
        const game = await ctx.db.get(id);      
        if(game){
            return { ...game, gameId, _id: undefined, _creationTime: undefined} 
        } 
        return null
}
export const find = sessionQuery({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId }) => {      
         return await query(ctx,gameId); 
    },
});
export const get = internalQuery({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId }) => {
        console.log("get",gameId);
        return await query(ctx,gameId); 
    },
});
export const select = internalQuery({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId }) => {    
        const id = gameId as Id<"game">;
        const game = await ctx.db.get(id); 
        return game;     
     },
 });

export const create = internalMutation({
    args: {
        seats:v.array(v.object({
            no:v.number(),  
            uid:v.optional(v.string()),
            tokens:v.array(v.object({
                id:v.number(),
                x:v.number(),
                y:v.number(),
            }))
        })),
        currentTurn:v.optional(v.object({
            seat:v.number(),
            dice:v.number(),
            skill:v.optional(v.string()),
            skillSelect:v.optional(v.string()),
        })),
        turnDue:v.optional(v.number()),
    },
    handler: async (ctx, { seats,currentTurn,turnDue }) => {
        const docId = await ctx.db.insert("game", {seats,currentTurn,turnDue,status:0 });
        return docId
    },
});
export const update = internalMutation({
    args: {
        id: v.id("game"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        await ctx.db.patch(id, data );
        return true
    },
})
