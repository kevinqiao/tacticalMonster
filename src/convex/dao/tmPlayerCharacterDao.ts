import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
export const find = internalQuery({
    args: { character_id: v.string(), uid: v.string() },
    handler: async (ctx, { character_id, uid }) => {
        const character = await ctx.db
            .query("tm_player_character").withIndex("by_player", (q) => q.eq("uid", uid).eq("character_id", character_id)).unique();
        return character
    },
});
export const findAll = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, { uid }) => {
        const playerCharacters = [];
        const characters = await ctx.db
            .query("tm_player_character").withIndex("by_player", (q) => q.eq("uid", uid)).collect();
        
        for(const character of characters){
            const characterLevels  = await ctx.db.query("tm_character_level").withIndex("by_character_id",(q)=>q.eq("character_id",character.character_id)).unique();
            const characterLevel = characterLevels?.levels.find((c)=>c.level===character.level); 
            console.log("characterLevel",characterLevel);       
            const characterData = await ctx.db.query("tm_character_data").withIndex("by_character_id", (q) => q.eq("character_id", character.character_id)).unique();
            if(character.unlockSkills){
                const unlockSkills = character.unlockSkills;
                const skillDoc= await ctx.db.query("tm_skill_data").withIndex("by_character", (q) => q.eq("character_id", character.character_id)).unique();
                const skills = skillDoc?.skills.filter((skill)=>unlockSkills.includes(skill.skill_id));
                playerCharacters.push({...characterData,uid,level:character.level, attributes:characterLevel?.attributes, skills});
            }
        }
        return playerCharacters;
    },
});
export const create = internalMutation({
    args: {
        character_id: v.string(),
        uid: v.string(),
        level: v.number(),
        exp: v.number(),
        status: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tm_player_character", args);
    },
});
export const update = internalMutation({
    args: {
        character_id: v.string(),
        uid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { character_id, uid, data }) => {
        const character = await ctx.db
            .query("tm_player_character").withIndex("by_player", (q) => q.eq("uid", uid).eq("character_id", character_id)).unique();
        if (character) {
            await ctx.db.patch(character._id, data);
        }
        return true
    },
})