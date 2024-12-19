import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

export const authByToken = action({
    args: { uid: v.string(), token: v.string() },
    handler: async (ctx, { uid, token }) => {
        // console.log("uid:" + uid)
        try {
            const user: any = await ctx.runQuery(internal.user.find, { uid });
            console.log(user.token + ":" + token)
            if (user && user.token === token) {
                const game = await ctx.runQuery(internal.games.findUserGame, { uid });
                if (game?.battleId && !game.status) {
                    const battle = await ctx.runQuery(internal.battle.findById, { battleId: game.battleId as Id<"battle"> })
                    if (battle && ((battle.duration + battle.startTime) > Date.now()))
                        user['battleId'] = battle._id
                }
                const matching = await ctx.runQuery(internal.matchqueue.finByUid, { uid: user.uid });
                if (matching)
                    user['insearch'] = 1;
                const assets = await ctx.runQuery(internal.asset.findUserAssets, { uid });
                if (assets)
                    user['assets'] = assets
                return { ...user, timestamp: Date.now() }
            }

        } catch (err) {
            return null
        }
        return null
    }
})

export const findAllUser = action({
    args: {},
    handler: async (ctx, args) => {
        const users: any[] = await ctx.runQuery(internal.user.findAll);
        return users;
    }
})

export const logout = action({
    args: { uid: v.string() },
    handler: async (ctx, { uid }) => {
        console.log("logout")
    }
})

export const heartbeat = action({
    handler: async (ctx) => {
        return { ok: true }
    }
})
export const signin = action({
    args: { uid: v.id("user"), token: v.string() },
    handler: async (ctx, { uid, token }) => {
        const user: any = await ctx.runQuery(internal.user.find, { uid });
        // if (user) {
        //     const game = await ctx.runQuery(internal.games.findUserGame, { uid });
        //     if (game) {
        //         const b: any = await ctx.runQuery(internal.battle.find, { battleId: game.battleId as Id<"battle"> })
        //         if (b) {
        //             const games = await ctx.runQuery(internal.games.findBattleGames, { battleId: b.id })
        //             if (games)
        //                 b['games'] = games.map((g) => ({ uid: g.uid, gameId: g._id }))
        //         } else
        //             b["games"] = [{ uid: uid, gameId: game._id }]
        //         user['battle'] = b;
        //         const matching = await ctx.runQuery(internal.matchqueue.finByUid, { uid: user.uid });
        //         if (matching)
        //             user['insearch'] = 1;
        //     }
        //     await ctx.runMutation(internal.user.update, { id: user["_id"], data: {} })
        // }
        return { token: "12345", ...user, timestamp: Date.now() }
    }
})
