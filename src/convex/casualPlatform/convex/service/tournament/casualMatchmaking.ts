/**
 * Async casual tournament matchmaking: queue, effectiveHumans rules, async process.
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  CASUAL_DEFAULT_EFFECTIVE_HUMANS,
  CASUAL_DEFAULT_QUEUE_EXPIRE,
  CASUAL_MATCH_QUEUE_TIMEOUT_MS,
  CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
  type QueueExpireAction,
} from "../../data/casualMatchmakingConfig";
import { getTournamentDefinition, isPeriodScopedTournament } from "../../data/casualTournamentConfigs";
import type { MutationCtx } from "../../_generated/server";
import { internalMutation, mutation, query } from "../../_generated/server";
import { getOrCreateOpenInstance } from "./casualInstanceService";
import {
  evaluateEffectiveHumans,
  logJoinMatchmakingProfileResult,
  resolvePlayerBotStrategyContext,
} from "./casualBotDifficultyService";
import {
  applyCasualJoinEntryChargeWithInstance,
  assertJoinEntryEligible,
  insertCasualRunDocumentsForHumans,
  refundCasualJoinEntryCharge,
  requiresDailySoloPlayCostAck,
} from "./casualTournamentJoinCore";
import {
  toCasualMatchQueueClientFlags,
  type JoinCasualRunQueuedResult,
  type JoinCasualRunResult,
} from "./casualTournamentTypes";
import type { CasualTournamentDefinition } from "../../data/casualTournamentConfigs";

async function scheduleBindMatchSeed(
  ctx: MutationCtx,
  matchId: string,
  templateId: string,
  def: CasualTournamentDefinition
): Promise<void> {
  if (def.maxPlayers <= 1) return;
  if (def.gameType === "solitaire") {
    await ctx.scheduler.runAfter(0, internal.service.tournament.casualMatchSeedActions.bindCasualMatchSeed, {
      matchId,
      templateId,
      sessionKey: `casual_sess:${matchId}`,
    });
    return;
  }
  if (def.gameType === "block_blast") {
    await ctx.scheduler.runAfter(
      0,
      internal.service.tournament.casualMatchSeedMutations.bindCasualMatchTemplateQuantiles,
      { matchId, templateId }
    );
  }
}

type QueueRow = Doc<"casual_match_queue">;

/** 兼容迁移前队列行；process 唯一使用该值 */
export function resolveQueueEffectiveHumans(row: QueueRow): number {
  const legacy = row as QueueRow & { effectiveMinHumans?: number };
  const n = row.effectiveHumans ?? legacy.effectiveMinHumans;
  if (typeof n === "number" && Number.isFinite(n) && n >= 1) {
    return Math.floor(n);
  }
  return CASUAL_DEFAULT_EFFECTIVE_HUMANS;
}

/** 兼容迁移前队列行；expire 定时任务唯一使用该值 */
export function resolveQueueExpireAction(row: QueueRow): QueueExpireAction {
  const action = row.queueExpireAction;
  if (action === "solo" || action === "exit") return action;
  return CASUAL_DEFAULT_QUEUE_EXPIRE;
}

/** multi batch 开桌人数：凑齐 effectiveHumans 后取当前 waiting 与 maxPlayers 的较小值 */
export function computeMultiTableBatchSize(args: {
  waitingLength: number;
  effectiveHumans: number;
  maxPlayers: number;
}): number {
  if (args.waitingLength < args.effectiveHumans) return 0;
  return Math.min(args.waitingLength, args.maxPlayers);
}

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

type ChargedMeta = {
  vouchersCharged?: number;
  coinsCharged?: number;
  gemsCharged?: number;
  activityIds?: string[];
};

async function releaseClaimingToWaiting(ctx: MutationCtx, rows: QueueRow[]): Promise<void> {
  const t = Date.now();
  for (const r of rows) {
    const cur = await ctx.db.get(r._id);
    if (cur?.status === "claiming") {
      await ctx.db.patch(r._id, { status: "waiting", updatedAt: t });
    }
  }
}

