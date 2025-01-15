import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        character_id: v.string(),
        character_name: v.string(), 
        skills: v.any()
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tm_skill_data", args);
    },
});

export const findByCharacter = internalQuery({
    args: {
        character_id: v.string()
    },
    handler: async (ctx, { character_id }) => {
        const doc = await ctx.db.query("tm_skill_data").withIndex("by_character", (q) => q.eq("character_id", character_id)).unique();
        return doc?.skills
    },
})
export const update = internalMutation({
    args: {
        character_id: v.string(),
        skills: v.any()
    },
    handler: async (ctx, { character_id, skills }) => {
        const skill_data = await ctx.db.query("tm_skill_data").withIndex("by_character", (q) => q.eq("character_id", character_id)).unique();
        const sid = skill_data?._id;
        if (sid)
            await ctx.db.patch(sid, { skills });
    },
})
