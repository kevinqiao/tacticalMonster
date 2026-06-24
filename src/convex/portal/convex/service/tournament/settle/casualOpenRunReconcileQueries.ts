import { v } from "convex/values";

import { internalQuery } from "../../../_generated/server";
import { isRegisteredPortalGameType } from "../../../data/portalGameRegistry";
import { getPoolMetaByVersion } from "../../../service/seedPool/seedPoolStore";

export type ExpiredOpenRunRow = {
  gameId: string;
  uid: string;
  gameType: string;
  dueAt: number;
};

/** 列出 uid 下已超时且仍为 open 的 run（供服务端 reconcile action 使用）。 */
export const listExpiredOpenRunsForReconcile = internalQuery({
  args: {
    uid: v.string(),
    gameType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { uid, gameType, limit }) => {
    const n = Math.min(Math.max(limit ?? 8, 1), 20);
    const now = Date.now();
    const openGames = await ctx.db
      .query("portal_run_player_games")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    const rows: ExpiredOpenRunRow[] = [];
    for (const pg of openGames) {
      if (rows.length >= n) break;
      if (pg.status !== "open" && pg.status !== "replaying") continue;
      if (gameType && pg.gameType !== gameType) continue;
      if (!isRegisteredPortalGameType(pg.gameType)) continue;

      const pm = await ctx.db.get(pg.playerMatchId);
      if (!pm || (pm.status !== "open" && pm.status !== "replaying")) continue;

      const poolMeta = await getPoolMetaByVersion(ctx.db, pg.gameType, pg.seedBinding.poolVersion);
      const matchTimeLimitSec = poolMeta?.matchTimeLimitSec ?? 300;
      const dueAt = pg.createdAt + matchTimeLimitSec * 1000;
      if (now < dueAt) continue;

      rows.push({
        gameId: pg.gameId,
        uid: pg.uid,
        gameType: pg.gameType,
        dueAt,
      });
    }
    return rows;
  },
});
