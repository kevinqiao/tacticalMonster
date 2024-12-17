import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
export const find = internalQuery({
    args: { gameId: v.id("tm_game"),round:v.number(), uid: v.string(),character:v.string()},
    handler: async (ctx, { gameId, round, uid,character }) => {
        const action = await ctx.db.query("tm_action")
            .withIndex("by_game_round_uid_character", (q) => q.eq("gameId", gameId).eq("round", round).eq("uid", uid).eq("character", character))
            .unique();
        return action
    },
});
export const create = internalMutation({
    args: {
        gameId: v.id("tm_game"),
        round: v.number(),
        uid: v.string(),
        character: v.string(),
        act: v.number(),
        data: v.any()
    },
    handler: async (ctx, args) => {
        const docId = await ctx.db.insert("tm_action", args);
        return docId
    },
});
