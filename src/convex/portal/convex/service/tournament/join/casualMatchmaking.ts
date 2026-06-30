/**
 * Async casual tournament matchmaking: queue + scheduler ? openCasualTableActions
 */
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  portal_match_queue_TIMEOUT_MS,
  CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
} from "../../../data/portalMatchmakingConfig";
import { getPortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import { internalMutation, internalQuery, mutation, query } from "../../../_generated/server";
import { authedMutation, authedQuery } from "../../../custom/session";
import {
  evaluateEffectiveHumans,
  logJoinMatchmakingProfileResult,
  resolvePlayerBotStrategyContext,
} from "./casualMatchmakingProfile";
import {
  assertJoinEntryEligible,
} from "./casualTournamentJoinCore";
import { findAnyGlobalOpenCasualMatch } from "./casualOpenTableGuard";
import {
  recoverStaleClaimingQueueRow,
  reconcileCasualMatchQueueForJoin,
  purgeExtraCasualMatchQueueRows,
  resolveQueueEffectiveHumans,
  resolveQueueExpireAction,
} from "./casualMatchmakingCore";
import {
  toCasualMatchQueueClientFlags,
  type JoinCasualRunQueuedResult,
  type JoinCasualRunResult,
} from "../shared/casualTournamentTypes";

export {
  computeMultiTableBatchSize,
  resolveQueueEffectiveHumans,
  resolveQueueExpireAction,
} from "./casualMatchmakingCore";

export const recoverStaleClaimingQueueRowInternal = internalMutation({
  args: {
    queueRowId: v.id("portal_match_queue"),
    staleMs: v.optional(v.number()),
  },
  handler: async (ctx, { queueRowId, staleMs }) => {
    const { recovered } = await recoverStaleClaimingQueueRow(ctx, queueRowId, staleMs);
    return { ok: true as const, recovered };
  },
});

export const getQueueRowForOpen = internalQuery({
  args: { queueRowId: v.id("portal_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (!row || row.status !== "waiting") return null;
    if (resolveQueueEffectiveHumans(row) !== 1) return null;
    return { templateId: row.templateId };
  },
});

export const getQueueRowForExpire = internalQuery({
  args: { queueRowId: v.id("portal_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (!row || row.status !== "waiting") return null;
    if (resolveQueueEffectiveHumans(row) <= 1) return null;
    if (resolveQueueExpireAction(row) === "exit") {
      return { ok: true as const, action: "exit" as const };
    }
    return { ok: true as const, action: "solo" as const, templateId: row.templateId };
  },
});

export const deleteQueueRow = internalMutation({
  args: { queueRowId: v.id("portal_match_queue") },
  handler: async (ctx, { queueRowId }) => {
    const row = await ctx.db.get(queueRowId);
    if (row) await ctx.db.delete(queueRowId);
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

/** Play ???:?? + scheduler ?? */
export const enqueueCasualMatchmakingAndTryMatch = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    campaignId: v.optional(v.string()),
    merchantId: v.optional(v.string()),
    maxPlaysPerDay: v.optional(v.number()),
    dayTimezone: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { uid, tournamentId, campaignId, merchantId, maxPlaysPerDay, dayTimezone }
  ): Promise<JoinCasualRunResult> => {
    const def = getPortalTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }

    const now = Date.now();

    const existingOpen = await findAnyGlobalOpenCasualMatch(ctx, uid);
    if (existingOpen) {
      await purgeExtraCasualMatchQueueRows(ctx, {
        uid,
        templateId: tournamentId,
        now,
      });
      if (existingOpen.templateId !== tournamentId) {
        return { ok: false as const, error: "already_in_open_match" as const };
      }
      return {
        ok: true as const,
        queued: false as const,
        templateId: tournamentId,
        gameId: existingOpen.gameId,
        matchId: existingOpen.matchId,
        runTournamentId: existingOpen.runTournamentId,
      };
    }

    const preview = await assertJoinEntryEligible(ctx, uid, tournamentId, now);
    if (!preview.ok) {
      return { ok: false as const, error: preview.error };
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
    const expiresAt = effectiveHumans > 1 ? now + portal_match_queue_TIMEOUT_MS : undefined;

    const reconciled = await reconcileCasualMatchQueueForJoin(ctx, uid, tournamentId, now);

    let queueRowId: Id<"portal_match_queue">;
    if (reconciled) {
      await ctx.db.patch(reconciled._id, {
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: reconciled.skipEntryCharge,
        updatedAt: now,
        ...(campaignId ? { campaignId } : {}),
        ...(merchantId ? { merchantId } : {}),
        ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        ...(reconciled.status === "claiming"
          ? { status: "waiting" as const }
          : {}),
      });
      queueRowId = reconciled._id;
    } else {
      queueRowId = await ctx.db.insert("portal_match_queue", {
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
        ...(campaignId ? { campaignId } : {}),
        ...(merchantId ? { merchantId } : {}),
        ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
      });
    }

    if (effectiveHumans === 1) {
      await ctx.scheduler.runAfter(
        CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
        internal.service.tournament.join.casualOpenTableActions.openSoloAsyncTableFromQueue,
        { queueRowId }
      );
    } else {
      if (expiresAt != null) {
        await ctx.scheduler.runAfter(
          portal_match_queue_TIMEOUT_MS,
          internal.service.tournament.join.casualOpenTableActions.expireCasualMatchQueueEntryOpen,
          { queueRowId }
        );
      }
      await ctx.scheduler.runAfter(
        0,
        internal.service.tournament.join.casualOpenTableActions.processCasualMatchQueueForTemplate,
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

export const listCasualMatchQueueForUid = authedQuery({
  args: {},
  handler: async (ctx) => {
    const uid = ctx.uid;
    const rows = await ctx.db
      .query("portal_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    return rows
      .filter((r) => r.status === "waiting" || r.status === "claiming")
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .reduce<
        Array<{
          templateId: string;
          status: "waiting" | "claiming";
          createdAt: number;
          waitingForPeer: boolean;
          expiresAt?: number;
        }>
      >((acc, r) => {
        if (acc.some((x) => x.templateId === r.templateId)) return acc;
        const eff = resolveQueueEffectiveHumans(r);
        acc.push({
          templateId: r.templateId,
          status: r.status as "waiting" | "claiming",
          createdAt: r.createdAt,
          ...toCasualMatchQueueClientFlags({
            effectiveHumans: eff,
            expiresAt: r.expiresAt,
          }),
        });
        return acc;
      }, []);
  },
});

export const leaveCasualMatchQueue = authedMutation({
  args: {
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, { templateId }) => {
    const uid = ctx.uid;
    const rows = await ctx.db
      .query("portal_match_queue")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();

    const scopeTemplateId = templateId?.trim();
    const inScope = (rowTemplateId: string) =>
      !scopeTemplateId || rowTemplateId === scopeTemplateId;

    const now = Date.now();
    for (const row of rows.filter((r) => r.status === "claiming" && inScope(r.templateId))) {
      if (now - row.updatedAt > 15_000) {
        await ctx.db.patch(row._id, { status: "waiting", updatedAt: now });
      }
    }

    const claimingFresh = (
      await ctx.db
        .query("portal_match_queue")
        .withIndex("by_uid", (q) => q.eq("uid", uid))
        .collect()
    ).filter((r) => r.status === "claiming" && inScope(r.templateId));
    const waitingFresh = (
      await ctx.db
        .query("portal_match_queue")
        .withIndex("by_uid", (q) => q.eq("uid", uid))
        .collect()
    ).filter((r) => r.status === "waiting" && inScope(r.templateId));

    if (claimingFresh.length > 0 && waitingFresh.length === 0) {
      const allStale = claimingFresh.every((r) => now - r.updatedAt > 15_000);
      if (allStale) {
        for (const row of claimingFresh) {
          await ctx.db.delete(row._id);
        }
        return { ok: true as const, removed: claimingFresh.length };
      }
      return { ok: false as const, error: "cannot_leave_claiming" as const };
    }
    if (waitingFresh.length === 0) {
      return { ok: false as const, error: "not_in_queue" as const };
    }

    for (const row of waitingFresh) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const, removed: waitingFresh.length };
  },
});
