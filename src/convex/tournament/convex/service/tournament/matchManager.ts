import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import { settleTournament, TournamentStatus, incrementPlayerAttempts } from "./common";
import { createSeededRandom } from "./seedRandom";
// import { getTorontoMidnight } from "../simpleTimezoneUtils";

const GAME_MODES: Record<string, string> = {
    solitaire: "solo",
    uno: "shared",
    ludo: "shared",
    rummy: "shared"
}
// 远程游戏服务器配置
const GAME_SERVER_CONFIG: Record<string, string> = {
    "solitaire": "https://game-server.example.com/api/games",
    "uno": "https://game-server.example.com/api/games",
    "ludo": "https://game-server.example.com/api/games",
    "rummy": "https://game-server.example.com/api/games"
};

/**
 * 比赛管理器 - 使用新的 matches 和 player_matches 表结构
 * 只支持远程游戏服务器
 */
export class MatchManager {
    /**
     * 创建新比赛
     */
    static async createMatch(ctx: any, params: {
        tournamentId: string;
        typeId: string;
        uids?: string[];
    }) {
        try {

            const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", params.typeId)).unique();
            if (!tournamentType) {
                throw new Error("锦标赛类型不存在");
            }
            const { uids, typeId, tournamentId } = params;
            const nowISO = new Date().toISOString();
            const newMatch = {
                tournamentId,
                tournamentType: typeId,
                gameType: tournamentType.gameType,
                completed: false,
                maxPlayers: tournamentType.matchRules.maxPlayers,
                minPlayers: tournamentType.matchRules.minPlayers,
                startTime: undefined,
                endTime: undefined,
                createdAt: nowISO,
                updatedAt: nowISO,
            }
            const matchId = await ctx.db.insert("matches", newMatch);

            // // 记录比赛创建事件

            // const match = await ctx.db.get(matchId);

            // if (uids) {
            //     await this.joinMatch(ctx, {
            //         uids,
            //         match: match
            //     });
            // }
            return { id: matchId, ...newMatch };
        } catch (error) {
            console.error("创建比赛失败:", error);
            throw error;
        }
    }
    /**
     * 玩家加入比赛
     */
    static async joinMatch(ctx: any, params: {
        uid: string;
        match: any;
    }) {
        const nowISO = new Date().toISOString();
        const { uid, match } = params;


        // 检查比赛人数限制
        const playerMatches = await ctx.db.query("player_matches").withIndex("by_match", (q: any) => q.eq("matchId", match._id)).collect();
        if ((playerMatches.length + 1) > match.maxPlayers) {
            throw new Error("比赛已满");
        }


        const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", match.tournamentId).eq("uid", uid)).unique();
        if (playerTournament) {
            // await ctx.db.insert("player_tournaments", {
            //     uid,
            //     tournamentId: match.tournamentId,
            //     tournamentType: match.tournamentType,
            //     gameType: match.gameType,
            //     score: 0,
            //     status: TournamentStatus.OPEN,
            //     createdAt: nowISO,
            //     updatedAt: nowISO,
            // });

            const playerMatch = await ctx.db.query("player_matches").withIndex("by_match_uid", (q: any) => q.eq("matchId", match._id).eq("uid", uid)).unique();
            if (!playerMatch) {
                // 获取 tournamentType 配置（用于增量统计）
                let tournamentType: any = null;
                if (match.tournamentType) {
                    tournamentType = await ctx.db
                        .query("tournament_types")
                        .withIndex("by_typeId", (q: any) => q.eq("typeId", match.tournamentType))
                        .unique();
                }

                const seed = createSeededRandom(match._id + uid);
                const pmatch = {
                    matchId: match.id,
                    tournamentId: match.tournamentId,
                    tournamentType: match.tournamentType,
                    uid: uid,
                    gameId: GAME_MODES[match.gameType] === "solo" ? `game_${match.id}_${uid}` : `game_${match.id}`,
                    gameType: match.gameType,
                    seed: `game_${match.id}_${uid}`,
                    score: 0,
                    rank: -1,
                    status: TournamentStatus.OPEN,
                    createdAt: nowISO,
                    updatedAt: nowISO,
                }
                await ctx.db.insert("player_matches", pmatch);

                // 增量更新尝试次数统计
                if (tournamentType) {
                    try {
                        await incrementPlayerAttempts(ctx, {
                            uid,
                            tournamentType,
                            createdAt: nowISO,
                        });
                    } catch (error) {
                        // 统计更新失败不应影响主要流程
                        console.error(`增量更新尝试次数统计失败 (uid: ${uid}, matchId: ${match._id}):`, error);
                    }
                }

                return { ...pmatch, _id: undefined, _creationTime: undefined };
            } else {
                return { ...playerMatch, _id: undefined, _creationTime: undefined };
            }
        }
    }
    /**
     * 结束比赛
     */
    static async submitGameScore(ctx: any,
        scores: {
            gameId: string;
            score: number;
            gameData: any;
        }[]
    ) {

        const nowISO = new Date().toISOString();


        for (const gameScore of scores) {
            const playerMatch = await ctx.db.query("player_matches").withIndex("by_game", (q: any) => q.eq("gameId", gameScore.gameId)).unique();
            if (!playerMatch) {
                throw new Error("玩家比赛记录不存在");
            }
            await ctx.db.patch(playerMatch._id, {
                score: gameScore.score,
                status: TournamentStatus.COMPLETED,
                updatedAt: nowISO
            });
        }
        return true

    }

