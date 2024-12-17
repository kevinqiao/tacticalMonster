import { v } from "convex/values";
import { action } from "../_generated/server";
import { sessionAction, sessionQuery } from "../custom/session";
import GameManager from "./tmGameManager";
export const start = action({
    args: {},
    handler: async (ctx, args) => {
        const gameService = new GameManager(ctx);
        await gameService.createGame();
    }
})
export const find = sessionQuery({
    args: { gameId: v.id("tm_game") },
    handler: async (ctx, { gameId }) => {
        return await ctx.db.get(gameId);
    }
})
export const walk = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const defend = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const attack = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const standBy = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})


