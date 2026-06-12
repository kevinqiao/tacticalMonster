"use node";

import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { pickCasualMatchSeedBinding } from "../../bridge/casualSeedProvider";
import type { CasualMatchSeedBinding } from "./casualMatchSeedBinding";
import { type JoinChargeMeta } from "./casualOpenTableMutations";

type ClaimOk = {
  ok: true;
  uids: string[];
  queueRowIds: Id<"casual_match_queue">[];
  joinChargeByUid: Record<string, JoinChargeMeta>;
  instanceId?: Id<"casual_tournament_instances">;
  activityIds?: string[];
};

async function pickSeedBindingForMatch(
  templateId: string,
  matchId: string,
  uids: string[]
): Promise<{ ok: true; seedBinding: CasualMatchSeedBinding } | { ok: false; error: string }> {
  const def = getTournamentDefinition(templateId);
  if (!def) {
    return { ok: false as const, error: "unknown_tournament" };
  }
  return await pickCasualMatchSeedBinding({ templateId, matchId, uids, def });
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

  const pick = await pickSeedBindingForMatch(templateId, shell.matchId, claim.uids);
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
    seedBinding: pick.seedBinding,
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
}

/** 队列开桌：M1 claim → M2 shell → pick → M3 finalize */
export const openCasualTableFromQueue = internalAction({
  args: {
    templateId: v.string(),
    queueRowIds: v.array(v.id("casual_match_queue")),
  },
  handler: async (ctx, { templateId, queueRowIds }) => {
    const claim = await ctx.runMutation(
      internal.service.tournament.join.casualOpenTableMutations.claimQueueAndCharge,
      { templateId, queueRowIds }
    );
    if (!claim.ok) {
      return claim;
    }
    return await openCasualTableFromClaimHandler(ctx, { templateId, claim });
  },
});

/** 日榜 solo：charge → shell → pick → finalize */
export const openCasualDailySoloTable = internalAction({
  args: {
    uid: v.string(),
    templateId: v.string(),
  },
  handler: async (ctx, { uid, templateId }) => {
    const charge = await ctx.runMutation(
      internal.service.tournament.join.casualOpenTableMutations.chargeSoloDailyJoin,
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

/** eff=1 单真人异步桌 */
export const openSoloAsyncTableFromQueue = internalAction({
  args: { queueRowId: v.id("casual_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.runQuery(
      internal.service.tournament.join.casualMatchmaking.getQueueRowForOpen,
      { queueRowId }
    );
    if (!row) {
      return { ok: true as const };
    }
    return await ctx.runAction(internal.service.tournament.join.casualOpenTableActions.openCasualTableFromQueue, {
      templateId: row.templateId,
      queueRowIds: [queueRowId],
    });
  },
});

/** 排队超时 fallback solo 开桌 */
export const expireCasualMatchQueueEntryOpen = internalAction({
  args: { queueRowId: v.id("casual_match_queue") },
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
