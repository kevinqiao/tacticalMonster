import { v } from "convex/values";
import { Id } from "../../../_generated/dataModel";
import { mutation } from "../../../_generated/server";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";
import { TournamentService } from "../tournamentService";

export const testJoin = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: { uid: string }) => {
        // const uid = "2-22222";
        const uids = ['1-11111', '2-11111', '3-11111'];
        try {
            const typeId = "quick_match_solitaire_ticket2";
            await Promise.all(uids.map(async (uid: string) => {
                const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
                if (!player) {
                    throw new Error("玩家不存在");
                }
                const result = await TournamentService.join(ctx, { player, typeId });
            }));

        } catch (error: any) {
            return { error: error.message };
        }
    },
});
export const testContinueJoin = (mutation as any)({
    args: { matchId: v.string() },
    handler: async (ctx: any, args: { matchId: string }) => {
        const uid = "4-11111";
        try {
            const match = await ctx.db.get(args.matchId as Id<"matches">);
            if (!match) {
                throw new Error("比赛不存在");
            }
            const result = await MatchManager.joinMatch(ctx, { uids: [uid], match: match });
            return result;
        } catch (error: any) {
            return { error: error.message };
        }
    },
});
export const testBatchSubmitScore = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        let matchId: string | null = null;
        const playerMatches = await ctx.db.query("player_matches").collect();
        playerMatches.filter((match: any) => !match.completed).forEach(async (match: any, index: number) => {
            if (!matchId) {
                matchId = match.matchId;
            }
            const score = Math.floor(Math.random() * 1000);
            const scores = [{ uid: match.uid, gameId: match.gameId, score, gameData: {} }]
            await MatchManager.submitScore(ctx, { scores });
        });
        console.log("matchId:", matchId)
    },
});
export const testMatching = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        await TournamentMatchingService.executeMatchingTask(ctx, { batchSize: 50, maxProcessingTime: 30000 });
    },
});
export const testSubmitScore = (mutation as any)({
    args: {
        uid: v.string(),
        gameId: v.string(),
        score: v.number(),
    },
    handler: async (ctx: any, args: { uid: string, gameId: string, score: number }) => {
        const scores = [{ uid: args.uid, gameId: args.gameId, score: args.score, gameData: {} }]
        const result = await MatchManager.submitScore(ctx, { scores });
        return result;
    },
});

