import { v } from "convex/values";
import { internal } from "../_generated/api";
import { authedQuery } from "../custom/session";
import { internalMutation } from "../_generated/server";

export class PlayerManager {
    static async ensurePlayer(ctx: any, params: { uid: string }) {
        const player: any = await ctx.runQuery(internal.dao.playerDao.find, { uid: params.uid });
        const nowISO = new Date().toISOString();
        if (!player) {
            await ctx.runMutation(internal.dao.playerDao.create, {
                uid: params.uid,
                coins: 1000,
                gems: 100,
                expire: Date.now() + 1000 * 60 * 60 * 24 * 30,
            });
        } else {
            await ctx.runMutation(internal.dao.playerDao.update, {
                uid: params.uid,
                expire: Date.now() + 1000 * 60 * 60 * 24 * 30,
            });
        }
        return await ctx.runQuery(internal.dao.playerDao.find, { uid: params.uid });
    }
}

export const ensurePlayer = internalMutation({
    args: { uid: v.string() },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await PlayerManager.ensurePlayer(ctx, args);
    },
});

/** @deprecated use ensurePlayer via platform JWT */
export const authenticate = ensurePlayer;

export const getPlayerTournamentStatus = authedQuery({
    args: {},
    handler: async (ctx: any): Promise<any> => {
        console.log("getPlayerTournamentStatus", ctx.uid);
        return [];
    },
});
