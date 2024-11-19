import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        skill_id: v.string(),
        name: v.string(),
        type: v.union(v.string()),
        description: v.optional(v.string()),
        range: v.optional(v.object({ area_type: v.union(v.string()), distance: v.number() })),
        unlockConditions: v.optional(v.object({ level: v.number(), questsCompleted: v.array(v.string()) })),
        resourceCost: v.optional(v.object({ mana: v.number() })),
        cooldown: v.optional(v.number()),
        effects: v.optional(v.array(v.any())),
        triggerConditions: v.optional(v.array(v.any()))
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tm_skill_data", args);
    },
});

export const find = internalQuery({
    args: {
        skill_id: v.string()
    },
    handler: async (ctx, { skill_id }) => {
        const skill = await ctx.db.query("tm_skill_data").withIndex("by_skill_id", (q) => q.eq("skill_id", skill_id)).unique();
        if (skill)
            return { ...skill, id: skill?._id, _id: undefined, _creationTime: undefined }
    },
})
export const update = internalMutation({
    args: {
        skill_id: v.string(),
        data: v.any()
    },
    handler: async (ctx, { skill_id, data }) => {
        const skill_data = await ctx.db.query("tm_skill_data").withIndex("by_skill_id", (q) => q.eq("skill_id", skill_id)).unique();
        const sid = skill_data?._id;
        if (sid)
            await ctx.db.patch(sid, data);
    },
})
