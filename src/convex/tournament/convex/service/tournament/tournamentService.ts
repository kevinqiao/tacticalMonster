import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { internalMutation, mutation, query } from "../../_generated/server";
import { TOURNAMENT_CONFIGS } from "../../data/tournamentConfigs";
import { getTorontoDate } from "../utils";
import {
    findPlayerRank,
    findTournamentByType,
    getCommonData,
    getPlayerAttempts,
    settleTournament
} from "./common";
import { getHandler } from "./handler";
import { MatchManager } from "./matchManager";

/**
 * 统一锦标赛服务
 * 支持单人、多人锦标赛，只使用远程游戏服务器
 * 非周期性的锦标赛("total"):都是单场比赛(single_match)
 * 周期性的锦标赛(周期性的类型：daily、weekly、seasonal):可以包含(single_match、multi_match,best_of_series,elimination)
 */
export class TournamentService {
    static async loadTournamentConfig(ctx: any) {
        const preconfigs = await ctx.db.query("tournament_types").collect();

        preconfigs.forEach(async (preconfig: any) => {
            await ctx.db.delete(preconfig._id);
        });

        console.log("loadTournamentConfig,TOURNAMENT_CONFIGS", TOURNAMENT_CONFIGS.length)
        TOURNAMENT_CONFIGS.forEach(async (tournamentConfig) => {

            await ctx.db.insert("tournament_types", tournamentConfig);
        });

    }
    /**
     * 加入锦标赛
     */
    static async joinTournament(ctx: any, params: {
        uid: string;
        gameType: string;
        typeId: string;
    }) {

        const handler = getHandler(params.typeId);
        // 执行加入逻辑（处理器内部会处理锦标赛创建）
        const result = await handler.join(ctx, {
            uid: params.uid,
            gameType: params.gameType,
            typeId: params.typeId
        });

        return {
            success: true,
            ...result,
            message: "成功加入锦标赛",
        };
    }

    /**
     * 提交分数
     */
    static async submitScore(ctx: any, params: {
        matchId: string;
        scores: {
            uid: string;
            score: number;
            rank?: number;
            gameData: any;
        }[];
    }) {
        const match = await ctx.db.get(params.matchId as Id<"matches">);
        if (!match) {
            throw new Error("比赛不存在");
        }
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", match.tournamentType)).first();
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }

