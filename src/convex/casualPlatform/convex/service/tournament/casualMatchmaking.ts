/**
 * Async casual tournament matchmaking: queue, claiming, batch open tables.
 * Extend this module for richer MM (regions, skill buckets, bots-as-fill, etc.).
 */
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { getTournamentDefinition, isPeriodScopedTournament } from "../../data/casualTournamentConfigs";
import type { MutationCtx } from "../../_generated/server";
import { internalMutation } from "../../_generated/server";
import { getOrCreateOpenInstance } from "./casualInstanceService";
import {
  applyCasualJoinEntryChargeWithInstance,
  computeJoinEntryWillCharge,
  insertCasualRunDocumentsForHumans,
  refundCasualJoinEntryCharge,
  requiresDailySoloPlayCostAck,
} from "./casualTournamentJoinCore";
import type { JoinCasualRunResult } from "./casualTournamentTypes";

export async function findOpenCasualAssignmentForUidTemplate(
  ctx: MutationCtx,
  uid: string,
  templateId: string
): Promise<{ gameId: string; matchId: string; runTournamentId: string } | null> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid_template", (q) => q.eq("uid", uid).eq("templateId", templateId))
    .collect();
  const open = rows
    .filter((r) => r.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!open) return null;
  return {
    gameId: open.gameId,
    matchId: open.matchId,
    runTournamentId: open.tournamentId,
  };
}

/**
 * 同一 `templateId` 下多真人并发 join 时：
 * - 先把 FIFO 队列行 `waiting → claiming`，利用 Convex 文档级 OCC，保证同一行不会被两个 mutation 同时扣费；
 * - 只对 `claiming` 行扣费；凑不齐 `matchmakingMinHumans` 则退款（若已扣）并把行恢复 `waiting`，或删行（余额不足）。
 */
export async function tryCasualMatchmakingForTemplateCore(
  ctx: MutationCtx,
  templateId: string
): Promise<void> {
  const def = getTournamentDefinition(templateId);
  if (!def) return;

  const minH = Math.max(1, def.matchmakingMinHumans);
  const maxP = Math.max(1, def.maxPlayers);
  /** 单次 mutation 内连续开桌上限：正常会在队列不足时 `return`，此项防止异常路径下的死循环 */
  const maxRounds = 64;

  for (let round = 0; round < maxRounds; round++) {
    const waiting = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_template_status", (q) => q.eq("templateId", templateId).eq("status", "waiting"))
      .collect();
    waiting.sort((a, b) => a.createdAt - b.createdAt);
    if (waiting.length < minH) return;

    const batchSize = Math.min(waiting.length, maxP);
    const now = Date.now();

    const claimedRows: (typeof waiting)[0][] = [];
    for (const row of waiting) {
      if (claimedRows.length >= batchSize) break;
      const fresh = await ctx.db.get(row._id);
      if (!fresh || fresh.status !== "waiting") continue;
      await ctx.db.patch(fresh._id, {
        status: "claiming",
        updatedAt: now,
      });
      claimedRows.push(fresh);
    }

    const releaseClaimingToWaiting = async (rows: typeof claimedRows) => {
      const t = Date.now();
      for (const r of rows) {
        const cur = await ctx.db.get(r._id);
        if (cur?.status === "claiming") {
          await ctx.db.patch(r._id, { status: "waiting", updatedAt: t });
        }
      }
    };

    if (claimedRows.length < minH) {
      await releaseClaimingToWaiting(claimedRows);
      return;
    }

    const instanceId = await getOrCreateOpenInstance(ctx, {
      templateId,
      def,
      now: Date.now(),
    });
    if (instanceId === null && isPeriodScopedTournament(def)) {
      await releaseClaimingToWaiting(claimedRows);
      return;
    }

    type ChargedMeta = {
      vouchersCharged?: number;
      coinsCharged?: number;
      gemsCharged?: number;
      activityIds?: string[];
    };
    const charged: Array<{ row: (typeof waiting)[0]; meta: ChargedMeta }> = [];

    for (const row of claimedRows) {
      const ch = await applyCasualJoinEntryChargeWithInstance(ctx, row.uid, templateId, def, instanceId);
      if (!ch.ok) {
        await ctx.db.delete(row._id);
        continue;
      }
      charged.push({
        row,
        meta: {
          vouchersCharged: ch.vouchersCharged,
          coinsCharged: ch.coinsCharged,
          gemsCharged: ch.gemsCharged,
          activityIds: ch.activityIds,
        },
      });
    }

    if (charged.length < minH) {
      for (const c of charged) {
        await refundCasualJoinEntryCharge(ctx, c.row.uid, c.meta);
        const cur = await ctx.db.get(c.row._id);
        if (cur?.status === "claiming") {
          await ctx.db.patch(c.row._id, { status: "waiting", updatedAt: Date.now() });
        }
      }
      await releaseClaimingToWaiting(
        claimedRows.filter((r) => !charged.some((c) => c.row._id === r._id))
      );
      return;
    }

    const uids = charged.map((c) => c.row.uid);
    const meta0 = charged[0]!.meta;
    const inserted = await insertCasualRunDocumentsForHumans(ctx, {
      uids,
      templateId,
      def,
      ...(instanceId ? { instanceId } : {}),
      vouchersCharged: meta0.vouchersCharged,
      coinsCharged: meta0.coinsCharged,
      gemsCharged: meta0.gemsCharged,
      activityIds: meta0.activityIds,
    });

    const runId = inserted.runTournamentId as Id<"casual_run_tournaments">;
    const doneAt = Date.now();
    for (const c of charged) {
      await ctx.db.patch(c.row._id, {
        status: "matched",
        matchedRunTournamentId: runId,
        updatedAt: doneAt,
      });
    }
    /* 下一轮：若仍有足够 `waiting`，继续在本 txn 内再开一桌；否则会在循环头 `return` */
  }
}

/** Play 异步场：先入 `casual_match_queue`，再由 `tryCasualMatchmakingForTemplateCore` 凑满人后扣费建局。 */
export const enqueueCasualMatchmakingAndTryMatch = internalMutation({
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

    const existingOpen = await findOpenCasualAssignmentForUidTemplate(ctx, uid, tournamentId);
    if (existingOpen) {
      return {
        ok: true as const,
        runTournamentId: existingOpen.runTournamentId,
        matchId: existingOpen.matchId,
        gameId: existingOpen.gameId,
        templateId: tournamentId,
      };
    }

    const now = Date.now();
    const preview = await computeJoinEntryWillCharge(ctx, uid, tournamentId, now);
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }
    if (requiresDailySoloPlayCostAck(tournamentId, preview.willChargeEntry) && dailySoloCostAck !== true) {
      return { ok: false as const, error: "needs_cost_ack" };
    }

    const dupWaiting = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid_template_status", (q) =>
        q.eq("uid", uid).eq("templateId", tournamentId).eq("status", "waiting")
      )
      .first();

    if (!dupWaiting) {
      const now = Date.now();
      await ctx.db.insert("casual_match_queue", {
        uid,
        templateId: tournamentId,
        status: "waiting",
        createdAt: now,
        updatedAt: now,
      });
    }

    await tryCasualMatchmakingForTemplateCore(ctx, tournamentId);

    const assigned = await findOpenCasualAssignmentForUidTemplate(ctx, uid, tournamentId);
    if (assigned) {
      return {
        ok: true as const,
        runTournamentId: assigned.runTournamentId,
        matchId: assigned.matchId,
        gameId: assigned.gameId,
        templateId: tournamentId,
      };
    }

    return { ok: true as const, queued: true as const, templateId: tournamentId };
  },
});
