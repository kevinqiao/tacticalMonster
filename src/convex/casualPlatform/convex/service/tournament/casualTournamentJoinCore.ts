/**
 * Run creation + join charging shared by season join and async matchmaking.
 * Keep mutation endpoints in `tournament/casualTournamentService`; this module is plain helpers only.
 */
import { internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import {
  applyScaledCurrencyCost,
  applyVoucherCost,
  effectiveEntryBilling,
  isPeriodScopedTournament,
  type CasualTournamentDefinition,
  type EntryCost,
} from "../../data/casualTournamentConfigs";
import {
  ensureInstancePlayerStateRow,
} from "./casualInstanceService";

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
  ctx: MutationCtx,
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
  def: CasualTournamentDefinition
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
  instanceId: Id<"casual_tournament_instances"> | null
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
    return applyCasualJoinEntryCharge(ctx, uid, tournamentId, def);
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
  const ch = await applyCasualJoinEntryCharge(ctx, uid, tournamentId, def);
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
    gameType: def.gameId,
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
  const matchConvexId = await ctx.db.insert("casual_run_matches", {
    tournamentId: runTournamentId,
    templateId,
    gameType: def.gameId,
    completed: false,
    minPlayers: humanPlayerCount,
    maxPlayers: def.maxPlayers,
    humanPlayerCount,
    createdAt: now,
    updatedAt: now,
  });
  const matchIdStr = String(matchConvexId);
  const sessionExternal = `casual_sess:${matchIdStr}`;
  const byUid: Record<string, { gameId: string }> = {};
  for (const uid of uids) {
    const gameId = `game_${matchIdStr}_${uid}`;
    await ctx.db.insert("casual_run_player_matches", {
      matchId: matchIdStr,
      tournamentId: String(runTournamentId),
      templateId,
      uid,
      gameId,
      gameType: def.gameId,
      externalGameId: sessionExternal,
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
