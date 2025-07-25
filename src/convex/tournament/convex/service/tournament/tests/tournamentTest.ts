import { mutation, query } from "../../../_generated/server";
import { findTournamentByType } from "../common";
import { TournamentService } from "../tournamentService";

export const testJoin = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const uid = "2-22222";
        const typeId = "1";
        let tournament;
        const tournamentType = await ctx.db.query("tournament_types").withIndex("by_typeId", (q: any) => q.eq("typeId", typeId)).unqiue();
        if (tournamentType.matchRules.matchType !== "single_match" && ['daily', 'weekly', 'seasonal'].includes(tournamentType.timeRange)) {
            tournament = await findTournamentByType(ctx, { tournamentType: tournamentType });
            if (!tournament) {
                throw new Error("锦标赛不存在");
            }
        }
        const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
        if (!player) {
            throw new Error("玩家不存在");
        }
        const result = await TournamentService.join(ctx, { player, tournamentType, tournament });
        return result;
    },
});
export const testAvailableTournaments = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        const result = await TournamentService.getAvailableTournaments(ctx, { uid: "2-22222" });
        console.log("available tournaments", result);
        return result;
    },
});
export const testSubmitScore = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const result = await TournamentService.submitScore(ctx, { scores: [{ gameId: "1", uid: "2-22222", score: 100, rank: 1, gameData: {} }] });
        return result;
    },
});