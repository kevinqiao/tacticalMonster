import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
export const find = internalQuery({
    args: { id: v.id("tm_user_character") },
    handler: async (ctx, { id }) => {
        const character = await ctx.db
            .get(id);
        return character
    },
});
export const findByUser = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx, { uid }) => {
        const characters = await ctx.db
            .query("tm_user_character").withIndex("by_user", (q) => q.eq("uid", uid)).collect();
        return characters.map((character) => Object.assign({}, character, { id: character?._id, _creationTime: undefined, _id: undefined }))
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
        return await ctx.db.insert("tm_user_character", args);
    },
});
export const update = internalMutation({
    args: {
        id: v.id("tm_user_character"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        await ctx.db.patch(id, data);
        return true
    },
})