    /**
     * 通知游戏结束
     * 更新 player_matches 状态，检查并结算 match（如果所有游戏都结束）
     */
    static async notifyGameEnd(ctx: any, params: {
        gameId: string;
        matchId: string;
        finalScore: number;
    }): Promise<{
        ok: boolean;
        matchCompleted: boolean;
        error?: string;
    }> {
        const nowISO = new Date().toISOString();

        // 1. 更新 player_matches 状态为 COMPLETED
        const playerMatch = await ctx.db
            .query("player_matches")
            .withIndex("by_game", (q: any) => q.eq("gameId", params.gameId))
            .first();

        if (!playerMatch) {
            throw new Error("玩家比赛记录不存在");
        }

        await ctx.db.patch(playerMatch._id, {
            score: params.finalScore || playerMatch.score || 0,
            status: TournamentStatus.COMPLETED,
            updatedAt: nowISO,
        });

        // 2. 检查 match 中所有游戏是否都结束
        const match = await ctx.db.get(params.matchId as Id<"matches">);
        if (!match) {
            throw new Error("比赛不存在");
        }

        const allPlayerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", params.matchId))
            .collect();

        const allCompleted = allPlayerMatches.every(
            (pm: any) => pm.status === TournamentStatus.COMPLETED
        ) && allPlayerMatches.length === match.maxPlayers;

        // 3. 如果所有游戏都结束，结算 match
        if (allCompleted && !match.completed) {
            await this.settleMatch(ctx, {
                matchId: params.matchId as Id<"matches">,
            });

            return {
                ok: true,
                matchCompleted: true,
            };
        }

        return {
            ok: true,
            matchCompleted: false,
        };
    }

    /**
     * 结算比赛
     */
    static async settleMatch(ctx: any, params: {
        matchId: Id<"matches">;
    }) {
        const match = await ctx.db.get(params.matchId);
        if (!match) {
            throw new Error("比赛不存在");
        } else if (match.completed) {
            return;
        }
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", match.tournamentType)).unique();
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
        const playerMatches = await ctx.db.query("player_matches").withIndex("by_match", (q: any) => q.eq("matchId", params.matchId)).order("desc").collect();

        const matchRules = tournamentType.matchRules;
        await Promise.all(playerMatches.map(async (playerMatch: any, index: number) => {
            // const pmid = playerMatch._id as Id<"player_matches">;
            await ctx.db.patch(playerMatch._id, {
                rank: index + 1,
                completed: true,
                updatedAt: (new Date()).toISOString()
            });

            const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", match.tournamentId).eq("uid", playerMatch.uid)).unique();
            if (playerTournament) {
                playerTournament.score = playerMatch.score ?? 0

                switch (tournamentType.matchRules.rankingMethod) {
                    case "highest_score":
                        playerTournament.score = Math.max(playerTournament.score, matchRules.matchPoints ? matchRules.matchPoints[playerMatch.rank] : playerMatch.score);
                        break;
                    case "total_score":
                        playerTournament.score += matchRules.matchPoints ? matchRules.matchPoints[playerMatch.rank] : playerMatch.score;
                        break;
                    case "average_score":
                        playerTournament.score = (playerTournament.score + (matchRules.matchPoints ? matchRules.matchPoints[playerMatch.rank] : playerMatch.score)) / 2;
                        break;
                    case "threshold":
                        playerTournament.score = playerMatch.score;
                        break;
                }
                await ctx.db.patch(playerTournament._id, {
                    score: playerTournament.score,
                    updatedAt: (new Date()).toISOString()
                });
            }
        }));
        // const completed = playerMatches.every((playerMatch: any) => playerMatch.completed);
        const completed = playerMatches.every((playerMatch: any) => playerMatch.completed) && playerMatches.length === match.maxPlayers;

        if (completed) {
            await ctx.db.patch(match._id, {
                completed: true,
                updatedAt: (new Date()).toISOString()
            });


            const playerScores = playerMatches.map((playerMatch: any) => ({
                uid: playerMatch.uid,
                score: playerMatch.score,
                seed: playerMatch.seed
            }));
            // const scoreThresholdControl = new ScoreThresholdPlayerController(ctx);
            // const aiCount = match.maxPlayers - playerMatches.length;

            // const rankings: RankingResult[] = await scoreThresholdControl.calculateRankings(playerScores);
            // console.log("rankings", rankings)
            // rankings.forEach(async (ranking: any) => {
            //     await ctx.db.patch(ranking.uid, {
            //         rank: ranking.rank,
            //         score: ranking.score,
            //         updatedAt: (new Date()).toISOString()
            //     });
            // });

            if (tournamentType.matchRules.matchType === "single_match") {
                await settleTournament(ctx, match.tournamentId);
            }
        }
    }




}