async function openTableForClaimedRows(
  ctx: MutationCtx,
  args: {
    templateId: string;
    claimedRows: QueueRow[];
    charged: Array<{ row: QueueRow; meta: ChargedMeta }>;
    instanceId: Id<"casual_tournament_instances"> | null;
    def: NonNullable<ReturnType<typeof getTournamentDefinition>>;
  }
): Promise<boolean> {
  const { templateId, charged, instanceId, def } = args;
  const first = charged[0];
  if (!first?.meta) return false;
  const uids = charged.map((c) => c.row.uid).filter(Boolean);
  if (uids.length === 0) return false;
  const meta0 = first.meta;
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
  await scheduleBindMatchSeed(ctx, inserted.matchId, templateId, def);
  return true;
}

/** 单真人桌开桌核心（不校验 effectiveHumans） */
async function openSingleHumanTableFromQueueRow(
  ctx: MutationCtx,
  templateId: string,
  row: QueueRow
): Promise<boolean> {
  const def = getTournamentDefinition(templateId);
  if (!def) return false;

  const now = Date.now();
  const fresh = await ctx.db.get(row._id);
  if (!fresh || fresh.status !== "waiting") {
    return false;
  }

  await ctx.db.patch(fresh._id, { status: "claiming", updatedAt: now });

  const instanceId = await getOrCreateOpenInstance(ctx, { templateId, def, now });
  if (instanceId === null && isPeriodScopedTournament(def)) {
    await ctx.db.patch(fresh._id, { status: "waiting", updatedAt: now });
    return false;
  }

  const ch = await applyCasualJoinEntryChargeWithInstance(
    ctx,
    fresh.uid,
    templateId,
    def,
    instanceId,
    { skipEntryCharge: fresh.skipEntryCharge === true }
  );
  if (!ch.ok) {
    await ctx.db.delete(fresh._id);
    return false;
  }

  const inserted = await insertCasualRunDocumentsForHumans(ctx, {
    uids: [fresh.uid],
    templateId,
    def,
    ...(instanceId ? { instanceId } : {}),
    vouchersCharged: ch.vouchersCharged,
    coinsCharged: ch.coinsCharged,
    gemsCharged: ch.gemsCharged,
    activityIds: ch.activityIds,
  });

  await ctx.db.patch(fresh._id, {
    status: "matched",
    matchedRunTournamentId: inserted.runTournamentId as Id<"casual_run_tournaments">,
    updatedAt: now,
  });
  await scheduleBindMatchSeed(ctx, inserted.matchId, templateId, def);
  return true;
}

/** 单真人桌：effectiveHumans === 1（1000ms 定时任务） */
async function tryOpenSoloTableFromQueueRow(
  ctx: MutationCtx,
  templateId: string,
  row: QueueRow
): Promise<boolean> {
  const fresh = await ctx.db.get(row._id);
  if (!fresh || fresh.status !== "waiting" || resolveQueueEffectiveHumans(fresh) !== 1) {
    return false;
  }
  return openSingleHumanTableFromQueueRow(ctx, templateId, fresh);
}

/** 排队超时：按 queueExpireAction 开 solo 桌或移出队列 */
async function expireCasualMatchQueueRow(
  ctx: MutationCtx,
  queueRowId: Id<"casual_match_queue">
): Promise<boolean> {
  const row = await ctx.db.get(queueRowId);
  if (!row || row.status !== "waiting") return false;
  if (resolveQueueEffectiveHumans(row) <= 1) return false;

  if (resolveQueueExpireAction(row) === "exit") {
    await ctx.db.delete(row._id);
    return true;
  }
  return tryOpenSoloFallbackFromExpiredQueueRow(ctx, queueRowId);
}

async function tryOpenSoloFallbackFromExpiredQueueRow(
  ctx: MutationCtx,
  queueRowId: Id<"casual_match_queue">
): Promise<boolean> {
  const row = await ctx.db.get(queueRowId);
  if (!row || row.status !== "waiting") return false;
  if (resolveQueueEffectiveHumans(row) <= 1) return false;
  return openSingleHumanTableFromQueueRow(ctx, row.templateId, row);
}

