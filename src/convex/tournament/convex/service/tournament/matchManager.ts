import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import { incrementPlayerAttempts, PlayerMatchStatus, settleTournament, TournamentStatus } from "./common";
import { createSeededRandom } from "./seedRandom";
// import { getTorontoMidnight } from "../simpleTimezoneUtils";

const GAME_MODES: Record<string, string> = {
    solitaire: "solo",
    /** Tactical Monster PVE：单人关卡，gameId 与 mr_games 一致须带 uid */
    tacticalMonster: "solo",
    uno: "shared",
    ludo: "shared",
    rummy: "shared",
};
// è¿œç¨‹æ¸¸æˆæœåŠ¡å™¨é…ç½®
const GAME_SERVER_CONFIG: Record<string, string> = {
    "solitaire": "https://game-server.example.com/api/games",
    "uno": "https://game-server.example.com/api/games",
    "ludo": "https://game-server.example.com/api/games",
    "rummy": "https://game-server.example.com/api/games"
};

/**
 * æ¯”èµ›ç®¡ç†å™¨ - ä½¿ç”¨æ–°çš„ matches å’Œ player_matches è¡¨ç»“æž„
 * åªæ”¯æŒè¿œç¨‹æ¸¸æˆæœåŠ¡å™¨
 */
export class MatchManager {
    /**
     * åˆ›å»ºæ–°æ¯”èµ›
     */
    static async createMatch(ctx: any, params: {
        tournamentId: string;
        typeId: string;
        uids?: string[];
    }) {
        try {

            const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", params.typeId)).unique();
            if (!tournamentType) {
                throw new Error("é”¦æ ‡èµ›ç±»åž‹ä¸å­˜åœ¨");
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

            // // è®°å½•æ¯”èµ›åˆ›å»ºäº‹ä»¶

            // const match = await ctx.db.get(matchId);

            // if (uids) {
            //     await this.joinMatch(ctx, {
            //         uids,
            //         match: match
            //     });
            // }
            return { id: matchId, ...newMatch };
        } catch (error) {
            console.error("åˆ›å»ºæ¯”èµ›å¤±è´¥:", error);
            throw error;
        }
    }
    /**
     * çŽ©å®¶åŠ å…¥æ¯”èµ›
     */
    static async joinMatch(ctx: any, params: {
        uid: string;
        match: any;
    }) {
        const nowISO = new Date().toISOString();
        const { uid, match } = params;


        // æ£€æŸ¥æ¯”èµ›äººæ•°é™åˆ¶
        const playerMatches = await ctx.db.query("player_matches").withIndex("by_match", (q: any) => q.eq("matchId", match._id)).collect();
        if ((playerMatches.length + 1) > match.maxPlayers) {
            throw new Error("æ¯”èµ›å·²æ»¡");
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
                // èŽ·å– tournamentType é…ç½®ï¼ˆç”¨äºŽå¢žé‡ç»Ÿè®¡ï¼‰
                let tournamentType: any = null;
                if (match.tournamentType) {
                    tournamentType = await ctx.db
                        .query("tournament_types")
                        .withIndex("by_typeId", (q: any) => q.eq("typeId", match.tournamentType))
                        .unique();
                }

                const matchKey = String((match as { id?: string; _id?: string }).id ?? match._id);
                const seed = createSeededRandom(String(match._id) + uid);
                const pmatch = {
                    matchId: matchKey,
                    mode: match.mode,
                    tournamentId: match.tournamentId,
                    tournamentType: match.tournamentType,
                    uid: uid,
                    gameId:
                        GAME_MODES[match.gameType] === "solo"
                            ? `game_${matchKey}_${uid}`
                            : `game_${matchKey}`,
                    gameType: match.gameType,
                    seed: `game_${matchKey}_${uid}`,
                    score: 0,
                    rank: -1,
                    status: PlayerMatchStatus.open,
                    createdAt: nowISO,
                    updatedAt: nowISO,
                }
                await ctx.db.insert("player_matches", pmatch);

                // å¢žé‡æ›´æ–°å°è¯•æ¬¡æ•°ç»Ÿè®¡
                if (tournamentType) {
                    try {
                        await incrementPlayerAttempts(ctx, {
                            uid,
                            tournamentType,
                            createdAt: nowISO,
                        });
                    } catch (error) {
                        // ç»Ÿè®¡æ›´æ–°å¤±è´¥ä¸åº”å½±å“ä¸»è¦æµç¨‹
                        console.error(`å¢žé‡æ›´æ–°å°è¯•æ¬¡æ•°ç»Ÿè®¡å¤±è´¥ (uid: ${uid}, matchId: ${match._id}):`, error);
                    }
                }

                return { ...pmatch, _id: undefined, _creationTime: undefined };
            } else {
                return { ...playerMatch, _id: undefined, _creationTime: undefined };
            }
        }
    }

