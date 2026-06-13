import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { entryDocToSeedPoolEntry, getEntryBySeedId, resolvePoolVersion } from "./towerSeedPoolStore";

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
