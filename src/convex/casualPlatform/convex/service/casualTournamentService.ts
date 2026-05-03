import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { getDefaultCasualTournaments } from "../data/casualTournamentConfigs";

/** 确保演示锦标存在于 DB（幂等） */
export const seedDemoTournaments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seasons = await ctx.db.query("casual_seasons").collect();
    if (seasons.length === 0) {
      const now = Date.now();
      await ctx.db.insert("casual_seasons", {
        seasonId: "casual_s1",
        name: "Season 1",
        startsAt: now,
        endsAt: now + 90 * 86400000,
        active: true,
      });
    }
    for (const t of getDefaultCasualTournaments()) {
      const existing = await ctx.db
        .query("casual_tournaments")
        .withIndex("by_tournamentId", (q) => q.eq("tournamentId", t.tournamentId))
        .unique();
      if (!existing) {
        await ctx.db.insert("casual_tournaments", {
          tournamentId: t.tournamentId,
          title: t.title,
          gameId: t.gameId,
          matchType: t.matchType,
          status: t.status,
        });
      }
    }
    return { ok: true as const };
  },
});

export const listTournaments = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_tournaments").collect();
    if (rows.length > 0) {
      return rows.map((r) => ({
        tournamentId: r.tournamentId,
        title: r.title,
        gameId: r.gameId,
        matchType: r.matchType,
        status: r.status,
      }));
    }
    return getDefaultCasualTournaments();
  },
});

export const leaderboard = query({
  args: { tournamentId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { tournamentId, limit }) => {
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    const entries = await ctx.db
      .query("casual_entries")
      .withIndex("by_tournament_score", (q) => q.eq("tournamentId", tournamentId))
      .order("desc")
      .take(n);
    return entries
      .filter((e) => e.score != null)
      .map((e, i) => ({
        rank: i + 1,
        uid: e.uid,
        score: e.score as number,
        submittedAt: e.submittedAt,
      }));
  },
});

export const joinTournament = mutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
  },
  handler: async (ctx, { uid, tournamentId }) => {
    await ctx.runMutation(internal.service.casualTournamentService.seedDemoTournaments, {});
    const existing = await ctx.db
      .query("casual_entries")
      .withIndex("by_uid_tournament", (q) =>
        q.eq("uid", uid).eq("tournamentId", tournamentId)
      )
      .unique();
    if (existing) {
      return { ok: true as const, entryId: existing._id };
    }
    const id = await ctx.db.insert("casual_entries", {
      uid,
      tournamentId,
      submittedAt: Date.now(),
    });
    await ctx.runMutation(internal.service.casualTaskService.bumpTaskProgress, {
      uid,
      taskId: "casual_join_tournament_1",
      delta: 1,
    });
    return { ok: true as const, entryId: id };
  },
});

export const applyScore = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    gameId: v.string(),
    score: v.number(),
    externalGameId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, tournamentId, gameId, score, externalGameId }) => {
    const tourney = await ctx.db
      .query("casual_tournaments")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tournamentId))
      .unique();
    if (!tourney || tourney.gameId !== gameId) {
      return { ok: false as const, error: "bad_tournament" };
    }
    const row = await ctx.db
      .query("casual_entries")
      .withIndex("by_uid_tournament", (q) =>
        q.eq("uid", uid).eq("tournamentId", tournamentId)
      )
      .unique();
    if (!row) {
      const id = await ctx.db.insert("casual_entries", {
        uid,
        tournamentId,
        score,
        submittedAt: Date.now(),
        externalGameId,
      });
      if (gameId === "block_blast") {
        await ctx.runMutation(internal.service.casualTaskService.bumpTaskProgress, {
          uid,
          taskId: "casual_play_block_blast_1",
          delta: 1,
        });
      }
      return { ok: true as const, entryId: id };
    }
    const best = row.score == null ? score : Math.max(row.score, score);
    await ctx.db.patch(row._id, {
      score: best,
      submittedAt: Date.now(),
      externalGameId: externalGameId ?? row.externalGameId,
    });
    if (gameId === "block_blast") {
      await ctx.runMutation(internal.service.casualTaskService.bumpTaskProgress, {
        uid,
        taskId: "casual_play_block_blast_1",
        delta: 1,
      });
    }
    return { ok: true as const, entryId: row._id };
  },
});
