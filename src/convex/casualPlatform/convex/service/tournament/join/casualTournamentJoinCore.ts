/**
 * Run creation + join charging shared by season join and async matchmaking.
 * Keep mutation endpoints in `join/casualJoinMutations`; this module is plain helpers only.
 */
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  applyScaledCurrencyCost,
  applyVoucherCost,
  effectiveEntryBilling,
  getTournamentDefinition,
  isPeriodScopedTournament,
  type CasualTournamentDefinition,
  type EntryCost,
} from "../../../data/casualTournamentConfigs";

export function requiresDailySoloPlayCostAck(tournamentId: string, willChargeEntry: boolean): boolean {
  if (!willChargeEntry) return false;
  return (
    tournamentId === CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID ||
    tournamentId === CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID
  );
}
import { resolveInstanceWindow } from "../../../data/casualInstanceWindow";
import { activeSeasonWindowForCtx, ensureInstancePlayerStateRow } from "../list/casualInstanceService";

export const RUN_TOURNAMENT_OPEN = 0;
export const RUN_TOURNAMENT_COMPLETED = 1;
export const RUN_PLAYER_TOURNAMENT_OPEN = 0;
export const RUN_PLAYER_TOURNAMENT_COMPLETED = 1;

function applyEntryCostToPlayerPatch(
  row: { coins?: number; gems?: number },
  cost: EntryCost
): { ok: true; patch: Record<string, number> } | { ok: false; error: string } {
  if (cost.kind === "none") return { ok: true, patch: {} };
  if (cost.kind === "coins") {
    const cur = row.coins ?? 0;
    if (cur < cost.amount) return { ok: false, error: "insufficient_coins" };
    return { ok: true, patch: { coins: cur - cost.amount } };
  }
  if (cost.kind === "gems") {
    const cur = row.gems ?? 0;
    if (cur < cost.amount) return { ok: false, error: "insufficient_gems" };
    return { ok: true, patch: { gems: cur - cost.amount } };
  }
  if (cost.kind === "seasonVouchers") {
    return { ok: false, error: "bad_entry_cost" };
  }
  return { ok: false, error: "bad_entry_cost" };
}

async function resolveJoinEntryCost(
  ctx: MutationCtx | QueryCtx,
  tournamentId: string,
  def: CasualTournamentDefinition
): Promise<EntryCost> {
  let entryCost: EntryCost = def.entry;
  if (def.matchType === "season_challenge" && def.entry.kind === "seasonVouchers") {
    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    entryCost = {
      kind: "seasonVouchers",
      amount: applyVoucherCost(
        def.entry.amount,
        modifiers.voucherCostMultiplier,
        modifiers.voucherCostDelta
      ),
    };
  } else if (def.entry.kind === "coins") {
    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    entryCost = {
      kind: "coins",
      amount: applyScaledCurrencyCost(
        def.entry.amount,
        modifiers.coinsCostMultiplier,
        modifiers.coinsCostDelta
      ),
    };
  } else if (def.entry.kind === "gems") {
    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    entryCost = {
      kind: "gems",
      amount: applyScaledCurrencyCost(
        def.entry.amount,
        modifiers.gemsCostMultiplier,
        modifiers.gemsCostDelta
      ),
    };
  }
  return entryCost;
}

export async function applyCasualJoinEntryCharge(
  ctx: MutationCtx,
  uid: string,
  tournamentId: string,
  def: CasualTournamentDefinition,
  opts?: { skipEntryCharge?: boolean }
): Promise<
  | {
      ok: true;
      vouchersCharged?: number;
      coinsCharged?: number;
      gemsCharged?: number;
      activityIds?: string[];
    }
  | { ok: false; error: string }
