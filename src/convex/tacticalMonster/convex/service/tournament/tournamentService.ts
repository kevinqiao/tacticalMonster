import { v } from "convex/values";
import {
    getTacticalMonsterRuleIdsFromTournamentConfigs,
    getTournamentConfigByRuleId,
    resolveTournamentMode,
} from "../../../../tournament/convex/data/tournamentConfigs";
import { internal } from "../../_generated/api";
import { authedAction, authedQuery } from "../../custom/session";
import { action } from "../../_generated/server";
import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";
import { tournamentBridgeHeaders } from "../bridge/tournamentBridgeSecret";
import { getStageRuleConfig, STAGE_RULE_CONFIGS } from "../../data/stageRuleConfigs";
import type { StageModeType, StageRuleConfig } from "../../types/stageRuleTypes";
import { TacticalMonsterErrorCode } from "../errorCodes";
import {
    estimateTeamPowerFromSlots,
    estimateTeamPowerFromStageRule,
    getDebugTeamProfileSlots,
} from "../game/teamPresetService";
import { StageManagerService } from "../stage/stageManagerService";

/** mr_games.status：0 进行中，1 胜 2 负 3 平（已结束） */
function isMrGameEnded(game: { status?: number }): boolean {
    const s = game.status;
    return s === 1 || s === 2 || s === 3;
}

/**
 * 同一 uid + ruleId 下未结束的对局；若有多条取 lastUpdate（回退 createdAt）最新的一条。
 * 用于 solo_challenge 在 getRuleStatuses 中附带可续战的 gameId。
 */
async function findOngoingGameIdForRule(
    ctx: any,
    uid: string,
    ruleId: string
): Promise<string | undefined> {
    const games = await ctx.db
        .query("mr_games")
        .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", ruleId))
        .collect();
    const ongoing = games.filter((g: { status?: number }) => !isMrGameEnded(g));
    if (ongoing.length === 0) return undefined;
    ongoing.sort((a: { lastUpdate?: string; createdAt?: string }, b: { lastUpdate?: string; createdAt?: string }) => {
        const ta = a.lastUpdate ?? a.createdAt ?? "";
        const tb = b.lastUpdate ?? b.createdAt ?? "";
        return tb.localeCompare(ta);
    });
    return (ongoing[0] as { gameId: string }).gameId;
}

export type TournamentLoadGamePlayMode = "play" | "watch" | "replay";

/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 * 非周期性的锦标赛("total"):都是单场比赛(single_match)
 * 周期性的锦标赛(周期性的类型：daily、weekly、seasonal):可以包含(single_match、multi_match,best_of_series,elimination)
 */
