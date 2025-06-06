import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
const enum Status {
    STARTED = 0,
    COMPLETED = 1,
    DROPPED = 2,
    CANCELLED = 3,
}
export const create = internalMutation({
    args: {
        tournamentId: v.string(),
        players: v.array(v.object({ uid: v.string(), score: v.number(), rank: v.number() })),
    },
    handler: async (ctx, { tournamentId, players }) => {
        const mid = await ctx.db.insert("match", { tournamentId, players, start_time: 0, end_time: 0, status: Status.STARTED });
        return mid;
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
