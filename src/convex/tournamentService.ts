import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
// export const join = sessionAction({
//     args: { tid: v.string() },
//     handler: async (ctx, { tid }) => {
//         const { uid } = ctx.user;
//         const tournament = await ctx.runQuery(internal.tournaments.findById, { id: tid });

//         if (tournament?.type === 0 || tournament?.closeTime && tournament.closeTime > Date.now()) {
//             if (tournament?.type > 0 && tournament.closeTime)
//                 console.log("timeleft:" + (tournament.closeTime - Date.now()))
//             const game = await ctx.runQuery(internal.games.findUserGame, { uid });
//             if (game && !game.status) {
//                 if (!game.dueTime || Date.now() < game.dueTime)
//                     return { ok: false, code: 1 }
//             }
//             const qs = await ctx.runQuery(internal.matchqueue.finByUid, { uid });
//             if (qs)
//                 return { ok: false, code: 2 }

//             await ctx.runMutation(internal.matchqueue.create, { uid, tournamentId: tid });
//             return { ok: true }
//         }
//         return { ok: false }

//     }
// })
export const exit = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }) => {
        const qs = await ctx.runQuery(internal.matchqueue.finByUid, { uid });
        if (qs) {
            await ctx.runMutation(internal.matchqueue.remove, { id: qs._id });
            return { ok: true }
        }
    }
})

