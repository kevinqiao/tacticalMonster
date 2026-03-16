import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { internalMutation, mutation, query } from "../../_generated/server";
import { getTournamentConfig, TOURNAMENT_CONFIGS } from "../../data/tournamentConfigs";
import {
    collectRewards,
    getPlayerAttempts,
    settleTournament,
    TournamentStatus,
    validateJoinTournament
} from "./common";
import { TournamentErrorCode } from "./errorCodes";
import { MatchManager } from "./matchManager";


/**
 * 统一锦标赛服务
 * 
 * 支持单人和多人锦标赛，使用远程游戏服务器
 * 
 * 新配置系统说明：
 * - 奖励配置从 TournamentConfig 读取（包括 rankRewards 和 performanceRewards）
 * - 单人关卡（minPlayers === 1 && maxPlayers === 1）支持 firstClearRewards
 * - 宝箱配置（chestTypeWeights）在 rankRewards 或 performanceRewards.levelRewards 中配置
 * - 限制配置支持 maxAttempts、attemptCost 和 unlimitedAttempts
 * 
 * 非周期性的锦标赛("total"): 都是单场比赛(single_match)
 * 周期性的锦标赛(周期性的类型：daily、weekly、seasonal): 可以包含(single_match、multi_match、best_of_series、elimination)
 */
export class TournamentService {
    /**
     * 加载锦标赛配置到数据库
     * 
     * @param options.replaceExisting - 是否替换已存在的配置（默认 false）
     */
    static async loadTournamentConfig(ctx: any, options?: {
        replaceExisting?: boolean;
    }) {
        const { replaceExisting = false } = options || {};

        // 1. 清理现有配置（如果替换）
        if (replaceExisting) {
            const preconfigs = await ctx.db.query("tournament_types").collect();
            for (const preconfig of preconfigs) {
                await ctx.db.delete(preconfig._id);
            }
        }

        // 2. 加载静态配置
        // 注意：TournamentConfig 现在需要手动配置，不再自动生成
        for (const config of TOURNAMENT_CONFIGS) {
            // 获取转换后的配置（处理旧格式）
            const tournamentConfig = getTournamentConfig(config.typeId) || config;

            // 检查是否已存在
            if (!replaceExisting) {
                const existing = await ctx.db
                    .query("tournament_types")
                    .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentConfig.typeId))
                    .first();

                if (existing) {
                    continue;  // 跳过已存在的配置
                }
            }

            // 准备插入的数据（移除可能的旧字段）
            const dataToInsert: any = {
                ...tournamentConfig,
                createdAt: tournamentConfig.createdAt || new Date().toISOString(),
                updatedAt: tournamentConfig.updatedAt || new Date().toISOString(),
            };

            // 移除旧格式字段（如果存在）
            delete dataToInsert.type;
            delete dataToInsert.stageRuleId;
            delete dataToInsert.stageRule; // 兼容旧版本的 stageRule
            delete dataToInsert.priority; // schema 中无此字段，避免校验失败

