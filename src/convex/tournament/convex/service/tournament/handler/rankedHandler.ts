import { internal } from "../../../_generated/api";
import { getTorontoDate } from "../../utils";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";
import { baseHandler, getPlayerAttempts, TournamentHandler } from "./base";

/**
 * 排位锦标赛处理器
 * 处理 ranked_chess_masters 等排位锦标赛
 */
export const rankedHandler: TournamentHandler = {
    ...baseHandler,

    async join(ctx, { uid, gameType, tournamentType, player, season }) {
        const now = getTorontoDate();

        // 获取锦标赛类型配置
        const tournamentTypeConfig = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
            .first();

        if (!tournamentTypeConfig) {
            throw new Error("锦标赛类型不存在");
        }

        const config = tournamentTypeConfig.defaultConfig;

        // 验证段位要求
        if (config.entryRequirements?.minSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName.toLowerCase());
            const minIndex = segments.indexOf(config.entryRequirements.minSegment);
            if (playerIndex < minIndex) {
                throw new Error(`需要至少 ${config.entryRequirements.minSegment} 段位才能参加此锦标赛`);
            }
        }

        // 验证加入条件
        await this.validateJoin(ctx, { uid, gameType, tournamentType, player, season });

        // 扣除入场费
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (config.entryFee) {
            const deductEntryFee = (internal as any)["service/tournament/ruleEngine"].deductEntryFeeMutation;
            await ctx.runMutation(deductEntryFee, {
                uid,
                gameType,
                tournamentType,
                entryFee: config.entryFee,
                inventory
            });
        }

        // 检查参赛次数限制
        const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType });
        if (config.rules?.maxAttempts && attempts >= config.rules.maxAttempts) {
            throw new Error("已达最大尝试次数");
        }

        // 查找或创建排位锦标赛
        let tournament = await this.findOrCreateRankedTournament(ctx, {
            uid,
            gameType,
            tournamentType,
            player,
            season,
            config,
            now
        });

        // 排位锦标赛通常是多人比赛
        return await this.handleMultiMatchTournament(ctx, {
            tournament,
            uid,
            gameType,
            player,
            config
        });
    },

    async submitScore(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) {
        const now = getTorontoDate();

        try {
            // 获取锦标赛信息
            const tournament = await ctx.db.get(tournamentId);
            if (!tournament) {
                throw new Error("锦标赛不存在");
            }

            // 验证提交条件
            await this.validateScore(ctx, { tournamentId, gameType, score, gameData, propsUsed, uid });

            // 查找对应的比赛记录
            const match = await this.findPlayerMatch(ctx, { tournamentId, uid, gameType });
            if (!match) {
                throw new Error("未找到对应的比赛记录");
            }

            // 提交分数到比赛
            const submitResult = await MatchManager.submitScore(ctx, {
                matchId: match.matchId,
                tournamentId,
                uid,
                gameType,
                score,
                gameData,
                propsUsed,
                attemptNumber: match.attemptNumber
            });

            // 执行延迟扣除（如果使用了道具）
            let deductionResult = null;
            if (propsUsed.length > 0 && gameId) {
                try {
                    const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
                    deductionResult = await ctx.runMutation(unifiedPropManager.executeDelayedDeduction, {
                        gameId,
                        uid,
                        gameResult: {
                            score,
                            gameData,
                            propsUsed,
                            completed: true
                        }
                    });
                } catch (error) {
                    console.error("执行延迟扣除失败:", error);
                }
            }

            // 更新锦标赛状态
            await ctx.db.patch(tournament._id, {
                updatedAt: now.iso
            });

            // 记录道具使用日志
            if (propsUsed.length > 0) {
                await this.logPropUsage(ctx, {
                    uid,
                    tournamentId,
                    matchId: match.matchId,
                    propsUsed,
                    gameId,
                    deductionResult
                });
            }

            // 检查是否需要结算锦标赛
            let settleResult = null;
            const allMatches = await ctx.db
                .query("matches")
                .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
                .collect();

            const completedMatches = allMatches.filter((m: any) => m.status === "completed");
            if (completedMatches.length === allMatches.length && allMatches.length > 0) {
                try {
                    console.log(`结算排位锦标赛 ${tournamentId}`);
                    await this.settle(ctx, tournamentId);
                    settleResult = {
                        settled: true,
                        reason: "排位锦标赛完成"
                    };
                } catch (settleError) {
                    console.error("排位锦标赛结算失败:", settleError);
                    settleResult = {
                        settled: false,
                        error: settleError instanceof Error ? settleError.message : "未知错误"
                    };
                }
            }

            return {
                success: true,
                matchId: match.matchId,
                score,
                deductionResult,
                settleResult,
                message: settleResult?.settled ? "分数提交成功，锦标赛已结算" : "分数提交成功"
            };

        } catch (error) {
            console.error("提交分数失败:", error);

            // 如果分数提交失败，取消延迟扣除
            if (propsUsed.length > 0 && gameId) {
                try {
                    const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
                    await ctx.runMutation(unifiedPropManager.cancelDelayedDeduction, {
                        gameId,
                        uid,
                        reason: "游戏中断"
                    });
                } catch (error) {
                    console.error("取消延迟扣除失败:", error);
                }
            }

            throw error;
        }
    },

    async settle(ctx, tournamentId) {
        const now = getTorontoDate();

        // 获取锦标赛信息
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取所有比赛记录
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .collect();

        if (matches.length === 0) {
            throw new Error("没有比赛记录");
        }

        // 计算玩家总积分和排名
        const playerScores = new Map<string, { totalScore: number; matchCount: number; bestScore: number; eloChange: number }>();

        for (const match of matches) {
            const playerMatches = await ctx.db
                .query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
                .collect();

            for (const playerMatch of playerMatches) {
                if (!playerMatch.completed) continue;

                const current = playerScores.get(playerMatch.uid) || {
                    totalScore: 0,
                    matchCount: 0,
                    bestScore: 0,
                    eloChange: 0
                };

                playerScores.set(playerMatch.uid, {
                    totalScore: current.totalScore + playerMatch.score,
                    matchCount: current.matchCount + 1,
                    bestScore: Math.max(current.bestScore, playerMatch.score),
                    eloChange: current.eloChange + (playerMatch.eloChange || 0)
                });
            }
        }

        // 根据锦标赛规则计算最终排名
        const sortedPlayers = Array.from(playerScores.entries())
            .map(([uid, stats]) => ({
                uid,
                totalScore: stats.totalScore,
                matchCount: stats.matchCount,
                bestScore: stats.bestScore,
                averageScore: stats.totalScore / stats.matchCount,
                eloChange: stats.eloChange
            }))
            .sort((a: any, b: any) => {
                // 优先按总分排序，然后按平均分排序
                if (b.totalScore !== a.totalScore) {
                    return b.totalScore - a.totalScore;
                }
                return b.averageScore - a.averageScore;
            })
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));

        // 分配奖励并更新段位
        for (const playerData of sortedPlayers) {
            try {
                // 更新玩家段位
                await this.updatePlayerRanking(ctx, {
                    uid: playerData.uid,
                    eloChange: playerData.eloChange,
                    rank: playerData.rank,
                    tournament
                });

                if (this.distributeRewards) {
                    await this.distributeRewards(ctx, {
                        uid: playerData.uid,
                        rank: playerData.rank,
                        score: playerData.totalScore,
                        tournament,
                        matches: matches.filter((m: any) =>
                            ctx.db.query("player_matches")
                                .withIndex("by_match", (q: any) => q.eq("matchId", m._id))
                                .filter((q: any) => q.eq(q.field("uid"), playerData.uid))
                                .first()
                        )
                    });
                }
            } catch (error: any) {
                console.error(`分配奖励失败 (${playerData.uid}):`, error);

                await ctx.db.insert("error_logs", {
                    error: `分配奖励失败: ${error.message}`,
                    context: "ranked_tournament_settle",
                    uid: playerData.uid,
                    createdAt: now.iso
                });
            }
        }

        // 更新锦标赛状态为已完成
        await ctx.db.patch(tournamentId, {
            status: "completed",
            updatedAt: now.iso
        });

        console.log(`排位锦标赛 ${tournamentId} 结算完成`);
    }
};

