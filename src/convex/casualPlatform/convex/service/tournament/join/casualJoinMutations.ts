import { v } from "convex/values";
import {
  getTournamentDefinition,
  isPeriodScopedTournament,
} from "../../../data/casualTournamentConfigs";
import { internalMutation, query } from "../../../_generated/server";
import { getOrCreateOpenInstance } from "../list/casualInstanceService";
import {
  applyCasualJoinEntryChargeWithInstance,
  assertJoinEntryEligible,
  insertCasualRunDocumentsForHumans,
  requiresDailySoloPlayCostAck,
} from "./casualTournamentJoinCore";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";
import { isCasualDevAutoReplayTokensEnabled } from "../../../data/casualPlayerStrategyTypes";
import { grantReplayTokens } from "../replay/casualReplayTokens";
/**
 * 每场新 run：扣费 + `casual_run_*` 四表 + TM 对齐 `game_${matchId}_${uid}`。
 *
 * 不在此函数创建 solitaireArena / blockBlast 的牌局文档：casual 与游戏 Convex 分离部署。
 * 前端拿到 `gameId` 后打开对局时调 solitaireArena / blockBlast 的 `proxy.controller.loadGame`（内部 HTTP 调本服务 `find-match-by-game` 取 seed 并建局）。
 */
export const joinCasualRunCore = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    dailySoloCostAck: v.optional(v.literal(true)),
  },
  handler: async (ctx, { uid, tournamentId, dailySoloCostAck }): Promise<JoinCasualRunResult> => {
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }

    const now = Date.now();
    const preview = await assertJoinEntryEligible(ctx, uid, tournamentId, now);
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }
    if (requiresDailySoloPlayCostAck(tournamentId, preview.willChargeEntry) && dailySoloCostAck !== true) {
      return { ok: false as const, error: "needs_cost_ack" };
    }

    const instanceId = await getOrCreateOpenInstance(ctx, { templateId: tournamentId, def, now });
    if (isPeriodScopedTournament(def) && !instanceId) {
      return { ok: false as const, error: "period_unavailable" };
    }

    const ch = await applyCasualJoinEntryChargeWithInstance(ctx, uid, tournamentId, def, instanceId);
    if (!ch.ok) {
      return { ok: false as const, error: ch.error };
    }

    const inserted = await insertCasualRunDocumentsForHumans(ctx, {
      uids: [uid],
      templateId: tournamentId,
      def,
      ...(instanceId ? { instanceId } : {}),
      vouchersCharged: ch.vouchersCharged,
      coinsCharged: ch.coinsCharged,
      gemsCharged: ch.gemsCharged,
      activityIds: ch.activityIds,
    });

    const row = inserted.byUid[uid];
    if (!row) {
      return { ok: false as const, error: "join_failed" };
    }

    if (isCasualDevAutoReplayTokensEnabled() && def.maxPlayers > 1) {
      const existing = await ctx.db
        .query("casual_replay_tokens")
        .withIndex("by_uid", (q) => q.eq("uid", uid))
        .collect();
      const unused = existing.filter((t) => t.usedAt == null).length;
      if (unused < 3) {
        await grantReplayTokens(ctx, uid, 3 - unused);
      }
    }

    return {
      ok: true as const,
      queued: false as const,
      runTournamentId: inserted.runTournamentId,
      matchId: inserted.matchId,
      gameId: row.gameId,
      templateId: tournamentId,
      vouchersCharged: inserted.vouchersCharged,
      coinsCharged: inserted.coinsCharged,
      gemsCharged: inserted.gemsCharged,
      activityIds: inserted.activityIds,
    };
  },
});

/** æœ¬æ¬¡ join æ˜¯å¦ä¼šæ‰£å…¥åœºè´¹ï¼ˆåªè¯»ï¼Œä¸Ž join è·¯å¾„ä¸€è‡´ï¼‰ */
export const previewJoinEntryCharge = query({
  args: { uid: v.string(), tournamentId: v.string() },
  handler: async (ctx, { uid, tournamentId }) => {
    return await assertJoinEntryEligible(ctx, uid, tournamentId, Date.now());
  },
});
