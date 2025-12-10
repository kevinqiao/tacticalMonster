import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { RewardService } from "./rewardService";
import { TournamentProxyService } from "../tournament/tournamentProxyService";

/**
 * 获取玩家锦标赛结算结果（用于前端显示）
 */
export const getTournamentResult = query({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await TournamentProxyService.getTournamentResult({
            uid: args.uid,
            tournamentId: args.tournamentId,
        });
    },
});

/**
 * 领取锦标赛奖励
 */
export const claimTournamentRewards = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await RewardService.claimTournamentRewards(ctx, {
            uid: args.uid,
            tournamentId: args.tournamentId,
        });
    },
});
