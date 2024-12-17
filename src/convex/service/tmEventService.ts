import { v } from "convex/values";
import { sessionQuery } from "../custom/session";


export const findByGame = sessionQuery({
    args: { gameId: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { gameId, lastTime }) => {
        return await ctx.db.query("tm_event").withIndex("by_game", (q) => q.eq("gameId", gameId).gt("_creationTime", lastTime ?? Date.now())).collect();
    }
})

export const findByPlayer = sessionQuery({
    args: { uid: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { uid, lastTime }) => {
        return await ctx.db.query("tm_event").withIndex("by_player", (q) => q.eq("uid", uid).gt("_creationTime", lastTime ?? Date.now())).collect();
    }
})

