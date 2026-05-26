import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { resolvePlayerSeedScore } from "./solitaireSeedScoreLookup";
import { rolloutTerminalReason, solitaireSeedTier } from "./solitaireSeedPoolValidators";
import {
  entryDocToSeedPoolEntry,
  findRolloutsInSeed,
  getActivePoolMeta,
  getEntryBySeedId,
  getRolloutSummary,
  listSeedEntries,
  loadRolloutSummariesForSeed,
  loadSeedPoolEntryWithSummaries,
  pickRandomSeedForTier,
  resolvePoolVersion,
} from "./solitaireSeedPoolStore";

export const listSeedIdsInPool = internalQuery({
  args: {
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return { poolVersion: null as string | null, seedIds: [] as string[] };
    const rows = await ctx.db
      .query("solitaire_seed_pool_entries")
      .withIndex("by_poolVersion", (q) => q.eq("poolVersion", version))
      .collect();
    return {
      poolVersion: version,
      seedIds: rows.map((r) => r.seedId),
    };
  },
});

export const getActivePoolMetaQuery = internalQuery({
  args: {},
  handler: async (ctx) => {
    const meta = await getActivePoolMeta(ctx.db);
    return meta ?? null;
  },
});

export const getSeedEntryBySeedId = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { seedId, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return null;
    const entry = await getEntryBySeedId(ctx.db, version, seedId);
    if (!entry) return null;
    return entryDocToSeedPoolEntry(entry);
  },
});

export const getSeedEntryWithSummaries = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { seedId, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return null;
    return await loadSeedPoolEntryWithSummaries(ctx.db, version, seedId);
  },
});

export const listRolloutSummariesForSeed = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { seedId, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return [];
    return await loadRolloutSummariesForSeed(ctx.db, version, seedId);
  },
});

export const getRolloutSummaryQuery = internalQuery({
  args: {
    seedId: v.string(),
    rolloutIndex: v.number(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { seedId, rolloutIndex, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return null;
    return await getRolloutSummary(ctx.db, version, seedId, rolloutIndex);
  },
});

export const findRolloutsInSeedQuery = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    minScore: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    terminalReason: v.optional(rolloutTerminalReason),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const version = await resolvePoolVersion(ctx.db, args.poolVersion);
    if (!version) return [];
    return await findRolloutsInSeed(ctx.db, version, args.seedId, {
      minScore: args.minScore,
      maxScore: args.maxScore,
      terminalReason: args.terminalReason,
      completed: args.completed,
    });
  },
});

export const listSeedEntriesQuery = internalQuery({
  args: {
    poolVersion: v.optional(v.string()),
    tier: v.optional(solitaireSeedTier),
    minDifficulty: v.optional(v.number()),
    maxDifficulty: v.optional(v.number()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const version = await resolvePoolVersion(ctx.db, args.poolVersion);
    if (!version) {
      return { entries: [], isDone: true as const };
    }
    return await listSeedEntries(ctx.db, {
      poolVersion: version,
      tier: args.tier,
      minDifficulty: args.minDifficulty,
      maxDifficulty: args.maxDifficulty,
      cursor: args.cursor,
      limit: args.limit,
    });
  },
});

export const resolvePlayerScoreOnSeed = internalQuery({
  args: {
    seedId: v.string(),
    playerScore: v.number(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { seedId, playerScore, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return null;
    const entry = await loadSeedPoolEntryWithSummaries(ctx.db, version, seedId);
    if (!entry) return null;
    return resolvePlayerSeedScore(entry, playerScore);
  },
});

export const pickRandomSeedForTierQuery = internalQuery({
  args: {
    tier: solitaireSeedTier,
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { tier, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, poolVersion);
    if (!version) return null;
    const entry = await pickRandomSeedForTier(ctx.db, version, tier);
    if (!entry) return null;
    return entryDocToSeedPoolEntry(entry);
  },
});