            await ctx.db.insert("tournament_types", dataToInsert);
        }
    }
    /**
     * 加入锦标赛
     * 
     * 对于单人关卡（minPlayers === 1 && maxPlayers === 1），直接创建比赛
     * 对于多人比赛，加入匹配队列
     * 
     * @param params.uid - 玩家 UID
     * @param params.typeId - 锦标赛类型 ID
     * @param params.tournamentId - 可选的锦标赛 ID（如果未提供，会创建新的锦标赛）
     * @param params.teamPower - 玩家队伍战力（TacticalMonster 游戏需要，用于匹配和创建游戏）
     * @param params.stageId - 关卡 ID（单人关卡需要，用于创建游戏）
     */
    static async join(ctx: any, params: {
        uid: string,
        typeId: any,
        tournamentId?: string,
        teamPower?: number,
        stageId?: string
    }) {
        const { uid, typeId, teamPower, stageId } = params;
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", typeId)).first();
        if (!tournamentType) {
            return { ok: false, message: "锦标赛类型不存在" };
        }
        const validateResult = await validateJoinTournament(ctx, { uid, tournamentType });
        if (!validateResult || !validateResult.ok) {
            return { ok: false, errorCode: validateResult?.errorCode || TournamentErrorCode.UNKNOWN_ERROR, message: validateResult?.message || "验证出错" };
        }
        const tournament = {
            gameType: tournamentType.gameType,
            status: TournamentStatus.OPEN,
            type: tournamentType.typeId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        // return { ok: true, message: "成功加入锦标赛..." };
        if (tournamentType.matchRules.maxPlayers > 1) {
            // 多人比赛：加入匹配队列，传递 teamPower 用于匹配
            // const metadata = teamPower !== undefined ? { teamPower } : undefined;
            // await TournamentMatchingService.joinMatchingQueue(ctx, {
            //     uid,
            //     tournamentId: tournamentId || undefined,
            //     typeId,
            //     gameType: tournamentType.gameType,
            //     metadata
            // });
            // return { ok: true, message: "成功加入匹配队列" };
        } else {
            const tournamentId = await ctx.db.insert("tournaments", tournament);
            if (tournamentId) {
                await ctx.db.insert("player_tournaments", {
                    uid,
                    score: 0,
                    status: TournamentStatus.OPEN,
                    tournamentId,
                    tournamentType: tournament.type,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                const match = await MatchManager.createMatch(ctx, {
                    tournamentId,
                    typeId: tournamentType.typeId,
                    uids: [uid]
                });
                const playerMatch = await MatchManager.joinMatch(ctx, { uid, match: { ...match, type: "solo" } });
                console.log("playerMatch:", stageId, teamPower);
                return {
                    ok: true,
                    message: "成功加入锦标赛",
                    data: {
                        matchId: match.id,
                        gameId: playerMatch.gameId,
                        stageId,
                        teamPower,
                    },
                    // playerMatch
                };
            }
        }
    }

    /**
     * 结算锦标赛
     * 
     * 计算奖励并更新玩家状态，但不发放奖励
     * 奖励将在玩家主动 claim 时发放
     * 
     * @param tournamentId - 锦标赛 ID
     */
    static async settle(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        await settleTournament(ctx, tournamentId);

        return {
            success: true,
            tournamentId,
            message: "锦标赛结算完成"
        };
    }

    /**
     * 获取锦标赛排行榜
     * 
     * @param args.tournamentId - 锦标赛 ID
     * @param args.paginationOpts - 分页选项
     */
    static async getLeaderboard(ctx: any, args: { tournamentId: string, paginationOpts: any }) {
        const { tournamentId, paginationOpts } = args;
        console.log("getLeaderboard", tournamentId, paginationOpts)
        const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        const playerTournaments = await ctx.db.query("player_tournaments").withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId)).order("desc").paginate(paginationOpts);
        console.log("playerTournaments", playerTournaments)
        const leaderboard = playerTournaments.page.map((playerTournament: any) => { return { uid: playerTournament.uid, score: playerTournament.score } })
        console.log("leaderboard", leaderboard)

    }


    /**
     * 领取锦标赛奖励
     * 
     * 发放积分、金币等奖励，并标记奖励已领取
     * 注意：collectRewards 已经会更新状态为 COLLECTED，这里不需要再次更新
     * 
     * @param playerTournament - 玩家锦标赛记录
     */
    static async collect(ctx: any, playerTournament: any) {
        await collectRewards(ctx, playerTournament);
        // collectRewards 已经会更新状态为 COLLECTED，无需再次更新
    }
    /**
     * 获取当前玩家可参与的锦标赛列表
     * 
     * 根据新的配置系统：
     * - 使用 limits.maxAttempts 作为最大尝试次数限制
     * - 如果 limits.unlimitedAttempts === true，则不限制尝试次数
     * - 订阅用户可以使用 limits.subscribed.maxAttempts（如果存在）
     */
    static async getAvailableTournaments(ctx: any, params: {
        uid: string;
    }) {
        const { uid } = params;

        // 获取所有活跃的锦标赛类型
        const tournamentTypes = await ctx.db
            .query("tournament_types")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .collect();

        console.log("[getAvailableTournaments] 过滤 isActive=true 后的记录数:", tournamentTypes.length);

        const availableTournaments: any[] = [];
        for (const tournamentType of tournamentTypes) {
            try {
                const participation = { attempts: 0 };

                // // 检查尝试次数限制
                if (tournamentType.limits) {
                    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType });
                    participation.attempts = attempts;
                }

                availableTournaments.push({
                    typeId: tournamentType.typeId,
                    name: tournamentType.name,
                    description: tournamentType.description,
                    timeRange: tournamentType.timeRange,
                    gameType: tournamentType.gameType,
                    config: {
                        entryRequirements: tournamentType.entryRequirements,
                        gameRule: tournamentType.gameRule,
                        matchRules: tournamentType.matchRules,
                        rewards: tournamentType.rewards,
                        schedule: tournamentType.schedule,
                        limits: tournamentType.limits,
                    },
                    participation,
                });

            } catch (error) {
                console.error(`检查锦标赛资格失败 (${tournamentType.typeId}):`, error);
                // 继续检查其他锦标赛，不中断整个流程
            }
        }

        return {
            success: true,
            tournaments: availableTournaments,
            totalCount: availableTournaments.length
        };
    }
}



export const settle = mutation({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settle(ctx, args.tournamentId);
        return result;
    },
});


export const join = internalMutation({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        typeId: v.string(),
        teamPower: v.optional(v.number()),
        stageId: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        console.log("join:", args);
        const { uid, tournamentId, typeId, teamPower, stageId } = args;
        const result = await TournamentService.join(ctx, { uid, tournamentId, typeId, teamPower, stageId });
        return result;
    },
});
export const collect = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const { uid, tournamentId } = args;
        const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", uid)).unique();
        if (!playerTournament) {
            throw new Error("锦标赛不存在");
        }
        if (playerTournament.status >= TournamentStatus.SETTLED) {
            throw new Error("锦标赛已领取");
        }
        const result = await TournamentService.collect(ctx, playerTournament);
        return result;
    },
});
export const getAvailableTournaments = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx: any, { uid }: { uid: string }) => {
        try {
            const result = await TournamentService.getAvailableTournaments(ctx, { uid });
            // console.log("getAvailableTournaments", result)
            return result;
        } catch (error) {
            console.error("获取可参与的锦标赛失败:", error);
            return null;
        }
    },
});

export const loadTournamentConfig = internalMutation({
    args: {
        replaceExisting: v.optional(v.boolean()),        // 是否替换已存在的配置
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.loadTournamentConfig(ctx, {
            replaceExisting: args.replaceExisting || false,
        });
        return result;
    },
});



