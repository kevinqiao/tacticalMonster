/**
 * 开桌 mutation 拆分：M1 claim → M2 shell → (action pick) → M3 finalize / abort
 */
import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import {
  effectiveEntryBilling,
  getTournamentDefinition,
  isPeriodScopedTournament,
  type CasualTournamentDefinition,
} from "../../../data/casualTournamentConfigs";
import { internalMutation } from "../../../_generated/server";
import { getOrCreateOpenInstance } from "../list/casualInstanceService";
import {
  applyCasualJoinEntryChargeWithInstance,
  refundCasualJoinEntryCharge,
  RUN_PLAYER_TOURNAMENT_OPEN,
  RUN_TOURNAMENT_OPEN,
} from "./casualTournamentJoinCore";
import {
  casualMatchSeedBindingValidator,
  readCasualMatchSeedBinding,
  type CasualMatchSeedBinding,
} from "./casualMatchSeedBinding";
import { assertNoGlobalOpenCasualMatch } from "./casualOpenTableGuard";
import {
  computeMultiTableBatchSize,
  releaseClaimingToWaiting,
  resolveQueueEffectiveHumans,
  type QueueRow,
} from "./casualMatchmakingCore";

export type JoinChargeMeta = {
  vouchersCharged?: number;
  coinsCharged?: number;
  gemsCharged?: number;
};

export function joinChargeForStorage(
  byUid: Record<string, JoinChargeMeta>
): Record<string, JoinChargeMeta> {
  return Object.fromEntries(
    Object.entries(byUid).map(([uid, m]) => [
      uid,
      {
        vouchersCharged: m.vouchersCharged,
        coinsCharged: m.coinsCharged,
        gemsCharged: m.gemsCharged,
      },
    ])
  );
}

const joinChargeByUidValidator = v.record(
  v.string(),
  v.object({
    vouchersCharged: v.optional(v.number()),
    coinsCharged: v.optional(v.number()),
    gemsCharged: v.optional(v.number()),
  })
);

/** M1：claim 队列 + 扣费（不 insert match） */
export const claimQueueAndCharge = internalMutation({
  args: {
    templateId: v.string(),
    queueRowIds: v.array(v.id("casual_match_queue")),
  },
  handler: async (ctx, { templateId, queueRowIds }) => {
    const def = getTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const rows: Doc<"casual_match_queue">[] = [];
    for (const id of queueRowIds) {
      const row = await ctx.db.get(id);
      if (!row || row.templateId !== templateId || row.status !== "waiting") {
        return { ok: false as const, error: "invalid_queue_row" as const };
      }
      rows.push(row);
    }
    if (rows.length === 0) {
      return { ok: false as const, error: "empty_batch" as const };
    }

    const uids = rows.map((r) => r.uid).filter(Boolean);
    const openGuard = await assertNoGlobalOpenCasualMatch(ctx, uids);
    if (!openGuard.ok) {
      return { ok: false as const, error: openGuard.error, uid: openGuard.uid };
    }

    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch(row._id, { status: "claiming", updatedAt: now });
    }

    const instanceId = await getOrCreateOpenInstance(ctx, { templateId, def, now });
    if (instanceId === null && isPeriodScopedTournament(def)) {
      await releaseClaimingToWaiting(ctx, rows);
      return { ok: false as const, error: "period_unavailable" as const };
    }

    const joinChargeByUid: Record<string, JoinChargeMeta> = {};
    const chargedRows: Doc<"casual_match_queue">[] = [];
    let batchActivityIds: string[] | undefined;

    for (const row of rows) {
      const ch = await applyCasualJoinEntryChargeWithInstance(
        ctx,
        row.uid,
        templateId,
        def,
        instanceId,
        { skipEntryCharge: row.skipEntryCharge === true }
      );
      if (!ch.ok) {
        await ctx.db.delete(row._id);
        continue;
      }
      if (!batchActivityIds && ch.activityIds?.length) {
        batchActivityIds = ch.activityIds;
      }
      joinChargeByUid[row.uid] = {
        vouchersCharged: ch.vouchersCharged,
        coinsCharged: ch.coinsCharged,
        gemsCharged: ch.gemsCharged,
      };
      chargedRows.push(row);
    }

    const requiredHumans = resolveQueueEffectiveHumans(rows[0]!);
    if (chargedRows.length < requiredHumans) {
      for (const row of chargedRows) {
        const meta = joinChargeByUid[row.uid];
        if (meta) await refundCasualJoinEntryCharge(ctx, row.uid, meta);
        const cur = await ctx.db.get(row._id);
        if (cur?.status === "claiming") {
          await ctx.db.patch(row._id, { status: "waiting", updatedAt: now });
        }
      }
      await releaseClaimingToWaiting(
        ctx,
        rows.filter((r) => !chargedRows.some((c) => c._id === r._id))
      );
      return { ok: false as const, error: "charge_failed" as const };
    }

    return {
      ok: true as const,
      uids: chargedRows.map((r) => r.uid),
      queueRowIds: chargedRows.map((r) => r._id),
      joinChargeByUid,
      instanceId: instanceId ?? undefined,
      activityIds: batchActivityIds,
    };
  },
});

