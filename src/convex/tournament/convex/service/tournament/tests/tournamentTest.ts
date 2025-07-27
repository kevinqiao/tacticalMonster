import { v } from "convex/values";
import { mutation, query } from "../../../_generated/server";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";
import { TournamentService } from "../tournamentService";
export const testAvailableTournaments = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        const result = await TournamentService.getAvailableTournaments(ctx, { uid: "2-22222" });
        return result;
    },
});
export const testJoin = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: { uid: string }) => {
        // const uid = "2-22222";
        try {
            const typeId = "multi_competition";

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
export const loadInventory = (mutation as any)({
    args: { uid: v.string() },
    handler: async (ctx: any, args: { uid: string }) => {
        const uid = args.uid;
        const player = await ctx.db.query("players").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
        if (!player) {
            throw new Error("玩家不存在");
        }
        const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).unique();
        if (!inventory) {
            await ctx.db.insert("player_inventory", {
                uid: uid,
                coins: 1000,
                props: [{ gameType: "1", propType: "1", quantity: 100 }],
                tickets: [{ type: "1", quantity: 100 }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        } else {
            await ctx.db.patch(inventory._id, {
                coins: inventory.coins + 1000,
                updatedAt: new Date().toISOString(),
            });
        }

        return inventory;
    },
});