> {
  const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
  if (!player) {
    return { ok: false as const, error: "no_player" };
  }
  if (opts?.skipEntryCharge) {
    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    return { ok: true as const, activityIds: modifiers.activityIds };
  }
  const entryCost = await resolveJoinEntryCost(ctx, tournamentId, def);

  if (entryCost.kind === "seasonVouchers") {
    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    const activityIds = modifiers.activityIds;
    const wallet = await ctx.runMutation(
      internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta,
      { uid, deltaVouchers: -entryCost.amount }
    );
    if (!wallet.ok) {
      return {
        ok: false as const,
        error:
          wallet.error === "insufficient_vouchers"
            ? "insufficient_vouchers"
            : wallet.error === "no_season"
              ? "no_active_season"
              : "join_failed",
      };
    }
    return {
      ok: true as const,
      vouchersCharged: entryCost.amount,
      activityIds,
    };
  }

  const modifiers = await ctx.runQuery(
    internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
    { tournamentId }
  );
  const activityIds = modifiers.activityIds;
  const costResult = applyEntryCostToPlayerPatch(player, entryCost);
  if (!costResult.ok) {
    return { ok: false as const, error: costResult.error };
  }
  if (Object.keys(costResult.patch).length > 0) {
    await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
      uid,
      ...costResult.patch,
    });
  }
  return {
    ok: true as const,
    vouchersCharged: undefined,
    coinsCharged: entryCost.kind === "coins" ? entryCost.amount : undefined,
    gemsCharged: entryCost.kind === "gems" ? entryCost.amount : undefined,
    activityIds,
  };
}

/**
 * 周期型：`per_instance` 时同一 `instanceId` 仅首局扣费；`per_match` 与现网一致。
 * `instanceId` 为 null 时退化为 `applyCasualJoinEntryCharge`。
 */
export async function applyCasualJoinEntryChargeWithInstance(
  ctx: MutationCtx,
  uid: string,
  tournamentId: string,
  def: CasualTournamentDefinition,
  instanceId: Id<"casual_tournament_instances"> | null,
  opts?: { skipEntryCharge?: boolean }
): Promise<
  | {
      ok: true;
      vouchersCharged?: number;
      coinsCharged?: number;
      gemsCharged?: number;
      activityIds?: string[];
    }
  | { ok: false; error: string }
> {
  if (!instanceId || !isPeriodScopedTournament(def)) {
    return applyCasualJoinEntryCharge(ctx, uid, tournamentId, def, opts);
  }
  const now = Date.now();
  const stId = await ensureInstancePlayerStateRow(ctx, { instanceId, uid, now });
  const st = await ctx.db.get(stId);
  if (!st) {
    return { ok: false as const, error: "join_failed" };
  }
  if (effectiveEntryBilling(def) === "per_instance" && st.entryFeeCharged) {
    const modifiers = await ctx.runQuery(
      internal.service.activity.casualActivityService.resolveSeasonActivityModifiers,
      { tournamentId }
    );
    return {
      ok: true as const,
      activityIds: modifiers.activityIds,
    };
  }
  const ch = await applyCasualJoinEntryCharge(ctx, uid, tournamentId, def, opts);
  if (!ch.ok) {
    return ch;
  }
  if (effectiveEntryBilling(def) === "per_instance") {
    await ctx.db.patch(stId, { entryFeeCharged: true, updatedAt: now });
  }
  return ch;
}

/** 匹配失败回滚：与 `applyCasualJoinEntryCharge` 对称（仅休闲货币 / 赛季券） */
export async function refundCasualJoinEntryCharge(
  ctx: MutationCtx,
  uid: string,
  meta: {
    vouchersCharged?: number;
    coinsCharged?: number;
    gemsCharged?: number;
  }
): Promise<void> {
  if (meta.vouchersCharged && meta.vouchersCharged > 0) {
    await ctx.runMutation(internal.service.season.casualSeasonService.applySeasonWalletBalanceDelta, {
      uid,
      deltaVouchers: meta.vouchersCharged,
    });
  }
  const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
  if (!player) return;
  const coinsAdd = meta.coinsCharged ?? 0;
  const gemsAdd = meta.gemsCharged ?? 0;
  if (coinsAdd <= 0 && gemsAdd <= 0) return;
  await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
    uid,
    ...(coinsAdd > 0 ? { coins: (player.coins ?? 0) + coinsAdd } : {}),
    ...(gemsAdd > 0 ? { gems: (player.gems ?? 0) + gemsAdd } : {}),
  });
}

