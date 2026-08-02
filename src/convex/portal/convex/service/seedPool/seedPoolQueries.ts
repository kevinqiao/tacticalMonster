import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { catalogGameType, seedPoolSolvableStatus } from "./seedPoolValidators";
import { getActivePoolMeta, resolvePoolVersion } from "./seedPoolStore";

export const listSeedIdsInPool = internalQuery({
  args: {
    gameType: catalogGameType,
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, { gameType, poolVersion }) => {
    const version = await resolvePoolVersion(ctx.db, gameType, poolVersion);
    if (!version) {
      return { gameType, poolVersion: null as string | null, seedIds: [] as string[] };
    }
    const rows = await ctx.db
      .query("seed_pool_entries")
      .withIndex("by_gameType_and_poolVersion", (q) =>
        q.eq("gameType", gameType).eq("poolVersion", version)
      )
      .collect();
    return {
      gameType,
      poolVersion: version,
      seedIds: rows.map((r) => r.seedId),
    };
  },
});

/** List seedIds filtered by layout solvability status. */
export const listSeedIdsBySolvable = internalQuery({
  args: {
    gameType: catalogGameType,
    poolVersion: v.optional(v.string()),
    solvable: seedPoolSolvableStatus,
  },
  handler: async (ctx, { gameType, poolVersion, solvable }) => {
    const version = await resolvePoolVersion(ctx.db, gameType, poolVersion);
    if (!version) {
      return {
        gameType,
        poolVersion: null as string | null,
        solvable,
        seedIds: [] as string[],
      };
    }
    const rows = await ctx.db
      .query("seed_pool_entries")
      .withIndex("by_gameType_poolVersion_solvable", (q) =>
        q.eq("gameType", gameType).eq("poolVersion", version).eq("solvable", solvable)
      )
      .collect();
    return {
      gameType,
      poolVersion: version,
      solvable,
      seedIds: rows.map((r) => r.seedId),
    };
  },
});

export const getActivePoolMetaQuery = internalQuery({
  args: {
    gameType: catalogGameType,
  },
  handler: async (ctx, { gameType }) => {
    const meta = await getActivePoolMeta(ctx.db, gameType);
    return meta ?? null;
  },
});

/** All poolVersions for a game (from seed_pool_meta). Used by ops clear. */
export const listPoolVersionsForGame = internalQuery({
  args: {
    gameType: catalogGameType,
  },
  handler: async (ctx, { gameType }) => {
    const rows = await ctx.db
      .query("seed_pool_meta")
      .withIndex("by_gameType_and_isActive", (q) => q.eq("gameType", gameType))
      .collect();
    const versions = [
      ...new Set(
        rows
          .map((r) => r.poolVersion)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      ),
    ].sort();
    return {
      gameType,
      poolVersions: versions,
      pools: rows.map((r) => ({
        poolVersion: r.poolVersion,
        entryCount: r.entryCount,
        isActive: r.isActive,
        importStatus: r.importStatus ?? null,
      })),
    };
  },
});
