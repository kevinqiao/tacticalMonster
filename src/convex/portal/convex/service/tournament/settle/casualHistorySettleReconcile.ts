import { v } from "convex/values";

import type { Id } from "../../../_generated/dataModel";
import { authedMutation } from "../../../custom/session";
import { getPortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import { RUN_PLAYER_TOURNAMENT_COMPLETED } from "../join/casualTournamentJoinCore";
import { playerGameId } from "../shared/casualPlayerGameTypes";
import { isHumanSubmittedStatus } from "../shared/casualPlayerMatchStatus";
import {
  runConfirmCasualRunWithoutReplay,
  tryFinalizeCasualAsyncMatch,
} from "../submit/casualRunIngestCore";

/** 历史页兜底：对已交分但未完成 run 的异步桌尝试 finalize；单人延迟结算走 confirm */
export const reconcilePendingCasualHistorySettlements = authedMutation({
  args: {
    gameType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { gameType, limit }) => {
    const uid = ctx.uid;
    const n = Math.min(Math.max(limit ?? 15, 1), 40);
    const now = Date.now();

    const pts = await ctx.db
      .query("portal_run_player_tournaments")
      .withIndex("by_uid_template", (q) => q.eq("uid", uid))
      .collect();
    pts.sort((a, b) => b.updatedAt - a.updatedAt);

    let scanned = 0;
    let finalized = 0;
    let scheduled = 0;
    let promotedOnly = 0;
    let soloConfirmed = 0;

    for (const pt of pts) {
      if (scanned >= n) break;
      if (pt.status === RUN_PLAYER_TOURNAMENT_COMPLETED) continue;

      const def = getPortalTournamentDefinition(pt.templateId);
      if (!def) continue;
      if (gameType && def.gameType !== gameType) continue;

      const runIdStr = String(pt.tournamentId);
      const pm = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_run_tournament", (q) => q.eq("tournamentId", runIdStr))
        .filter((q) => q.eq(q.field("uid"), uid))
        .first();
      if (
        !pm ||
        !isHumanSubmittedStatus(pm.status) ||
        pm.score == null ||
        !Number.isFinite(pm.score)
      ) {
        continue;
      }

      const matchDoc = await ctx.db.get(pm.matchId as Id<"portal_run_matches">);
      if (!matchDoc || matchDoc.completed) continue;

      scanned += 1;

      if (def.maxPlayers <= 1) {
        const matchGameId = playerGameId(pm.matchId, uid, 0);
        const conf = await runConfirmCasualRunWithoutReplay(ctx, {
          uid,
          matchGameId,
        });
        if (conf.ok && "finalized" in conf && conf.finalized) {
          soloConfirmed += 1;
          finalized += 1;
        }
        continue;
      }

      const r = await tryFinalizeCasualAsyncMatch(ctx, pm.matchId, now);
      if (r.finalized) finalized += 1;
      else if (r.scheduled) scheduled += 1;
      else if (r.promotedOnly) promotedOnly += 1;
    }

    return {
      ok: true as const,
      scanned,
      finalized,
      scheduled,
      promotedOnly,
      soloConfirmed,
    };
  },
});
