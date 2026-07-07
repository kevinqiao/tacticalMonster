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
import { isCasualGameLobbyVisible } from "../../../data/portalGameRegistry";
import { authorizeCampaignJoinViaHttp } from "../../bridge/merchantCampaignBridge";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";

/**
 * Solo (maxPlayers<=1): openCasualSoloTable; multi: enqueue matchmaking.
 */
export const joinTournament = authedAction({
  args: {
    tournamentId: v.optional(v.string()),
    merchantSlug: v.optional(v.string()),
    campaignSlug: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { tournamentId, merchantSlug, campaignSlug }
  ): Promise<JoinCasualRunResult> => {
    const uid = ctx.uid;
    let resolvedTemplateId = tournamentId;
    let campaignId: string | undefined;
    let merchantId: string | undefined;
    let maxPlaysPerDay: number | undefined;
    let dayTimezone: string | undefined;

    if (merchantSlug && campaignSlug) {
      const authorized = await authorizeCampaignJoinViaHttp({
        uid,
        merchantSlug,
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
      merchantId = authorized.merchantId;
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

    if (def.maxPlayers <= 1) {
      return await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.openCasualSoloTable,
        {
          uid,
          templateId: resolvedTemplateId,
          ...(campaignId ? { campaignId } : {}),
          ...(merchantId ? { merchantId } : {}),
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
        ...(merchantId ? { merchantId } : {}),
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