    static async surrender(ctx: any, params: {
        uid: string;
        gameId: string;
    }) {
        const { uid, gameId } = params;
        const playerMatch = await ctx.db.query("player_matches").withIndex("by_game", (q: any) => q.eq("gameId", gameId)).first();
        if (!playerMatch) {
            throw new Error("çŽ©å®¶æ¯”èµ›è®°å½•ä¸å­˜åœ¨");
        }
        await ctx.db.patch(playerMatch._id, {
            status: PlayerMatchStatus.finished,
            updatedAt: new Date().toISOString(),
        });
        return { ok: true };
    }
    /**
     * é€šçŸ¥æ¸¸æˆç»“æŸ
     * æ›´æ–° player_matches çŠ¶æ€ï¼Œæ£€æŸ¥å¹¶ç»“ç®— matchï¼ˆå¦‚æžœæ‰€æœ‰æ¸¸æˆéƒ½ç»“æŸï¼‰
     */
    static async submitScore(ctx: any, params: {
        gameId: string;
        finalScore: number;
        isFirstClear?: boolean;
    }): Promise<{
        ok: boolean;
        error?: string;
    }> {
        const nowISO = new Date().toISOString();

        // 1. 将 player_matches 标为 finished（已交分）
        const playerMatch = await ctx.db
            .query("player_matches")
            .withIndex("by_game", (q: any) => q.eq("gameId", params.gameId))
            .first();

        if (!playerMatch) {
            throw new Error("çŽ©å®¶æ¯”èµ›è®°å½•ä¸å­˜åœ¨");
        }

        const patchData: Record<string, any> = {
            score: params.finalScore || playerMatch.score || 0,
            status: PlayerMatchStatus.finished,
            updatedAt: nowISO,
        };
        if (params.isFirstClear !== undefined) {
            patchData.isFirstClear = params.isFirstClear;
        }
        await ctx.db.patch(playerMatch._id, patchData);
        const matchId = playerMatch.matchId;
        // 2. æ£€æŸ¥ match ä¸­æ‰€æœ‰æ¸¸æˆæ˜¯å¦éƒ½ç»“æŸ
        const match = await ctx.db.get(matchId as Id<"matches">);
        if (!match) {
            throw new Error("æ¯”èµ›ä¸å­˜åœ¨");
        }

        const allPlayerMatches = await ctx.db
            .query("player_matches")
            .withIndex("by_match", (q: any) => q.eq("matchId", matchId))
            .collect();

        const allCompleted = allPlayerMatches.every(
            (pm: any) => pm.status === PlayerMatchStatus.finished
        ) && allPlayerMatches.length === match.maxPlayers;

        // 3. å¦‚æžœæ‰€æœ‰æ¸¸æˆéƒ½ç»“æŸï¼Œç»“ç®— match
        if (allCompleted) {
            await this.settleMatch(ctx, {
                matchId: matchId as Id<"matches">,
            });

            return {
                ok: true,
            };
        }

        return {
            ok: true,
        };
    }

