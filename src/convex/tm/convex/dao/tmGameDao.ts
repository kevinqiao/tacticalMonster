import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../custom/session";
const query = async (ctx:any,gameId:string)=>{
        const id = gameId as Id<"tm_game">;
        const game = await ctx.db.get(id);      
        if(game){
            const gameCharacters = [];
            const currentRound = await ctx.db.query("tm_game_round").withIndex("by_game_round", (q:any) => q.eq("gameId", game._id).eq("no", game.round)).unique();
            const characters = await ctx.db
            .query("tm_game_character").withIndex("by_game", (q:any) => q.eq("gameId", gameId)).collect();
            for(const character of characters){
                const skillDoc = await ctx.db.query("tm_skill_data").withIndex("by_character", (q:any) => q.eq("character_id", character.character_id)).unique();
                // console.log("skillDoc", skillDoc);
                const skills = skillDoc?.skills.filter((skill:any)=>
                    character.skills?.includes(skill.id))
                gameCharacters.push({...character, skills})
            } 
            const map = await ctx.db.query("tm_map_data").withIndex("by_map_id", (q:any) => q.eq("map_id", game.map)).unique();
            return { ...game, gameId, _id: undefined, createTime: game?._creationTime,currentRound: currentRound ? {
                ...currentRound,
                id: currentRound._id,
                _id: undefined,
                _creationTime: undefined,
                no: currentRound.no || game.round
            } : undefined,characters:gameCharacters ,map:{...map, _id: undefined, _creationTime: undefined }  }
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
        return await query(ctx,gameId); 
    },
});
export const select = internalQuery({
    args: { gameId: v.string()},
    handler: async (ctx, { gameId }) => {    
        const id = gameId as Id<"tm_game">;
        const game = await ctx.db.get(id); 
        return game;     
     },
 });

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
