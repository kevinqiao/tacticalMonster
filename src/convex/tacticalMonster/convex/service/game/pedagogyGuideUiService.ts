/**
 * 教学引导横幅：仅记录「不再显示提示」偏好，与局内 tutorialProgress / 胜负判定无关。
 */
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

export const isGuideUiDismissed = query({
    args: {
        uid: v.string(),
        ruleId: v.string(),
    },
    handler: async (ctx, { uid, ruleId }) => {
        const row = await ctx.db
            .query("mr_player_pedagogy_guide_ui")
            .withIndex("by_uid_ruleId", (q) => q.eq("uid", uid).eq("ruleId", ruleId))
            .unique();
        return !!row;
    },
});

export const dismissGuideUi = mutation({
    args: {
        uid: v.string(),
        ruleId: v.string(),
    },
    handler: async (ctx, { uid, ruleId }) => {
        const existing = await ctx.db
            .query("mr_player_pedagogy_guide_ui")
            .withIndex("by_uid_ruleId", (q) => q.eq("uid", uid).eq("ruleId", ruleId))
            .unique();
        const now = new Date().toISOString();
        if (existing) {
            await ctx.db.patch(existing._id, { dismissedAt: now });
        } else {
            await ctx.db.insert("mr_player_pedagogy_guide_ui", { uid, ruleId, dismissedAt: now });
        }
        return { ok: true as const };
    },
});
