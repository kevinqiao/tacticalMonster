import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import GameManager from "./gameManager";

// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const createGame = internalMutation({
    args: { uids: v.array(v.string()), matchId: v.string() },
    handler: async (ctx, { uids, matchId }) => {
        const gameService = new GameManager(ctx);
        await gameService.createGame(uids, matchId);
        return gameService.getGame();
    }
})

export const roll = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        try {
            // const gameService = new GameManager(ctx, gameId);
            // await gameService.initGame(gameId);
        } catch (error) {
            console.log("roll error", error);
        }

        return true;

    }
})

export const timeout = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("TM localProxy timeout", gameId);
        const gameService = new GameManager(ctx);
        // await gameService.initGame(gameId);
        await gameService.timeout();
        return true;
    }
})





