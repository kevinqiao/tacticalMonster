/**
 * 宝箱 Convex API
 * 提供给前端调用的宝箱接口
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { ChestService } from "./chestService";

/**
 * 领取宝箱奖励
 */
export const claimChest = mutation({
    args: {
        uid: v.string(),
        chestId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ChestService.claimChest(ctx, {
            uid: args.uid,
            chestId: args.chestId,
        });
    },
});

/**
 * 获取玩家宝箱列表
 */
export const getPlayerChests = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        const waitingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", args.uid).eq("status", "waiting"))
            .collect();

        const openingChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", args.uid).eq("status", "opening"))
            .collect();

        const readyChests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid_status", (q: any) => q.eq("uid", args.uid).eq("status", "ready"))
            .collect();

        const queueRows = await ctx.db
            .query("mr_chest_queue")
            .withIndex("by_uid", (q: any) => q.eq("uid", args.uid))
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

