import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
export const find= internalQuery({
    args: { gameId: v.string(), uid: v.string(), character_id   : v.string() },
    handler: async (ctx, { gameId, uid, character_id }) => {
        const character = await ctx.db
            .query("tm_game_character").withIndex("by_game_character", (q) => q.eq("gameId", gameId).eq("uid", uid).eq("character_id", character_id)).unique();
        if (!character) return null;
        return character;   
    },
});
export const create = internalMutation({
    args: {
        character_id: v.string(),
        uid: v.string(),
        gameId: v.string(),
        level: v.number(),
        stats: v.any(),
        q: v.number(),
        r: v.number(),
        statusEffects: v.optional(v.array(v.any())),
        unlockSkills: v.optional(v.array(v.string())),
        cooldowns: v.optional(v.any()),
        move_range: v.number(),
        attack_range: v.object({ min: v.number(), max: v.number() })
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tm_game_character", args);
    },
});
export const update = internalMutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        character_id: v.string(),
        data: v.any()
    },
    handler: async (ctx, { gameId, uid, character_id, data }) => {
        const character = await ctx.db.query("tm_game_character").withIndex("by_game_character", (q) => q.eq("gameId", gameId).eq("uid", uid).eq("character_id", character_id)).unique();
        if (!character) return false;
        await ctx.db.patch(character._id, data);
        return true
    },
})