import { v } from "convex/values";
import { action } from "../_generated/server";
import { sessionAction, sessionQuery } from "../custom/session";
import GameManager from "./tmGameManager";
// "use node";
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
    args: { gameId: v.string(), character_id: v.string(), to: v.object({ q: v.number(), r: v.number() }) },
    handler: async (ctx, { gameId, character_id, to }) => {
        if (!ctx.user) return false;
        const gameService = new GameManager(ctx);
        // console.log("walk action:", character_id, ctx.user.uid);
        return await gameService.walk(gameId, ctx.user.uid, character_id, to);

    }
})
export const defend = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const attack = sessionAction({
    args: {  gameId: v.string(), data: v.any() },
    handler: async (ctx, { gameId, data }) => {
        console.log("attack", gameId, data);
        console.log("user", ctx.user)
         if (!ctx.user) return false;

        const gameService = new GameManager(ctx);
        return await gameService.attack(gameId, data);
    }
})
export const standBy = sessionAction({
    args: { act: v.number(), gameId: v.string(), actionId: v.optional(v.number()), data: v.any() },
    handler: async (ctx, { act, gameId, actionId, data }) => {
        console.log("TM game service")
    }
})
export const selectSkill = sessionAction({
    args: {gameId: v.string(), data: v.any() },
    handler: async (ctx, { gameId, data }) => {
        if (!ctx.user) return false;
        const gameService = new GameManager(ctx);
        return await gameService.selectSkill(gameId, data);
    }
})

