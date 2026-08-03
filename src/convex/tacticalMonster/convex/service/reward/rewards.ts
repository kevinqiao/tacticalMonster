import { v } from "convex/values";
import { authedMutation, authedQuery } from "../../custom/session";
import { RewardService } from "./rewardService";
import { TournamentProxyService } from "../tournament/tournamentProxyService";

/**
 * 获取玩家锦标赛结算结果（用于前端显示）
 */
export const getTournamentResult = authedQuery({
    args: {
        tournamentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await TournamentProxyService.getTournamentResult({
            uid: ctx.uid,
            tournamentId: args.tournamentId,
        });
    },
});

/**
 * 领取锦标赛奖励
 */
export const claimTournamentRewards = authedMutation({
    args: {
        tournamentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await RewardService.claimTournamentRewards(ctx, {
            uid: ctx.uid,
            tournamentId: args.tournamentId,
        });
    },
});
