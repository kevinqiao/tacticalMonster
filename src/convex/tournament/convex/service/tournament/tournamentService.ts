import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { internalMutation, mutation, query } from "../../_generated/server";
import { TOURNAMENT_CONFIGS } from "../../data/tournamentConfigs";
import {
    checkTournamentEligible,
    collectRewards,
    createTournament,
    findPlayerRank,
    findTournamentByType,
    getPlayerAttempts,
    joinTournament,
    settleTournament,
    TournamentStatus
} from "./common";
import { getHandler } from "./handler";
import { MatchManager } from "./matchManager";
import { TournamentMatchingService } from "./tournamentMatchingService";


/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 * 非周期性的锦标赛("total"):都是单场比赛(single_match)
 * 周期性的锦标赛(周期性的类型：daily、weekly、seasonal):可以包含(single_match、multi_match,best_of_series,elimination)
 */
export class TournamentService {
    static async loadTournamentConfig(ctx: any, options?: {
        generateDynamicLevels?: boolean;  // 是否生成动态关卡
        replaceExisting?: boolean;        // 是否替换已存在的配置
    }) {
        const { generateDynamicLevels = false, replaceExisting = false } = options || {};

        // 1. 如果需要生成动态关卡，先生成
        if (generateDynamicLevels) {
            // 动态导入并直接调用 handler 函数
            const levelGenerationModule = await import("../../api/levelGeneration");
            if (levelGenerationModule.generateAllActiveLevelsHandler) {
                // 直接调用 handler 函数，避免通过 mutation 调用
                await levelGenerationModule.generateAllActiveLevelsHandler(ctx, { replaceExisting });
            }
        }

        // 2. 清理现有配置（如果替换）
        if (replaceExisting) {
            const preconfigs = await ctx.db.query("tournament_types").collect();
            for (const preconfig of preconfigs) {
                await ctx.db.delete(preconfig._id);
            }
        }

        // 3. 加载静态配置
        for (const tournamentConfig of TOURNAMENT_CONFIGS) {
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

            await ctx.db.insert("tournament_types", {
                ...tournamentConfig,
                createdAt: tournamentConfig.createdAt || new Date().toISOString(),
                updatedAt: tournamentConfig.updatedAt || new Date().toISOString(),
            });
        }
    }
    /**
     * 加入锦标赛
     */
    static async join(ctx: any, params: {
        uid: string,
        typeId: any,
        tournamentId?: string
    }) {
        const { uid, tournamentId, typeId } = params;
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", typeId)).first();
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
        if (tournamentType.matchRules.maxPlayers > 1) {
            await TournamentMatchingService.joinMatchingQueue(ctx, { uid, tournamentId: tournamentId || undefined, typeId });
            return { ok: true, message: "成功加入匹配队列" };
        } else {
            let tid: string = tournamentId || "";
            if (tournamentId) {
                await joinTournament(ctx, { tournamentId, uids: [uid] });
            } else {
                const tournament = await createTournament(ctx, { tournamentType });
                await joinTournament(ctx, { tournamentId: tournament._id, uids: [uid] });
                tid = tournament._id;
            }
            const match = await MatchManager.createMatch(ctx, {
                tournamentId: tid,
                typeId: tournamentType.typeId,
                uids: [uid]
            });
            const playerMatch = await MatchManager.joinMatch(ctx, { uid, match });

            return {
                ok: true,
                message: "成功加入锦标赛",
                playerMatch
            };
        }
    }

    /**
     * 结算锦标赛
     */
    static async settle(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        await settleTournament(ctx, tournament);

        return {
            success: true,
            tournamentId,
            message: "锦标赛结算完成"
        };
    }

    /**
     * 结算锦标赛
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
     * 获取锦标赛详情
     */
    static async getTournamentDetails(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取比赛列表
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        // 获取玩家比赛记录
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        // 获取参与锦标赛的玩家信息 - 使用player_tournaments表
        const playerTournaments = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        const players: any[] = [];
        for (const pt of playerTournaments) {
            const player = await ctx.db.query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", pt.uid))
                .first();
            if (player) {
                players.push(player);
            }
        }

        // 计算玩家统计
        const playerStats = new Map<string, any>();

        for (const playerMatch of playerMatches) {
            if (!playerMatch.completed) continue;

            const current = playerStats.get(playerMatch.uid) || {
                totalScore: 0,
                matchCount: 0,
                bestScore: 0,
                averageScore: 0
            };

            const newTotal = current.totalScore + playerMatch.score;
            const newCount = current.matchCount + 1;

            playerStats.set(playerMatch.uid, {
                totalScore: newTotal,
                matchCount: newCount,
                bestScore: Math.max(current.bestScore, playerMatch.score),
                averageScore: newTotal / newCount
            });
        }

        // 排序玩家 - 简化版本
        const entries = Array.from(playerStats.entries());
        const playerArray: any[] = [];

        for (const [uid, stats] of entries) {
            const player = players.find((p: any) => p?.uid === uid);
            playerArray.push({
                uid,
                ...stats,
                player
            });
        }

        playerArray.sort((a: any, b: any) => b.bestScore - a.bestScore);

        // 排序玩家
        const sortedPlayers: any[] = [];
        for (let i = 0; i < playerArray.length; i++) {
            const player = playerArray[i];
            sortedPlayers.push({
                ...player,
                rank: i + 1
            });
        }

        return {
            tournament,
            matches,
            players: sortedPlayers,
            totalMatches: matches.length,
            totalPlayers: playerTournaments.length
        };
    }


