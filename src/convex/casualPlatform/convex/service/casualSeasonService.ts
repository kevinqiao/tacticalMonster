import { v } from "convex/values";
import { query } from "../_generated/server";

/** 赛季列表 MVP：读 DB；无数据时返回占位（不写 DB，避免在 query 内突变） */
export const listSeasons = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_seasons").collect();
    if (rows.length > 0) {
      return rows.map((r) => ({
        seasonId: r.seasonId,
        name: r.name,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        active: r.active,
      }));
    }
    return [
      {
        seasonId: "season_placeholder_1",
        name: "Season 1 (configure in dashboard)",
        startsAt: Date.now(),
        endsAt: Date.now() + 86400000 * 90,
        active: true,
      },
    ];
  },
});

export const getPassProgress = query({
  args: { uid: v.optional(v.string()) },
  handler: async (ctx, { uid }) => {
    if (!uid) return null;
    const active = await ctx.db.query("casual_seasons").collect();
    const season = active.find((s) => s.active) ?? active[0];
    if (!season) return null;
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season.seasonId))
      .unique();
    if (!row) {
      return { uid, seasonId: season.seasonId, level: 1, xp: 0 };
    }
    return {
      uid: row.uid,
      seasonId: row.seasonId,
      level: row.level,
      xp: row.xp,
    };
  },
});
