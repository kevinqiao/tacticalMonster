import { v } from "convex/values";
import { action } from "../../_generated/server";
import { GameRuleConfigService } from "../game/gameRuleConfigService";
import { TournamentProxyService } from "./tournamentProxyService";



/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 * 非周期性的锦标赛("total"):都是单场比赛(single_match)
 * 周期性的锦标赛(周期性的类型：daily、weekly、seasonal):可以包含(single_match、multi_match,best_of_series,elimination)
 */
export class TournamentService {

    /**
     * 加入锦标赛
     */
    static async join(ctx: any, params: {
        uid: string,
        typeId: any,
        tournamentId?: string
    }) {
        const { uid, tournamentId, typeId } = params;

    }

}



export const join = action({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        typeId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const { uid, tournamentId, typeId } = args;
        const gameRuleConfig = GameRuleConfigService.getGameRuleConfig(typeId);
        if (!gameRuleConfig) {
            return { ok: false, error: "关卡规则配置不存在" };
        }
        if (gameRuleConfig.stageType === "story") {
            return { ok: false, error: "故事模式关卡不能加入锦标赛" };
        }

        const result = await TournamentProxyService.join({ uid, tournamentId, typeId });
        if (result.ok && gameRuleConfig.stageType === "challenge") {
            const { matchId, gameId, stageId } = result.data as { matchId?: string; gameId: string; stageId: string };

        }

        return { ok: true, message: "成功加入锦标赛" };
    },
});
export const openTournament = action({
    args: {
        uid: v.string(),
        typeId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const { uid, typeId } = args;
        const ruleConfig = GameRuleConfigService.getGameRuleConfig(typeId);
        if (!ruleConfig) {
            return { ok: false, error: "关卡规则配置不存在" };
        }
        if (ruleConfig.stageType === "challenge") {

        }
    },
});