export class TournamentService {
    static async loadGame(ctx: any, params: {

        gameId: string;
        /** 默认 play：play/watch 下若对局已结束则返回 GAME_OVER；replay 允许加载已结束局 */
        playMode?: TournamentLoadGamePlayMode;
    }) {
        const { gameId } = params;

        const game = await ctx.runQuery((internal as any).service.game.gameService.findGame, { gameId });
        if (game) {

            // 已存在的游戏：检查是否有活跃的玩家 turn，构造 phaseChanges 让前端统一处理
            let phaseChanges: any = undefined;
            const currentRound = (game as any).currentRound;
            console.log("[loadGame] 游戏已存在, currentRound:", JSON.stringify({
                no: currentRound?.no,
                turnsCount: currentRound?.turns?.length,
                turns: currentRound?.turns?.map((t: any) => ({
                    uid: t.uid, character_id: t.character_id, status: t.status
                })),
            }));
            if (currentRound && currentRound.turns) {
                const activeTurn = currentRound.turns.find(
                    (t: any) => t.status === 1 && t.uid !== "boss"
                );
                console.log("[loadGame] activeTurn:", activeTurn ? {
                    uid: activeTurn.uid,
                    character_id: activeTurn.character_id,
                    status: activeTurn.status,
                } : "未找到活跃的玩家 turn");
                if (activeTurn) {
                    phaseChanges = {
                        turnStart: {
                            uid: activeTurn.uid,
                            character_id: activeTurn.character_id,
                            round: currentRound.no || 1,
                        },
                    };
                }
            }
            console.log("[loadGame] 返回 phaseChanges:", phaseChanges ? JSON.stringify(phaseChanges) : "undefined");
            return { ok: true, game, phaseChanges };
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
            const { uid, tournamentType, stageId } = result.match;
            console.log("match result", result.match);
            const gameResult = await ctx.runMutation((internal as any).service.game.gameService.createGame, {
                uid,
                gameId,
                ruleId: tournamentType,
                stageId,
            });
            if (gameResult && gameResult.ok && gameResult.data) {
                return { ok: true, game: gameResult.data, phaseChanges: gameResult.phaseChanges };
            }
        }
        return { ok: false, errorCode: TacticalMonsterErrorCode.MATCH_NOT_FOUND };
    }
    static async surrender(ctx: any, params: {
        uid: string;
        gameId: string;
    }) {

        const { uid, gameId } = params;
        // const surResult = await ctx.runMutation((internal as any).service.game.gameService.surrender, { gameId });
        // if (surResult.ok) {
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.SURRENDER),
            {
                method: "POST",
                headers: tournamentBridgeHeaders(),
                body: JSON.stringify({
                    uid,
                    gameId,
                    finalScore: 100,
                }),
            }
        );
        const result = await response.json();

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
        const ruleConfig = getStageRuleConfig(typeId) as StageRuleConfig;
        const isUnlocked = await ctx.runQuery((internal as any).service.stage.stageManagerService.isStageUnlocked, { uid, ruleConfig: { ruleId: ruleConfig.ruleId, stageType: ruleConfig.stageType } });
        if (!isUnlocked) {
            return { ok: false, errorCode: TacticalMonsterErrorCode.STAGE_NOT_UNLOCKED };
        }
        let currentStageId = await ctx.runQuery((internal as any).service.stage.stageManagerService.findCurrentStageId, { uid, ruleConfig: { ruleId: ruleConfig.ruleId, stageType: ruleConfig.stageType } });
        // 首次进入某个已解锁关卡时可能尚无 player_stage 记录：这里按规则即时创建 stage
        if (!currentStageId) {
            currentStageId = await ctx.runMutation(
                (internal as any).service.stage.stageManagerService.ensureStageIdForRule,
                { uid, typeId }
            );
        }
        if (!currentStageId) {
            return { ok: false, errorCode: TacticalMonsterErrorCode.STAGE_NOT_FOUND };
        }

        try {
            // 使用 internal API 调用 getTeamPower query
            const teamPowerFromRoster = await ctx.runQuery(
                (internal as any).service.team.teamService.getTeamPower,
                { uid }
            );
            const presetPower = estimateTeamPowerFromStageRule(ruleConfig);
            const debugSlots = getDebugTeamProfileSlots(ruleConfig);
            const debugPower = debugSlots?.length ? estimateTeamPowerFromSlots(debugSlots) : 0;
            const teamPower =
                debugPower > 0
                    ? debugPower
                    : ruleConfig.teamPreset?.mode === "override" && presetPower > 0
                        ? presetPower
                        : teamPowerFromRoster;

            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.JOIN_TOURNAMENT),
                {
                    method: "POST",
                    headers: tournamentBridgeHeaders(),
                    body: JSON.stringify({
                        uid,
                        typeId,
                        // 以后端判定的当前关卡 stageId 为准，避免前端传入旧值导致无法开局
                        stageId: currentStageId,
                        teamPower,
                    }),
                }
            );
            const result = await response.json();
            console.log("join result", result);
            if (result.ok) {
                const { gameId, matchId, stageId, teamPower } = result.data;
                const gameResult = await ctx.runMutation((internal as any).service.game.gameService.createGame, {
                    uid,
                    gameId,
                    ruleId: typeId,
                    stageId,
                });
                if (gameResult && gameResult.ok && gameResult.data) {
                    return { ok: true, game: gameResult.data, phaseChanges: gameResult.phaseChanges };
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
        /** 是否在 mr_player_first_clear 中有通关记录（performance≥2，与解锁链一致） */
        completed: boolean;
        /** 锦标赛 TournamentConfig.mode：教学 / 单人挑战 / 多人（无配置时省略） */
        mode?: StageModeType;
        /** mode 为 solo_challenge 且存在未结束的 mr_games 时返回，便于续战 */
        gameId?: string;
    }>> {
        const { uid, ruleIds: ruleIdsFilter = [] } = params;
        const fromStages = Object.keys(STAGE_RULE_CONFIGS);
        const fromTournaments = getTacticalMonsterRuleIdsFromTournamentConfigs();
        const merged = [...new Set([...fromStages, ...fromTournaments])].sort();
        const targetRuleIds =
            ruleIdsFilter.length > 0
                ? merged.filter((id) => ruleIdsFilter.includes(id))
                : merged;

        // 构建返回结果
        const ruleStatuses: Array<{
            ruleId: string;
            unlocked: boolean;
            stageId: string;
            completed: boolean;
            mode?: StageModeType;
            /** solo_challenge：存在进行中的 mr_games 时返回，供前端 loadGame 续战 */
            gameId?: string;
        }> = [];

        for (const ruleId of targetRuleIds) {
            const ruleConfig = getStageRuleConfig(ruleId);
            const tmCfg = getTournamentConfigByRuleId(ruleId);
            const mode = resolveTournamentMode(tmCfg) as StageModeType | undefined;

            const firstClear = await ctx.db
                .query("mr_player_first_clear")
                .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", ruleId))
                .unique();
            const completed = !!firstClear && (firstClear.performance ?? 0) >= 2;

            const soloOngoingGameId =
                mode === "solo_challenge"
                    ? await findOngoingGameIdForRule(ctx, uid, ruleId)
                    : undefined;

            if (!ruleConfig) {
                ruleStatuses.push({
                    ruleId,
                    unlocked: false,
                    stageId: "",
                    completed,
                    ...(mode !== undefined ? { mode } : {}),
                    ...(soloOngoingGameId ? { gameId: soloOngoingGameId } : {}),
                });
                continue;
            }

            let unlocked = false;
            let stageId = "";
            if (ruleConfig.stageType === "arena") {
                // Arena 类型：只从 mr_arena_stage 获取最新的 stageId
                const arenaStage = await ctx.db
                    .query("mr_arena_stage")
                    .withIndex("by_ruleId", (q: any) => q.eq("ruleId", ruleConfig.ruleId))
                    .order("desc")
                    .first();
                stageId = arenaStage?.stageId ?? "";
                // Arena 类型不需要检查 firstClearCompleted 和 isUnlocked，使用默认值
            } else {

                // 判断是否解锁
                unlocked = await StageManagerService.isStageUnlocked(ctx, uid, ruleConfig);
                // 只有解锁的关卡才获取 stageId
                if (unlocked) {
                    // 获取 stageId：从 mr_player_stages 中获取最新的 stageId（使用 by_lastPlayAt 索引）
                    try {
                        const stage = await StageManagerService.getOrCreateChallengeStage(ctx, uid, ruleConfig.ruleId, ruleConfig);
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
                ruleId: ruleConfig.ruleId,
                unlocked,
                stageId,
                completed,
                ...(mode !== undefined ? { mode } : {}),
                ...(soloOngoingGameId ? { gameId: soloOngoingGameId } : {}),
            });
        }

        return ruleStatuses;
    }
}
export const loadGame = action({
    args: {
        gameId: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.loadGame(ctx, args);
        return result;
    },
});
export const join = authedAction({
    args: {
        typeId: v.string(),
        stageId: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await TournamentService.join(ctx, { ...args, uid: ctx.uid });
        return result;
    },
});
export const surrender = authedAction({
    args: {
        gameId: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("surrender args", args);
        const result = await TournamentService.surrender(ctx, { ...args, uid: ctx.uid });
        return result;
    },
});

/**
 * 获取所有关卡的状态（query：便于前端 useQuery 订阅，数据变更时自动推送）
 */
export const getAllRuleStatuses = authedQuery({
    args: {},
    handler: async (ctx) => {
        return await TournamentService.getRuleStatuses(ctx, { uid: ctx.uid });
    },
});




