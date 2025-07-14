import { getTorontoDate } from "../../utils";
import {
    checkTournamentEligibility,
    getPlayerAttempts,
    getTournamentTypeConfig,
    notifyTournamentChanges
} from "../common";
import { MatchManager } from "../matchManager";

/**
 * Best of Series 锦标赛处理器
 * 实现三局两胜制锦标赛逻辑
 */
export const bestOfSeriesHandler = {
    /**
     * 加入锦标赛
     */
    join: async (ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
        player: any;
        season: any;
    }) => {
        const { uid, gameType, tournamentType, player, season } = params;
        const now = getTorontoDate();

        // 获取锦标赛类型配置
        const tournamentTypeConfig = await getTournamentTypeConfig(ctx, tournamentType);
        const matchRules = tournamentTypeConfig.matchRules;

        // 检查参赛资格
        const eligibility = await checkTournamentEligibility(ctx, {
            uid,
            tournamentType: tournamentTypeConfig,
            player,
            inventory: null,
            season
        });

        if (!eligibility.eligible) {
            throw new Error(`参赛资格检查失败: ${eligibility.reasons.join(", ")}`);
        }

        // 获取玩家尝试次数
        const timeRange = tournamentTypeConfig.timeRange || "total";
        const attempts = await getPlayerAttempts(ctx, {
            uid,
            tournamentType,
            gameType,
            timeRange
        });

        // 检查尝试次数限制
        const maxAttempts = matchRules.maxAttempts || 1;
        if (attempts >= maxAttempts) {
            throw new Error(`已达到最大尝试次数: ${maxAttempts}`);
        }

        // 查找或创建锦标赛
        const tournament = await findOrCreateBestOfSeriesTournament(ctx, {
            uid,
            gameType,
            tournamentType,
            player,
            season,
            config: tournamentTypeConfig,
            now,
            attemptNumber: attempts + 1
        });

        // 创建系列赛比赛
        const seriesMatchId = await MatchManager.createMatch(ctx, {
            tournamentId: tournament._id,
            gameType,
            matchType: "best_of_series",
            maxPlayers: matchRules.maxPlayers || 2,
            minPlayers: matchRules.minPlayers || 2,
            gameData: {
                tournamentType,
                attemptNumber: attempts + 1,
                seriesConfig: {
                    totalGames: matchRules.specialRules?.find((r: any) => r.type === "total_games")?.value || 3,
                    gamesToWin: matchRules.specialRules?.find((r: any) => r.type === "games_to_win")?.value || 2,
                    currentGame: 1,
                    playerScores: {},
                    gameResults: []
                }
            }
        });

        // 玩家加入比赛
        const playerMatchId = await MatchManager.joinMatch(ctx, {
            matchId: seriesMatchId,
            tournamentId: tournament._id,
            uid,
            gameType
        });

        // 通知锦标赛变化
        await notifyTournamentChanges(ctx, {
            uid,
            changeType: "participation_update",
            tournamentType,
            tournamentId: tournament._id,
            data: {
                name: tournamentTypeConfig.name,
                action: "joined_best_of_series",
                attemptNumber: attempts + 1,
                seriesMatchId
            }
        });

        return {
            tournamentId: tournament._id,
            attemptNumber: attempts + 1,
            seriesMatchId,
            playerMatchId,
            gameId: `best_of_series_${seriesMatchId}`,
            serverUrl: "remote_server_url",
            matchStatus: "pending",
            seriesConfig: {
                totalGames: matchRules.specialRules?.find((r: any) => r.type === "total_games")?.value || 3,
                gamesToWin: matchRules.specialRules?.find((r: any) => r.type === "games_to_win")?.value || 2,
                currentGame: 1
            },
            success: true
        };
    },

    /**
     * 提交分数
     */
    submitScore: async (ctx: any, params: {
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }) => {
        const { tournamentId, uid, gameType, score, gameData, propsUsed, gameId } = params;
        const now = getTorontoDate();

        // 获取锦标赛信息
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取系列赛比赛
        const seriesMatch = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("matchType"), "best_of_series"))
            .first();

        if (!seriesMatch) {
            throw new Error("系列赛比赛不存在");
        }

        // 更新系列赛配置
        const seriesConfig = seriesMatch.gameData.seriesConfig || {};
        const currentGame = seriesConfig.currentGame || 1;
        const totalGames = seriesConfig.totalGames || 3;
        const gamesToWin = seriesConfig.gamesToWin || 2;

        // 记录当前游戏结果
        const gameResult = {
            gameNumber: currentGame,
            uid,
            score,
            timestamp: now.iso,
            propsUsed
        };

        // 更新玩家分数
        if (!seriesConfig.playerScores[uid]) {
            seriesConfig.playerScores[uid] = {
                wins: 0,
                losses: 0,
                totalScore: 0,
                games: []
            };
        }

        seriesConfig.playerScores[uid].totalScore += score;
        seriesConfig.playerScores[uid].games.push(gameResult);

        // 添加游戏结果到系列赛
        seriesConfig.gameResults.push(gameResult);

        // 检查是否需要确定胜负
        const playerScores = Object.values(seriesConfig.playerScores);
        const maxWins = Math.max(...playerScores.map((p: any) => p.wins));
        const seriesComplete = maxWins >= gamesToWin || currentGame >= totalGames;

        // 更新比赛状态
        await ctx.db.patch(seriesMatch._id, {
            gameData: {
                ...seriesMatch.gameData,
                seriesConfig: {
                    ...seriesConfig,
                    currentGame: currentGame + 1,
                    seriesComplete
                }
            },
            updatedAt: now.iso
        });

        // 如果系列赛完成，进行结算
        if (seriesComplete) {
            await bestOfSeriesHandler.settle(ctx, tournamentId);
        }

        return {
            success: true,
            seriesMatchId: seriesMatch._id,
            gameNumber: currentGame,
            score,
            seriesComplete,
            nextGame: currentGame + 1,
            playerStats: seriesConfig.playerScores[uid]
        };
    },

    /**
     * 结算锦标赛
     */
    settle: async (ctx: any, tournamentId: string) => {
        const now = getTorontoDate();

        // 获取锦标赛信息
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取系列赛比赛
        const seriesMatch = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("matchType"), "best_of_series"))
            .first();

        if (!seriesMatch) {
            throw new Error("系列赛比赛不存在");
        }

        const seriesConfig = seriesMatch.gameData.seriesConfig;
        const playerScores = seriesConfig.playerScores;

        // 计算最终排名
        const players = Object.entries(playerScores).map(([uid, stats]: [string, any]) => ({
            uid,
            wins: stats.wins,
            losses: stats.losses,
            totalScore: stats.totalScore,
            averageScore: stats.totalScore / stats.games.length
        }));

        // 按胜场数排序，胜场数相同时按总分排序
        players.sort((a, b) => {
            if (a.wins !== b.wins) {
                return b.wins - a.wins;
            }
            return b.totalScore - a.totalScore;
        });

        // 分配排名
        const rankedPlayers = players.map((player, index) => ({
            ...player,
            rank: index + 1
        }));

        // 更新锦标赛状态
        await ctx.db.patch(tournamentId, {
            status: "completed",
            updatedAt: now.iso
        });

        // 更新比赛状态
        await ctx.db.patch(seriesMatch._id, {
            status: "completed",
            endTime: now.iso,
            updatedAt: now.iso
        });

        // 更新玩家比赛记录
        for (const player of rankedPlayers) {
            await ctx.db.insert("player_matches", {
                matchId: seriesMatch._id,
                tournamentId,
                uid: player.uid,
                gameType: tournament.gameType,
                score: player.totalScore,
                rank: player.rank,
                completed: true,
                attemptNumber: 1,
                propsUsed: [],
                playerGameData: {
                    wins: player.wins,
                    losses: player.losses,
                    averageScore: player.averageScore,
                    totalGames: player.wins + player.losses
                },
                joinTime: seriesMatch.createdAt,
                leaveTime: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso
            });
        }

        // 通知所有参与者
        for (const player of rankedPlayers) {
            await notifyTournamentChanges(ctx, {
                uid: player.uid,
                changeType: "tournament_completed",
                tournamentType: tournament.tournamentType,
                tournamentId,
                data: {
                    name: tournament.tournamentType,
                    action: "best_of_series_completed",
                    rank: player.rank,
                    wins: player.wins,
                    totalScore: player.totalScore
                }
            });
        }

        return {
            success: true,
            tournamentId,
            seriesMatchId: seriesMatch._id,
            finalRankings: rankedPlayers,
            seriesStats: {
                totalGames: seriesConfig.currentGame - 1,
                gamesToWin: seriesConfig.gamesToWin,
                completedAt: now.iso
            }
        };
    }
};

