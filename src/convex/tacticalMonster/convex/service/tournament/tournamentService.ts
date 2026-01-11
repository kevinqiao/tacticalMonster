import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { action, mutation } from "../../_generated/server";
import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";
import { getStageRuleConfig, getStageRuleConfigs, STAGE_RULE_CONFIGS, StageRuleConfig } from "../../data/stageRuleConfigs";
import { TacticalMonsterErrorCode } from "../errorCodes";
import { StageManagerService } from "../stage/stageManagerService";



/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 * 非周期性的锦标赛("total"):都是单场比赛(single_match)
 * 周期性的锦标赛(周期性的类型：daily、weekly、seasonal):可以包含(single_match、multi_match,best_of_series,elimination)
 */
export class TournamentService {
    static async loadGame(ctx: any, params: {
        uid: string;
        gameId: string;
    }) {
        const { uid, gameId } = params;
        const game = await ctx.runQuery((internal as any).service.game.gameService.findGame, { gameId });
        if (game) {
            return { ok: true, game };
        }
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.FIND_MATCH_GAME),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    gameId,
                }),
            }
        );
        const result = await response.json();

        if (result.ok) {
            const { typeId, stageId } = result.data;
            const game = await ctx.runMutation((internal as any).service.game.gameService.createGame, {
                uid,
                gameId,
                ruleId: typeId,
                stageId,
            });
            if (game) {
                return { ok: true, game };
            }
        }
        return { ok: false, errorCode: TacticalMonsterErrorCode.MATCH_NOT_FOUND };
    }
    static async surrender(ctx: any, params: {
        uid: string;
        gameId: string;
    }) {
        console.log("surrender params", params);
        const { uid, gameId } = params;
        // const surResult = await ctx.runMutation((internal as any).service.game.gameService.surrender, { gameId });
        // if (surResult.ok) {
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.SURRENDER),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uid,
                    gameId,
                    finalScore: 100,
                }),
            }
        );
        const result = await response.json();
        console.log("surrender result", result);
        if (result.ok) {
            return { ok: true };
        }
        // }
        return { ok: false, errorCode: TacticalMonsterErrorCode.GAME_SURRENDER_FAILED };
    }

    /**
     * 加入锦标赛
     */
    static async join(ctx: any, params: {
        uid: string;
        typeId: string;
        stageId: string;
    }) {
        const { uid, typeId, stageId } = params;
        const stageRule = getStageRuleConfig(typeId) as StageRuleConfig;
        const isUnlocked = await ctx.runQuery(internal.service.stage.stageManagerService.isStageUnlocked, { uid, stageRule: { ruleId: stageRule.ruleId, stageType: stageRule.stageType } });
        if (!isUnlocked) {
            return { ok: false, errorCode: TacticalMonsterErrorCode.STAGE_NOT_UNLOCKED };
        }
        const currentStageId = await ctx.runQuery(internal.service.stage.stageManagerService.findCurrentStageId, { uid, stageRule: { ruleId: stageRule.ruleId, stageType: stageRule.stageType } });
        if (!currentStageId) {
            return { ok: false, errorCode: TacticalMonsterErrorCode.STAGE_NOT_FOUND };
        }

        try {
            // 使用 internal API 调用 getTeamPower query
            const teamPower = await ctx.runQuery(
                (internal as any).service.team.teamService.getTeamPower,
                { uid }
            );

            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.JOIN_TOURNAMENT),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid,
                        typeId,
                        stageId,
                        teamPower,
                    }),
                }
            );
            const result = await response.json();
            if (result.ok) {
                const { gameId, matchId, stageId, teamPower } = result.data;
                const game = await ctx.runMutation((internal as any).service.game.gameService.createGame, {
                    uid,
                    gameId,
                    ruleId: typeId,
                    stageId,
                });
                if (game) {
                    return { ok: true, game };
                }

            }
            return { ok: false, errorCode: TacticalMonsterErrorCode.GAME_CREATE_FAILED };

        } catch (error: any) {
            console.error("调用加入锦标赛服务失败:", error);
            return {
                ok: false,
                errorCode: TacticalMonsterErrorCode.NETWORK_ERROR,
            };
        }

    }

    /**
     * 获取所有关卡的状态
     * 合并关卡规则配置和数据库中的玩家关卡数据
     */
    static async getRuleStatuses(ctx: any, params: {
        uid: string;
        ruleIds?: string[];
    }): Promise<Array<{
        ruleId: string;
        unlocked: boolean;
        stageId: string;
    }>> {
        const { uid, ruleIds = [] } = params;
        const stageRules = ruleIds.length > 0 ? getStageRuleConfigs(ruleIds) : Object.values(STAGE_RULE_CONFIGS);


        // 构建返回结果
        const ruleStatuses: Array<{
            ruleId: string;
            unlocked: boolean;
            stageId: string;
        }> = [];

        for (const stageRule of stageRules) {

            let unlocked = false;
            let stageId = "";
            if (stageRule.stageType === "arena") {
                // Arena 类型：只从 mr_arena_stage 获取最新的 stageId
                const arenaStage = await ctx.db
                    .query("mr_arena_stage")
                    .withIndex("by_ruleId", (q: any) => q.eq("ruleId", stageRule.ruleId))
                    .order("desc")
                    .first();
                stageId = arenaStage?.stageId ?? "";
                // Arena 类型不需要检查 firstClearCompleted 和 isUnlocked，使用默认值
            } else {

                // 判断是否解锁
                unlocked = await StageManagerService.isStageUnlocked(ctx, uid, stageRule);
                // 只有解锁的关卡才获取 stageId
                if (unlocked) {
                    // 获取 stageId：从 mr_player_stages 中获取最新的 stageId（使用 by_lastPlayAt 索引）
                    try {
                        const stage = await StageManagerService.getOrCreateChallengeStage(ctx, uid, stageRule.ruleId, stageRule);
                        if (stage) {
                            stageId = stage.stageId;
                        }
                    } catch (error: any) {
                        console.error("获取 stageId 失败:", error);
                        stageId = "";
                    }
                }
            }

            ruleStatuses.push({
                ruleId: stageRule.ruleId,
                unlocked,
                stageId,
            });
        }

        return ruleStatuses;
    }
}
export const loadGame = action({
    args: {
        uid: v.string(),
        gameId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        // return { ok: true, args }
        const result = await TournamentService.loadGame(ctx, args);
        return result;
    },
});
export const join = action({
    args: {
        uid: v.string(),
        typeId: v.string(),
        stageId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.join(ctx, args);
        return result;
    },
});
export const surrender = action({
    args: {
        uid: v.optional(v.string()),
        gameId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        console.log("surrender args", args);
        const result = await TournamentService.surrender(ctx, args);
        return result;
    },
});

/**
 * 获取所有关卡的状态
 */
export const getAllRuleStatuses = mutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const { uid } = args;
        return await TournamentService.getRuleStatuses(ctx, { uid });
    },
});




