import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const create = internalMutation({
    args: {
        uid: v.string(),
        action: v.string(),
        actionData: v.optional(v.any()),
    },
    handler: async (ctx, { uid, action, actionData }) => {
        const now = new Date().toISOString();
        const pid = await ctx.db.insert("task_events", { uid, action, actionData, processed: false, createdAt: now, updatedAt: now });
        return pid;
    },
})



