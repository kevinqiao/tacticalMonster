/**
 * 异步 run 桌：过期 promote + 全桌可终局时 finalize（cron / confirm 共用）。
 * 全员 confirmed 后按 bot 最晚 revealAt+duration 调度清算。
 */
import { v } from "convex/values";

import { internalMutation } from "../../../_generated/server";
import { tryFinalizeCasualAsyncMatch } from "../submit/casualRunIngestCore";

export {
  tryFinalizeCasualAsyncMatch,
  type TryFinalizeCasualAsyncMatchResult,
} from "../submit/casualRunIngestCore";

/** scheduler：bot 完赛到点后执行清算（skipBotDueWait 避免重复调度） */
export const runScheduledCasualAsyncMatchFinalize = internalMutation({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    return await tryFinalizeCasualAsyncMatch(ctx, matchId, Date.now(), {
      skipPromote: true,
      skipBotDueWait: true,
    });
  },
});
