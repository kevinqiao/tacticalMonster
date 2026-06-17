import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { catalogGameType } from "./seedPoolValidators";
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

export const getActivePoolMetaQuery = internalQuery({
  args: {
    gameType: catalogGameType,
  },
  handler: async (ctx, { gameType }) => {
    const meta = await getActivePoolMeta(ctx.db, gameType);
    return meta ?? null;
  },
});
