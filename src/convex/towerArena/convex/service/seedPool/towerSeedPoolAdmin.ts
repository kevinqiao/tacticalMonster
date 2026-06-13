import { v, type Infer } from "convex/values";

import { internalMutation, type MutationCtx } from "../../_generated/server";
import { rolloutDistributionMetrics, rolloutSummary, towerSeedTier } from "./towerSeedPoolValidators";
import {
  computeTierCounts,
  countEntriesForPool,
  deactivateAllPools,
  getPoolMetaByVersion,
} from "./towerSeedPoolStore";

const rolloutSummaryImport = v.object({
  poolVersion: v.string(),
  seedId: v.string(),
  ...rolloutSummary.fields,
});

export const importSeedPoolBegin = internalMutation({
  args: {
    poolVersion: v.string(),
    rolloutCount: v.number(),
    matchTimeLimitSec: v.number(),
    generatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await deactivateAllPools(ctx.db);
    const existing = await getPoolMetaByVersion(ctx.db, args.poolVersion);
    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        importStatus: "importing",
        entryCount: 0,
        tierCounts: undefined,
        importedAt: Date.now(),
        rolloutCount: args.rolloutCount,
        matchTimeLimitSec: args.matchTimeLimitSec,
        generatedAt: args.generatedAt,
      });
      return { ok: true as const, poolVersion: args.poolVersion, replaced: true };
    }
    await ctx.db.insert("tower_seed_pool_meta", {
      poolVersion: args.poolVersion,
      rolloutCount: args.rolloutCount,
      matchTimeLimitSec: args.matchTimeLimitSec,
      generatedAt: args.generatedAt,
      entryCount: 0,
      isActive: false,
      importStatus: "importing",
      importedAt: Date.now(),
    });
    return { ok: true as const, poolVersion: args.poolVersion, replaced: false };
  },
});

type EntryImport = Infer<typeof seedPoolEntryImport> & { poolVersion: string };
type RolloutImport = Infer<typeof rolloutSummaryImport>;

async function writeBatch(
  ctx: MutationCtx,
  poolVersion: string,
  entries: EntryImport[],
  rollouts: RolloutImport[]
) {
  const meta = await getPoolMetaByVersion(ctx.db, poolVersion);
  if (!meta) throw new Error(`pool meta not found: ${poolVersion}`);

  for (const e of entries) {
    const existing = await ctx.db
      .query("tower_seed_pool_entries")
      .withIndex("by_poolVersion_and_seedId", (q) =>
        q.eq("poolVersion", poolVersion).eq("seedId", e.seedId)
      )
      .unique();
    const doc = {
      poolVersion,
      seedId: e.seedId,
      tier: e.tier,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("tower_seed_pool_entries", doc);
  }

  for (const r of rollouts) {
    const existing = await ctx.db
      .query("tower_seed_pool_rollout_summaries")
      .withIndex("by_poolVersion_and_seedId_and_rolloutIndex", (q) =>
        q.eq("poolVersion", poolVersion).eq("seedId", r.seedId).eq("rolloutIndex", r.rolloutIndex)
      )
      .unique();
    const doc = {
      poolVersion: r.poolVersion,
      seedId: r.seedId,
      rolloutIndex: r.rolloutIndex,
      finalScore: r.finalScore,
      moves: r.moves,
      completed: r.completed,
      terminalReason: r.terminalReason,
      elapsedSimSeconds: r.elapsedSimSeconds,
      opCount: r.opCount,
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("tower_seed_pool_rollout_summaries", doc);
  }

  const entryCount = await countEntriesForPool(ctx.db, poolVersion);
  await ctx.db.patch(meta._id, { entryCount });
  return { entriesWritten: entries.length, rolloutsWritten: rollouts.length };
}

export const importSeedPoolBatch = internalMutation({
  args: {
    poolVersion: v.string(),
    entries: v.array(
      v.object({
        poolVersion: v.string(),
        seedId: v.string(),
        tier: towerSeedTier,
        difficultyScore: v.number(),
        metrics: rolloutDistributionMetrics,
      })
    ),
    rollouts: v.array(rolloutSummaryImport),
  },
  handler: async (ctx, args) => {
    const result = await writeBatch(ctx, args.poolVersion, args.entries, args.rollouts);
    return { ok: true as const, ...result };
  },
});

export const importSeedPoolFinalize = internalMutation({
  args: { poolVersion: v.string() },
  handler: async (ctx, { poolVersion }) => {
    const meta = await getPoolMetaByVersion(ctx.db, poolVersion);
    if (!meta) return { ok: false as const, error: "no_meta" as const };
    const tierCounts = await computeTierCounts(ctx.db, poolVersion);
    await deactivateAllPools(ctx.db);
    await ctx.db.patch(meta._id, {
      isActive: true,
      importStatus: "ready",
      tierCounts,
      entryCount: await countEntriesForPool(ctx.db, poolVersion),
      importedAt: Date.now(),
    });
    return { ok: true as const, tierCounts };
  },
});
