/**
 * 开桌 mutation 拆分：M1 claim → M2 shell → (action pick) → M3 finalize / abort
 */
import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import {
  effectiveEntryBilling,
  getPortalTournamentDefinition,
  isDeprecatedDailySoloTournament,
  isPeriodScopedTournament,
  seatGameTypeForTemplate,
  type PortalTournamentDefinition,
} from "../../../data/portalTournamentConfigs";
import { internalMutation } from "../../../_generated/server";
import { getOrCreateOpenInstance } from "../list/portalInstanceService";
import {
  deletePlayerSessionsForMatch,
  insertPlayerSessionForUid,
  type SeedBindingByGameIndex,
} from "../shared/casualSessionOpenCore";
import {
  findOpenPlayerGameForSeat,
  listPlayerGamesForSeat,
} from "../shared/casualPlayerGameTypes";
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
import { assertCampaignDailyPlayLimit } from "./campaignDailyPlayLimit";
import { assertPortalDailyPlayLimit } from "./portalDailyPlayLimit";
import { refundAbandonedQueuePlayEntry } from "../../ads/portalPlayEntryQueueRefund";
import {
  computeMultiTableBatchSize,
  purgeExtraCasualMatchQueueRows,
  releaseClaimingToWaiting,
  resolveQueueEffectiveHumans,
  type QueueRow,
} from "./casualMatchmakingCore";
import { resolveEconomyScope } from "../../economy/resolveEconomyScope";
import {
  entrySnapshotFromDef,
  loadLobbyRewardsOverride,
} from "../../lobby/lobbyOfferingRewards";

export type JoinChargeMeta = {
  vouchersCharged?: number;
  coinsCharged?: number;
  gemsCharged?: number;
  scopeKey?: string;
  lobbyId?: Id<"portal_lobbies">;
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
    scopeKey: v.optional(v.string()),
    lobbyId: v.optional(v.id("portal_lobbies")),
  })
);

/** M1：claim 队列 + 扣费（不 insert match） */
export const claimQueueAndCharge = internalMutation({
  args: {
    templateId: v.string(),
    queueRowIds: v.array(v.id("portal_match_queue")),
  },
  handler: async (ctx, { templateId, queueRowIds }) => {
    const def = getPortalTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const rows: Doc<"portal_match_queue">[] = [];
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
    const chargedRows: Doc<"portal_match_queue">[] = [];
    let batchActivityIds: string[] | undefined;

    for (const row of rows) {
      let ch: Awaited<ReturnType<typeof applyCasualJoinEntryChargeWithInstance>>;
      let chargeScopeKey = "shared";
      try {
        const partnerId = row.partnerId ?? 0;
        let scopeKey = "shared";
        let lobbyIdForCharge = row.lobbyId ?? null;
        try {
          const scope = await resolveEconomyScope(ctx, {
            partnerId,
            lobbyId: row.lobbyId ?? null,
          });
          scopeKey = scope.scopeKey;
          lobbyIdForCharge = scope.lobbyId;
        } catch {
          // isolated without lobbyId: fall back to shared charge (legacy rows)
          scopeKey = "shared";
          lobbyIdForCharge = null;
        }
        chargeScopeKey = scopeKey;
        ch = await applyCasualJoinEntryChargeWithInstance(
          ctx,
          row.uid,
          templateId,
          def,
          instanceId,
          {
            skipEntryCharge: row.skipEntryCharge === true,
            scopeKey,
            lobbyId: lobbyIdForCharge,
          }
        );
      } catch (err) {
        console.error("[casual] claimQueueAndCharge entry charge threw", {
          templateId,
          uid: row.uid,
          err,
        });
        ch = { ok: false as const, error: "charge_failed" };
      }
      if (!ch.ok) {
        console.warn("[casual] claimQueueAndCharge entry charge failed", {
          templateId,
          uid: row.uid,
          error: ch.error,
        });
        await refundAbandonedQueuePlayEntry(ctx, row);
        const cur = await ctx.db.get(row._id);
        if (cur) await ctx.db.delete(cur._id);
        continue;
      }
      if (!batchActivityIds && ch.activityIds?.length) {
        batchActivityIds = ch.activityIds;
      }
      joinChargeByUid[row.uid] = {
        vouchersCharged: ch.vouchersCharged,
        coinsCharged: ch.coinsCharged,
        gemsCharged: ch.gemsCharged,
        scopeKey: chargeScopeKey,
        ...(row.lobbyId ? { lobbyId: row.lobbyId } : {}),
      };
      chargedRows.push(row);
    }

    const storedRequired = resolveQueueEffectiveHumans(rows[0]!);
    /** 超时 solo 开桌 / 单人行 batch：只要求本批人数，不能仍用排队时的 effectiveHumans=2 */
    const requiredHumans = Math.min(storedRequired, rows.length);
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
      ...(rows[0]?.lobbyId ? { lobbyId: rows[0].lobbyId } : {}),
      ...(rows[0]?.campaignId ? { campaignId: rows[0].campaignId } : {}),
      ...(rows[0]?.partnerId != null ? { partnerId: rows[0].partnerId } : {}),
      ...(rows[0]?.campaignRewardMode
        ? { campaignRewardMode: rows[0].campaignRewardMode }
        : {}),
      ...(rows[0]?.campaignDueTime != null
        ? { campaignDueTime: rows[0].campaignDueTime }
        : {}),
      ...(rows[0]?.campaignReplaySettings
        ? { campaignReplaySettings: rows[0].campaignReplaySettings }
        : {}),
      ...(rows[0]?.maxPlaysPerDay != null ? { maxPlaysPerDay: rows[0].maxPlaysPerDay } : {}),
      ...(rows[0]?.dayTimezone ? { dayTimezone: rows[0].dayTimezone } : {}),
    };
  },
});

