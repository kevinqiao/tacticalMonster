import { v } from "convex/values";

import { query } from "../../_generated/server";
import {
  catalogGameType,
  catalogSeedTier,
  rolloutTerminalReason,
} from "./seedPoolValidators";
import {
  findRolloutsInSeed,
  getActivePoolMeta,
  listSeedEntries,
  loadRolloutSummariesForSeed,
  resolvePoolVersion,
} from "./seedPoolStore";

function assertDevQueriesEnabled(): void {
  if (process.env.SEED_POOL_DEV_QUERIES !== "1") {
    throw new Error(
      "Seed pool dev queries are disabled. Set SEED_POOL_DEV_QUERIES=1 in casualPlatform convex env."
    );
  }
}

export const getActivePoolMetaDev = query({
  args: {
    gameType: catalogGameType,
  },
  handler: async (ctx, { gameType }) => {
    assertDevQueriesEnabled();
    const meta = await getActivePoolMeta(ctx.db, gameType);
    if (!meta) return null;
    return {
      poolVersion: meta.poolVersion,
      rolloutCount: meta.rolloutCount,
      matchTimeLimitSec: meta.matchTimeLimitSec,
      entryCount: meta.entryCount,
      generatedAt: meta.generatedAt,
      isActive: meta.isActive,
    };
  },
});

export const listPoolSeedEntriesDev = query({
  args: {
    gameType: catalogGameType,
    poolVersion: v.optional(v.string()),
    tier: v.optional(catalogSeedTier),
    minDifficulty: v.optional(v.number()),
    maxDifficulty: v.optional(v.number()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertDevQueriesEnabled();
    const version = await resolvePoolVersion(ctx.db, args.gameType, args.poolVersion);
    if (!version) {
      return { poolVersion: null as string | null, entries: [], isDone: true as const };
    }
    const result = await listSeedEntries(ctx.db, {
      gameType: args.gameType,
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
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, seedId, poolVersion }) => {
    assertDevQueriesEnabled();
    const version = await resolvePoolVersion(ctx.db, gameType, poolVersion);
    if (!version) return [];
    return await loadRolloutSummariesForSeed(ctx.db, gameType, version, seedId);
  },
});

export const findRolloutsDev = query({
  args: {
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    minScore: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    terminalReason: v.optional(rolloutTerminalReason),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertDevQueriesEnabled();
    const version = await resolvePoolVersion(ctx.db, args.gameType, args.poolVersion);
    if (!version) return [];
    const all = await findRolloutsInSeed(ctx.db, args.gameType, version, args.seedId, {
      minScore: args.minScore,
      maxScore: args.maxScore,
    });
    return all.filter((s) => {
      if (args.terminalReason != null && s.terminalReason !== args.terminalReason) {
        return false;
      }
      if (args.completed != null && s.completed !== args.completed) {
        return false;
      }
      return true;
    });
  },
});
