import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../custom/session";
export const findBySession = sessionQuery({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId }) => {
        const id = gameId as Id<"tm_game">;
        const game = await ctx.db.get(id);      
        if(game){
            const currentRound = await ctx.db.query("tm_game_round").withIndex("by_game_round", (q) => q.eq("gameId", game._id).eq("no", game.round)).unique();
            const characters = await ctx.db
            .query("tm_game_character").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
            const map = await ctx.db.query("tm_map_data").withIndex("by_map_id", (q) => q.eq("map_id", game.map)).unique();
            return { ...game, id: game?._id, _id: undefined, createTime: game?._creationTime,currentRound:currentRound?currentRound:{no:0,turns:[]},characters:characters.map((character)=>Object.assign({},character,{id:character?._id, _id: undefined, _creationTime: undefined })) ,map:{...map, _id: undefined, _creationTime: undefined }  }
        }
        return null
    },
});
export const find = internalQuery({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId }) => {
    
        const id = gameId as Id<"tm_game">;
        const game = await ctx.db.get(id);      
        if(game){
            const currentRound = await ctx.db.query("tm_game_round").withIndex("by_game_round", (q) => q.eq("gameId", game._id).eq("no", game.round)).unique();
            const characters = await ctx.db
            .query("tm_game_character").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
            const map = await ctx.db.query("tm_map_data").withIndex("by_map_id", (q) => q.eq("map_id", game.map)).unique();
            return { ...game, id: game?._id, _id: undefined, createTime: game?._creationTime,currentRound:{...currentRound,id:currentRound?._id, _id: undefined, _creationTime: undefined },characters:characters.map((character)=>Object.assign({},character,{id:character?._id, _id: undefined, _creationTime: undefined })) ,map:{...map, _id: undefined, _creationTime: undefined }  }
        }
        return null
    },
});
// export const find = internalQuery({
//     args: { gameId: v.id("tm_game") },
//     handler: async (ctx, { gameId }) => {
//         const game = await ctx.db.get(gameId);
//         return { ...game, id: game?._id, _id: undefined, createTime: game?._creationTime }
//     },
// });
export const create = internalMutation({
    args: {
        challenger:v.string(),
        challengee: v.string(),
        players: v.array(v.object({ uid: v.string(), name: v.optional(v.string()), avatar: v.optional(v.string()) })),
        map: v.string(),
        round: v.number()    
    },
    handler: async (ctx, { challenger, challengee, map, round,players }) => {
        const docId = await ctx.db.insert("tm_game", {map,round,challengee, challenger, players, lastUpdate: Date.now() });
        return docId
    },
});
export const update = internalMutation({
    args: {
        id: v.id("tm_game"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        await ctx.db.patch(id, data );
        return true
    },
})