        await MatchManager.submitScore(ctx, {
            match: match,
            tournamentType: tournamentType,
            scores: params.scores
        });
        if (tournamentType.matchRules.matchType === "single") {
            const playerTournaments = await ctx.db.query("player_tournaments").withIndex("by_tournament", (q: any) => q.eq("tournamentId", match.tournamentId)).collect();
            if (playerTournaments.length === tournamentType.matchRules.maxPlayers) {
                await TournamentService.settle(ctx, match.tournamentId);
            }
        }
        return {
            success: true,
            message: "分数提交成功"
        };
    }

    /**
     * 结算锦标赛
     */
    static async settle(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId);
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

    /**
     * 获取玩家锦标赛历史
     */
    static async getPlayerTournamentHistory(ctx: any, params: {
        uid: string;
        limit?: number;
    }) {
        const { uid, limit = 20 } = params;

        // 获取玩家参与的所有锦标赛
        const playerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .order("desc")
            .take(limit);

        // 收集唯一的锦标赛和比赛ID
        const tournamentIdSet = new Set<string>();
        const matchIdSet = new Set<string>();

        for (const pm of playerMatches) {
            tournamentIdSet.add(pm.tournamentId);
            matchIdSet.add(pm.matchId);
        }

        const tournamentIds = Array.from(tournamentIdSet);
        const matchIds = Array.from(matchIdSet);

        // 获取锦标赛和比赛数据
        const tournaments: any[] = [];
        const matches: any[] = [];

        for (const id of tournamentIds) {
            const tournament = await ctx.db.get(id);
            if (tournament) {
                tournaments.push(tournament);
            }
        }

        for (const id of matchIds) {
            const match = await ctx.db.get(id);
            if (match) {
                matches.push(match);
            }
        }

        // 构建历史记录
        const history: any[] = [];
        for (const pm of playerMatches) {
            const tournament = tournaments.find((t: any) => t?._id === pm.tournamentId);
            const match = matches.find((m: any) => m?._id === pm.matchId);

            history.push({
                playerMatch: pm,
                tournament,
                match,
                gameType: pm.gameType,
                score: pm.score,
                rank: pm.rank,
                completed: pm.completed,
                createdAt: pm.createdAt
            });
        }

        // 排序历史记录
        history.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return history;
    }

    /**
     * 清理过期锦标赛
     */
    static async cleanupExpiredTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log("开始清理过期锦标赛");

        try {
            // 查找所有过期的开放锦标赛
            const expiredTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), now.iso))
                .collect();

            let cleanedCount = 0;

            for (const tournament of expiredTournaments) {
                // 检查是否有未完成的比赛
                const incompleteMatches = await ctx.db
                    .query("matches")
                    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournament._id))
                    .filter((q: any) => q.neq(q.field("status"), "completed"))
                    .collect();

                if (incompleteMatches.length > 0) {
                    console.log(`锦标赛 ${tournament._id} 有未完成的比赛，跳过清理`);
                    continue;
                }

                // 关闭锦标赛
                await ctx.db.patch(tournament._id, {
                    status: "expired",
                    updatedAt: now.iso
                });

                cleanedCount++;
                console.log(`已关闭过期锦标赛: ${tournament._id}`);
            }

            return {
                success: true,
                message: `过期锦标赛清理完成`,
                cleanedCount
            };

        } catch (error) {
            console.error("清理过期锦标赛失败:", error);
            throw error;
        }
    }

    /**
     * 结算完成的锦标赛
     */
    static async settleCompletedTournaments(ctx: any) {
        const now = getTorontoDate();

        console.log("开始结算完成的锦标赛");

        try {
            // 查找所有开放且已过期的锦标赛
            const completedTournaments = await ctx.db
                .query("tournaments")
                .filter((q: any) => q.eq(q.field("status"), "open"))
                .filter((q: any) => q.lt(q.field("endTime"), now.iso))
                .collect();

            let settledCount = 0;

            for (const tournament of completedTournaments) {
                try {
                    // 获取对应的处理器
                    const handler = getHandler(tournament.tournamentType);

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
                        createdAt: now.iso
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

        // 获取玩家信息
        const { player, inventory } = await getCommonData(ctx, {
            uid,
            requireInventory: true,
            requireSeason: true
        });

        // 获取所有活跃的锦标赛类型
        let tournamentTypes = await ctx.db
            .query("tournament_types")
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .collect();

        // 应用过滤条件
        if (gameType) {
            tournamentTypes = tournamentTypes.filter((tt: any) =>
                tt.gameType === gameType
            );
        }

        const availableTournaments: any[] = [];

        for (const tournamentType of tournamentTypes) {
            try {
                const participation = { rank: -1, attempts: 0 };
                if (tournamentType.matchRules.matchType !== "single_match" && ['daily', 'weekly', 'seasonal'].includes(tournamentType.timeRange)) {
                    const tournament = await findTournamentByType(ctx, { uid, tournamntType: tournamentType });
                    if (!tournament) {
                        continue;
                    }
                    participation.rank = await findPlayerRank(ctx, { uid, tournamentId: tournament._id });
                }
                const attempts = await getPlayerAttempts(ctx, {
                    uid,
                    tournamentType
                });
                participation.attempts = attempts;

                // 检查参赛资格
                // const eligibility = await checkTournamentEligibility(ctx, {
                //     tournamentType,
                //     player,
                //     inventory,
                //     attempts
                // });

                availableTournaments.push({
                    typeId: tournamentType.typeId,
                    name: tournamentType.name,
                    description: tournamentType.description,
                    category: tournamentType.category,
                    gameType: tournamentType.gameType,
                    // config: {
                    //     entryRequirements: tournamentType.entryRequirements,
                    //     matchRules: tournamentType.matchRules,
                    //     rewards: tournamentType.rewards,
                    //     schedule: tournamentType.schedule,
                    //     limits: tournamentType.limits,
                    //     advanced: tournamentType.advanced
                    // },
                    // eligibility,
                    participation,
                    priority: tournamentType.priority || 5
                });
            } catch (error) {
                console.error(`检查锦标赛资格失败 (${tournamentType.typeId}):`, error);
                // 继续检查其他锦标赛，不中断整个流程
            }
        }

        // 按优先级排序
        availableTournaments.sort((a: any, b: any) => a.priority - b.priority);

        return {
            success: true,
            tournaments: availableTournaments,
            totalCount: availableTournaments.length
        };
    }


}

// Convex 函数接口
export const joinTournament = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        typeId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.joinTournament(ctx, args);
        return result;
    },
});

export const submitScore = mutation({
    args: {
        matchId: v.id("matches"),
        games: v.array(v.object({
            uid: v.string(),
            score: v.number(),
            gameData: v.any(),
            gameId: v.optional(v.string()),
        })),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.submitScore(ctx, args);
        return result;
    },
});

export const settle = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settle(ctx, args.tournamentId);
        return result;
    },
});

export const getTournamentDetails = (query as any)({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getTournamentDetails(ctx, args.tournamentId);
        return result;
    },
});

export const getPlayerTournamentHistory = (query as any)({
    args: {
        uid: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.getPlayerTournamentHistory(ctx, args);
        return result;
    },
});

export const cleanupExpiredTournaments = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.cleanupExpiredTournaments(ctx);
        return result;
    },
});

export const settleCompletedTournaments = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.settleCompletedTournaments(ctx);
        return result;
    },
});

export const getAvailableTournaments = (query as any)({
    args: {
        uid: v.string(),
        gameType: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any) => {
        console.log("getAvailableTournaments", args);
        const result = await TournamentService.getAvailableTournaments(ctx, args);
        return result;
    },
});

export const loadTournamentConfig = (internalMutation as any)({
    args: {

    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.loadTournamentConfig(ctx);
        return result;
    },
});

