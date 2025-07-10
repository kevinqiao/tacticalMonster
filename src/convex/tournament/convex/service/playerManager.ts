import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, query } from "../_generated/server";
import { getTorontoDate } from "./utils";


export class PlayerManager {
    /**
     * 验证玩家
     */
    static async authenticate(ctx: any, params: {
        uid: string;
        token: string;
    }) {
        const player: any = await ctx.runQuery(internal.dao.playerDao.find, { uid: params.uid });
        // const token = generateRandomString(36);
        const now = getTorontoDate();
        if (!player) {

            await ctx.runMutation(internal.dao.playerDao.create, {
                uid: params.uid,
                token: params.token,
                expire: Date.now() + 1000 * 60 * 60 * 24 * 30,
            });

            await ctx.db.insert("player_inventory", {
                uid: params.uid,
                coins: 1000,
                props: [],
                tickets: [],
                createdAt: now.iso,
                updatedAt: now.iso
            });

        } else {
            await ctx.runMutation(internal.dao.playerDao.update, {
                uid: params.uid,
                token: params.token,
                expire: Date.now() + 1000 * 60 * 60 * 24 * 30,
            });
        }
        return player;
    }


}

// Convex 函数接口
export const authenticate = (internalMutation as any)({
    args: {
        uid: v.string(),
        token: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await PlayerManager.authenticate(ctx, args);
    },
});

export const getPlayerTournamentStatus = (query as any)({
    args: {
        uid: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        console.log("getPlayerTournamentStatus", args);
        return [];
    },
});


