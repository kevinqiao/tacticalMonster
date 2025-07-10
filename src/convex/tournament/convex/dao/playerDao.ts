import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const create = internalMutation({
    args: {
        uid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
        data: v.optional(v.any()),
    },
    handler: async (ctx, { uid, token, expire, data }) => {
        const pid = await ctx.db.insert("players", { uid, token, expire, ...data });
        return pid;
    },
})

export const findAll = internalQuery({
    handler: async (ctx, { character_id }) => {
        const players = await ctx.db.query("players").collect();
        return players
    },
})
export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return player;
    },
})
export const update = internalMutation({
    args: {
        uid: v.string(),
        token: v.optional(v.string()),
        expire: v.optional(v.number()),
    },
    handler: async (ctx, { uid, token, expire }) => {
        const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (player) {
            return await ctx.db.patch(player._id, { token, expire });
        }
        return null;
    },
})

