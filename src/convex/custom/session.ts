import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { action, mutation, query } from "../_generated/server";

export const sessionAction = customAction(action, {
    // Argument validation for sessionMutation: two named args here.
    args: { uid: v.string(), token: v.string() },
    // The function handler, taking the validated arguments and context.
    input: async (ctx, { uid, token }) => {
        console.log("user uid:" + uid + ":" + token)
        const u: any = await ctx.runQuery(internal.user.find, { id: uid as Id<"user"> });
        const user = u && u.uid === uid ? u : null;
        // const user = { uid, token };
        // Note: we're passing args through, so they'll be available below
        return { ctx: { user }, args: {} };
    }
})


export const sessionQuery = customQuery(
    query, // The base function we're extending

    {
        // Argument validation for sessionMutation: two named args here.
        args: { uid: v.string(), token: v.string() },
        // The function handler, taking the validated arguments and context.
        input: async (ctx, { uid, token }) => {
            // const u = await ctx.db.get(uid as Id<"user">);
            // const user = u && u._id === uid && u.token == token ? { ...u, uid: u._id, _id: undefined, _creationTime: undefined } : null;
            return { ctx: { ...ctx, user:{uid,token} }, args:{uid,token} };
        }

    }
);
export const sessionMutation = customMutation(mutation,
    {
        args: { uid: v.string(), token: v.string() },
        input: async (ctx, { uid, token }) => {
            const u = await ctx.db.get(uid as Id<"user">);
            const user = u && u._id === uid && u.token == token ? { ...u, uid: u._id, _id: undefined, _creationTime: undefined } : null;
            return { ctx: { ...ctx, user }, args: {} };
        }
    })