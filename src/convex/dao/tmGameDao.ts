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
        round: v.number(),
        turns: v.array(v.object({ uid: v.string(), character_id: v.string(), status: v.number() })),
        timeClock: v.number(),
        obstacles: v.array(v.object({ x: v.number(), y: v.number(), type: v.number() })),
        disables: v.array(v.object({ x: v.number(), y: v.number() })),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("tm_game", args);
        return
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