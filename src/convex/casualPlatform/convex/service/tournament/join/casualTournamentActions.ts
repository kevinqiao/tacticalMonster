"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../../../_generated/api";
import { action } from "../../../_generated/server";
import { jwtAccessSecret } from "../../auth/jwtAccessSecret";
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
export const joinTournament = action({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
  },
  handler: async (ctx, { uid, tournamentId }): Promise<JoinCasualRunResult> => {
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

export const createScoreVerificationNonce = action({
  args: { token: v.string(), externalGameId: v.string() },
  handler: async (_ctx, { token, externalGameId }) => {
    const secret = jwtAccessSecret();
    if (!secret) {
      return { ok: false as const };
    }
    try {
      const payload = jwt.verify(token, secret);
      if (!payload || typeof payload !== "object" || !("uid" in payload)) {
        return { ok: false as const };
      }
      const uid = String((payload as { uid: unknown }).uid);
      const nonce = crypto.randomBytes(16).toString("hex");
      return {
        ok: true as const,
        nonce,
        uid,
        externalGameId,
        hint: "Wire blockBlast Convex to verify nonce with casualPlatform (TODO)",
      };
    } catch {
      return { ok: false as const };
    }
  },
});
