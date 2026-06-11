import { v } from "convex/values";

import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { resolveSeedTierForTemplate } from "../../../data/casualSeedTierPolicy";
import type { Id } from "../../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../../_generated/server";
import {
  casualMatchSeedBindingValidator,
  readCasualMatchSeedBinding,
  type CasualMatchSeedBinding,
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
      templateId: matchDoc.templateId,
      gameType: matchDoc.gameType,
      uids,
    };
  },
});

/** Block Blast 等：将模板 referenceScoreQuantiles 写入 seedBinding */
export const bindCasualMatchTemplateQuantiles = internalMutation({
  args: {
    matchId: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { matchId, templateId }) => {
    const def = getTournamentDefinition(templateId);
    if (!def?.referenceScoreQuantiles) {
      const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
      if (matchDoc) {
        await ctx.db.patch(matchDoc._id, {
          seedResolveError: "missing_reference_quantiles",
          updatedAt: Date.now(),
        });
      }
      return { ok: false as const, error: "missing_reference_quantiles" as const };
    }

    const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    if (readCasualMatchSeedBinding(matchDoc)) {
      return { ok: true as const, alreadyBound: true as const };
    }

    const tier = resolveSeedTierForTemplate(def);
    const seedBinding: CasualMatchSeedBinding = {
      seedId: `template:${templateId}`,
      poolVersion: "static",
      tier,
      scoreQuantiles: { ...def.referenceScoreQuantiles },
    };
    const now = Date.now();
    await ctx.db.patch(matchDoc._id, {
      seedBinding,
      seedResolveError: undefined,
      updatedAt: now,
    });
    return { ok: true as const, seedId: seedBinding.seedId };
  },
});
