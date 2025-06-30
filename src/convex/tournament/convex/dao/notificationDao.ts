import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const create = internalMutation({
    args: {
        uid: v.string(),
        message: v.string(),
    },
    handler: async (ctx, { uid, message }) => {
        const now = new Date().toISOString();
        const pid = await ctx.db.insert("notifications", { uid, message, createdAt: now });
        return pid;
    },
})



