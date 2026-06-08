"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../../_generated/api";
import { action } from "../../_generated/server";
import { jwtAccessSecret } from "../auth/jwtAccessSecret";
import { getTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { JoinCasualRunResult } from "./casualTournamentTypes";

/**
 * 校验 JWT 后调用 `applyScore`（须已有 run：`casual_run_player_matches`）。
 * 异步锦标 **run**（`game_*`）结算仅允许经 `/internal/casual-run-ingest` + `CASUAL_GAME_BRIDGE_SECRET`，
 * 由 solitaireArena / blockBlast `submitCasualPlatformRun` 写入；前端不得携带客户端自选分数调用 casual。
 * Phase A：createScoreVerificationNonce 等对账扩展保留。
 */
export const submitScore = action({
  args: {
    token: v.string(),
    tournamentId: v.string(),
    gameType: v.string(),
    score: v.number(),
  },
  handler: async (ctx, { token, tournamentId, gameType, score }) => {
    const secret = jwtAccessSecret();
    if (!secret) {
      console.error("[casualPlatform] submitScore: JWT secret unavailable");
      return { ok: false as const, error: "server_misconfigured" };
    }
    try {
      const payload = jwt.verify(token, secret);
      if (!payload || typeof payload !== "object" || !("uid" in payload)) {
        return { ok: false as const, error: "invalid_token" };
      }
      const uid = String((payload as { uid: unknown }).uid);
      await ctx.runMutation(internal.service.tournament.casualTournamentService.applyScore, {
        uid,
        tournamentId,
        gameType,
        score,
      });
      return { ok: true as const };
    } catch (e) {
      console.error("[casualPlatform] submitScore", e);
      return { ok: false as const, error: "verify_failed" };
    }
  },
});

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
        internal.service.tournament.casualTournamentService.joinCasualRunCore,
        { uid, tournamentId, dailySoloCostAck }
      );
      if (!result.ok || result.queued !== false) {
        return result;
      }
      if (def.gameType === "solitaire" && result.matchId) {
        const bind = await ctx.runAction(
          internal.service.tournament.casualMatchSeedActions.bindCasualMatchSeed,
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
      internal.service.tournament.casualMatchmaking.enqueueCasualMatchmakingAndTryMatch,
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
