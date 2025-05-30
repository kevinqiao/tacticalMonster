import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import GameManager from "./gameManager";

// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";
export const start = internalAction({
    args: {},
    handler: async (ctx, args) => {
        const gameService = new GameManager(ctx);
        await gameService.createGame();
        const game = gameService.getGame();
        //  console.log("game",game);
        if (game && game.seats) {
            const events = [];
            for (const seat of game.seats) {
                if (seat.uid) {
                    events.push({ name: "GameCreated", uid: seat.uid, data: { name: "ludo", id: game.gameId, status: 0 } })
                }
            }
            const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`, // 添加认证头
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(events)
            });
            // console.log("response",response);
        }

    }
})

export const roll = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        try {
            const gameService = new GameManager(ctx);
            await gameService.initGame(gameId);
            // await gameService.roll();
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
        await gameService.initGame(gameId);
        await gameService.timeout();
        return true;
    }
})





