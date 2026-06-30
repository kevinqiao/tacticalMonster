import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { authedMutation, authedQuery } from "../../custom/session";
import { internalMutation, mutation } from "../../_generated/server";
import { getTournamentConfig, TOURNAMENT_CONFIGS } from "../../data/tournamentConfigs";
import {
    collectRewards,
    getPlayerAttempts,
    playerMatchModeFromTournamentTypeDoc,
    settleTournament,
    TournamentStatus,
    validateJoinTournament
} from "./common";
import { TournamentErrorCode } from "./errorCodes";
import { MatchManager } from "./matchManager";

/**
 * ç»Ÿä¸€é”¦æ ‡èµ›æœåŠ¡
 * 
 * æ”¯æŒå•äººå’Œå¤šäººé”¦æ ‡èµ›ï¼Œä½¿ç”¨è¿œç¨‹æ¸¸æˆæœåŠ¡å™¨
 * 
 * æ–°é…ç½®ç³»ç»Ÿè¯´æ˜Žï¼š
 * - å¥–åŠ±é…ç½®ä»Ž TournamentConfig è¯»å–ï¼ˆåŒ…æ‹¬ rankRewards å’Œ performanceRewardsï¼‰
 * - å•äººå…³å¡ï¼ˆminPlayers === 1 && maxPlayers === 1ï¼‰æ”¯æŒ firstClearRewards
 * - å®ç®±é…ç½®ï¼ˆchestTypeWeightsï¼‰åœ¨ rankRewards æˆ– performanceRewards.levelRewards ä¸­é…ç½®
 * - é™åˆ¶é…ç½®æ”¯æŒ maxAttemptsã€attemptCost å’Œ unlimitedAttempts
 * 
 * éžå‘¨æœŸæ€§çš„é”¦æ ‡èµ›("total"): éƒ½æ˜¯å•åœºæ¯”èµ›(single_match)
 * å‘¨æœŸæ€§çš„é”¦æ ‡èµ›(å‘¨æœŸæ€§çš„ç±»åž‹ï¼šdailyã€weeklyã€seasonal): å¯ä»¥åŒ…å«(single_matchã€multi_matchã€best_of_seriesã€elimination)
 */
export class TournamentService {
    /**
     * åŠ è½½é”¦æ ‡èµ›é…ç½®åˆ°æ•°æ®åº“
     * 
     * @param options.replaceExisting - æ˜¯å¦æ›¿æ¢å·²å­˜åœ¨çš„é…ç½®ï¼ˆé»˜è®¤ falseï¼‰
     */
    static async loadTournamentConfig(ctx: any, options?: {
        replaceExisting?: boolean;
    }) {
        const { replaceExisting = false } = options || {};

        // 1. æ¸…ç†çŽ°æœ‰é…ç½®ï¼ˆå¦‚æžœæ›¿æ¢ï¼‰
        if (replaceExisting) {
            const preconfigs = await ctx.db.query("tournament_types").collect();
            for (const preconfig of preconfigs) {
                await ctx.db.delete(preconfig._id);
            }
        }

        // 2. åŠ è½½é™æ€é…ç½®
        // æ³¨æ„ï¼šTournamentConfig çŽ°åœ¨éœ€è¦æ‰‹åŠ¨é…ç½®ï¼Œä¸å†è‡ªåŠ¨ç”Ÿæˆ
        for (const config of TOURNAMENT_CONFIGS) {
            // èŽ·å–è½¬æ¢åŽçš„é…ç½®ï¼ˆå¤„ç†æ—§æ ¼å¼ï¼‰
            const tournamentConfig = getTournamentConfig(config.typeId) || config;

            // æ£€æŸ¥æ˜¯å¦å·²å­˜åœ¨
            if (!replaceExisting) {
                const existing = await ctx.db
                    .query("tournament_types")
                    .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentConfig.typeId))
                    .first();

                if (existing) {
                    continue;  // è·³è¿‡å·²å­˜åœ¨çš„é…ç½®
                }
            }

            // å‡†å¤‡æ’å…¥çš„æ•°æ®ï¼ˆç§»é™¤å¯èƒ½çš„æ—§å­—æ®µï¼‰
            const dataToInsert: any = {
                ...tournamentConfig,
                createdAt: tournamentConfig.createdAt || new Date().toISOString(),
                updatedAt: tournamentConfig.updatedAt || new Date().toISOString(),
            };

            // ç§»é™¤æ—§æ ¼å¼å­—æ®µï¼ˆå¦‚æžœå­˜åœ¨ï¼‰
            delete dataToInsert.type;
            delete dataToInsert.priority; // schema ä¸­æ— æ­¤å­—æ®µï¼Œé¿å…æ ¡éªŒå¤±è´¥

