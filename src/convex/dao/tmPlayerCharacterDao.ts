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
        const characters = await ctx.db
            .query("tm_player_character").withIndex("by_player", (q) => q.eq("uid", uid)).collect();
        return characters.map((character) => ({ ...character, _creationTime: undefined, _id: undefined }))
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