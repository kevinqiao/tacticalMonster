"use node";
import { v } from "convex/values";
import crypto from "crypto";
import { internal } from "../../../_generated/api";
import { authedAction } from "../../../custom/session";
import {
  getPortalTournamentDefinition,
  isDeprecatedDailySoloTournament,
  isJoinableCasualTournament,
  portalTournamentIdForMode,
} from "../../../data/portalTournamentConfigs";
import { isCasualGameLobbyVisible } from "../../../data/partnerGameRegistry";
import { authorizeCampaignJoinViaHttp } from "../../bridge/merchantCampaignBridge";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";

/**
 * Solo (maxPlayers<=1): openCasualSoloTable; multi: enqueue matchmaking.
 */
export const joinTournament = authedAction({
  args: {
    tournamentId: v.optional(v.string()),
    partnerSlug: v.optional(v.string()),
    campaignSlug: v.optional(v.string()),
    /** Portal lobby for weekly-league settle scope. */
    lobbyId: v.optional(v.id("portal_lobbies")),
    /** Explicitly select the ad rung after free plays are exhausted. */
    adEntry: v.optional(v.boolean()),
    /** Explicitly select the ticket rung after free + ad are exhausted. */
    ticketEntry: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { tournamentId, partnerSlug, campaignSlug, lobbyId, adEntry, ticketEntry }
  ): Promise<JoinCasualRunResult> => {
    const uid = ctx.uid;
    let resolvedTemplateId = tournamentId;
    let campaignId: string | undefined;
    let partnerId: number | undefined;
    let campaignRewardMode: "pass_per_run" | "competitive_leaderboard" | undefined;
    let campaignDueTime: number | undefined;
    let campaignReplaySettings:
      | {
          maxReplaysPerMatch?: number;
          adReplayEnabled?: boolean;
          adReplayDailyCap?: number;
          ticketReplayEnabled?: boolean;
          ticketReplayPriceTickets?: number;
          coinReplayEnabled?: boolean;
          coinReplayPriceCoins?: number;
          coinReplayDailyCap?: number | null;
        }
      | undefined;
    let maxPlaysPerDay: number | undefined;
    let dayTimezone: string | undefined;

    if (partnerSlug && campaignSlug) {
      const authorized = await authorizeCampaignJoinViaHttp({
        uid,
        partnerSlug,
        campaignSlug,
      });
      if (!authorized.ok) {
        return { ok: false as const, error: authorized.error };
      }
      const mapped = portalTournamentIdForMode(authorized.gameType, authorized.mode);
      if (!mapped) {
        return { ok: false as const, error: "unknown_tournament" };
      }
      resolvedTemplateId = mapped;
      campaignId = authorized.campaignId;
      partnerId = authorized.partnerId;
      campaignRewardMode = authorized.rewardMode;
      campaignDueTime = authorized.dueTime;
      campaignReplaySettings = authorized.replaySettings;
      maxPlaysPerDay = authorized.playLimits.maxPlaysPerDay;
      dayTimezone = authorized.playLimits.dayTimezone;
    }

    if (!resolvedTemplateId) {
      return { ok: false as const, error: "missing_tournament" };
    }

    const def = getPortalTournamentDefinition(resolvedTemplateId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }
    if (isDeprecatedDailySoloTournament(resolvedTemplateId)) {
      return { ok: false as const, error: "tournament_closed" };
    }
    if (!isJoinableCasualTournament(def)) {
      return { ok: false as const, error: "tournament_closed" };
    }
    if (!isCasualGameLobbyVisible(def.gameType)) {
      return { ok: false as const, error: "game_not_available" };
    }
    if (adEntry && ticketEntry) {
      return { ok: false as const, error: "invalid_entry_mode" };
    }
    if (adEntry) {
      const entry = await ctx.runMutation(
        internal.service.ads.portalAdEntryService.consumeAdEntryForJoin,
        {
          uid,
          templateId: resolvedTemplateId,
          ...(lobbyId ? { lobbyId } : {}),
        }
      );
      if (!entry.ok) return entry;
    }
    if (ticketEntry) {
      const entry = await ctx.runMutation(
        internal.service.ads.portalTicketEntryService.consumeTicketEntryForJoin,
        {
          uid,
          templateId: resolvedTemplateId,
          ...(lobbyId ? { lobbyId } : {}),
        }
      );
      if (!entry.ok) return entry;
    }

    if (def.maxPlayers <= 1) {
      return await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.openCasualSoloTable,
        {
          uid,
          templateId: resolvedTemplateId,
          ...(lobbyId ? { lobbyId } : {}),
          ...(campaignId ? { campaignId } : {}),
          ...(partnerId != null ? { partnerId } : {}),
          ...(campaignRewardMode ? { campaignRewardMode } : {}),
          ...(campaignDueTime != null ? { campaignDueTime } : {}),
          ...(campaignReplaySettings ? { campaignReplaySettings } : {}),
          ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
          ...(dayTimezone ? { dayTimezone } : {}),
        }
      );
    }

    const enqueued = await ctx.runMutation(
      internal.service.tournament.join.casualMatchmaking.enqueueCasualMatchmakingAndTryMatch,
      {
        uid,
        tournamentId: resolvedTemplateId,
        ...(lobbyId ? { lobbyId } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(partnerId != null ? { partnerId } : {}),
        ...(campaignRewardMode ? { campaignRewardMode } : {}),
        ...(campaignDueTime != null ? { campaignDueTime } : {}),
        ...(campaignReplaySettings ? { campaignReplaySettings } : {}),
        ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
        // Bot-fill (eff=1): open in this action so coin/free multi returns ready/error
        // instead of leaving the client stuck on "Creating match".
        deferOpenToCaller: true,
      }
    );
    if (!enqueued.ok || !enqueued.queued) {
      return enqueued;
    }

    const queueRowId =
      "queueRowId" in enqueued
        ? (enqueued.queueRowId as string | undefined)
        : undefined;
    const effectiveHumans =
      "effectiveHumans" in enqueued && typeof enqueued.effectiveHumans === "number"
        ? enqueued.effectiveHumans
        : enqueued.waitingForPeer
          ? 2
          : 1;

    if (effectiveHumans === 1 && queueRowId) {
      const opened = await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.openSoloAsyncTableFromQueue,
        { queueRowId: queueRowId as never }
      );
      if (opened && typeof opened === "object" && "ok" in opened && opened.ok === true) {
        const byUid =
          "byUid" in opened
            ? (opened.byUid as Record<string, { gameId: string }> | undefined)
            : undefined;
        const row = byUid?.[uid];
        if (row?.gameId && "matchId" in opened && "runTournamentId" in opened) {
          return {
            ok: true as const,
            queued: false as const,
            templateId: resolvedTemplateId,
            gameId: row.gameId,
            matchId: String(opened.matchId),
            runTournamentId: String(opened.runTournamentId),
          };
        }
      }
      const err =
        opened && typeof opened === "object" && "error" in opened
          ? String((opened as { error: string }).error)
          : "open_table_failed";

      if (err === "already_in_open_match") {
        const existing = await ctx.runQuery(
          internal.service.tournament.join.casualOpenTableGuard.getAnyGlobalOpenCasualMatch,
          { uid }
        );
        if (existing && existing.templateId === resolvedTemplateId) {
          return {
            ok: true as const,
            queued: false as const,
            templateId: resolvedTemplateId,
            gameId: existing.gameId,
            matchId: existing.matchId,
            runTournamentId: existing.runTournamentId,
          };
        }
      }

      console.error("[casual] joinTournament sync open failed", {
        templateId: resolvedTemplateId,
        uid,
        error: err,
      });
      // Drop queue so UI cannot spin forever on a dead row.
      await ctx.runMutation(
        internal.service.tournament.join.casualMatchmaking.deleteQueueRow,
        { queueRowId: queueRowId as never }
      );
      return { ok: false as const, error: err };
    }

    // eff>1: async peer match — schedule process + optional expire.
    await ctx.scheduler.runAfter(
      0,
      internal.service.tournament.join.casualOpenTableActions.processCasualMatchQueueForTemplate,
      { templateId: resolvedTemplateId }
    );
    if (enqueued.expiresAt != null && queueRowId) {
      const delayMs = Math.max(0, enqueued.expiresAt - Date.now());
      await ctx.scheduler.runAfter(
        delayMs,
        internal.service.tournament.join.casualOpenTableActions.expireCasualMatchQueueEntryOpen,
        { queueRowId: queueRowId as never }
      );
    }
    return enqueued;
  },
});

export const createScoreVerificationNonce = authedAction({
  args: { externalGameId: v.string() },
  handler: async (ctx, { externalGameId }) => {
    const nonce = crypto.randomBytes(16).toString("hex");
    return {
      ok: true as const,
      nonce,
      uid: ctx.uid,
      externalGameId,
      hint: "Wire blockBlast Convex to verify nonce with casualPlatform (TODO)",
    };
  },
});
