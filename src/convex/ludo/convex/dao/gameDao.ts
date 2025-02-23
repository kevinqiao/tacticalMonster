import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../custom/session";
const query = async (ctx:any,gameId:string)=>{
      
        const id = gameId as Id<"game">;
        const game = await ctx.db.get(id);      
        if(game){
            if(game.actDue){
                game.actDue=game.actDue-Date.now();
            }
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
            })),
            dice:v.optional(v.number()),
        })),
        currentAction:v.optional(v.object({type:v.number(),seat:v.optional(v.number()),tokens:v.optional(v.array(v.number()))})),
        actDue:v.optional(v.number()),
    },
        handler: async (ctx, { seats,currentAction,actDue }) => {
        const docId = await ctx.db.insert("game", {seats,currentAction,actDue,status:0 });
        return docId
    },
});
export const update = internalMutation({
    args: {
        id: v.id("game"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        console.log("update",id,data);
        await ctx.db.patch(id, data );
        return true
    },
})
export const lock = internalMutation({
    args: {
        id: v.id("game")
    },
    handler: async (ctx, { id}) => {
        const game = await ctx.db.get(id); 
        if(game&&!game.status){
            await ctx.db.patch(id, {status:1});
            return true;
        }
        return false
    },
})
export const unlock= internalMutation({
    args: {
        id: v.id("game")
    },
    handler: async (ctx, { id}) => {
        const game = await ctx.db.get(id); 
        if(game&&game.status){
            await ctx.db.patch(id, {status:0});
            return true;
        }
        return false
    },
})
