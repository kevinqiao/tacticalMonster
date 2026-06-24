/**
 * ?? run ?:?? promote + ?????? finalize(cron / confirm ??)?
 * ?? confirmed ?? bot ?? revealAt+duration ?????
 */
import { v } from "convex/values";

import { internalMutation } from "../../../_generated/server";
import { tryFinalizeCasualAsyncMatch } from "../submit/casualRunIngestCore";

export {
  tryFinalizeCasualAsyncMatch,
  type TryFinalizeCasualAsyncMatchResult,
} from "../submit/casualRunIngestCore";

/** scheduler:bot ?????????(skipBotDueWait ??????) */
export const runScheduledCasualAsyncMatchFinalize = internalMutation({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    return await tryFinalizeCasualAsyncMatch(ctx, matchId, Date.now(), {
      skipPromote: true,
      skipBotDueWait: true,
    });
  },
});