/** 单人模板 join 扣费（p75 等；无 queue） */
export const chargeSoloJoin = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { uid, templateId }) => {
    const def = getPortalTournamentDefinition(templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }
    if (isDeprecatedDailySoloTournament(templateId)) {
      return { ok: false as const, error: "tournament_closed" as const };
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
    lobbyId: v.optional(v.id("portal_lobbies")),
    instanceId: v.optional(v.id("portal_tournament_instances")),
    campaignId: v.optional(v.string()),
    partnerId: v.optional(v.number()),
    campaignRewardMode: v.optional(
      v.union(v.literal("pass_per_run"), v.literal("competitive_leaderboard"))
    ),
    campaignDueTime: v.optional(v.number()),
    campaignReplaySettings: v.optional(
      v.object({
        maxReplaysPerMatch: v.optional(v.number()),
        adReplayEnabled: v.optional(v.boolean()),
        adReplayDailyCap: v.optional(v.number()),
        ticketReplayEnabled: v.optional(v.boolean()),
        ticketReplayPriceTickets: v.optional(v.number()),
        coinReplayEnabled: v.optional(v.boolean()),
        coinReplayPriceCoins: v.optional(v.number()),
        coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
      })
    ),
    maxPlaysPerDay: v.optional(v.number()),
    dayTimezone: v.optional(v.string()),
    /** When present, copy per-player joinLobbyId / rewards snapshots from queue. */
    queueRowIds: v.optional(v.array(v.id("portal_match_queue"))),
    /** Solo (no queue): ad/ticket lane after grant consume. */
    playEntryLane: v.optional(v.union(v.literal("ad"), v.literal("ticket"))),
    /** Async multi create: profile eff (>1); join capacity is maxPlayers. */
    effectiveHumans: v.optional(v.number()),
    matchPartitionKey: v.optional(v.string()),
    /** Async multi: allow later humans to join until full or first submit. */
    joinOpen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const def = getPortalTournamentDefinition(args.templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const uids = [...new Set(args.uids.map((u) => u.trim()).filter(Boolean))];
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const queueByUid = new Map<string, Doc<"portal_match_queue">>();
    if (args.queueRowIds?.length) {
      for (const qid of args.queueRowIds) {
        const qrow = await ctx.db.get(qid);
        if (qrow) queueByUid.set(qrow.uid, qrow);
      }
    }

    if (args.campaignId && args.maxPlaysPerDay != null && args.maxPlaysPerDay >= 1) {
      for (const uid of uids) {
        const daily = await assertCampaignDailyPlayLimit(ctx, {
          uid,
          campaignId: args.campaignId,
          maxPlaysPerDay: args.maxPlaysPerDay,
          ...(args.dayTimezone ? { dayTimezone: args.dayTimezone } : {}),
        });
        if (!daily.ok) {
          return { ok: false as const, error: daily.error };
        }
      }
    } else if (!args.campaignId) {
      for (const uid of uids) {
        const queueRow = queueByUid.get(uid);
        const joinLobby = queueRow?.lobbyId ?? args.lobbyId;
        const entryLane =
          queueRow?.playEntryLane === "ad" || queueRow?.playEntryLane === "ticket"
            ? queueRow.playEntryLane
            : args.playEntryLane === "ad" || args.playEntryLane === "ticket"
              ? args.playEntryLane
              : undefined;
        const daily = await assertPortalDailyPlayLimit(ctx, {
          uid,
          templateId: args.templateId,
          ...(joinLobby ? { lobbyId: joinLobby } : {}),
          ...(args.dayTimezone ? { dayTimezone: args.dayTimezone } : {}),
          ...(entryLane ? { entryLane } : {}),
        });
        if (!daily.ok) {
          return { ok: false as const, error: daily.error };
        }
      }
    }

    const now = Date.now();
    const runTournamentId = await ctx.db.insert("portal_run_tournaments", {
      templateId: args.templateId,
      gameType: def.gameType,
      status: RUN_TOURNAMENT_OPEN,
      createdAt: now,
      updatedAt: now,
      ...(args.lobbyId ? { lobbyId: args.lobbyId } : {}),
      ...(args.instanceId ? { instanceId: args.instanceId } : {}),
      ...(args.campaignId ? { campaignId: args.campaignId } : {}),
      ...(args.partnerId != null ? { partnerId: args.partnerId } : {}),
      ...(args.campaignRewardMode ? { campaignRewardMode: args.campaignRewardMode } : {}),
      ...(args.campaignDueTime != null ? { campaignDueTime: args.campaignDueTime } : {}),
      ...(args.campaignReplaySettings
        ? { campaignReplaySettings: args.campaignReplaySettings }
        : {}),
    });

    const entrySnap = entrySnapshotFromDef(def);
    for (const uid of uids) {
      const qrow = queueByUid.get(uid);
      const joinLobbyId = qrow?.lobbyId ?? args.lobbyId;
      const rewardsOverrideSnapshot =
        qrow?.rewardsOverrideSnapshot ??
        (joinLobbyId
          ? await loadLobbyRewardsOverride(ctx, joinLobbyId, args.templateId)
          : undefined);
      await ctx.db.insert("portal_run_player_tournaments", {
        uid,
        tournamentId: runTournamentId,
        templateId: args.templateId,
        score: 0,
        status: RUN_PLAYER_TOURNAMENT_OPEN,
        createdAt: now,
        updatedAt: now,
        ...(joinLobbyId ? { joinLobbyId } : {}),
        ...(rewardsOverrideSnapshot ? { rewardsOverrideSnapshot } : {}),
        entrySnapshot: qrow?.entrySnapshot ?? entrySnap,
      });
    }

    const matchConvexId = await ctx.db.insert("portal_run_matches", {
      tournamentId: runTournamentId,
      templateId: args.templateId,
      gameType: seatGameTypeForTemplate(def),
      completed: false,
      minPlayers: uids.length,
      maxPlayers: def.maxPlayers,
      humanPlayerCount: uids.length,
      joinChargeByUid: joinChargeForStorage(args.joinChargeByUid),
      openPhase: "pending_seed",
      createdAt: now,
      updatedAt: now,
      ...(args.effectiveHumans != null ? { effectiveHumans: args.effectiveHumans } : {}),
      ...(args.matchPartitionKey ? { matchPartitionKey: args.matchPartitionKey } : {}),
      ...(args.joinOpen === true ? { joinOpen: true } : {}),
    });

    console.log("[casual] insertMatchShell", {
      templateId: args.templateId,
      matchId: String(matchConvexId),
      runTournamentId: String(runTournamentId),
      uids,
    });

    return {
      ok: true as const,
      matchId: String(matchConvexId),
      runTournamentId: String(runTournamentId),
    };
  },
});

