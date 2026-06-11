"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../../../_generated/api";
import { action } from "../../../_generated/server";
import { jwtAccessSecret } from "../../auth/jwtAccessSecret";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";

/**
 * 日榜（maxPlayers<=1）：同步建局 + solitaire seed 绑定；异步场仅入队。
 */
export const joinTournament = action({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    dailySoloCostAck: v.optional(v.literal(true)),
  },
  handler: async (ctx, { uid, tournamentId, dailySoloCostAck }): Promise<JoinCasualRunResult> => {
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }
    if (def.maxPlayers <= 1) {
      const result = await ctx.runMutation(
        internal.service.tournament.join.casualJoinMutations.joinCasualRunCore,
        { uid, tournamentId, dailySoloCostAck }
      );
      if (!result.ok || result.queued !== false) {
        return result;
      }
      if (
        result.matchId &&
        (def.gameType === "solitaire" || def.gameType === "block_blast")
      ) {
        const bind = await ctx.runAction(
          internal.service.tournament.join.casualMatchSeedActions.bindCasualMatchSeed,
          {
            matchId: result.matchId,
            templateId: tournamentId,
            sessionKey: `casual_sess:${result.matchId}`,
          }
        );
        if (!bind.ok) {
          return { ok: false as const, error: bind.error ?? "seed_bind_failed" };
        }
      }
      return result;
    }
    return await ctx.runMutation(
      internal.service.tournament.join.casualMatchmaking.enqueueCasualMatchmakingAndTryMatch,
      { uid, tournamentId, dailySoloCostAck }
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
