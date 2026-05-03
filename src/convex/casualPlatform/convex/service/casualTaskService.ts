import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { CASUAL_MISSION_TEMPLATES } from "../data/casualMissionTemplates";

/** 合并模板与玩家 `casual_tasks` 进度 */
export const listSeasonMissions = query({
  args: { uid: v.optional(v.string()) },
  handler: async (ctx, { uid }) => {
    const byTask = new Map<
      string,
      { progress: number; completedAt?: number; updatedAt: number }
    >();
    if (uid) {
      const rows = await ctx.db
        .query("casual_tasks")
        .withIndex("by_uid_task", (q) => q.eq("uid", uid))
        .collect();
      for (const r of rows) {
        byTask.set(r.taskId, {
          progress: r.progress,
          completedAt: r.completedAt,
          updatedAt: r.updatedAt,
        });
      }
    }
    return CASUAL_MISSION_TEMPLATES.map((t) => {
      const p = byTask.get(t.taskId);
      return {
        taskId: t.taskId,
        title: t.title,
        target: t.target,
        progress: p?.progress ?? 0,
        completed: (p?.progress ?? 0) >= t.target,
        completedAt: p?.completedAt,
      };
    });
  },
});

export const bumpTaskProgress = internalMutation({
  args: {
    uid: v.string(),
    taskId: v.string(),
    delta: v.number(),
  },
  handler: async (ctx, { uid, taskId, delta }) => {
    const template = CASUAL_MISSION_TEMPLATES.find((t) => t.taskId === taskId);
    if (!template) return { ok: false as const, error: "unknown_task" };
    const existing = await ctx.db
      .query("casual_tasks")
      .withIndex("by_uid_task", (q) => q.eq("uid", uid).eq("taskId", taskId))
      .unique();
    const now = Date.now();
    const next = Math.min(
      template.target,
      Math.max(0, (existing?.progress ?? 0) + delta)
    );
    const completedAt =
      next >= template.target ? (existing?.completedAt ?? now) : undefined;
    if (!existing) {
      await ctx.db.insert("casual_tasks", {
        uid,
        taskId,
        progress: next,
        completedAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        progress: next,
        completedAt,
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});
