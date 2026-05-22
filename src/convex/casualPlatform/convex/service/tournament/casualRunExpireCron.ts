import { internalMutation } from "../../_generated/server";
import { tryFinalizeCasualAsyncMatch } from "./casualRunMatchFinalize";

/** 每分钟扫描未完成的异步桌：过期 `finished` → `confirmed`，满足条件则终局结算。 */
export const finalizeExpiredCasualAsyncRuns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const matches = await ctx.db.query("casual_run_matches").collect();
    let scanned = 0;
    let promotedOnly = 0;
    let finalized = 0;
    for (const m of matches) {
      if (m.completed || m.maxPlayers <= 1) continue;
      scanned += 1;
      const r = await tryFinalizeCasualAsyncMatch(ctx, String(m._id), now);
      if (r.finalized) finalized += 1;
      else if (r.promotedOnly) promotedOnly += 1;
    }
    return { ok: true as const, scanned, promotedOnly, finalized };
  },
});
