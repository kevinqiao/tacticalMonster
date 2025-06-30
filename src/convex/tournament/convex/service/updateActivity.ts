import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const updateActivity = internalMutation({
  args: {
    uid: v.string(),
    activityId: v.string(),
    makeupDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const activity = await ctx.db
      .query("player_activities")
      .withIndex("by_uid_activityId", (q) => q.eq("uid", args.uid).eq("activityId", args.activityId))
      .first();
    const player = await ctx.db.query("players").withIndex("by_uid", (q) => q.eq("uid", args.uid)).first();

    if (!player) {
      throw new Error("Player not found");
    }

    if (!activity) {
      await ctx.db.insert("player_activities", {
        uid: args.uid,
        activityId: args.activityId,
        progress: { cumulativeDays: 1, consecutiveDays: 1, interruptions: 0 },
        startDate: today,
        lastLogin: today,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    const newProgress = { ...activity.progress };
    const lastLoginDate = activity.lastLogin.split("T")[0];
    const targetDate = args.makeupDate || today;

    if (args.makeupDate) {
      newProgress.cumulativeDays += 1;
      if (newProgress.interruptions < 1) {
        newProgress.consecutiveDays += 1;
      }
    } else if (lastLoginDate < today) {
      newProgress.cumulativeDays += 1;
      const daysMissed = (Date.parse(today) - Date.parse(lastLoginDate)) / (24 * 60 * 60 * 1000);
      if (daysMissed > 1) {
        newProgress.interruptions += 1;
        newProgress.consecutiveDays = newProgress.interruptions < 1 ? newProgress.consecutiveDays + 1 : 1;
      } else {
        newProgress.consecutiveDays += 1;
      }
      if (newProgress.interruptions > 0) {
        await ctx.db.insert("notifications", {
          uid: args.uid,
          message: "错过昨日登录！今日登录继续累计，保持连续获 500 金币+门票！",
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(activity._id, {
      progress: newProgress,
      lastLogin: today,
      updatedAt: now,
    });
  },
});
