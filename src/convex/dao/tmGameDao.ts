import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
export const find = internalQuery({
    args: { gameId: v.id("tm_game") },
    handler: async (ctx, { gameId }) => {
        const game = await ctx.db.get(gameId);
        return { ...game, id: game?._id, _id: undefined, createTime: game?._creationTime }
    },
});
export const create = internalMutation({
    args: {
        challenger: v.string(),
        challengee: v.string(),
        timeClock: v.number(),
        map: v.string(),
        currentRound: v.string()    
    },
    handler: async (ctx, args) => {
        const docId = await ctx.db.insert("tm_game", { ...args, lastUpdate: Date.now() });
        return docId
    },
});
export const update = internalMutation({
    args: {
        gameId: v.id("tm_game"),
        data: v.any()
    },
    handler: async (ctx, { gameId, data }) => {
        await ctx.db.patch(gameId, data);
        return true
    },
})