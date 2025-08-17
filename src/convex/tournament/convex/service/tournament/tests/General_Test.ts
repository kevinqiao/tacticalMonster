import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { TournamentService } from "../tournamentService";
export const testAvailableTournaments = (query as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: { uid: string }) => {
        const result = await TournamentService.getAvailableTournaments(ctx, { uid: args.uid });
        return result;
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