// 辅助函数
async function findOrCreateRankedTournament(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
}) {
    const { uid, gameType, tournamentType, player, season, config, now } = params;

    // 查找排位锦标赛
    let tournament = await ctx.db
        .query("tournaments")
        .withIndex("by_type_status", (q: any) =>
            q.eq("tournamentType", tournamentType)
                .eq("status", "open")
                .eq("gameType", gameType)
                .eq("segmentName", player.segmentName)
        )
        .first();

    if (!tournament) {
        // 创建新的排位锦标赛
        const tournamentId = await ctx.db.insert("tournaments", {
            seasonId: season._id,
            gameType,
            segmentName: player.segmentName,
            status: "open",
            playerUids: [uid],
            tournamentType,
            isSubscribedRequired: config.isSubscribedRequired || false,
            isSingleMatch: false, // 排位锦标赛通常是多人比赛
            prizePool: config.entryFee?.coins ? config.entryFee.coins * 0.8 : 0,
            config,
            createdAt: now.iso,
            updatedAt: now.iso,
            endTime: new Date(now.localDate.getTime() + (config.duration || 30 * 24 * 60 * 60 * 1000)).toISOString(),
            rankedTournament: {
                seasonId: season._id,
                seasonName: season.name,
                type: "ranked",
                eloBased: true
            }
        });

        tournament = await ctx.db.get(tournamentId);
    } else {
        // 添加到现有锦标赛
        if (!tournament.playerUids.includes(uid)) {
            await ctx.db.patch(tournament._id, {
                playerUids: [...tournament.playerUids, uid],
                updatedAt: now.iso
            });
        }
    }

    return tournament;
}