/** 多人桌：相同 effectiveHumans 的 FIFO batch */
async function tryOpenMultiTableBatch(
  ctx: MutationCtx,
  templateId: string,
  requiredHumans: number,
  waitingSame: QueueRow[]
): Promise<boolean> {
  const def = getTournamentDefinition(templateId);
  if (!def || !Number.isFinite(requiredHumans) || requiredHumans < 2) return false;

  waitingSame.sort((a, b) => a.createdAt - b.createdAt);
  const batchSize = computeMultiTableBatchSize({
    waitingLength: waitingSame.length,
    effectiveHumans: requiredHumans,
    maxPlayers: def.maxPlayers,
  });
  if (batchSize < requiredHumans) return false;

  const now = Date.now();

  const claimedRows: QueueRow[] = [];
  for (const row of waitingSame) {
    if (claimedRows.length >= batchSize) break;
    const fresh = await ctx.db.get(row._id);
    if (!fresh || fresh.status !== "waiting") continue;
    if (resolveQueueEffectiveHumans(fresh) !== requiredHumans) continue;
    await ctx.db.patch(fresh._id, { status: "claiming", updatedAt: now });
    claimedRows.push(fresh);
  }

  if (claimedRows.length < requiredHumans) {
    await releaseClaimingToWaiting(ctx, claimedRows);
    return false;
  }

  const instanceId = await getOrCreateOpenInstance(ctx, {
    templateId,
    def,
    now: Date.now(),
  });
  if (instanceId === null && isPeriodScopedTournament(def)) {
    await releaseClaimingToWaiting(ctx, claimedRows);
    return false;
  }

  const charged: Array<{ row: QueueRow; meta: ChargedMeta }> = [];
  for (const row of claimedRows) {
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

  if (charged.length < requiredHumans) {
    for (const c of charged) {
      if (!c?.row || !c.meta) continue;
      await refundCasualJoinEntryCharge(ctx, c.row.uid, c.meta);
      const cur = await ctx.db.get(c.row._id);
      if (cur?.status === "claiming") {
        await ctx.db.patch(c.row._id, { status: "waiting", updatedAt: Date.now() });
      }
    }
    await releaseClaimingToWaiting(
      ctx,
      claimedRows.filter((r) => !charged.some((c) => c?.row._id === r._id))
    );
    return false;
  }

  const opened = await openTableForClaimedRows(ctx, {
    templateId,
    claimedRows,
    charged,
    instanceId,
    def,
  });
  if (!opened) {
    for (const c of charged) {
      if (!c?.row || !c.meta) continue;
      await refundCasualJoinEntryCharge(ctx, c.row.uid, c.meta);
      const cur = await ctx.db.get(c.row._id);
      if (cur?.status === "claiming") {
        await ctx.db.patch(c.row._id, { status: "waiting", updatedAt: Date.now() });
      }
    }
    await releaseClaimingToWaiting(ctx, claimedRows);
    return false;
  }
  return true;
}

export async function processCasualMatchQueueForTemplateCore(
  ctx: MutationCtx,
  templateId: string
): Promise<void> {
  const def = getTournamentDefinition(templateId);
  if (!def || def.maxPlayers <= 1) return;

  const maxRounds = 64;
  for (let round = 0; round < maxRounds; round++) {
    let opened = false;

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
      if (rows.length >= need) {
        const ok = await tryOpenMultiTableBatch(ctx, templateId, need, rows);
        if (ok) {
          opened = true;
          break;
        }
      }
    }

    if (!opened) return;
  }
}

export const processCasualMatchQueueForTemplate = internalMutation({
  args: { templateId: v.string() },
  handler: async (ctx, { templateId }) => {
    await processCasualMatchQueueForTemplateCore(ctx, templateId);
    return { ok: true as const };
  },
});

