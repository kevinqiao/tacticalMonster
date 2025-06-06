import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { action, mutation, query } from "../_generated/server";

export const sessionAction = customAction(action, {
    // Argument validation for sessionMutation: two named args here.
    args: { uid: v.optional(v.string()), token: v.optional(v.string()) },
    // The function handler, taking the validated arguments and context.
    input: async (ctx, { uid, token }) => {

        // const u: any = await ctx.runQuery(internal.user.find, { uid });
        // const user = u && u.uid === uid ? u : null;
        // const user = { uid, token };
        // Note: we're passing args through, so they'll be available below
        return { ctx: { user: { uid, token } }, args: {} };
    }
})


export const sessionQuery = customQuery(
    query, // The base function we're extending

    {
        // Argument validation for sessionMutation: two named args here.
        args: { uid: v.string(), token: v.string() },
        // The function handler, taking the validated arguments and context.
        input: async (ctx, { uid, token }) => {
            try {
                const u = await ctx.db.get(uid as Id<"player">);
                return { ctx: { ...ctx, user: u }, args: {} };
            } catch (error) {
                return { ctx: { ...ctx, user: null }, args: {} };
            }

        }

    }
);
export const sessionMutation = customMutation(mutation,
    {
        args: { uid: v.string(), token: v.string() },
        input: async (ctx, { uid, token }) => {
            try {
                console.log("sessionMutation", uid, token);
                const u = await ctx.db.query("player").withIndex("by_uid", (q) => q.eq("uid", uid)).unique();
                console.log("sessionMutation", u);
                return { ctx: { ...ctx, user: u }, args: {} };
            } catch (error) {
                return { ctx: { ...ctx, user: null }, args: {} };
            }
        }
    })