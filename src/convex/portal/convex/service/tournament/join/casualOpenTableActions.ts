"use node";

import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { getPortalTournamentDefinition, effectiveGameSequence } from "../../../data/portalTournamentConfigs";
import { pickCasualMatchSeedBinding } from "../../bridge/casualSeedProvider";
import type { CasualMatchSeedBinding } from "./casualMatchSeedBinding";
import { type JoinChargeMeta } from "./casualOpenTableMutations";
import type { SeedBindingByGameIndex } from "../shared/casualSessionOpenCore";

type ClaimOk = {
  ok: true;
  uids: string[];
  queueRowIds: Id<"portal_match_queue">[];
  joinChargeByUid: Record<string, JoinChargeMeta>;
  instanceId?: Id<"portal_tournament_instances">;
  activityIds?: string[];
};

const OPEN_TABLE_RETRY_ERRORS = new Set([
  "no_unused_seed_for_tier",
  "no_active_pool",
  "game_unreachable",
  "open_table_failed",
  "bad_response",
]);

async function scheduleSoloOpenRetry(
  ctx: ActionCtx,
  queueRowId: Id<"portal_match_queue">,
  delayMs = 3_000
) {
  await ctx.scheduler.runAfter(
    delayMs,
    internal.service.tournament.join.casualOpenTableActions.openSoloAsyncTableFromQueue,
    { queueRowId }
  );
}

async function pickSeedBindingsForMatch(
  ctx: ActionCtx,
  templateId: string,
  matchId: string,
  uids: string[]
): Promise<{ ok: true; seedBindingsByIndex: SeedBindingByGameIndex } | { ok: false; error: string }> {
  const def = getPortalTournamentDefinition(templateId);
  if (!def) {
    return { ok: false as const, error: "unknown_tournament" };
  }
  const sequence = effectiveGameSequence(def);
  const seedBindingsByIndex: SeedBindingByGameIndex = {};
  for (let i = 0; i < sequence.length; i++) {
    const gameType = sequence[i]!;
    const picked = await pickCasualMatchSeedBinding(ctx, {
      templateId,
      matchId,
      uids,
      def,
      gameType,
    });
    if (!picked.ok) {
      console.error("[casual] pickSeedBindingsForMatch failed", {
        templateId,
        matchId,
        gameIndex: i,
        gameType,
        error: picked.error,
      });
      return picked;
    }
    seedBindingsByIndex[String(i)] = picked.seedBinding;
  }
  return { ok: true as const, seedBindingsByIndex };
}

async function openCasualTableFromClaimHandler(
  ctx: ActionCtx,
  args: {
    templateId: string;
    claim: ClaimOk;
  }
): Promise<
  | { ok: true; matchId: string; runTournamentId: string; byUid: Record<string, { gameId: string }> }
  | { ok: false; error: string }
> {
  const { templateId, claim } = args;
  let shellMatchId: string | undefined;

  try {
    const shell = await ctx.runMutation(internal.service.tournament.join.casualOpenTableMutations.insertMatchShell, {
      templateId,
      uids: claim.uids,
      joinChargeByUid: claim.joinChargeByUid,
      ...(claim.instanceId ? { instanceId: claim.instanceId } : {}),
    });
    if (!shell.ok) {
      await ctx.runMutation(internal.service.tournament.join.casualOpenTableMutations.abortOpenTable, {
        queueRowIds: claim.queueRowIds,
        joinChargeByUid: claim.joinChargeByUid,
        templateId,
        ...(claim.instanceId ? { instanceId: claim.instanceId } : {}),
      });
      return shell;
    }
    shellMatchId = shell.matchId;

    const pick = await pickSeedBindingsForMatch(ctx, templateId, shell.matchId, claim.uids);
    if (!pick.ok) {
      await ctx.runMutation(internal.service.tournament.join.casualOpenTableMutations.abortOpenTable, {
        matchId: shell.matchId,
        queueRowIds: claim.queueRowIds,
        joinChargeByUid: claim.joinChargeByUid,
        templateId,
        ...(claim.instanceId ? { instanceId: claim.instanceId } : {}),
      });
      return pick;
    }

    const fin = await ctx.runMutation(internal.service.tournament.join.casualOpenTableMutations.finalizeOpenTable, {
      matchId: shell.matchId,
      seedBindingsByIndex: pick.seedBindingsByIndex,
      queueRowIds: claim.queueRowIds,
    });
    if (!fin.ok) {
      await ctx.runMutation(internal.service.tournament.join.casualOpenTableMutations.abortOpenTable, {
        matchId: shell.matchId,
        queueRowIds: claim.queueRowIds,
        joinChargeByUid: claim.joinChargeByUid,
        templateId,
        ...(claim.instanceId ? { instanceId: claim.instanceId } : {}),
      });
      return fin;
    }

    return {
      ok: true as const,
      matchId: shell.matchId,
      runTournamentId: shell.runTournamentId,
      byUid: fin.byUid,
    };
  } catch (err) {
    console.error("[casual] openCasualTableFromClaim threw", { templateId, err });
    await ctx.runMutation(internal.service.tournament.join.casualOpenTableMutations.abortOpenTable, {
      ...(shellMatchId ? { matchId: shellMatchId } : {}),
      queueRowIds: claim.queueRowIds,
      joinChargeByUid: claim.joinChargeByUid,
      templateId,
      ...(claim.instanceId ? { instanceId: claim.instanceId } : {}),
    });
    return { ok: false as const, error: "open_table_failed" as const };
  }
}