export const openSoloTableFromScheduledQueue = internalMutation({
  args: { queueRowId: v.id("casual_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (!row) return { ok: true as const };
    await tryOpenSoloTableFromQueueRow(ctx, row.templateId, row);
    return { ok: true as const };
  },
});

export const expireCasualMatchQueueEntry = internalMutation({
  args: { queueRowId: v.id("casual_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    await expireCasualMatchQueueRow(ctx, queueRowId);
    return { ok: true as const };
  },
});

function buildQueuedResponse(args: {
  templateId: string;
  effectiveHumans: number;
  expiresAt?: number;
}): JoinCasualRunQueuedResult {
  return {
    ok: true as const,
    queued: true as const,
    templateId: args.templateId,
    ...toCasualMatchQueueClientFlags({
      effectiveHumans: args.effectiveHumans,
      expiresAt: args.expiresAt,
    }),
  };
}

/** Play 异步场：入队 + 异步 process；仅返回 queued。 */
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
      const profile = await resolvePlayerBotStrategyContext(ctx, {
        uid,
        templateId: tournamentId,
        def,
      });
      const { effectiveHumans, matchedRuleId, queueExpireAction } = evaluateEffectiveHumans(profile, def);
      logJoinMatchmakingProfileResult({
        uid,
        templateId: tournamentId,
        profile,
        effectiveHumans,
        matchedRuleId,
        queueExpireAction,
        source: "existing_open",
      });
      return buildQueuedResponse({
        templateId: tournamentId,
        effectiveHumans,
      });
    }

    const now = Date.now();

    const preview = await assertJoinEntryEligible(ctx, uid, tournamentId, now);
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
    }
    if (requiresDailySoloPlayCostAck(tournamentId, preview.willChargeEntry) && dailySoloCostAck !== true) {
      return { ok: false as const, error: "needs_cost_ack" };
    }

    const profile = await resolvePlayerBotStrategyContext(ctx, {
      uid,
      templateId: tournamentId,
      def,
    });
    const { effectiveHumans, matchedRuleId, queueExpireAction } = evaluateEffectiveHumans(profile, def);
    logJoinMatchmakingProfileResult({
      uid,
      templateId: tournamentId,
      profile,
      effectiveHumans,
      matchedRuleId,
      queueExpireAction,
      source: "enqueue",
    });
    const expiresAt =
      effectiveHumans > 1 ? now + CASUAL_MATCH_QUEUE_TIMEOUT_MS : undefined;

    const dupWaiting = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid_template_status", (q) =>
        q.eq("uid", uid).eq("templateId", tournamentId).eq("status", "waiting")
      )
      .first();

    let queueRowId: Id<"casual_match_queue">;
    if (dupWaiting) {
      await ctx.db.patch(dupWaiting._id, {
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: dupWaiting.skipEntryCharge,
        updatedAt: now,
      });
      queueRowId = dupWaiting._id;
    } else {
      queueRowId = await ctx.db.insert("casual_match_queue", {
        uid,
        templateId: tournamentId,
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: undefined,
        status: "waiting",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (effectiveHumans === 1) {
      await ctx.scheduler.runAfter(
        CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
        internal.service.tournament.casualMatchmaking.openSoloTableFromScheduledQueue,
        { queueRowId }
      );
    } else {
      if (expiresAt != null) {
        await ctx.scheduler.runAfter(
          CASUAL_MATCH_QUEUE_TIMEOUT_MS,
          internal.service.tournament.casualMatchmaking.expireCasualMatchQueueEntry,
          { queueRowId }
        );
      }
      await ctx.scheduler.runAfter(
        0,
        internal.service.tournament.casualMatchmaking.processCasualMatchQueueForTemplate,
        { templateId: tournamentId }
      );
    }

    return buildQueuedResponse({
      templateId: tournamentId,
      effectiveHumans,
      expiresAt,
    });
  },
});

/** Play / Lobby：当前用户是否在匹配队列中（waiting 或 claiming） */
export const listCasualMatchQueueForUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const rows = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    return rows
      .filter((r) => r.status === "waiting" || r.status === "claiming")
      .map((r) => {
        const eff = resolveQueueEffectiveHumans(r);
        return {
          templateId: r.templateId,
          status: r.status as "waiting" | "claiming",
          createdAt: r.createdAt,
          ...toCasualMatchQueueClientFlags({
            effectiveHumans: eff,
            expiresAt: r.expiresAt,
          }),
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** 退出匹配：仅删除 `waiting` 行（未扣入场费）；存在 `claiming` 时拒绝 */
export const leaveCasualMatchQueue = mutation({
  args: {
    uid: v.string(),
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, templateId }) => {
    const rows = await ctx.db
      .query("casual_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    const scopeTemplateId = templateId?.trim();
    const inScope = (rowTemplateId: string) =>
      !scopeTemplateId || rowTemplateId === scopeTemplateId;

    const claiming = rows.filter((r) => r.status === "claiming" && inScope(r.templateId));
    const waiting = rows.filter((r) => r.status === "waiting" && inScope(r.templateId));

    if (claiming.length > 0 && waiting.length === 0) {
      return { ok: false as const, error: "cannot_leave_claiming" as const };
    }
    if (waiting.length === 0) {
      return { ok: false as const, error: "not_in_queue" as const };
    }

    for (const row of waiting) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const, removed: waiting.length };
  },
});
