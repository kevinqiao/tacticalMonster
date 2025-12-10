import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const findTypeById = internalQuery({
    args: {
        typeId: v.string(),
    },
    handler: async (ctx, { typeId }) => {
        const config = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", typeId))
            .unique();
        return config
    },
});

/**
 * 获取玩家锦标赛记录（内部查询）
 */
export const getPlayerTournament = internalQuery({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
    },
    handler: async (ctx, { uid, tournamentId }) => {
        return await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament_uid", (q: any) => 
                q.eq("tournamentId", tournamentId).eq("uid", uid)
            )
            .unique();
    },
});

/**
 * 获取锦标赛信息（内部查询）
 */
export const getTournament = internalQuery({
    args: {
        tournamentId: v.string(),
    },
    handler: async (ctx, { tournamentId }) => {
        return await ctx.db.get(tournamentId as Id<"tournaments">);
    },
});

/**
 * 更新玩家锦标赛状态为已领取（内部 mutation）
 */
export const markRewardsCollected = internalMutation({
    args: {
        playerTournamentId: v.id("player_tournaments"),
    },
    handler: async (ctx, { playerTournamentId }) => {
        await ctx.db.patch(playerTournamentId, {
            status: 3, // COLLECTED
            collectedAt: new Date().toISOString()
        });
    },
});