    /**
     * ç»“ç®—æ¯”èµ›
     */
    static async settleMatch(ctx: any, params: {
        matchId: Id<"matches">;
    }) {
        const match = await ctx.db.get(params.matchId);
        if (!match) {
            throw new Error("æ¯”èµ›ä¸å­˜åœ¨");
        } else if (match.completed) {
            return;
        }
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", match.tournamentType)).unique();
        if (!tournamentType) {
            throw new Error("é”¦æ ‡èµ›ç±»åž‹ä¸å­˜åœ¨");
        }
        const playerMatches = await ctx.db.query("player_matches").withIndex("by_match", (q: any) => q.eq("matchId", params.matchId)).order("desc").collect();

        const matchRules = tournamentType.matchRules;
        await Promise.all(playerMatches.map(async (playerMatch: any, index: number) => {
            // const pmid = playerMatch._id as Id<"player_matches">;
            await ctx.db.patch(playerMatch._id, {
                rank: index + 1,
                status: PlayerMatchStatus.settled,
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
        // In-memory rows are still "finished" until patch above; require all participants finished before closing matches row.
        const matchFullySettled =
            playerMatches.length === match.maxPlayers &&
            playerMatches.every((pm: any) => pm.status === PlayerMatchStatus.finished);

        if (matchFullySettled) {
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
                await settleTournament(ctx, match.tournamentId, params.matchId);
            }
        }
    }




}


// Convex å‡½æ•°æŽ¥å£
export const checkLastMatch = action({
    args: {
        uid: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        const match = await ctx.runQuery(internal.service.tournament.matchManager.findLastMatch, { uid: args.uid });
        if (match && match.status === PlayerMatchStatus.open && match.dueTime) {
            const now = new Date().toISOString();
            if (now > match.dueTime) {
                //fetch game score from game server
            }
        }
        return { gameId: match?.gameId, gameType: match?.gameType, matchType: match?.mode, status: match?.status };
    },
});
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


export const submitScore = internalMutation({
    args: {
        gameId: v.string(),
        finalScore: v.number(),
        isFirstClear: v.optional(v.boolean()),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.submitScore(ctx, args);
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
        const match = await ctx.db.query("player_matches").withIndex("by_tournamentType_uid_status", (q: any) => q.eq("tournamentType", typeId).eq("uid", uid).eq("status", PlayerMatchStatus.open)).order("desc").first();

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
export const findLastMatch = internalQuery({
    args: { uid: v.string() },
    handler: async (ctx: any, { uid }: { uid: string }): Promise<any> => {

        const match = await ctx.db.query("player_matches").withIndex("by_uid", (q: any) => q.eq("uid", uid)).order("desc").first();
        if (match) {
            return { ...match, _id: undefined, _creationTime: undefined };
        } else {
            return null;
        }

    },
});
export const findNewMatch = query({
    args: { uid: v.string() },
    handler: async (ctx: any, { uid }: { uid: string }): Promise<any> => {
        const match = await ctx.db.query("player_matches").withIndex("by_uid", (q: any) => q.eq("uid", uid)).order("desc").first();
        if (match && match.status === PlayerMatchStatus.open) {
            return { ...match, _id: undefined, _creationTime: undefined };
        }
    },
});
export const surrender = internalMutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
    },
    handler: async (ctx: any, args: any): Promise<any> => {
        return await MatchManager.surrender(ctx, args);
    },
});

/**
 * 一次性迁移：旧版 player_matches 使用 status 数字 + 可选 completed。
 * 部署新 schema 前对存量数据执行；若文档仍含已删除字段 `completed`，需在 Dashboard 清理或二次迁移。
 */
export const migratePlayerMatchesStatusV2 = internalMutation({
    args: {},
    handler: async (ctx: any) => {
        const rows = await ctx.db.query("player_matches").collect();
        let patched = 0;
        for (const r of rows as any[]) {
            const s = r.status;
            if (s === "open" || s === "finished" || s === "settled") continue;
            let next: "open" | "finished" | "settled";
            if (r.completed === true) next = "settled";
            else if (s === 1 || s === TournamentStatus.COMPLETED) next = "finished";
            else next = "open";
            await ctx.db.patch(r._id, { status: next });
            patched++;
        }
        return { patched, total: rows.length };
    },
});

