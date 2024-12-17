import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../custom/session";
export const findBySession = sessionQuery({
    args: { gameId: v.id("tm_game") },
    handler: async (ctx, { gameId }) => {
        const game = await ctx.db.get(gameId);
        return { ...game, id: game?._id, _id: undefined, createTime: game?._creationTime }
    },
});
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
        map: v.string(),
        round: v.number()    
    },
    handler: async (ctx, args) => {
        const docId = await ctx.db.insert("tm_game", { ...args, lastUpdate: Date.now() });
        return docId
    },
});
export const update = internalMutation({
    args: {
        id: v.id("tm_game"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        await ctx.db.patch(id, { ...data, lastUpdate: Date.now() });
        return true
    },
})