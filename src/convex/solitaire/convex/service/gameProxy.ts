import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { sessionMutation } from "../custom/session";
import GameManager from "./gameManager";

// "use node";
const apiEndpoint = "https://cool-salamander-393.convex.site/event/sync"; // 替换为目标 API 的 URL
const apiToken = "1234567890";

// export const createGame = internalMutation({
//     args: {},
//     handler: async (ctx, args) => {
//         const gameService = new GameManager(ctx, "");
//         await gameService.createGame(uids, matchId);
//         return gameService.getGame();
//     }
// })
// export const create = action({
//     args: {},
//     handler: async (ctx, args) => {
//         console.log("create game");
//         const game = await ctx.runMutation(internal.service.localProxy.createGame, { uids: args.uids, matchId: args.matchId });
//         // console.log("game", game);
//         if (game) {
//             const events = [];
//             for (const seat of game.seats ?? []) {
//                 if (seat.uid) {
//                     events.push({ name: "GameCreated", uid: seat.uid, data: { name: "solitaire", id: game.gameId, status: 0 } })
//                 }
//             }
//             console.log("events", events);
//             const response = await fetch(apiEndpoint, {
//                 method: "POST",
//                 headers: {
//                     "Authorization": `Bearer ${apiToken}`, // 添加认证头
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify(events)
//             });
//             console.log("response", response);
//         }

//     }
// })

export const start = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {

        try {
            console.log("start game", gameId);
            const gameService = new GameManager(ctx);
            await gameService.initialize(gameId);
            await gameService.start();

        } catch (error) {
            console.log("roll error", error);
        }

        return true;

    }
})
export const startRound = internalMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {

        try {
            const gameService = new GameManager(ctx);
            await gameService.initialize(gameId);
            await gameService.startRound();

        } catch (error) {
            console.log("roll error", error);
        }

        return true;

    }
})
export const flip = sessionMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const user = ctx.user;
        if (!user || !user.uid) return false;
        try {
            const gameService = new GameManager(ctx);
            await gameService.initialize(gameId);
            return await gameService.flip(user.uid);

        } catch (error) {
            console.log("move error", error);
            return { ok: false }
        }

    }
})
export const move = sessionMutation({
    args: { gameId: v.string(), cardId: v.string(), to: v.object({ field: v.number(), slot: v.number() }) },
    handler: async (ctx, { gameId, cardId, to }) => {
        const user = ctx.user;
        if (!user || !user.uid) return false;
        try {
            const gameService = new GameManager(ctx);
            await gameService.initialize(gameId);
            const res = await gameService.move(user.uid, cardId, to);
            // console.log("move res", res);
            return res;
        } catch (error) {
            console.log("move error", error);
            return { ok: false }
        }

    }
})
export const completeSkill = sessionMutation({
    args: { gameId: v.string(), skillId: v.string(), data: v.optional(v.any()) },
    handler: async (ctx, { gameId, skillId, data }) => {
        console.log("complete skill", gameId, skillId, data);
        const user = ctx.user;
        if (!user || !user.uid) return false;
        try {
            const gameService = new GameManager(ctx);
            await gameService.initialize(gameId);
            const res = await gameService.completeSkill(skillId, data);
            return res;
        } catch (error) {
            console.log("complete skill error", error);
            return { ok: false }
        }

    }
})
export const turnOffBot = sessionMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const user = ctx.user;
        if (!user || !user.uid) return false;

    }
})
export const timeout = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {

        try {
            const gameService = new GameManager(ctx);
            await gameService.initialize(gameId);
            await gameService.timeout();
        } catch (error) {
            console.log("timeout error", error);
        }
        return true;
    }
})

export const gameOver = sessionMutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        if (!ctx.user) return false;
        const gameService = new GameManager(ctx);
        await gameService.initialize(gameId);
        // await gameService.gameOver();
        return true;
    }
})