    static async collect(ctx: any, playerTournament: any) {
        await collectRewards(ctx, playerTournament);
        await ctx.db.patch(playerTournament._id, {
            status: TournamentStatus.SETTLED,
            updatedAt: new Date().toISOString()
        });
    }
    /**
     * 结算完成的锦标赛
     */
    static async settleCompletedTournaments(ctx: any) {
        const nowISO = new Date().toISOString();

        console.log("开始结算完成的锦标赛");

        try {
            // 查找所有开放且已过期的锦标赛
            const completedTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), nowISO))
                .collect();

            let settledCount = 0;

            for (const tournament of completedTournaments) {
                try {
                    // 获取对应的处理器
                    const handler = getHandler(tournament.type);

                    // 执行结算
                    await handler.settle(ctx, tournament._id);

                    settledCount++;
                    console.log(`已结算锦标赛: ${tournament._id}`);
                } catch (error) {
                    console.error(`结算锦标赛 ${tournament._id} 失败:`, error);

                    // 记录错误日志
                    await ctx.db.insert("error_logs", {
                        error: `结算锦标赛失败: ${error instanceof Error ? error.message : "未知错误"}`,
                        context: "settleCompletedTournaments",
                        tournamentId: tournament._id,
                        createdAt: nowISO
                    });
                }
            }

            return {
                success: true,
                message: `完成锦标赛结算`,
                settledCount
            };

        } catch (error) {
            console.error("结算完成锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 获取当前玩家可参与的锦标赛列表
     */
    static async getAvailableTournaments(ctx: any, params: {
        uid: string;
        gameType?: string; // 可选，过滤特定游戏类型
    }) {
        const { uid, gameType } = params;
        // 获取所有活跃的锦标赛类型
        let tournamentTypes = await ctx.db
            .query("tournament_types")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .collect();

        // 应用过滤条件
        if (gameType) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.gameType === gameType
            );
        }
        console.log("tournamentTypes", tournamentTypes.length)
        const availableTournaments: any[] = [];
        for (const tournamentType of tournamentTypes) {
            try {
                const participation = { rank: -1, attempts: 0 };
                const eligible = await checkTournamentEligible(ctx, { uid, tournamentType });
                console.log("eligible", eligible)
                if (eligible) {
                    if (tournamentType.limits) {
                        const attempts = await getPlayerAttempts(ctx, { uid, tournamentType });
                        if (attempts >= tournamentType.limits.maxAttempts) {
                            continue;
                        }
                        participation.attempts = attempts.length;
                    }
                    let tournamentId = null;
                    if (['daily', 'weekly', 'monthly'].includes(tournamentType.timeRange)) {
                        const tournament = await findTournamentByType(ctx, { tournamentType: tournamentType });
                        const playerRank = await findPlayerRank(ctx, { uid, tournament });
                        participation.rank = playerRank.rank ?? -1;
                        // tournamentId = playerRank.tournamentId;
                        tournamentId = tournament._id
                    }
                    // console.log("participation", participation)
                    availableTournaments.push({
                        tournamentId,
                        typeId: tournamentType.typeId,
                        name: tournamentType.name,
                        description: tournamentType.description,
                        timeRange: tournamentType.timeRange,
                        gameType: tournamentType.gameType,
                        config: {
                            entryRequirements: tournamentType.entryRequirements,
                            matchRules: tournamentType.matchRules,
                            rewards: tournamentType.rewards,
                            schedule: tournamentType.schedule,
                            limits: tournamentType.limits,
                        },
                        // eligibility,
                        participation,
                    });
                }
            } catch (error) {
                console.error(`检查锦标赛资格失败 (${tournamentType.typeId}):`, error);
                // 继续检查其他锦标赛，不中断整个流程
            }
        }

        // 按优先级排序
        // availableTournaments.sort((a: any, b: any) => a.priority - b.priority);

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

export const getTournamentDetails = query({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getTournamentDetails(ctx, args.tournamentId);
        return result;
    },
});


export const join = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        typeId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const { uid, tournamentId, typeId } = args;

        const result = await TournamentService.join(ctx, { uid, tournamentId, typeId });
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
            console.log("getAvailableTournaments", uid)
            const result = await TournamentService.getAvailableTournaments(ctx, { uid, gameType: 'solitaire' });
            return result;
        } catch (error) {
            console.error("获取可参与的锦标赛失败:", error);
            return null;
        }
    },
});

export const loadTournamentConfig = internalMutation({
    args: {
        generateDynamicLevels: v.optional(v.boolean()),  // 是否生成动态关卡
        replaceExisting: v.optional(v.boolean()),        // 是否替换已存在的配置
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.loadTournamentConfig(ctx, {
            generateDynamicLevels: args.generateDynamicLevels || false,
            replaceExisting: args.replaceExisting || false,
        });
        return result;
    },
});