/** M3：写入 player_matches + player_games */
export const finalizeOpenTable = internalMutation({
  args: {
    matchId: v.string(),
    seedBindingsByIndex: v.record(v.string(), casualMatchSeedBindingValidator),
    queueRowIds: v.optional(v.array(v.id("portal_match_queue"))),
  },
  handler: async (ctx, { matchId, seedBindingsByIndex, queueRowIds }) => {
    const matchDoc = await ctx.db.get(matchId as Id<"portal_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    const existingPm = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .first();

    const ptRows = await ctx.db
      .query("portal_run_player_tournaments")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", matchDoc.tournamentId))
      .collect();
    const uids = ptRows.map((r) => r.uid).filter(Boolean);
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const now = Date.now();

    const markQueueMatched = async () => {
      if (!queueRowIds?.length) return;
      const runId = matchDoc.tournamentId;
      for (const qid of queueRowIds) {
        const row = await ctx.db.get(qid);
        if (row?.status === "claiming" || row?.status === "waiting") {
          // Settle ladder payment with the opened run — do not refund on purge.
          await ctx.db.patch(qid, {
            status: "matched",
            matchedRunTournamentId: runId,
            playEntryLane: undefined,
            ticketEntryPriceTickets: undefined,
            updatedAt: now,
          });
        }
      }
    };

    if (existingPm) {
      const byUid: Record<string, { gameId: string; gameType: string; gameIndex: number }> = {};
      const seatRows = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
        .collect();
      for (const pm of seatRows) {
        const openPg =
          (await findOpenPlayerGameForSeat(ctx, pm._id)) ??
          (await listPlayerGamesForSeat(ctx, pm._id)).find((g) => g.gameIndex === 0);
        if (!openPg) continue;
        byUid[pm.uid] = {
          gameId: openPg.gameId,
          gameType: openPg.gameType,
          gameIndex: openPg.gameIndex,
        };
      }
      await markQueueMatched();
      for (const uid of Object.keys(byUid)) {
        await purgeExtraCasualMatchQueueRows(ctx, {
          uid,
          templateId: matchDoc.templateId,
          now,
        });
      }
      return { ok: true as const, alreadyFinalized: true as const, byUid };
    }

    const def = getPortalTournamentDefinition(matchDoc.templateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" as const };
    }

    const primarySeed = seedBindingsByIndex["0"];
    await ctx.db.patch(matchDoc._id, {
      seedResolveError: undefined,
      openPhase: "ready",
      updatedAt: now,
      ...(primarySeed ? { seedBinding: primarySeed } : {}),
    });

    const byUid: Record<string, { gameId: string; gameType: string; gameIndex: number }> = {};
    for (const uid of uids) {
      const opened = await insertPlayerSessionForUid(ctx, {
        matchId,
        runTournamentId: String(matchDoc.tournamentId),
        templateId: matchDoc.templateId,
        def,
        uid,
        seedBindingsByIndex: seedBindingsByIndex as SeedBindingByGameIndex,
        now,
      });
      byUid[uid] = {
        gameId: opened.openGameId,
        gameType: opened.openGameType,
        gameIndex: 0,
      };
      await ctx.runMutation(internal.service.task.casualTaskService.notifyTournamentJoined, { uid });
    }

    if (queueRowIds?.length) {
      await markQueueMatched();
    }

    for (const uid of uids) {
      await purgeExtraCasualMatchQueueRows(ctx, {
        uid,
        templateId: matchDoc.templateId,
        now,
      });
    }

    return { ok: true as const, byUid };
  },
});

/** M_abort：开桌失败回滚 */
export const abortOpenTable = internalMutation({
  args: {
    matchId: v.optional(v.string()),
    queueRowIds: v.array(v.id("portal_match_queue")),
    joinChargeByUid: joinChargeByUidValidator,
    instanceId: v.optional(v.id("portal_tournament_instances")),
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const def = getPortalTournamentDefinition(args.templateId);
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
          .query("portal_instance_player_state")
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

    const matchDoc = await ctx.db.get(args.matchId as Id<"portal_run_matches">);
    if (!matchDoc) {
      return { ok: true as const };
    }

    const existingSeats = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId!))
      .first();
    if (existingSeats) {
      console.warn("[casual] abortOpenTable skipped destructive rollback — player seats exist", {
        matchId: args.matchId,
        templateId: args.templateId,
      });
      return { ok: true as const, skippedDestructiveRollback: true as const };
    }

    await deletePlayerSessionsForMatch(ctx, args.matchId!);

    const playerTournaments = await ctx.db
      .query("portal_run_player_tournaments")
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

function queuePartitionKey(row: Doc<"portal_match_queue">, templateId: string): string {
  if (row.matchPartitionKey) return row.matchPartitionKey;
  const partnerId = row.partnerId ?? 0;
  return `p:${partnerId}|t:${templateId}`;
}

/** 选出并 claim 下一个多人 batch（供 processQueue action 调用） */
export const claimNextMultiBatch = internalMutation({
  args: { templateId: v.string() },
  handler: async (ctx, { templateId }) => {
    const def = getPortalTournamentDefinition(templateId);
    if (!def || def.maxPlayers <= 1) {
      return { ok: false as const, error: "not_multi" as const };
    }

    const waiting = await ctx.db
      .query("portal_match_queue")
      .withIndex("by_template_status", (q) => q.eq("templateId", templateId).eq("status", "waiting"))
      .collect();
    waiting.sort((a, b) => a.createdAt - b.createdAt);

    /** Never cross partners: group by matchPartitionKey (lobby-shared within partner). */
    const byPartition = new Map<string, Doc<"portal_match_queue">[]>();
    for (const r of waiting) {
      const key = queuePartitionKey(r, templateId);
      const list = byPartition.get(key) ?? [];
      list.push(r);
      byPartition.set(key, list);
    }

    for (const partitionRows of byPartition.values()) {
      const multi = partitionRows.filter((r) => resolveQueueEffectiveHumans(r) >= 2);
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

      /** eff=1：Bot 补位开桌（与 openSingleHumanAsyncTableFromQueue 双保险） */
      const soloFill = partitionRows.filter((r) => resolveQueueEffectiveHumans(r) === 1);
      if (soloFill.length > 0) {
        soloFill.sort((a, b) => a.createdAt - b.createdAt);
        return await ctx.runMutation(
          internal.service.tournament.join.casualOpenTableMutations.claimQueueAndCharge,
          { templateId, queueRowIds: [soloFill[0]!._id] }
        );
      }
    }

    return { ok: false as const, error: "no_batch" as const };
  },
});
