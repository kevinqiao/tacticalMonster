import { v } from "convex/values";

import { query } from "../../_generated/server";
import { towerSeedTier } from "./towerSeedPoolValidators";
import {
  getActivePoolMeta,
  listSeedEntries,
  loadRolloutSummariesForSeed,
  resolvePoolVersion,
} from "./towerSeedPoolStore";

function assertDevQueriesEnabled(): void {
  if (process.env.SEED_POOL_DEV_QUERIES !== "1") {
    throw new Error(
      "Seed pool dev queries are disabled. Set SEED_POOL_DEV_QUERIES=1 in towerArena convex env."
    );
  }
}

export const getActivePoolMetaDev = query({
  args: {},
  handler: async (ctx) => {
    assertDevQueriesEnabled();
    const meta = await getActivePoolMeta(ctx.db);
    if (!meta) return null;
    return {
      poolVersion: meta.poolVersion,
      rolloutCount: meta.rolloutCount,
      matchTimeLimitSec: meta.matchTimeLimitSec,
      entryCount: meta.entryCount,
      generatedAt: meta.generatedAt,
      tierCounts: meta.tierCounts ?? null,
      isActive: meta.isActive,
    };
  },
});

export const listPoolSeedEntriesDev = query({
  args: {
    poolVersion: v.optional(v.string()),
    tier: v.optional(towerSeedTier),
    minDifficulty: v.optional(v.number()),
    maxDifficulty: v.optional(v.number()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertDevQueriesEnabled();
    const version = await resolvePoolVersion(ctx.db, args.poolVersion);
    if (!version) {
      return { poolVersion: null as string | null, entries: [], isDone: true as const };
    }
    const result = await listSeedEntries(ctx.db, {
      poolVersion: version,
      tier: args.tier,
      minDifficulty: args.minDifficulty,
      maxDifficulty: args.maxDifficulty,
      cursor: args.cursor,
      limit: args.limit,
    });
    return { poolVersion: version, ...result };
  },
});

export const listRolloutSummariesDev = query({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { seedId, poolVersion }) => {
    assertDevQueriesEnabled();
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return [];
    return await loadRolloutSummariesForSeed(ctx.db, version, seedId);
  },
});