async function handleMultiMatchTournament(ctx: any, params: {
    tournament: any;
    uid: string;
    gameType: string;
    player: any;
    config: any;
}) {
    const { tournament, uid, gameType, player, config } = params;

    // 使用锦标赛匹配服务
    const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
        uid,
        tournamentId: tournament._id,
        gameType,
        player,
        config
    });

    return {
        tournamentId: tournament._id,
        matchId: matchResult.matchId,
        playerMatchId: matchResult.playerMatchId,
        gameId: matchResult.gameId,
        serverUrl: matchResult.serverUrl,
        attemptNumber: 1,
        matchStatus: matchResult.matchInfo,
        rankedTournament: {
            seasonId: tournament.seasonId,
            seasonName: tournament.seasonName,
            type: "ranked",
            eloBased: true
        }
    };
}

async function findPlayerMatch(ctx: any, params: {
    tournamentId: string;
    uid: string;
    gameType: string;
}) {
    const { tournamentId, uid, gameType } = params;

    // 查找玩家的比赛记录
    const playerMatches = await ctx.db
        .query("player_matches")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .collect();

    for (const playerMatch of playerMatches) {
        const match = await ctx.db.get(playerMatch.matchId);
        if (match &&
            match.tournamentId === tournamentId &&
            match.gameType === gameType &&
            match.status !== "completed") {
            return {
                matchId: playerMatch.matchId,
                attemptNumber: playerMatch.attemptNumber
            };
        }
    }

    return null;
}

async function updatePlayerRanking(ctx: any, params: {
    uid: string;
    eloChange: number;
    rank: number;
    tournament: any;
}) {
    const { uid, eloChange, rank, tournament } = params;
    const now = getTorontoDate();

    // 获取玩家信息
    const player = await ctx.db
        .query("players")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    if (!player) return;

    // 更新ELO分数
    const newEloScore = (player.eloScore || 1000) + eloChange;

    // 根据ELO分数确定新段位
    const newSegment = determineSegmentByElo(newEloScore);

    // 更新玩家信息
    await ctx.db.patch(player._id, {
        eloScore: newEloScore,
        segmentName: newSegment,
        updatedAt: now.iso
    });

    // 记录段位变化
    if (newSegment !== player.segmentName) {
        await ctx.db.insert("segment_changes", {
            uid,
            oldSegment: player.segmentName,
            newSegment,
            eloChange,
            tournamentId: tournament._id,
            tournamentType: tournament.tournamentType,
            rank,
            createdAt: now.iso
        });
    }
}

function determineSegmentByElo(eloScore: number): string {
    if (eloScore >= 2000) return "Diamond";
    if (eloScore >= 1500) return "Platinum";
    if (eloScore >= 1200) return "Gold";
    if (eloScore >= 1000) return "Silver";
    return "Bronze";
}

async function logPropUsage(ctx: any, data: {
    uid: string;
    tournamentId: string;
    matchId: string;
    propsUsed: string[];
    gameId?: string;
    deductionResult?: any;
}) {
    const now = getTorontoDate();

    const logData: any = {
        uid: data.uid,
        gameType: "tournament",
        propType: data.propsUsed.join(","),
        gameState: {
            tournamentId: data.tournamentId,
            matchId: data.matchId,
            gameId: data.gameId
        },
        newGameState: {},
        params: {},
        deductionMode: "delayed",
        gameId: data.gameId,
        createdAt: now.iso
    };

    if (data.deductionResult?.deductionId) {
        logData.deductionId = data.deductionResult.deductionId;
    }

    await ctx.db.insert("prop_usage_logs", logData);
} 