/** M1'：日榜 solo 扣费（无 queue） */
export const chargeSoloDailyJoin = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { uid, templateId }) => {
    const def = getTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const openGuard = await assertNoGlobalOpenCasualMatch(ctx, [uid]);
    if (!openGuard.ok) {
      return { ok: false as const, error: openGuard.error, uid: openGuard.uid };
    }

    const now = Date.now();
    const instanceId = await getOrCreateOpenInstance(ctx, { templateId, def, now });
    if (instanceId === null && isPeriodScopedTournament(def)) {
      return { ok: false as const, error: "period_unavailable" as const };
    }

    const ch = await applyCasualJoinEntryChargeWithInstance(ctx, uid, templateId, def, instanceId);
    if (!ch.ok) {
      return { ok: false as const, error: ch.error };
    }

    return {
      ok: true as const,
      uids: [uid],
      joinChargeByUid: {
        [uid]: {
          vouchersCharged: ch.vouchersCharged,
          coinsCharged: ch.coinsCharged,
          gemsCharged: ch.gemsCharged,
        },
      },
      instanceId: instanceId ?? undefined,
      activityIds: ch.activityIds,
    };
  },
});

/** M2：insert shell（无 player_matches、无 seedBinding） */
export const insertMatchShell = internalMutation({
  args: {
    templateId: v.string(),
    uids: v.array(v.string()),
    joinChargeByUid: joinChargeByUidValidator,
    instanceId: v.optional(v.id("casual_tournament_instances")),
  },
  handler: async (ctx, args) => {
    const def = getTournamentDefinition(args.templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const uids = [...new Set(args.uids.map((u) => u.trim()).filter(Boolean))];
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const now = Date.now();
    const runTournamentId = await ctx.db.insert("casual_run_tournaments", {
      templateId: args.templateId,
      gameType: def.gameType,
      status: RUN_TOURNAMENT_OPEN,
      createdAt: now,
      updatedAt: now,
      ...(args.instanceId ? { instanceId: args.instanceId } : {}),
    });

    for (const uid of uids) {
      await ctx.db.insert("casual_run_player_tournaments", {
        uid,
        tournamentId: runTournamentId,
        templateId: args.templateId,
        score: 0,
        status: RUN_PLAYER_TOURNAMENT_OPEN,
        createdAt: now,
        updatedAt: now,
      });
    }

    const matchConvexId = await ctx.db.insert("casual_run_matches", {
      tournamentId: runTournamentId,
      templateId: args.templateId,
      gameType: def.gameType,
      completed: false,
      minPlayers: uids.length,
      maxPlayers: def.maxPlayers,
      humanPlayerCount: uids.length,
      joinChargeByUid: joinChargeForStorage(args.joinChargeByUid),
      openPhase: "pending_seed",
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
      matchId: String(matchConvexId),
      runTournamentId: String(runTournamentId),
    };
  },
});

/** M3：写入 seedBinding + player_matches */
export const finalizeOpenTable = internalMutation({
  args: {
    matchId: v.string(),
    seedBinding: casualMatchSeedBindingValidator,
    queueRowIds: v.optional(v.array(v.id("casual_match_queue"))),
  },
  handler: async (ctx, { matchId, seedBinding, queueRowIds }) => {
    const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    if (readCasualMatchSeedBinding(matchDoc)) {
      const existing = await ctx.db
        .query("casual_run_player_matches")
        .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
        .first();
      if (existing) {
        return { ok: true as const, alreadyFinalized: true as const };
      }
    }

    const def = getTournamentDefinition(matchDoc.templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const ptRows = await ctx.db
      .query("casual_run_player_tournaments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", matchDoc.tournamentId))
      .collect();
    const uids = ptRows.map((r) => r.uid).filter(Boolean);
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const now = Date.now();
    await ctx.db.patch(matchDoc._id, {
      seedBinding,
      seedResolveError: undefined,
      openPhase: "ready",
      updatedAt: now,
    });

    const byUid: Record<string, { gameId: string }> = {};
    for (const uid of uids) {
      const gameId = `game_${matchId}_${uid}`;
      await ctx.db.insert("casual_run_player_matches", {
        matchId,
        tournamentId: String(matchDoc.tournamentId),
        templateId: matchDoc.templateId,
        uid,
        gameId,
        gameType: def.gameType,
        status: "open",
        createdAt: now,
        updatedAt: now,
      });
      byUid[uid] = { gameId };
      await ctx.runMutation(internal.service.task.casualTaskService.notifyTournamentJoined, { uid });
    }

    if (queueRowIds?.length) {
      const runId = matchDoc.tournamentId;
      for (const qid of queueRowIds) {
        const row = await ctx.db.get(qid);
        if (row?.status === "claiming") {
          await ctx.db.patch(qid, {
            status: "matched",
            matchedRunTournamentId: runId,
            updatedAt: now,
          });
        }
      }
    }

    return { ok: true as const, byUid };
  },
});

/** M_abort：开桌失败回滚 */
export const abortOpenTable = internalMutation({
  args: {
    matchId: v.optional(v.string()),
    queueRowIds: v.array(v.id("casual_match_queue")),
    joinChargeByUid: joinChargeByUidValidator,
    instanceId: v.optional(v.id("casual_tournament_instances")),
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const def = getTournamentDefinition(args.templateId);
    const now = Date.now();

    for (const [uid, meta] of Object.entries(args.joinChargeByUid)) {
      const hadCharge =
        (meta.vouchersCharged ?? 0) > 0 ||
        (meta.coinsCharged ?? 0) > 0 ||
        (meta.gemsCharged ?? 0) > 0;
      if (hadCharge) {
        await refundCasualJoinEntryCharge(ctx, uid, meta);
      }
      if (
        def &&
        args.instanceId &&
        isPeriodScopedTournament(def) &&
        effectiveEntryBilling(def) === "per_instance" &&
        hadCharge
      ) {
        const st = await ctx.db
          .query("casual_instance_player_state")
          .withIndex("by_instance_uid", (q) => q.eq("instanceId", args.instanceId!).eq("uid", uid))
          .first();
        if (st?.entryFeeCharged) {
          await ctx.db.patch(st._id, { entryFeeCharged: false, updatedAt: now });
        }
      }
    }

    for (const qid of args.queueRowIds) {
      const row = await ctx.db.get(qid);
      if (row?.status === "claiming") {
        await ctx.db.patch(qid, { status: "waiting", updatedAt: now });
      }
    }

    if (!args.matchId) {
      return { ok: true as const };
    }

    const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: true as const };
    }

    const playerMatches = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId!))
      .collect();
    for (const pm of playerMatches) {
      await ctx.db.delete(pm._id);
    }

    const playerTournaments = await ctx.db
      .query("casual_run_player_tournaments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", matchDoc.tournamentId))
      .collect();
    for (const pt of playerTournaments) {
      await ctx.db.delete(pt._id);
    }

    await ctx.db.delete(matchDoc._id);
    await ctx.db.delete(matchDoc.tournamentId);

    return { ok: true as const };
  },
});

