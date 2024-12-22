import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const find = internalQuery({
    args: { gameId: v.id("tm_game"), no: v.number() },
    handler: async (ctx, { gameId, no }) => {
        const round = await ctx.db.query("tm_game_round")
            .withIndex("by_game_round", (q) => q.eq("gameId", gameId).eq("no", no))
            .unique();
        return round
    },
});

export const create = internalMutation({
    args: {
        gameId: v.id("tm_game"),
        no: v.number(),
        status: v.number(),
        turns: v.array(v.object({
            uid: v.string(),
            character_id: v.string(),
            status: v.number(),
            startTime: v.optional(v.number()),
            completeTime: v.optional(v.number())
        }))
    },
    handler: async (ctx, args) => {
        const docId = await ctx.db.insert("tm_game_round",args);
        return docId;
    },
});
export const update = internalMutation({
    args: {
        gameId: v.id("tm_game"),
        no: v.number(),
        data: v.any()
    },
    handler: async (ctx, { gameId, no, data }) => {
        const round = await ctx.db.query("tm_game_round")    
            .withIndex("by_game_round", (q) => q.eq("gameId", gameId).eq("no", no))
            .unique();
        if (round) {
            await ctx.db.patch(round._id, data);
        }
        return true
    },
})