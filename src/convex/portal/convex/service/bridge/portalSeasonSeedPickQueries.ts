import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { loadSeasonSeedPickSignals } from "./portalSeasonSeedPickSignals";

export const loadSignals = internalQuery({
  args: {
    uid: v.string(),
    gameType: v.string(),
  },
  handler: async (ctx, args) => {
    return await loadSeasonSeedPickSignals(ctx, args);
  },
});
