import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
export const findByGame = internalQuery({
    args: { gameId: v.string(), category: v.string() },
    handler: async (ctx, { gameId, category }) => {
        const characters = await ctx.db
            .query("tm_game_character").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();

        return characters.map((character) => Object.assign({}, character, { id: character?._id, _creationTime: undefined, _id: undefined }))
    },
});
export const create = internalMutation({
    args: {
        character_id: v.string(),
        uid: v.string(),
        gameId: v.string(),
        level: v.number(),
        stats: v.any(),
        position: v.optional(v.object({ x: v.number(), y: v.number() })),
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
        id: v.id("tm_game_character"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        await ctx.db.patch(id, data);
        return true
    },
})