import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
const enum Status {
    REQUEST = 0,
    CHARGED = 1,
    MATCHED = 2,
    CANCELLED = 3,
}
export const create = internalMutation({
    args: {
        uid: v.string(),
        elo: v.number(),
        game: v.string(),
        level: v.number(),
        status: v.optional(v.number()),
    },
    handler: async (ctx, { uid, elo, game, level, status }) => {
        const pid = await ctx.db.insert("match_queue", { uid, elo, game, level, status: status || Status.REQUEST });
        return pid;
    },
})


export const findAll = internalQuery({
    handler: async (ctx) => {
        const players = await ctx.db.query("match_queue").collect();
        return players;
    },
})
export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const player = await ctx.db.query("match_queue").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return player;
    },
})

export const remove = internalMutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const player = await ctx.db.query("match_queue").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (player) {
            await ctx.db.delete(player._id);
            return uid;
        }
        return null;
    },
})
