import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { sessionMutation } from "../custom/session";

export const create = internalMutation({
    args: {
        cuid: v.string(),
        token: v.string(),
        platform: v.number(),
        partner: v.number(),
        data: v.any()
    },
    handler: async (ctx, { cuid, partner, token, platform, data }) => {
        const uid = platform + "-" + cuid;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (!user) {
            await ctx.db.insert("user", { uid, cuid, partner, token, platform: platform, data });
            return { uid, cuid, partner, token, data };
        }
        return null;
    },
});

export const find = internalQuery({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return user
    },
})
export const findUser = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, { uid }) => {
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        return user
    },
})
export const findByPartner = internalQuery({
    args: {
        cuid: v.string(),
        partner: v.number(),
    },
    handler: async (ctx, { cuid, partner }) => {
        const user = await ctx.db.query("user").withIndex("by_partner", (q) => q.eq("partner", partner).eq("cuid", cuid)).unique();
        return user;
    },
})
export const findByPlatform = internalQuery({
    args: {
        cuid: v.string(),
        platformId: v.number(),
    },
    handler: async (ctx, { cuid, platformId }) => {
        const user = await ctx.db.query("user").withIndex("by_platform", (q) => q.eq("platform", platformId).eq("cuid", cuid)).unique();
        return user;
    },
})
export const update = internalMutation({
    args: {
        uid: v.string(),
        data: v.any()
    },
    handler: async (ctx, { uid, data }) => {

        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        console.log("update userDao", uid, user?.data, data);
        if (user) {
            if (user.data)
                Object.assign(user.data, data);
            console.log("update userDao", uid, user.data);
            await ctx.db.patch(user._id, { lastUpdate: Date.now(), data: user.data });
            return true;
        }
        return false;
    },
})
export const updateMatch = sessionMutation({
    args: { matchId: v.string() },
    handler: async (ctx, { matchId }) => {
        const uid = ctx.user?.uid;
        if (!uid) return false;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            const data = user.data ? Object.assign({}, user.data, { matchId }) : { matchId };
            await ctx.db.patch(user._id, { data });
            return true;
        }
        return false;
    },
})
export const completeMatch = sessionMutation({
    args: {},
    handler: async (ctx, { }) => {
        const uid = ctx.user?.uid;
        if (!uid) return false;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            const data = user.data ? { ...user.data, matchId: undefined } : {};
            await ctx.db.patch(user._id, { data });
            return true;
        }
        return false;
    },
})
export const cancelMatch = sessionMutation({
    args: {},
    handler: async (ctx, { }) => {
        const uid = ctx.user?.uid;
        if (!uid) return false;
        const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
        if (user) {
            const data = user.data ? { ...user.data, matchId: undefined } : {};
            await ctx.db.patch(user._id, { data });
            return true;
        }
        return false;
    },
})
// export const updateLastUpdate = internalMutation({
//     args: { uid: v.string(), lastEvent: v.string() },
//     handler: async (ctx, { uid, lastEvent }) => {
//         const user = await ctx.db.query("user").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
//         if (user) {
//             const data = user.data ? Object.assign({}, user.data, { lastMatch }) : { lastMatch };
//             await ctx.db.patch(user._id, { data });
//             return true;
//         }
//         return false;
//     },
// })    
