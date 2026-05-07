import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query, type QueryCtx } from "../_generated/server";
import {
  PASS_LEVEL_REWARDS,
  passRewardForLevel,
} from "../data/casualPassRewards";

async function seasonStatsLeaderboard(
  ctx: QueryCtx,
  seasonId: string,
  limit: number,
  sortKey: "mainSeasonPoints" | "cArenaPoints"
) {
  const rows = await ctx.db
    .query("casual_player_season_stats")
    .withIndex("by_season_uid", (q) => q.eq("seasonId", seasonId))
    .collect();
  const sorted = [...rows].sort((a, b) => b[sortKey] - a[sortKey]);
  return sorted.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    uid: r.uid,
    points: r[sortKey],
  }));
}

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
    const claimedRows = await ctx.db
      .query("casual_pass_claims")
      .withIndex("by_uid_season_track_level", (q) =>
        q.eq("uid", uid).eq("seasonId", season.seasonId)
      )
      .collect();
    const claimed = claimedRows.map((c) => ({ track: c.track, level: c.level }));

    if (!row) {
      return {
        uid,
        seasonId: season.seasonId,
        level: 1,
        xp: 0,
        tracksPurchased: { standard: false, deluxe: false },
        claimed,
      };
    }
    return {
      uid: row.uid,
      seasonId: row.seasonId,
      level: row.level,
      xp: row.xp,
      tracksPurchased: row.tracksPurchased ?? { standard: false, deluxe: false },
      claimed,
    };
  },
});

export const mainSeasonLeaderboard = query({
  args: { seasonId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { seasonId, limit }) => {
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    return await seasonStatsLeaderboard(ctx, seasonId, n, "mainSeasonPoints");
  },
});

export const cArenaLeaderboard = query({
  args: { seasonId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { seasonId, limit }) => {
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    return await seasonStatsLeaderboard(ctx, seasonId, n, "cArenaPoints");
  },
});

export const addPassXpFromRun = internalMutation({
  args: { uid: v.string(), deltaXp: v.number() },
  handler: async (ctx, { uid, deltaXp }) => {
    const d = Math.max(0, Math.floor(deltaXp));
    if (d === 0) return { ok: true as const };
    const seasons = await ctx.db.query("casual_seasons").collect();
    const season = seasons.find((s) => s.active) ?? seasons[0];
    if (!season) return { ok: false as const, error: "no_season" };
    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (player) {
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        seasonXp: (player.seasonXp ?? 0) + d,
      });
    }
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", season.seasonId))
      .unique();
    const now = Date.now();
    const nextXp = (row?.xp ?? 0) + d;
    const nextLevel = 1 + Math.floor(nextXp / 1000);
    if (!row) {
      await ctx.db.insert("casual_pass_progress", {
        uid,
        seasonId: season.seasonId,
        level: nextLevel,
        xp: nextXp,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(row._id, {
        xp: nextXp,
        level: Math.max(row.level, nextLevel),
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});

export const claimPassLevel = mutation({
  args: {
    uid: v.string(),
    seasonId: v.string(),
    track: v.union(v.literal("free"), v.literal("standard"), v.literal("deluxe")),
    level: v.number(),
  },
  handler: async (ctx, { uid, seasonId, track, level }) => {
    const progress = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    const maxLevel = progress?.level ?? 1;
    if (level > maxLevel) {
      return { ok: false as const, error: "level_not_reached" };
    }
    const tracks = progress?.tracksPurchased ?? {};
    if (track === "standard" && !tracks.standard) {
      return { ok: false as const, error: "standard_not_owned" };
    }
    if (track === "deluxe" && !tracks.deluxe) {
      return { ok: false as const, error: "deluxe_not_owned" };
    }
    const existingClaim = await ctx.db
      .query("casual_pass_claims")
      .withIndex("by_uid_season_track_level", (q) =>
        q.eq("uid", uid).eq("seasonId", seasonId).eq("track", track).eq("level", level)
      )
      .unique();
    if (existingClaim) {
      return { ok: false as const, error: "already_claimed" };
    }
    const reward = passRewardForLevel(track, level);
    if (!reward) {
      return { ok: false as const, error: "no_reward_row" };
    }
    const now = Date.now();
    await ctx.db.insert("casual_pass_claims", {
      uid,
      seasonId,
      track,
      level,
      claimedAt: now,
    });
    for (const g of reward.grants) {
      await ctx.runMutation(internal.service.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: g.kind,
        amount: g.amount,
      });
    }
    return { ok: true as const };
  },
});

/** 开发/占位：解锁付费轨（真实环境由 IAP webhook 调用） */
export const devUnlockPassTrack = mutation({
  args: {
    uid: v.string(),
    seasonId: v.string(),
    track: v.union(v.literal("standard"), v.literal("deluxe")),
  },
  handler: async (ctx, { uid, seasonId, track }) => {
    const row = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", seasonId))
      .unique();
    const now = Date.now();
    const nextTracks = {
      ...(row?.tracksPurchased ?? {}),
      [track]: true,
    };
    if (!row) {
      await ctx.db.insert("casual_pass_progress", {
        uid,
        seasonId,
        level: 1,
        xp: 0,
        tracksPurchased: nextTracks,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(row._id, {
        tracksPurchased: nextTracks,
        updatedAt: now,
      });
    }
    return { ok: true as const };
  },
});

export const sealSeasonSnapshot = internalMutation({
  args: { seasonId: v.string(), kind: v.string(), payloadJson: v.string() },
  handler: async (ctx, { seasonId, kind, payloadJson }) => {
    await ctx.db.insert("casual_season_snapshots", {
      seasonId,
      kind,
      createdAt: Date.now(),
      payloadJson,
    });
    return { ok: true as const };
  },
});

export const listPassRewardTable = query({
  args: {},
  handler: async () => PASS_LEVEL_REWARDS,
});
