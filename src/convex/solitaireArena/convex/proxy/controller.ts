import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
const tournament_url = "https://beloved-mouse-699.convex.site"
export const loadGame = action({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }): Promise<any> => {
        const res: { ok: boolean, game?: any, events?: any } = { ok: false }
        let game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
        if (!game) {

            const matchURL = `${tournament_url}/findMatchGame`;
            const response = await fetch(matchURL, {
                method: "POST",
                body: JSON.stringify({ gameId })
            });
            const matchGameResult = await response.json();

            if (matchGameResult.ok) {
                const data = matchGameResult.match;
                const rawSeed = data?.seed ?? data?.gameId;
                const createArgs: { seed?: string } = {};
                if (typeof rawSeed === "string") {
                    createArgs.seed = rawSeed;
                }
                const gameResult = await ctx.runMutation(internal.service.gameManager.createGame, createArgs);

                if (gameResult && gameResult.ok) {
                    res.ok = true;
                    res.game = gameResult.data;
                    res.events = gameResult.events;
                }

            }
        } else {
            res.ok = true;
            res.game = game;
        }

        return res;
    },
});
export const submitScore = action({
    args: { gameId: v.string(), score: v.number() },
    handler: async (ctx, { gameId, score }): Promise<any> => {
        console.log("submitScore", gameId, score);
        const submitURL = `${tournament_url}/submitGameScore`;
        const response = await fetch(submitURL, {
            method: "POST",
            body: JSON.stringify({ gameId, score })
        });
        const res = await response.json();
        console.log("submitScore res", res);
        return { ok: res.ok ? true : false, res };
    },
});