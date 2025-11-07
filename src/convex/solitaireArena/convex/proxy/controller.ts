import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
const tournament_url = "https://beloved-mouse-699.convex.site"
export const loadGame = action({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }): Promise<any> => {
        let game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
        if (!game) {
            console.log("game not found, finding match");
            const matchURL = `${tournament_url}/findMatchGame`;
            const response = await fetch(matchURL, {
                method: "POST",
                body: JSON.stringify({ gameId })
            });
            const res = await response.json();
            if (res.ok) {
                const data = res.match;
                const rawSeed = data?.seed ?? data?.gameId;
                const createArgs: { seed?: string } = {};
                if (typeof rawSeed === "string") {
                    createArgs.seed = rawSeed;
                }
                game = await ctx.runMutation(internal.service.gameManager.create, createArgs);
            }
        }
        return { ok: game ? true : false, game };
    },
});