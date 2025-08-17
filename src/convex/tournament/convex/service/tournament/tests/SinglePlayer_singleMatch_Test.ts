import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";
import { TournamentService } from "../tournamentService";
export const testAvailableTournaments = (query as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: { uid: string }) => {
        const result = await TournamentService.getAvailableTournaments(ctx, { uid: args.uid });
        return result;
    },
});
export const testJoin = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: { uid: string }) => {
        // const uid = "2-22222";
        try {
            const typeId = "jackpot_solitaire_free";
            const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", args.uid)).unique();
            if (!player) {
                throw new Error("玩家不存在");
            }
            const result = await TournamentService.join(ctx, { player, typeId });
            return result;
        } catch (error: any) {
            return { error: error.message };
        }
    },
});
export const testBatchJoin = (mutation as any)({
    args: {},
    handler: async (ctx: any, args: { uid: string }) => {
        // const uid = "2-22222";
        try {
            const typeId = "jackpot_solitaire_free";
            const players = await ctx.db.query("players").collect();
            players.forEach(async (player: any) => {
                const result = await TournamentService.join(ctx, { player, typeId });
                return result;
            });
            return { success: true };
        } catch (error: any) {
            return { error: error.message };
        }
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
export const testBatchSubmitScore = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        const playerMatches = await ctx.db.query("player_matches").collect();
        playerMatches.filter((match: any) => !match.completed).forEach(async (match: any, index: number) => {
            const score = Math.floor(Math.random() * 1000);
            const scores = [{ uid: match.uid, gameId: match.gameId, score, gameData: {} }]
            await MatchManager.submitScore(ctx, { scores });
        });
    },
});
export const testLoadPlayers = (mutation as any)({
    args: { count: v.number() },
    handler: async (ctx: any, { count }: { count: number }) => {
        const players = await ctx.db.query("players").collect();

        players.forEach(async (player: any) => {
            await ctx.db.delete(player._id);
        });

        for (let i = 0; i < count; i++) {
            await ctx.db.insert("players", {
                uid: `${i + 1}-11111`,
                coins: 1000,
                displayName: `Player ${i}`,
                avatar: `https://example.com/avatar${i}.png`,
            });
        }

    },
});
export const testGetLeaderboard = (query as any)({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx: any, args: { tournamentId: string }) => {
        const result = await TournamentService.getLeaderboard(ctx, { tournamentId: args.tournamentId, paginationOpts: { numItems: 5, cursor: null } });
        return result;
    },
});