/** 队列开桌：M1 claim → M2 shell → pick → M3 finalize */
export const openCasualTableFromQueue = internalAction({
  args: {
    templateId: v.string(),
    queueRowIds: v.array(v.id("portal_match_queue")),
  },
  handler: async (ctx, { templateId, queueRowIds }) => {
    const claim = await ctx.runMutation(
      internal.service.tournament.join.casualOpenTableMutations.claimQueueAndCharge,
      { templateId, queueRowIds }
    );
    if (!claim.ok) {
      console.warn("[casual] openCasualTableFromQueue claim failed", {
        templateId,
        queueRowIds,
        error: claim.error,
        ...( "uid" in claim ? { uid: claim.uid } : {}),
      });
      if (
        queueRowIds.length === 1 &&
        (claim.error === "charge_failed" || OPEN_TABLE_RETRY_ERRORS.has(claim.error))
      ) {
        await scheduleSoloOpenRetry(ctx, queueRowIds[0]!);
      }
      return claim;
    }
    const opened = await openCasualTableFromClaimHandler(ctx, { templateId, claim });
    if (!opened.ok) {
      console.error("[casual] openCasualTableFromQueue open failed", {
        templateId,
        queueRowIds,
        error: opened.error,
      });
      if (queueRowIds.length === 1 && OPEN_TABLE_RETRY_ERRORS.has(opened.error)) {
        await scheduleSoloOpenRetry(ctx, queueRowIds[0]!);
      }
    }
    return opened;
  },
});

/** 单人模板（p75 等）：charge → shell → pick → finalize */
export const openCasualSoloTable = internalAction({
  args: {
    uid: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { uid, templateId }) => {
    const existingOpen = await ctx.runQuery(
      internal.service.tournament.join.casualOpenTableGuard.getAnyGlobalOpenCasualMatch,
      { uid }
    );
    if (existingOpen) {
      if (existingOpen.templateId !== templateId) {
        return { ok: false as const, error: "already_in_open_match" as const };
      }
      return {
        ok: true as const,
        queued: false as const,
        templateId,
        gameId: existingOpen.gameId,
        matchId: existingOpen.matchId,
        runTournamentId: existingOpen.runTournamentId,
      };
    }

    const charge = await ctx.runMutation(
      internal.service.tournament.join.casualOpenTableMutations.chargeSoloJoin,
      { uid, templateId }
    );
    if (!charge.ok) {
      return charge;
    }

    const claim: ClaimOk = {
      ok: true,
      uids: charge.uids,
      queueRowIds: [],
      joinChargeByUid: charge.joinChargeByUid,
      instanceId: charge.instanceId,
      activityIds: charge.activityIds,
    };

    const opened = await openCasualTableFromClaimHandler(ctx, { templateId, claim });
    if (!opened.ok) {
      return opened;
    }

    const row = opened.byUid[uid];
    if (!row) {
      return { ok: false as const, error: "join_failed" as const };
    }

    return {
      ok: true as const,
      queued: false as const,
      runTournamentId: opened.runTournamentId,
      matchId: opened.matchId,
      gameId: row.gameId,
      templateId,
      vouchersCharged: charge.joinChargeByUid[uid]?.vouchersCharged,
      coinsCharged: charge.joinChargeByUid[uid]?.coinsCharged,
      gemsCharged: charge.joinChargeByUid[uid]?.gemsCharged,
      activityIds: charge.activityIds,
    };
  },
});

/** 处理模板队列：循环 claim 多人 batch 并开桌 */
export const processCasualMatchQueueForTemplate = internalAction({
  args: { templateId: v.string() },
  handler: async (ctx, { templateId }) => {
    const openedMatchIds: string[] = [];
    for (let round = 0; round < 64; round++) {
      const claim = await ctx.runMutation(
        internal.service.tournament.join.casualOpenTableMutations.claimNextMultiBatch,
        { templateId }
      );
      if (!claim.ok) break;

      const opened = await openCasualTableFromClaimHandler(ctx, { templateId, claim });
      if (!opened.ok) {
        console.error("[casual] openCasualTableFromClaim failed", {
          templateId,
          error: opened.error,
        });
        continue;
      }
      openedMatchIds.push(opened.matchId);
    }
    return { ok: true as const, matchIds: openedMatchIds };
  },
});

/** eff=1 异步 solo 开桌 */
export const openSoloAsyncTableFromQueue = internalAction({
  args: { queueRowId: v.id("portal_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    await ctx.runMutation(
      internal.service.tournament.join.casualMatchmaking.recoverStaleClaimingQueueRowInternal,
      { queueRowId }
    );
    const row = await ctx.runQuery(
      internal.service.tournament.join.casualMatchmaking.getQueueRowForOpen,
      { queueRowId }
    );
    if (!row) {
      console.warn("[casual] openSoloAsyncTableFromQueue skipped", { queueRowId, reason: "no_waiting_row" });
      return { ok: true as const };
    }
    console.log("[casual] openSoloAsyncTableFromQueue", { queueRowId, templateId: row.templateId });
    return await ctx.runAction(internal.service.tournament.join.casualOpenTableActions.openCasualTableFromQueue, {
      templateId: row.templateId,
      queueRowIds: [queueRowId],
    });
  },
});

/** 排队超时 fallback solo 开桌 */
export const expireCasualMatchQueueEntryOpen = internalAction({
  args: { queueRowId: v.id("portal_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.runQuery(
      internal.service.tournament.join.casualMatchmaking.getQueueRowForExpire,
      { queueRowId }
    );
    if (!row?.ok) {
      return { ok: true as const };
    }
    if (row.action === "exit") {
      await ctx.runMutation(internal.service.tournament.join.casualMatchmaking.deleteQueueRow, {
        queueRowId,
      });
      return { ok: true as const };
    }
    return await ctx.runAction(internal.service.tournament.join.casualOpenTableActions.openCasualTableFromQueue, {
      templateId: row.templateId,
      queueRowIds: [queueRowId],
    });
  },
});