            await ctx.db.insert("tournament_types", dataToInsert);
        }
    }
    /**
     * åŠ å…¥é”¦æ ‡èµ›
     * 
     * å¯¹äºŽå•äººå…³å¡ï¼ˆminPlayers === 1 && maxPlayers === 1ï¼‰ï¼Œç›´æŽ¥åˆ›å»ºæ¯”èµ›
     * å¯¹äºŽå¤šäººæ¯”èµ›ï¼ŒåŠ å…¥åŒ¹é…é˜Ÿåˆ—
     * 
     * @param params.uid - çŽ©å®¶ UID
     * @param params.typeId - é”¦æ ‡èµ›ç±»åž‹ ID
     * @param params.tournamentId - å¯é€‰çš„é”¦æ ‡èµ› IDï¼ˆå¦‚æžœæœªæä¾›ï¼Œä¼šåˆ›å»ºæ–°çš„é”¦æ ‡èµ›ï¼‰
     * @param params.teamPower - çŽ©å®¶é˜Ÿä¼æˆ˜åŠ›ï¼ˆTacticalMonster æ¸¸æˆéœ€è¦ï¼Œç”¨äºŽåŒ¹é…å’Œåˆ›å»ºæ¸¸æˆï¼‰
     * @param params.stageId - å…³å¡ IDï¼ˆå•äººå…³å¡éœ€è¦ï¼Œç”¨äºŽåˆ›å»ºæ¸¸æˆï¼‰
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
            return { ok: false, message: "é”¦æ ‡èµ›ç±»åž‹ä¸å­˜åœ¨" };
        }
        const validateResult = await validateJoinTournament(ctx, { uid, tournamentType });
        if (!validateResult || !validateResult.ok) {
            return { ok: false, errorCode: validateResult?.errorCode || TournamentErrorCode.UNKNOWN_ERROR, message: validateResult?.message || "éªŒè¯å‡ºé”™" };
        }
        const tournament = {
            gameType: tournamentType.gameType,
            status: TournamentStatus.OPEN,
            type: tournamentType.typeId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        // return { ok: true, message: "æˆåŠŸåŠ å…¥é”¦æ ‡èµ›..." };
        if (tournamentType.matchRules.maxPlayers > 1) {
            // å¤šäººæ¯”èµ›ï¼šåŠ å…¥åŒ¹é…é˜Ÿåˆ—ï¼Œä¼ é€’ teamPower ç”¨äºŽåŒ¹é…
            // const metadata = teamPower !== undefined ? { teamPower } : undefined;
            // await TournamentMatchingService.joinMatchingQueue(ctx, {
            //     uid,
            //     tournamentId: tournamentId || undefined,
            //     typeId,
            //     gameType: tournamentType.gameType,
            //     metadata
            // });
            // return { ok: true, message: "æˆåŠŸåŠ å…¥åŒ¹é…é˜Ÿåˆ—" };
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
                const playerMatch = await MatchManager.joinMatch(ctx, {
                    uid,
                    match: { ...match, mode: playerMatchModeFromTournamentTypeDoc(tournamentType) },
                });
                console.log("playerMatch:", stageId, teamPower);
                return {
                    ok: true,
                    message: "æˆåŠŸåŠ å…¥é”¦æ ‡èµ›",
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
     * ç»“ç®—é”¦æ ‡èµ›
     * 
     * è®¡ç®—å¥–åŠ±å¹¶æ›´æ–°çŽ©å®¶çŠ¶æ€ï¼Œä½†ä¸å‘æ”¾å¥–åŠ±
     * å¥–åŠ±å°†åœ¨çŽ©å®¶ä¸»åŠ¨ claim æ—¶å‘æ”¾
     * 
     * @param tournamentId - é”¦æ ‡èµ› ID
     */
    static async settle(ctx: any, tournamentId: string) {
        const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
        if (!tournament) {
            throw new Error("é”¦æ ‡èµ›ä¸å­˜åœ¨");
        }

        await settleTournament(ctx, tournamentId);

        return {
            success: true,
            tournamentId,
            message: "é”¦æ ‡èµ›ç»“ç®—å®Œæˆ"
        };
    }

    /**
     * èŽ·å–é”¦æ ‡èµ›æŽ’è¡Œæ¦œ
     * 
     * @param args.tournamentId - é”¦æ ‡èµ› ID
     * @param args.paginationOpts - åˆ†é¡µé€‰é¡¹
     */
    static async getLeaderboard(ctx: any, args: { tournamentId: string, paginationOpts: any }) {
        const { tournamentId, paginationOpts } = args;
        console.log("getLeaderboard", tournamentId, paginationOpts)
        const tournament = await ctx.db.get(tournamentId as Id<"tournaments">);
        if (!tournament) {
            throw new Error("é”¦æ ‡èµ›ä¸å­˜åœ¨");
        }

        const playerTournaments = await ctx.db.query("player_tournaments").withIndex("by_tournament_score", (q: any) => q.eq("tournamentId", tournamentId)).order("desc").paginate(paginationOpts);
        console.log("playerTournaments", playerTournaments)
        const leaderboard = playerTournaments.page.map((playerTournament: any) => { return { uid: playerTournament.uid, score: playerTournament.score } })
        console.log("leaderboard", leaderboard)

    }


    /**
     * é¢†å–é”¦æ ‡èµ›å¥–åŠ±
     * 
     * å‘æ”¾ç§¯åˆ†ã€é‡‘å¸ç­‰å¥–åŠ±ï¼Œå¹¶æ ‡è®°å¥–åŠ±å·²é¢†å–
     * æ³¨æ„ï¼šcollectRewards å·²ç»ä¼šæ›´æ–°çŠ¶æ€ä¸º COLLECTEDï¼Œè¿™é‡Œä¸éœ€è¦å†æ¬¡æ›´æ–°
     * 
     * @param playerTournament - çŽ©å®¶é”¦æ ‡èµ›è®°å½•
     */
    static async collect(ctx: any, playerTournament: any) {
        await collectRewards(ctx, playerTournament);
        // collectRewards å·²ç»ä¼šæ›´æ–°çŠ¶æ€ä¸º COLLECTEDï¼Œæ— éœ€å†æ¬¡æ›´æ–°
    }
    /**
     * èŽ·å–å½“å‰çŽ©å®¶å¯å‚ä¸Žçš„é”¦æ ‡èµ›åˆ—è¡¨
     * 
     * æ ¹æ®æ–°çš„é…ç½®ç³»ç»Ÿï¼š
     * - ä½¿ç”¨ limits.maxAttempts ä½œä¸ºæœ€å¤§å°è¯•æ¬¡æ•°é™åˆ¶
     * - å¦‚æžœ limits.unlimitedAttempts === trueï¼Œåˆ™ä¸é™åˆ¶å°è¯•æ¬¡æ•°
     * - è®¢é˜…ç”¨æˆ·å¯ä»¥ä½¿ç”¨ limits.subscribed.maxAttemptsï¼ˆå¦‚æžœå­˜åœ¨ï¼‰
     */
    static async getAvailableTournaments(ctx: any, params: {
        uid: string;
    }) {
        const { uid } = params;

        // èŽ·å–æ‰€æœ‰æ´»è·ƒçš„é”¦æ ‡èµ›ç±»åž‹
        const tournamentTypes = await ctx.db
            .query("tournament_types")
            .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
            .collect();

        console.log("[getAvailableTournaments] è¿‡æ»¤ isActive=true åŽçš„è®°å½•æ•°:", tournamentTypes.length);

        const availableTournaments: any[] = [];
        for (const tournamentType of tournamentTypes) {
            try {
                const participation = { attempts: 0 };

                // // æ£€æŸ¥å°è¯•æ¬¡æ•°é™åˆ¶
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
                console.error(`æ£€æŸ¥é”¦æ ‡èµ›èµ„æ ¼å¤±è´¥ (${tournamentType.typeId}):`, error);
                // ç»§ç»­æ£€æŸ¥å…¶ä»–é”¦æ ‡èµ›ï¼Œä¸ä¸­æ–­æ•´ä¸ªæµç¨‹
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
export const collect = authedMutation({
    args: {
        tournamentId: v.string(),
    },
    handler: async (ctx: any, args: any) => {
        const { tournamentId } = args;
        const playerTournament = await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", ctx.uid)).unique();
        if (!playerTournament) {
            throw new Error("é”¦æ ‡èµ›ä¸å­˜åœ¨");
        }
        if (playerTournament.status >= TournamentStatus.SETTLED) {
            throw new Error("é”¦æ ‡èµ›å·²é¢†å–");
        }
        const result = await TournamentService.collect(ctx, playerTournament);
        return result;
    },
});
export const getAvailableTournaments = authedQuery({
    args: {},
    handler: async (ctx: any) => {
        try {
            const result = await TournamentService.getAvailableTournaments(ctx, { uid: ctx.uid });
            // console.log("getAvailableTournaments", result)
            return result;
        } catch (error) {
            console.error("èŽ·å–å¯å‚ä¸Žçš„é”¦æ ‡èµ›å¤±è´¥:", error);
            return null;
        }
    },
});

export const loadTournamentConfig = internalMutation({
    args: {
        replaceExisting: v.optional(v.boolean()),        // æ˜¯å¦æ›¿æ¢å·²å­˜åœ¨çš„é…ç½®
    },
    handler: async (ctx: any, args: any) => {
        const result = await TournamentService.loadTournamentConfig(ctx, {
            replaceExisting: args.replaceExisting || false,
        });
        return result;
    },
});





