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
    /** Explicitly select the ticket rung after free plays are exhausted. */
    ticketEntry: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { tournamentId, partnerSlug, campaignSlug, ticketEntry }
  ): Promise<JoinCasualRunResult> => {
    const uid = ctx.uid;
    let resolvedTemplateId = tournamentId;
    let campaignId: string | undefined;
    let partnerId: number | undefined;
    let campaignRewardMode: "pass_per_run" | "competitive_leaderboard" | undefined;
    let campaignDueTime: number | undefined;
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
    if (ticketEntry) {
      const entry = await ctx.runMutation(
        internal.service.ads.portalTicketEntryService.consumeTicketEntryForJoin,
        { uid, templateId: resolvedTemplateId }
      );
      if (!entry.ok) return entry;
    }

    if (def.maxPlayers <= 1) {
      return await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.openCasualSoloTable,
        {
          uid,
          templateId: resolvedTemplateId,
          ...(campaignId ? { campaignId } : {}),
          ...(partnerId != null ? { partnerId } : {}),
          ...(campaignRewardMode ? { campaignRewardMode } : {}),
          ...(campaignDueTime != null ? { campaignDueTime } : {}),
          ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
          ...(dayTimezone ? { dayTimezone } : {}),
        }
      );
    }

    return await ctx.runMutation(
      internal.service.tournament.join.casualMatchmaking.enqueueCasualMatchmakingAndTryMatch,
      {
        uid,
        tournamentId: resolvedTemplateId,
        ...(campaignId ? { campaignId } : {}),
        ...(partnerId != null ? { partnerId } : {}),
        ...(campaignRewardMode ? { campaignRewardMode } : {}),
        ...(campaignDueTime != null ? { campaignDueTime } : {}),
        ...(maxPlaysPerDay != null ? { maxPlaysPerDay } : {}),
        ...(dayTimezone ? { dayTimezone } : {}),
      }
    );
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
