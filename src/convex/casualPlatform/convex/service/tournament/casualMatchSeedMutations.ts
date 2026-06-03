import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../_generated/server";

const seedScoreQuantilesValidator = v.object({
  p10: v.number(),
  p25: v.number(),
  p30: v.number(),
  p33: v.number(),
  p50: v.number(),
  p66: v.number(),
  p70: v.number(),
  p75: v.number(),
  p90: v.number(),
});

export const patchCasualRunMatchSeed = internalMutation({
  args: {
    matchId: v.string(),
    seedId: v.string(),
    seedPoolVersion: v.string(),
    seedTier: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    seedScoreQuantiles: seedScoreQuantilesValidator,
  },
  handler: async (ctx, args) => {
    const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    const now = Date.now();
    await ctx.db.patch(matchDoc._id, {
      seedId: args.seedId,
      seedPoolVersion: args.seedPoolVersion,
      seedTier: args.seedTier,
      seedScoreQuantiles: args.seedScoreQuantiles,
      seedResolvedAt: now,
      seedResolveError: undefined,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const markCasualMatchSeedError = internalMutation({
  args: {
    matchId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, { matchId, error }) => {
    const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    const now = Date.now();
    await ctx.db.patch(matchDoc._id, {
      seedResolveError: error,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const getMatchForSeedBind = internalQuery({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
    if (!matchDoc) return null;
    const playerRows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .collect();
    const uids = [...new Set(playerRows.map((r) => r.uid).filter(Boolean))];
    return {
      seedId: matchDoc.seedId,
      humanPlayerCount: matchDoc.humanPlayerCount,
      maxPlayers: matchDoc.maxPlayers,
      uids,
    };
  },
});
