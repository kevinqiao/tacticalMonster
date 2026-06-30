"use node";

import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { authedAction } from "../../../custom/session";
import { forceEndCasualRunOnArena } from "./casualArenaForceEnd";

/** 大厅兜底：对已超时 open run 在 arena 侧 forceEnd（不经浏览器跨 deployment 调用）。 */
export const reconcileExpiredOpenCasualRuns = authedAction({
  args: {
    gameType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, limit }) => {
    const uid = ctx.uid;
    const rows = await ctx.runQuery(
      internal.service.tournament.settle.casualOpenRunReconcileQueries.listExpiredOpenRunsForReconcile,
      { uid, gameType, limit }
    );

    let settled = 0;
    let failed = 0;
    for (const row of rows) {
      const res = await forceEndCasualRunOnArena({
        uid: row.uid,
        gameId: row.gameId,
        gameType: row.gameType,
      });
      if (res.ok) settled += 1;
      else {
        failed += 1;
        console.warn("[portal] reconcileExpiredOpenCasualRuns forceEnd failed", row.gameId, res.error);
      }
    }

    return { ok: true as const, settled, failed, scanned: rows.length };
  },
});