export async function insertCasualRunDocumentsForHumans(
  ctx: MutationCtx,
  args: {
    uids: string[];
    templateId: string;
    def: CasualTournamentDefinition;
    instanceId?: Id<"casual_tournament_instances">;
    vouchersCharged?: number;
    coinsCharged?: number;
    gemsCharged?: number;
    activityIds?: string[];
    /** 各 uid 入场扣费快照；seed 绑定失败时用于退款 */
    joinChargeByUid?: Record<
      string,
      { vouchersCharged?: number; coinsCharged?: number; gemsCharged?: number }
    >;
  }
): Promise<{
  runTournamentId: string;
  matchId: string;
  byUid: Record<string, { gameId: string }>;
  vouchersCharged?: number;
  coinsCharged?: number;
  gemsCharged?: number;
  activityIds?: string[];
}> {
  const { uids, templateId, def } = args;
  const now = Date.now();
  const runTournamentId = await ctx.db.insert("casual_run_tournaments", {
    templateId,
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
      templateId,
      score: 0,
      status: RUN_PLAYER_TOURNAMENT_OPEN,
      createdAt: now,
      updatedAt: now,
    });
  }

  const humanPlayerCount = uids.length;
  const joinChargeByUid =
    args.joinChargeByUid ??
    Object.fromEntries(
      uids.map((uid) => [
        uid,
        {
          vouchersCharged: args.vouchersCharged,
          coinsCharged: args.coinsCharged,
          gemsCharged: args.gemsCharged,
        },
      ])
    );
  const matchConvexId = await ctx.db.insert("casual_run_matches", {
    tournamentId: runTournamentId,
    templateId,
    gameType: def.gameType,
    completed: false,
    minPlayers: humanPlayerCount,
    maxPlayers: def.maxPlayers,
    humanPlayerCount,
    joinChargeByUid,
    createdAt: now,
    updatedAt: now,
  });
  const matchIdStr = String(matchConvexId);
  const byUid: Record<string, { gameId: string }> = {};
  for (const uid of uids) {
    const gameId = `game_${matchIdStr}_${uid}`;
    await ctx.db.insert("casual_run_player_matches", {
      matchId: matchIdStr,
      tournamentId: String(runTournamentId),
      templateId,
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

  return {
    runTournamentId: String(runTournamentId),
    matchId: matchIdStr,
    byUid,
    vouchersCharged: args.vouchersCharged,
    coinsCharged: args.coinsCharged,
    gemsCharged: args.gemsCharged,
    activityIds: args.activityIds,
  };
}

export type JoinEntryChargePreview =
  | {
      ok: true;
      willChargeEntry: boolean;
      dueCoins: number;
      dueGems: number;
      dueVouchers: number;
      entryKind: EntryCost["kind"];
    }
  | { ok: false; error: string };

/**
 * 与 `applyCasualJoinEntryChargeWithInstance` 对齐：本次 join 是否会扣入场（供客户端预览）。
 * 只读，不建桶、不写库。
 */
export async function computeJoinEntryWillCharge(
  ctx: MutationCtx | QueryCtx,
  uid: string,
  tournamentId: string,
  now: number
): Promise<JoinEntryChargePreview> {
  const def = getTournamentDefinition(tournamentId);
  if (!def) {
    return { ok: false as const, error: "unknown_tournament" };
  }

  const entryCost = await resolveJoinEntryCost(ctx, tournamentId, def);
  if (entryCost.kind === "none") {
    return {
      ok: true as const,
      willChargeEntry: false,
      dueCoins: 0,
      dueGems: 0,
      dueVouchers: 0,
      entryKind: "none",
    };
  }

  const dues = (): { c: number; g: number; v: number } => ({
    c: entryCost.kind === "coins" ? entryCost.amount : 0,
    g: entryCost.kind === "gems" ? entryCost.amount : 0,
    v: entryCost.kind === "seasonVouchers" ? entryCost.amount : 0,
  });

  if (!isPeriodScopedTournament(def)) {
    const d = dues();
    return {
      ok: true as const,
      willChargeEntry: true,
      dueCoins: d.c,
      dueGems: d.g,
      dueVouchers: d.v,
      entryKind: entryCost.kind,
    };
  }

  const activeSeason = await activeSeasonWindowForCtx(ctx);
  const win = resolveInstanceWindow(def, now, activeSeason);
  if (!win) {
    return { ok: false as const, error: "period_unavailable" };
  }

  const inst = await ctx.db
    .query("casual_tournament_instances")
    .withIndex("by_template_instanceKey", (q) =>
      q.eq("templateId", tournamentId).eq("instanceKey", win.instanceKey)
    )
    .first();

  if (inst?.status === "closed") {
    return { ok: false as const, error: "period_unavailable" };
  }

  const d = dues();
  const entryKind = entryCost.kind;

  if (!inst) {
    return {
      ok: true as const,
      willChargeEntry: true,
      dueCoins: d.c,
      dueGems: d.g,
      dueVouchers: d.v,
      entryKind,
    };
  }

  const st = await ctx.db
    .query("casual_instance_player_state")
    .withIndex("by_instance_uid", (q) => q.eq("instanceId", inst._id).eq("uid", uid))
    .first();

  if (effectiveEntryBilling(def) === "per_instance" && st?.entryFeeCharged) {
    return {
      ok: true as const,
      willChargeEntry: false,
      dueCoins: 0,
      dueGems: 0,
      dueVouchers: 0,
      entryKind,
    };
  }

  return {
    ok: true as const,
    willChargeEntry: true,
    dueCoins: d.c,
    dueGems: d.g,
    dueVouchers: d.v,
    entryKind,
  };
}

/** 本次 join 若将扣入场，校验玩家余额/赛季券是否足够（与 `applyCasualJoinEntryCharge` 一致） */
export async function validateJoinEntryAffordable(
  ctx: MutationCtx | QueryCtx,
  uid: string,
  preview: Extract<JoinEntryChargePreview, { ok: true }>,
  opts?: { skipEntryCharge?: boolean }
): Promise<JoinEntryChargePreview> {
  if (opts?.skipEntryCharge || !preview.willChargeEntry) {
    return preview;
  }

  if (preview.dueVouchers > 0) {
    const activeSeason = await activeSeasonWindowForCtx(ctx);
    if (!activeSeason) {
      return { ok: false as const, error: "no_active_season" };
    }
    const pass = await ctx.db
      .query("casual_pass_progress")
      .withIndex("by_uid_season", (q) => q.eq("uid", uid).eq("seasonId", activeSeason.seasonId))
      .unique();
    const bal = pass?.seasonVouchers ?? 0;
    if (bal < preview.dueVouchers) {
      return { ok: false as const, error: "insufficient_vouchers" };
    }
  }

  if (preview.dueCoins > 0 || preview.dueGems > 0) {
    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!player) {
      return { ok: false as const, error: "no_player" };
    }
    if (preview.dueCoins > 0 && (player.coins ?? 0) < preview.dueCoins) {
      return { ok: false as const, error: "insufficient_coins" };
    }
    if (preview.dueGems > 0 && (player.gems ?? 0) < preview.dueGems) {
      return { ok: false as const, error: "insufficient_gems" };
    }
  }

  return preview;
}

/**
 * 入场预览 + 门槛校验（join / previewJoinEntryCharge 共用，与开桌扣费条件对齐）。
 */
export async function assertJoinEntryEligible(
  ctx: MutationCtx | QueryCtx,
  uid: string,
  tournamentId: string,
  now: number,
  opts?: { skipEntryCharge?: boolean }
): Promise<JoinEntryChargePreview> {
  const preview = await computeJoinEntryWillCharge(ctx, uid, tournamentId, now);
  if (!preview.ok) {
    return preview;
  }
  return validateJoinEntryAffordable(ctx, uid, preview, opts);
}