// Convex 函数接口
export const createMatch = (mutation as any)({
    args: {
        tournamentId: v.id("tournaments"),
        gameType: v.string(),
        matchType: v.string(),
        maxPlayers: v.number(),
        minPlayers: v.number(),
        gameData: v.optional(v.string()),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.createMatch(ctx, args);
    },
});

export const joinMatch = (mutation as any)({
    args: {
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.string(),
        gameType: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.joinMatch(ctx, args);
    },
});
export const submitGameScore = internalMutation({
    args: {
        gameId: v.string(),
        score: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        const scores = [{ gameId: args.gameId, score: args.score, gameData: {} }];
        const ok = await MatchManager.submitGameScore(ctx, scores);
        return { ok };
    },
});

export const notifyGameEnd = internalMutation({
    args: {
        gameId: v.string(),
        matchId: v.string(),
        finalScore: v.number(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.notifyGameEnd(ctx, args);
    },
});

export const findTournamentMatch = query({
    args: {
        typeId: v.optional(v.string()),
        uid: v.string(),
    },
    handler: async (ctx: any, { typeId, uid }: { typeId: string, uid: string }): Promise<any> => {
        if (!typeId) {
            return { ok: false, match: null };
        }
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", typeId)).unique();

        if (!tournamentType || tournamentType.matchRules.maxPlayers === 1) {
            return { ok: false, match: null };
        }
        const match = await ctx.db.query("player_matches").withIndex("by_tournamentType_uid_status", (q: any) => q.eq("tournamentType", typeId).eq("uid", uid).eq("status", TournamentStatus.OPEN)).order("desc").first();

        if (match) {
            return { ok: true, match: { ...match, _id: undefined, _creationTime: undefined } };
        } else {
            return { ok: false, match: null };
        }
    },
});
export const findMatchGame = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx: any, { gameId }: { gameId: string }): Promise<any> => {
        const match = await ctx.db.query("player_matches").withIndex("by_game", (q: any) => q.eq("gameId", gameId)).unique();
        if (match) {
            return { ...match, _id: undefined, _creationTime: undefined };
        }
        return null;
    },
});
export const findReport = query({
    args: { matchId: v.string() },
    handler: async (ctx: any, { matchId }: { matchId: string }): Promise<any> => {
        const matches = await ctx.db.query("player_matches").withIndex("by_match", (q: any) => q.eq("matchId", matchId)).collect();
        const scores = matches.map((match: any) => ({ uid: match.uid, score: match.score }));
        return { matchId, playerScores: scores };
    },
});
export const findGameMatch = query({
    args: { gameId: v.string() },
    handler: async (ctx: any, { gameId }: { gameId: string }): Promise<any> => {
        const match = await ctx.db.query("player_matches").withIndex("by_game", (q: any) => q.eq("gameId", gameId)).unique();
        if (match) {
            return { ...match, _id: undefined, _creationTime: undefined };
        } else {
            return null;
        }
    },
});
