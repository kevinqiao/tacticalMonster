import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        character_id: v.string(),
        levels: v.array(v.object({ level: v.number(), required_exp: v.number(), attributes: v.any() }))
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tm_character_level", args);
    },
});

export const find = internalQuery({
    args: {
        character_id: v.string()
    },
    handler: async (ctx, { character_id }) => {
        const levels = await ctx.db.query("tm_character_level").withIndex("by_character_id", (q) => q.eq("character_id", character_id)).unique();
        return levels
    },
})
export const findByLevel = internalQuery({
    args: {
        character_id: v.string(),
        level: v.number()
    },
    handler: async (ctx, { character_id, level }) => {
        const level_data = await ctx.db.query("tm_character_level").withIndex("by_character_id", (q) => q.eq("character_id", character_id)).unique();
        return level_data?.levels.find((l) => l.level === level)
    },
})