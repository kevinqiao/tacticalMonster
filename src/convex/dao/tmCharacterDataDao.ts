import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        character_id: v.string(),
        name: v.string(),
        class: v.optional(v.string()),
        race: v.optional(v.string()),
        asset: v.optional(v.string()),
        move_range: v.number(),
        attack_range: v.object({ min: v.number(), max: v.number() })
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tm_character_data", args);
    },
});
export const update = internalMutation({
    args: {
        character_id: v.string(),
        data: v.any()
    },
    handler: async (ctx, { character_id, data }) => {
        const character_data = await ctx.db.query("tm_character_data").withIndex("by_character_id", (q) => q.eq("character_id", character_id)).unique();
        const cid = character_data?._id;
        if (cid)
            await ctx.db.patch(cid, data);
    },
})
export const find = internalQuery({
    args: {
        character_id: v.string()
    },
    handler: async (ctx, { character_id }) => {
        const character_data = await ctx.db.query("tm_character_data").withIndex("by_character_id", (q) => q.eq("character_id", character_id)).unique();
        return character_data
    },
})