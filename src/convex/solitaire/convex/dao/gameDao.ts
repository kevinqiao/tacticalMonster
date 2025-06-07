import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { sessionQuery } from "../custom/session";
const query = async (ctx: any, gameId: string) => {
    console.log("query", gameId);
    const id = gameId as Id<"game">;
    const game = await ctx.db.get(id);
    if (game) {
        if (game.actDue) {
            game.actDue = game.actDue - Date.now();
        }
        game.cards.forEach((card: any) => {
            if (!card.status) {
                card.suit = undefined;
                card.rank = undefined;
            }
        })
        return { ...game, gameId, _id: undefined, _creationTime: undefined, lastUpdate: game.lastUpdate ?? game._creationTime }
    }
    return null
}
export const find = sessionQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        return await query(ctx, gameId);
    },
});
export const findByMatchId = internalQuery({
    args: { matchId: v.string() },
    handler: async (ctx, { matchId }) => {
        console.log("findByMatchId", matchId);
        const game = await ctx.db.query("game").withIndex("by_matchId", (q) => q.eq("matchId", matchId)).unique();
        console.log("game", game);
        if (!game) {
            return null;
        }
        if (game.actDue) {
            game.actDue = game.actDue - Date.now();
        }
        game.cards.forEach((card: any) => {
            if (!card.status) {
                card.suit = undefined;
                card.rank = undefined;
            }
        })
        return { ...game, gameId: game._id, _id: undefined, _creationTime: undefined, lastUpdate: game.lastUpdate ?? game._creationTime }
    },
});
export const get = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("get", gameId);
        return await query(ctx, gameId);
    },
});
export const select = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const id = gameId as Id<"game">;
        const game = await ctx.db.get(id);
        return game;
    },
});


export const update = internalMutation({
    args: {
        id: v.id("game"),
        data: v.any()
    },
    handler: async (ctx, { id, data }) => {
        console.log("update", id, data);
        await ctx.db.patch(id, data);
        return true
    },
})
export const findDuePast = internalQuery({
    args: {},
    handler: async (ctx) => {
        const games = await ctx.db.query("game").withIndex("by_due", (q) => q.eq("status", 0).lt("actDue", Date.now())).collect();
        return games.map((game) => {
            if (game.actDue) {
                game.actDue = game.actDue - Date.now();
            }
            return { ...game, gameId: game._id, _id: undefined, _creationTime: undefined }
        });
    },
});

export const unlock = internalMutation({
    args: {
        id: v.id("game")
    },
    handler: async (ctx, { id }) => {
        try {
            // const game = await ctx.db.get(id); 
            const game = await query(ctx, id);
            if (game && game.status) {
                await ctx.db.patch(id, { status: 0 });
                return game;
            }
            return null
        } catch (error) {
            console.log("unlock error", error);
            return null
        }
    },
})
