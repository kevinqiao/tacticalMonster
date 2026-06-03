import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  casualMatchSeedBindingValidator,
  readCasualMatchSeedBinding,
} from "./casualMatchSeedBinding";

export const patchCasualRunMatchSeed = internalMutation({
  args: {
    matchId: v.string(),
    seedBinding: casualMatchSeedBindingValidator,
  },
  handler: async (ctx, args) => {
    const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    const now = Date.now();
    await ctx.db.patch(matchDoc._id, {
      seedBinding: args.seedBinding,
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
    const binding = readCasualMatchSeedBinding(matchDoc);
    const playerRows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .collect();
    const uids = [...new Set(playerRows.map((r) => r.uid).filter(Boolean))];
    return {
      seedBinding: binding,
      humanPlayerCount: matchDoc.humanPlayerCount,
      maxPlayers: matchDoc.maxPlayers,
      uids,
    };
  },
});
