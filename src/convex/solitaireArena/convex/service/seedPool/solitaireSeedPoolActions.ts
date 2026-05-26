"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { simulateRolloutsForSeedEntry } from "./solitaireSeedPoolLazy";

export const lazySimulateRollouts = internalAction({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    rolloutCount: v.optional(v.number()),
    rolloutIndex: v.optional(v.number()),
    persistToDb: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.runQuery(internal.service.seedPool.solitaireSeedPoolQueries.getSeedEntryBySeedId, {
      seedId: args.seedId,
      poolVersion: args.poolVersion,
    });
    if (!entry) {
      return { ok: false as const, error: "seed_not_found" };
    }

    const result = simulateRolloutsForSeedEntry(entry, args.rolloutCount);
    let rollouts = result.rollouts;
    let rolloutSummaries = result.rolloutSummaries;

    if (args.rolloutIndex != null) {
      rollouts = rollouts.filter((r) => r.rolloutIndex === args.rolloutIndex);
      rolloutSummaries = rolloutSummaries.filter((r) => r.rolloutIndex === args.rolloutIndex);
    }

    if (args.persistToDb === true && rolloutSummaries.length > 0) {
      await ctx.runMutation(internal.service.seedPool.solitaireSeedPoolAdmin.upsertRolloutsForSeed, {
        poolVersion: entry.poolVersion,
        seedId: entry.seedId,
        rollouts: rolloutSummaries.map((r) => ({
          poolVersion: entry.poolVersion,
          seedId: entry.seedId,
          ...r,
        })),
      });
    }

    return {
      ok: true as const,
      seedId: entry.seedId,
      poolVersion: entry.poolVersion,
      rolloutSummaries,
      rollouts: rollouts.map((r) => ({
        rolloutIndex: r.rolloutIndex,
        policyVersion: r.policyVersion,
        opCount: r.ops.length,
        finalScore: r.finalScore,
        terminalReason: r.terminalReason,
        replayPacingMs: r.replayPacingMs,
      })),
      metrics: result.metrics,
      rolloutsCollapsed: result.rolloutsCollapsed,
    };
  },
});
