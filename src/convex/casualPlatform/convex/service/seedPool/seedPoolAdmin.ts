import { v, type Infer } from "convex/values";

import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  catalogGameType,
  rolloutSummaryImport,
  seedPoolEntryImport,
} from "./seedPoolValidators";
import {
  computeTierCounts,
  countEntriesForPool,
  deactivateAllPoolsForGame,
  deleteEntriesBatch,
  deleteRolloutsBatch,
  getPoolMetaByVersion,
  type CatalogGameType,
} from "./seedPoolStore";

export const importSeedPoolBegin = internalMutation({
  args: {
    gameType: catalogGameType,
    poolVersion: v.string(),
    rolloutCount: v.number(),
    matchTimeLimitSec: v.number(),
    generatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await deactivateAllPoolsForGame(ctx.db, args.gameType);

    const existing = await getPoolMetaByVersion(ctx.db, args.gameType, args.poolVersion);
    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        importStatus: "importing",
        entryCount: 0,
        importedAt: Date.now(),
        rolloutCount: args.rolloutCount,
        matchTimeLimitSec: args.matchTimeLimitSec,
        generatedAt: args.generatedAt,
      });
      return { ok: true as const, gameType: args.gameType, poolVersion: args.poolVersion, replaced: true };
    }

    await ctx.db.insert("seed_pool_meta", {
      gameType: args.gameType,
      poolVersion: args.poolVersion,
      rolloutCount: args.rolloutCount,
      matchTimeLimitSec: args.matchTimeLimitSec,
      generatedAt: args.generatedAt,
      entryCount: 0,
      isActive: false,
      importStatus: "importing",
      importedAt: Date.now(),
    });
    return { ok: true as const, gameType: args.gameType, poolVersion: args.poolVersion, replaced: false };
  },
});

type EntryImport = Infer<typeof seedPoolEntryImport>;
type RolloutImport = Infer<typeof rolloutSummaryImport>;

async function writeSeedPoolBatch(
  ctx: MutationCtx,
  gameType: CatalogGameType,
  poolVersion: string,
  entries: EntryImport[],
  rollouts: RolloutImport[],
  indexOnly: boolean | undefined,
  createMetaIfMissing = false
) {
  let meta = await getPoolMetaByVersion(ctx.db, gameType, poolVersion);
  if (!meta && createMetaIfMissing) {
    const metaId = await ctx.db.insert("seed_pool_meta", {
      gameType,
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
    throw new Error(`pool meta not found: ${gameType}/${poolVersion}`);
  }

  for (const e of entries) {
    if (e.poolVersion !== poolVersion) {
      throw new Error(`entry poolVersion mismatch: ${e.seedId}`);
    }
    const existing = await ctx.db
      .query("seed_pool_entries")
      .withIndex("by_gameType_poolVersion_seedId", (q) =>
        q.eq("gameType", gameType).eq("poolVersion", poolVersion).eq("seedId", e.seedId)
      )
      .unique();
    const doc = {
      gameType,
      poolVersion: e.poolVersion,
      seedId: e.seedId,
      tier: e.tier,
      difficultyScore: e.difficultyScore,
      metrics: e.metrics,
      ...(e.solvable != null
        ? {
            solvable: e.solvable,
            solvableSource: e.solvableSource,
            solvableReason: e.solvableReason ?? null,
          }
        : {}),
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("seed_pool_entries", doc);
    }
  }

  if (indexOnly !== true && rollouts.length > 0) {
    for (const r of rollouts) {
      if (r.poolVersion !== poolVersion) {
        throw new Error(`rollout poolVersion mismatch: ${r.seedId}:${r.rolloutIndex}`);
      }
      const existing = await ctx.db
        .query("seed_pool_rollout_summaries")
        .withIndex("by_gameType_poolVersion_seedId_rolloutIndex", (q) =>
          q
            .eq("gameType", gameType)
            .eq("poolVersion", poolVersion)
            .eq("seedId", r.seedId)
            .eq("rolloutIndex", r.rolloutIndex)
        )
        .unique();
      const doc = {
        gameType,
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
        await ctx.db.insert("seed_pool_rollout_summaries", doc);
      }
    }
  }

  const entryCount = await countEntriesForPool(ctx.db, gameType, poolVersion);
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
    gameType: catalogGameType,
    poolVersion: v.string(),
    entries: v.array(seedPoolEntryImport),
    rollouts: v.array(rolloutSummaryImport),
    indexOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { gameType, poolVersion, entries, rollouts, indexOnly }) => {
    const meta = await getPoolMetaByVersion(ctx.db, gameType, poolVersion);
    if (!meta || meta.importStatus !== "importing") {
      throw new Error(`pool ${gameType}/${poolVersion} is not in importing state`);
    }
    return await writeSeedPoolBatch(ctx, gameType, poolVersion, entries, rollouts, indexOnly);
  },
});

