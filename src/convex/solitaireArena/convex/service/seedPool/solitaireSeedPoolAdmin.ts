import { v, type Infer } from "convex/values";

import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  rolloutSummaryImport,
  seedPoolEntryImport,
} from "./solitaireSeedPoolValidators";
import {
  computeTierCounts,
  countEntriesForPool,
  deactivateAllPools,
  deleteEntriesBatch,
  deleteRolloutsBatch,
  getPoolMetaByVersion,
} from "./solitaireSeedPoolStore";

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

    await ctx.db.insert("solitaire_seed_pool_meta", {
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

type EntryImport = Infer<typeof seedPoolEntryImport>;
type RolloutImport = Infer<typeof rolloutSummaryImport>;

async function writeSeedPoolBatch(
  ctx: MutationCtx,
  poolVersion: string,
  entries: EntryImport[],
  rollouts: RolloutImport[],
  indexOnly: boolean | undefined,
  createMetaIfMissing = false
) {
  let meta = await getPoolMetaByVersion(ctx.db, poolVersion);
  if (!meta && createMetaIfMissing) {
    const metaId = await ctx.db.insert("solitaire_seed_pool_meta", {
      poolVersion,
      rolloutCount: 40,
      matchTimeLimitSec: 300,
      generatedAt: new Date().toISOString(),
      entryCount: 0,
      isActive: true,
      importStatus: "ready",
      importedAt: Date.now(),
    });
    meta = (await ctx.db.get(metaId))!;
  }
  if (!meta) {
    throw new Error(`pool meta not found: ${poolVersion}`);
  }

  for (const e of entries) {
    if (e.poolVersion !== poolVersion) {
      throw new Error(`entry poolVersion mismatch: ${e.seedId}`);
    }
    const existing = await ctx.db
      .query("solitaire_seed_pool_entries")
      .withIndex("by_poolVersion_and_seedId", (q) =>
        q.eq("poolVersion", poolVersion).eq("seedId", e.seedId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: e.tier,
        difficultyScore: e.difficultyScore,
        metrics: e.metrics,
      });
    } else {
      await ctx.db.insert("solitaire_seed_pool_entries", {
        poolVersion: e.poolVersion,
        seedId: e.seedId,
        tier: e.tier,
        difficultyScore: e.difficultyScore,
        metrics: e.metrics,
      });
    }
  }

  if (indexOnly !== true && rollouts.length > 0) {
    for (const r of rollouts) {
      if (r.poolVersion !== poolVersion) {
        throw new Error(`rollout poolVersion mismatch: ${r.seedId}:${r.rolloutIndex}`);
      }
      const existing = await ctx.db
        .query("solitaire_seed_pool_rollout_summaries")
        .withIndex("by_poolVersion_and_seedId_and_rolloutIndex", (q) =>
          q
            .eq("poolVersion", poolVersion)
            .eq("seedId", r.seedId)
            .eq("rolloutIndex", r.rolloutIndex)
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
      if (existing) {
        await ctx.db.patch(existing._id, doc);
      } else {
        await ctx.db.insert("solitaire_seed_pool_rollout_summaries", doc);
      }
    }
  }

  const entryCount = await countEntriesForPool(ctx.db, poolVersion);
  await ctx.db.patch(meta._id, { entryCount });

  return {
    ok: true as const,
    entriesWritten: entries.length,
    rolloutsWritten: indexOnly === true ? 0 : rollouts.length,
    entryCount,
  };
}

export const importSeedPoolBatch = internalMutation({
  args: {
    poolVersion: v.string(),
    entries: v.array(seedPoolEntryImport),
    rollouts: v.array(rolloutSummaryImport),
    indexOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { poolVersion, entries, rollouts, indexOnly }) => {
    const meta = await getPoolMetaByVersion(ctx.db, poolVersion);
    if (!meta || meta.importStatus !== "importing") {
      throw new Error(`pool ${poolVersion} is not in importing state`);
    }
    return await writeSeedPoolBatch(ctx, poolVersion, entries, rollouts, indexOnly);
  },
});

/** Incremental import: upsert without begin/finalize; pool stays active. */
export const importSeedPoolAppendBatch = internalMutation({
  args: {
    poolVersion: v.string(),
    entries: v.array(seedPoolEntryImport),
    rollouts: v.array(rolloutSummaryImport),
    indexOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { poolVersion, entries, rollouts, indexOnly }) => {
    return await writeSeedPoolBatch(
      ctx,
      poolVersion,
      entries,
      rollouts,
      indexOnly,
      true
    );
  },
});

export const refreshSeedPoolMeta = internalMutation({
  args: {
    poolVersion: v.string(),
    generatedAt: v.optional(v.string()),
    rolloutCount: v.optional(v.number()),
    matchTimeLimitSec: v.optional(v.number()),
  },
  handler: async (ctx, { poolVersion, generatedAt, rolloutCount, matchTimeLimitSec }) => {
    const meta = await getPoolMetaByVersion(ctx.db, poolVersion);
    if (!meta) {
      throw new Error(`pool meta not found: ${poolVersion}`);
    }
    const entryCount = await countEntriesForPool(ctx.db, poolVersion);
    const tierCounts = await computeTierCounts(ctx.db, poolVersion);
    await ctx.db.patch(meta._id, {
      entryCount,
      tierCounts,
      isActive: true,
      importStatus: "ready",
      importedAt: Date.now(),
      ...(generatedAt != null ? { generatedAt } : {}),
      ...(rolloutCount != null ? { rolloutCount } : {}),
      ...(matchTimeLimitSec != null ? { matchTimeLimitSec } : {}),
    });
    return { ok: true as const, poolVersion, entryCount, tierCounts };
  },
});

export const importSeedPoolFinalize = internalMutation({
  args: {
    poolVersion: v.string(),
    minEntries: v.optional(v.number()),
  },
  handler: async (ctx, { poolVersion, minEntries }) => {
    const meta = await getPoolMetaByVersion(ctx.db, poolVersion);
    if (!meta) {
      throw new Error(`pool meta not found: ${poolVersion}`);
    }

    const entryCount = await countEntriesForPool(ctx.db, poolVersion);
    const required = minEntries ?? 1;
    if (entryCount < required) {
      throw new Error(
        `pool ${poolVersion} has ${entryCount} entries, need at least ${required}`
      );
    }

    const tierCounts = await computeTierCounts(ctx.db, poolVersion);
    await deactivateAllPools(ctx.db);
    await ctx.db.patch(meta._id, {
      entryCount,
      tierCounts,
      isActive: true,
      importStatus: "ready",
      importedAt: Date.now(),
    });

    return { ok: true as const, poolVersion, entryCount, tierCounts };
  },
});

export const deleteSeedPoolRolloutsBatch = internalMutation({
  args: {
    poolVersion: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { poolVersion, batchSize }) => {
    const size = batchSize ?? 200;
    const result = await deleteRolloutsBatch(ctx.db, poolVersion, size);
    return { ok: true as const, poolVersion, ...result };
  },
});

export const deleteSeedPoolEntriesBatch = internalMutation({
  args: {
    poolVersion: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { poolVersion, batchSize }) => {
    const size = batchSize ?? 100;
    const result = await deleteEntriesBatch(ctx.db, poolVersion, size);
    return { ok: true as const, poolVersion, ...result };
  },
});

/** Replace rollout summary rows for one seed (e.g. after lazySimulate). */
export const upsertRolloutsForSeed = internalMutation({
  args: {
    poolVersion: v.string(),
    seedId: v.string(),
    rollouts: v.array(rolloutSummaryImport),
  },
  handler: async (ctx, { poolVersion, seedId, rollouts }) => {
    const existing = await ctx.db
      .query("solitaire_seed_pool_rollout_summaries")
      .withIndex("by_poolVersion_and_seedId", (q) =>
        q.eq("poolVersion", poolVersion).eq("seedId", seedId)
      )
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const r of rollouts) {
      if (r.seedId !== seedId || r.poolVersion !== poolVersion) {
        throw new Error("rollout seedId/poolVersion mismatch");
      }
      await ctx.db.insert("solitaire_seed_pool_rollout_summaries", {
        poolVersion: r.poolVersion,
        seedId: r.seedId,
        rolloutIndex: r.rolloutIndex,
        finalScore: r.finalScore,
        moves: r.moves,
        completed: r.completed,
        terminalReason: r.terminalReason,
        elapsedSimSeconds: r.elapsedSimSeconds,
        opCount: r.opCount,
      });
    }
    return { ok: true as const, written: rollouts.length };
  },
});

export const clearSeedPoolVersion = internalMutation({
  args: {
    poolVersion: v.string(),
    rolloutBatchSize: v.optional(v.number()),
    entryBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, { poolVersion, rolloutBatchSize, entryBatchSize }) => {
    let rolloutDeleted = 0;
    let rolloutDone = false;
    while (!rolloutDone) {
      const r = await deleteRolloutsBatch(ctx.db, poolVersion, rolloutBatchSize ?? 200);
      rolloutDeleted += r.deleted;
      rolloutDone = r.done;
      if (r.deleted === 0) break;
    }

    let entryDeleted = 0;
    let entryDone = false;
    while (!entryDone) {
      const e = await deleteEntriesBatch(ctx.db, poolVersion, entryBatchSize ?? 100);
      entryDeleted += e.deleted;
      entryDone = e.done;
      if (e.deleted === 0) break;
    }

    const meta = await getPoolMetaByVersion(ctx.db, poolVersion);
    if (meta) {
      await ctx.db.delete(meta._id);
    }

    return {
      ok: true as const,
      poolVersion,
      rolloutDeleted,
      entryDeleted,
    };
  },
});
