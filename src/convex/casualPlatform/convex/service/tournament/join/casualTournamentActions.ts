"use node";
import { v } from "convex/values";
import crypto from "crypto";
import { internal } from "../../../_generated/api";
import { authedAction } from "../../../custom/session";
import {
  getTournamentDefinition,
  isDeprecatedDailySoloTournament,
  isJoinableCasualTournament,
} from "../../../data/casualTournamentConfigs";
import { isCasualGameLobbyVisible } from "../../../data/casualGameRegistry";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";

/**
 * 单人（maxPlayers<=1，如 p75）：openCasualSoloTable 同步开桌；多人异步仅入队。
 */
export const joinTournament = authedAction({
  args: {
    tournamentId: v.string(),
  },
  handler: async (ctx, { tournamentId }): Promise<JoinCasualRunResult> => {
    const uid = ctx.uid;
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }
    if (isDeprecatedDailySoloTournament(tournamentId)) {
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
        { uid, templateId: tournamentId }
      );
    }

    return await ctx.runMutation(
      internal.service.tournament.join.casualMatchmaking.enqueueCasualMatchmakingAndTryMatch,
      { uid, tournamentId }
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