export const importSeedPoolAppendBatch = internalMutation({
  args: {
    gameType: catalogGameType,
    poolVersion: v.string(),
    entries: v.array(seedPoolEntryImport),
    rollouts: v.array(rolloutSummaryImport),
    indexOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { gameType, poolVersion, entries, rollouts, indexOnly }) => {
    return await writeSeedPoolBatch(
      ctx,
      gameType,
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
    gameType: catalogGameType,
    poolVersion: v.string(),
    generatedAt: v.optional(v.string()),
    rolloutCount: v.optional(v.number()),
    matchTimeLimitSec: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, poolVersion, generatedAt, rolloutCount, matchTimeLimitSec }) => {
    const meta = await getPoolMetaByVersion(ctx.db, gameType, poolVersion);
    if (!meta) {
      throw new Error(`pool meta not found: ${gameType}/${poolVersion}`);
    }
    const entryCount = await countEntriesForPool(ctx.db, gameType, poolVersion);
    const tierCounts = await computeTierCounts(ctx.db, gameType, poolVersion);
    await ctx.db.patch(meta._id, {
      entryCount,
      isActive: true,
      importStatus: "ready",
      importedAt: Date.now(),
      ...(generatedAt != null ? { generatedAt } : {}),
      ...(rolloutCount != null ? { rolloutCount } : {}),
      ...(matchTimeLimitSec != null ? { matchTimeLimitSec } : {}),
    });
    return { ok: true as const, gameType, poolVersion, entryCount, tierCounts };
  },
});

export const importSeedPoolFinalize = internalMutation({
  args: {
    gameType: catalogGameType,
    poolVersion: v.string(),
    minEntries: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, poolVersion, minEntries }) => {
    const meta = await getPoolMetaByVersion(ctx.db, gameType, poolVersion);
    if (!meta) {
      throw new Error(`pool meta not found: ${gameType}/${poolVersion}`);
    }

    const entryCount = await countEntriesForPool(ctx.db, gameType, poolVersion);
    const required = minEntries ?? 1;
    if (entryCount < required) {
      throw new Error(
        `pool ${gameType}/${poolVersion} has ${entryCount} entries, need at least ${required}`
      );
    }

    const tierCounts = await computeTierCounts(ctx.db, gameType, poolVersion);
    await deactivateAllPoolsForGame(ctx.db, gameType);
    await ctx.db.patch(meta._id, {
      entryCount,
      isActive: true,
      importStatus: "ready",
      importedAt: Date.now(),
    });

    return { ok: true as const, gameType, poolVersion, entryCount, tierCounts };
  },
});

export const clearSeedPoolVersion = internalMutation({
  args: {
    gameType: catalogGameType,
    poolVersion: v.string(),
    rolloutBatchSize: v.optional(v.number()),
    entryBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, poolVersion, rolloutBatchSize, entryBatchSize }) => {
    const rollouts = await deleteRolloutsBatch(
      ctx.db,
      gameType,
      poolVersion,
      rolloutBatchSize ?? 100
    );
    if (rollouts.deleted > 0) {
      return {
        ok: true as const,
        gameType,
        poolVersion,
        phase: "rollouts" as const,
        deleted: rollouts.deleted,
        complete: false,
      };
    }

    const entries = await deleteEntriesBatch(
      ctx.db,
      gameType,
      poolVersion,
      entryBatchSize ?? 100
    );
    if (entries.deleted > 0) {
      return {
        ok: true as const,
        gameType,
        poolVersion,
        phase: "entries" as const,
        deleted: entries.deleted,
        complete: false,
      };
    }

    const meta = await getPoolMetaByVersion(ctx.db, gameType, poolVersion);
    if (meta) {
      await ctx.db.delete(meta._id);
    }

    return {
      ok: true as const,
      gameType,
      poolVersion,
      phase: "complete" as const,
      deleted: 0,
      complete: true,
    };
  },
});