/**
 * 查找或创建Best of Series锦标赛
 */
async function findOrCreateBestOfSeriesTournament(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
    attemptNumber: number;
}) {
    const { uid, gameType, tournamentType, player, season, config, now, attemptNumber } = params;

    // 查找现有的开放锦标赛
    const existingTournament = await ctx.db
        .query("tournaments")
        .withIndex("by_type_status", (q: any) =>
            q.eq("tournamentType", tournamentType)
                .eq("status", "open")
        )
        .filter((q: any) => q.eq(q.field("gameType"), gameType))
        .first();

    if (existingTournament) {
        // 检查玩家是否已参与
        const existingParticipation = await ctx.db
            .query("player_tournaments")
            .withIndex("by_uid_tournament", (q: any) =>
                q.eq("uid", uid).eq("tournamentId", existingTournament._id)
            )
            .first();

        if (existingParticipation) {
            return existingTournament;
        }

        // 检查锦标赛容量
        const participantCount = await ctx.db
            .query("player_tournaments")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", existingTournament._id))
            .filter((q: any) => q.eq(q.field("status"), "active"))
            .collect();

        const maxPlayers = config.matchRules.maxPlayers || 2;
        if (participantCount.length < maxPlayers) {
            // 加入现有锦标赛
            await ctx.db.insert("player_tournaments", {
                uid,
                tournamentId: existingTournament._id,
                tournamentType,
                gameType,
                status: "active",
                joinedAt: now.iso,
                createdAt: now.iso,
                updatedAt: now.iso,
            });

            return existingTournament;
        }
    }

    // 创建新的Best of Series锦标赛
    const tournamentId = await ctx.db.insert("tournaments", {
        seasonId: season._id,
        gameType,
        segmentName: player.segmentName,
        status: "open",
        tournamentType,
        isSubscribedRequired: config.entryRequirements?.isSubscribedRequired || false,
        isSingleMatch: false, // Best of Series不是单人比赛
        prizePool: config.entryRequirements?.entryFee?.coins ? config.entryRequirements.entryFee.coins * 0.8 : 0,
        config: {
            entryRequirements: config.entryRequirements,
            matchRules: config.matchRules,
            rewards: config.rewards,
            schedule: config.schedule,
            limits: config.limits,
            advanced: config.advanced,
            bestOfSeries: {
                totalGames: config.matchRules.specialRules?.find((r: any) => r.type === "total_games")?.value || 3,
                gamesToWin: config.matchRules.specialRules?.find((r: any) => r.type === "games_to_win")?.value || 2,
                currentGame: 1
            }
        },
        createdAt: now.iso,
        updatedAt: now.iso,
        endTime: new Date(now.localDate.getTime() + (config.schedule?.duration || 3600) * 1000).toISOString(),
    });

    // 创建玩家参与关系
    await ctx.db.insert("player_tournaments", {
        uid,
        tournamentId,
        tournamentType,
        gameType,
        status: "active",
        joinedAt: now.iso,
        createdAt: now.iso,
        updatedAt: now.iso,
    });

    return await ctx.db.get(tournamentId);
} 