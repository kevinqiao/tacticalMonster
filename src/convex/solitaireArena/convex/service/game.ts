import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { GameManager } from "./gameManager";

export const createGame = mutation({
    handler: async (ctx) => {
        const gameManager = new GameManager(ctx);
        return await gameManager.createGame();
    },
});
export const draw = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        return await gameManager.draw(gameId);
    },
});
export const move = mutation({
    args: { gameId: v.string(), cardId: v.string(), toZone: v.string() },
    handler: async (ctx, { gameId, cardId, toZone }) => {
        const gameManager = new GameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.move(cardId, toZone);
    },
});
export const recycle = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameManager(ctx);
        return await gameManager.recycle(gameId);
    },
});