/** 选出并 claim 下一个多人 batch（供 processQueue action 调用） */
export const claimNextMultiBatch = internalMutation({
  args: { templateId: v.string() },
  handler: async (ctx, { templateId }) => {
    const def = getTournamentDefinition(templateId);
    if (!def || def.maxPlayers <= 1) {
      return { ok: false as const, error: "not_multi" as const };
    }

    const waiting = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_template_status", (q) => q.eq("templateId", templateId).eq("status", "waiting"))
      .collect();
    waiting.sort((a, b) => a.createdAt - b.createdAt);

    const multi = waiting.filter((r) => resolveQueueEffectiveHumans(r) >= 2);
    const byEffective = new Map<number, QueueRow[]>();
    for (const r of multi) {
      const eff = resolveQueueEffectiveHumans(r);
      const list = byEffective.get(eff) ?? [];
      list.push(r);
      byEffective.set(eff, list);
    }

    for (const [need, rows] of byEffective) {
      if (rows.length < need) continue;
      rows.sort((a, b) => a.createdAt - b.createdAt);
      const batchSize = computeMultiTableBatchSize({
        waitingLength: rows.length,
        effectiveHumans: need,
        maxPlayers: def.maxPlayers,
      });
      if (batchSize < need) continue;
      const batchIds = rows.slice(0, batchSize).map((r) => r._id);
      return await ctx.runMutation(
        internal.service.tournament.join.casualOpenTableMutations.claimQueueAndCharge,
        { templateId, queueRowIds: batchIds }
      );
    }

    return { ok: false as const, error: "no_batch" as const };
  },
});
