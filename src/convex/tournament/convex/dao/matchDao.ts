import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../_generated/server";
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
export const findMatch = query({
    args: {
        mid: v.string(),
    },
    handler: async (ctx, { mid }) => {
        const match = await ctx.db.get(mid as Id<"match">);
        return { ...match, _id: undefined, _creationTime: undefined };
    }
})
export const find = internalQuery({
    args: {
        mid: v.id("match"),
    },
    handler: async (ctx, { mid }) => {
        const match = await ctx.db.get(mid);
        return match;
    },
})
export const update = internalMutation({
    args: {
        mid: v.id("match"),
        data: v.any()
    },
    handler: async (ctx, { mid, data }) => {
        const match = await ctx.db.get(mid);
        if (match) {
            return await ctx.db.patch(match._id, data);
        }
        return null;
    },
})
export const remove = internalMutation({
    args: {
        mid: v.id("match"),
    },
    handler: async (ctx, { mid }) => {
        await ctx.db.delete(mid);
    },
})
