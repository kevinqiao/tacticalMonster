import { internalMutation } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { backfillAllMissingPortalRunMatchShells } from "./portalRunMatchShell";
import { isCasualAsyncVirtualOpponentUid } from "../settle/casualRunSettlementFill";

/** Dev/admin: rebuild missing `portal_run_matches` rows from seat data. */
export const backfillMissingPortalRunMatchShells = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await backfillAllMissingPortalRunMatchShells(ctx);
  },
});

/** Close open human seats whose match shell row was deleted (unrecoverable ids). */
export const closeOpenRunsWithMissingMatchShell = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let closed = 0;
    const seats = await ctx.db.query("portal_run_player_matches").collect();
    for (const pm of seats) {
      if (pm.status !== "open" && pm.status !== "replaying") continue;
      if (isCasualAsyncVirtualOpponentUid(pm.uid)) continue;
      const matchDoc = await ctx.db.get(pm.matchId as Id<"portal_run_matches">);
      if (matchDoc) continue;
      await ctx.db.patch(pm._id, { status: "settled", updatedAt: now, finishedAt: now });
      closed += 1;
    }
    return { ok: true as const, closed };
  },
});
