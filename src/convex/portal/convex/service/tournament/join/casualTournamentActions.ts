"use node";
import { v } from "convex/values";
import crypto from "crypto";
import { internal } from "../../../_generated/api";
import { authedAction } from "../../../custom/session";
import {
  getPortalTournamentDefinition,
  isDeprecatedDailySoloTournament,
  isJoinableCasualTournament,
  isPortalAsyncMultiTemplate,
} from "../../../data/portalTournamentConfigs";
import { isCasualGameLobbyVisible } from "../../../data/partnerGameRegistry";
import { authorizeCampaignJoinViaHttp } from "../../bridge/merchantCampaignBridge";
import { resolveMultiRitualJoinTemplate } from "../../bridge/portalSeasonSeedPickSignals";
import { sessionPartnerIdFromUid } from "../../../../../shared/platformAuth/parsePlatformUid";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";

/**
 * Solo (maxPlayers<=1): openCasualSoloTable; multi: enqueue matchmaking.
 */
export const joinTournament = authedAction({
  args: {
    tournamentId: v.optional(v.string()),
    /**
     * Campaign join: partner from platform session (uid) or FE PartnerManager.
     * Prefer omitting — server derives from uid. If provided, must match session.
     */
    partnerId: v.optional(v.number()),
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
    { tournamentId, partnerId: partnerIdArg, campaignSlug, lobbyId, adEntry, ticketEntry }
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

    if (campaignSlug) {
      // Trusted partner scope is the platform uid (`{cid}_{partnerId}_{…}`).
      const sessionPartnerId = sessionPartnerIdFromUid(uid);
      if (sessionPartnerId === null) {
        return { ok: false as const, error: "partner_session_required" };
      }
      if (
        partnerIdArg != null &&
        Number.isFinite(partnerIdArg) &&
        Math.floor(partnerIdArg) !== sessionPartnerId
      ) {
        return { ok: false as const, error: "partner_mismatch" };
      }
      const joinPartnerId = sessionPartnerId;

      const authorized = await authorizeCampaignJoinViaHttp({
        uid,
        partnerId: joinPartnerId,
        campaignSlug,
      });
      if (!authorized.ok) {
        return { ok: false as const, error: authorized.error };
      }
      resolvedTemplateId = authorized.tournamentId;
      campaignId = authorized.campaignId;
      partnerId = authorized.partnerId;
      campaignRewardMode = authorized.rewardMode;
      campaignDueTime = authorized.dueTime;
      campaignReplaySettings = authorized.replaySettings;
      maxPlaysPerDay = authorized.playLimits.maxPlaysPerDay;
      dayTimezone = authorized.playLimits.dayTimezone;

      // Coupon-limit enforcement: Portal's backpack owns the vouchers, so the
      // join-time check (avoid burning a play on an already-maxed-out player)
      // has to happen here rather than in Campaign's authorize query.
      if (authorized.rewardMode !== "competitive_leaderboard") {
        const maxCouponsPerPlayer = authorized.playLimits.maxCouponsPerPlayer;
        if (maxCouponsPerPlayer >= 1) {
          const { count } = await ctx.runQuery(
            internal.service.backpack.portalBackpackService.countCampaignVouchersForUid,
            { campaignId, uid }
          );
          if (count >= maxCouponsPerPlayer) {
            return { ok: false as const, error: "coupon_limit_reached" };
          }
        }
      }
    }

    if (!resolvedTemplateId) {
      return { ok: false as const, error: "missing_tournament" };
    }

    let def = getPortalTournamentDefinition(resolvedTemplateId);
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

    /** Multi ritual: force Solo template before entry charge / open (non-campaign). */
    let ritualForcedSolo = false;
    if (!campaignId && def.matchType === "multi_ranked") {
      const signals = await ctx.runQuery(
        internal.service.bridge.portalSeasonSeedPickQueries.loadSignals,
        { uid, gameType: def.gameType }
      );
      const rewritten = resolveMultiRitualJoinTemplate({
        requestedTemplateId: resolvedTemplateId,
        matchType: def.matchType,
        gameType: def.gameType,
        ladderProgress: signals.settledSoloCount,
      });
      if (rewritten.ritualForcedSolo) {
        const soloDef = getPortalTournamentDefinition(rewritten.templateId);
        if (soloDef && isJoinableCasualTournament(soloDef)) {
          resolvedTemplateId = rewritten.templateId;
          def = soloDef;
          ritualForcedSolo = true;
        }
      }
    }

    // Pre-check ladder ceiling before consuming ad/ticket grants (avoid burn-after-ad).
    if (!campaignId && (adEntry || ticketEntry)) {
      const daily = await ctx.runQuery(
        internal.service.tournament.join.portalDailyPlayLimit
          .assertPortalDailyPlayLimitQuery,
        {
          uid,
          templateId: resolvedTemplateId,
          ...(lobbyId ? { lobbyId } : {}),
          ...(dayTimezone ? { dayTimezone } : {}),
          ...(adEntry ? { pendingAdEntries: 1 } : {}),
          ...(ticketEntry ? { pendingTicketEntries: 1 } : {}),
        }
      );
      if (!daily.ok) {
        return { ok: false as const, error: daily.error };
      }
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
    let ticketEntryPriceTickets: number | undefined;
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
      if ("priceTickets" in entry && typeof entry.priceTickets === "number") {
        ticketEntryPriceTickets = entry.priceTickets;
      }
    }

    const playEntryLane = adEntry ? "ad" : ticketEntry ? "ticket" : undefined;

    if (def.maxPlayers <= 1) {
      const opened = await ctx.runAction(
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
          ...(playEntryLane ? { playEntryLane } : {}),
        }
      );
      if (opened.ok && ritualForcedSolo) {
        return { ...opened, ritualForcedSolo: true as const };
      }
      return opened;
    }

    // Async multi: join open unfinished table or create (no queue).
    if (isPortalAsyncMultiTemplate(def)) {
      return await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.joinOrCreateAsyncMultiTable,
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
          ...(playEntryLane ? { playEntryLane } : {}),
        }
      );
    }

    // Sync multi: enqueue matchmaking.
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
        ...(playEntryLane ? { playEntryLane } : {}),
        ...(ticketEntryPriceTickets != null
          ? { ticketEntryPriceTickets }
          : {}),
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
