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
import { assertCampaignDailyPlayLimit } from "./campaignDailyPlayLimit";
import { assertPortalDailyPlayLimit } from "./portalDailyPlayLimit";
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
import { matchPartitionKey } from "../../economy/resolveEconomyScope";
import {
  entrySnapshotFromDef,
  loadLobbyRewardsOverride,
} from "../../lobby/lobbyOfferingRewards";
import { refundAbandonedQueuePlayEntry } from "../../ads/portalPlayEntryQueueRefund";

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
  args: {
    queueRowId: v.id("portal_match_queue"),
    /** When true, skip ad/ticket refund (row already settled into a match). */
    skipEntryRefund: v.optional(v.boolean()),
  },
  handler: async (ctx, { queueRowId, skipEntryRefund }) => {
    const row = await ctx.db.get(queueRowId);
    if (!row) return { ok: true as const, refunded: false as const };
    if (!skipEntryRefund) {
      await refundAbandonedQueuePlayEntry(ctx, row);
    }
    const cur = await ctx.db.get(queueRowId);
    if (cur) await ctx.db.delete(queueRowId);
    return { ok: true as const, refunded: true as const };
  },
});

function buildQueuedResponse(args: {
  templateId: string;
  effectiveHumans: number;
  expiresAt?: number;
  queueRowId?: Id<"portal_match_queue">;
}): JoinCasualRunQueuedResult & {
  effectiveHumans: number;
  queueRowId?: Id<"portal_match_queue">;
} {
  return {
    ok: true as const,
    queued: true as const,
    templateId: args.templateId,
    effectiveHumans: args.effectiveHumans,
    ...(args.queueRowId ? { queueRowId: args.queueRowId } : {}),
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
    lobbyId: v.optional(v.id("portal_lobbies")),
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
    /** After ad/ticket grant consume — open-table rechecks use this lane. */
    playEntryLane: v.optional(v.union(v.literal("ad"), v.literal("ticket"))),
    /** Snapshot of tickets spent; refunded if queue is abandoned. */
    ticketEntryPriceTickets: v.optional(v.number()),
    /**
     * When true, skip scheduler; caller (joinTournament action) will open
     * eff=1 tables synchronously and return ready/error to the client.
     */
    deferOpenToCaller: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      uid,
      tournamentId,
      lobbyId,
      campaignId,
      partnerId,
      campaignRewardMode,
      campaignDueTime,
      campaignReplaySettings,
      maxPlaysPerDay,
      dayTimezone,
      playEntryLane,
      ticketEntryPriceTickets,
      deferOpenToCaller,
    }
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

    if (campaignId && maxPlaysPerDay != null && maxPlaysPerDay >= 1) {
      const daily = await assertCampaignDailyPlayLimit(ctx, {
        uid,
        campaignId,
        maxPlaysPerDay,
        ...(dayTimezone ? { dayTimezone } : {}),
      });
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
    } else if (!campaignId) {
      const daily = await assertPortalDailyPlayLimit(ctx, {
        uid,
        templateId: tournamentId,
        ...(lobbyId ? { lobbyId } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        ...(playEntryLane ? { entryLane: playEntryLane } : {}),
      });
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
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
    const resolvedPartnerId = partnerId ?? 0;
    const partitionKey = matchPartitionKey(resolvedPartnerId, tournamentId);
    const rewardsOverrideSnapshot = lobbyId
      ? await loadLobbyRewardsOverride(ctx, lobbyId, tournamentId)
      : undefined;
    const entrySnapshot = entrySnapshotFromDef(def);

    let queueRowId: Id<"portal_match_queue">;
    if (reconciled) {
      await ctx.db.patch(reconciled._id, {
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: reconciled.skipEntryCharge,
        updatedAt: now,
        matchPartitionKey: partitionKey,
        partnerId: resolvedPartnerId,
        entrySnapshot,
        ...(rewardsOverrideSnapshot ? { rewardsOverrideSnapshot } : {}),
        ...(lobbyId ? { lobbyId } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(campaignRewardMode ? { campaignRewardMode } : {}),
        ...(campaignDueTime != null ? { campaignDueTime } : {}),
        ...(campaignReplaySettings ? { campaignReplaySettings } : {}),
        ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        playEntryLane: playEntryLane,
        ticketEntryPriceTickets:
          playEntryLane === "ticket" ? ticketEntryPriceTickets : undefined,
        ...(reconciled.status === "claiming"
          ? { status: "waiting" as const }
          : {}),
      });
      queueRowId = reconciled._id;
    } else {
      queueRowId = await ctx.db.insert("portal_match_queue", {
        uid,
        templateId: tournamentId,
        matchPartitionKey: partitionKey,
        effectiveHumans,
        matchedRuleId: matchedRuleId ?? undefined,
        queueExpireAction: effectiveHumans > 1 ? queueExpireAction : undefined,
        expiresAt,
        skipEntryCharge: undefined,
        status: "waiting",
        createdAt: now,
        updatedAt: now,
        partnerId: resolvedPartnerId,
        entrySnapshot,
        ...(rewardsOverrideSnapshot ? { rewardsOverrideSnapshot } : {}),
        ...(lobbyId ? { lobbyId } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(campaignRewardMode ? { campaignRewardMode } : {}),
        ...(campaignDueTime != null ? { campaignDueTime } : {}),
        ...(campaignReplaySettings ? { campaignReplaySettings } : {}),
        ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        ...(playEntryLane ? { playEntryLane } : {}),
        ...(playEntryLane === "ticket" && ticketEntryPriceTickets != null
          ? { ticketEntryPriceTickets }
          : {}),
      });
    }

    if (!deferOpenToCaller) {
      if (effectiveHumans === 1) {
        await ctx.scheduler.runAfter(
          CASUAL_SOLO_ASYNC_OPEN_DELAY_MS,
          internal.service.tournament.join.casualOpenTableActions.openSoloAsyncTableFromQueue,
          { queueRowId }
        );
        /** 双保险：processQueue 也会 claim eff=1，避免 solo open 调度丢失后一直「匹配中」 */
        await ctx.scheduler.runAfter(
          CASUAL_SOLO_ASYNC_OPEN_DELAY_MS + 500,
          internal.service.tournament.join.casualOpenTableActions.processCasualMatchQueueForTemplate,
          { templateId: tournamentId }
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
    }

    return buildQueuedResponse({
      templateId: tournamentId,
      effectiveHumans,
      expiresAt,
      queueRowId,
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
          await refundAbandonedQueuePlayEntry(ctx, row);
          const cur = await ctx.db.get(row._id);
          if (cur) await ctx.db.delete(cur._id);
        }
        return { ok: true as const, removed: claimingFresh.length };
      }
      return { ok: false as const, error: "cannot_leave_claiming" as const };
    }
    if (waitingFresh.length === 0) {
      return { ok: false as const, error: "not_in_queue" as const };
    }

    for (const row of waitingFresh) {
      await refundAbandonedQueuePlayEntry(ctx, row);
      const cur = await ctx.db.get(row._id);
      if (cur) await ctx.db.delete(cur._id);
    }
    return { ok: true as const, removed: waitingFresh.length };
  },
});
