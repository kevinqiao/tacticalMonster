/**
 * 宝箱 Convex API
 * 提供给前端调用的宝箱接口
 */

import { v } from "convex/values";
import { authedMutation, authedQuery } from "../../custom/session";
import { ChestService } from "./chestService";

/**
 * 领取宝箱奖励
 */
export const claimChest = authedMutation({
    args: {
        chestId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ChestService.claimChest(ctx, {
            uid: ctx.uid,
            chestId: args.chestId,
        });
    },
});

/**
 * 获取玩家宝箱列表
 */
export const getPlayerChests = authedQuery({
    args: {},
    handler: async (ctx) => {
        const waitingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", ctx.uid).eq("status", "waiting"))
            .collect();

        const openingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", ctx.uid).eq("status", "opening"))
            .collect();

        const readyChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", ctx.uid).eq("status", "ready"))
            .collect();

        const queueRows = await ctx.db
            .query("mr_chest_queue")
            .withIndex("by_uid", (q: any) => q.eq("uid", ctx.uid))
            .collect();

        queueRows.sort((a: any, b: any) => a._creationTime - b._creationTime);

        return {
            waiting: waitingChests,
            opening: openingChests,
            ready: readyChests,
            queue: queueRows,
        };
    },
});
