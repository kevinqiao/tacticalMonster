"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

function jwtSecret(): string | null {
  const s = process.env.JWT_ACCESS_SECRET;
  return s && s.length > 0 ? s : null;
}

/**
 * Phase A：校验 JWT 后写入 casual_entries；游戏 Convex 对账见 `createScoreVerificationNonce`。
 */
export const submitScore = action({
  args: {
    token: v.string(),
    tournamentId: v.string(),
    gameId: v.string(),
    score: v.number(),
    externalGameId: v.optional(v.string()),
  },
  handler: async (ctx, { token, tournamentId, gameId, score, externalGameId }) => {
    const secret = jwtSecret();
    if (!secret) {
      console.error("[casualPlatform] submitScore: JWT_ACCESS_SECRET missing");
      return { ok: false as const, error: "server_misconfigured" };
    }
    try {
      const payload = jwt.verify(token, secret);
      if (!payload || typeof payload !== "object" || !("uid" in payload)) {
        return { ok: false as const, error: "invalid_token" };
      }
      const uid = String((payload as { uid: unknown }).uid);
      await ctx.runMutation(internal.service.casualTournamentService.seedDemoTournaments, {});
      await ctx.runMutation(internal.service.casualTournamentService.applyScore, {
        uid,
        tournamentId,
        gameId,
        score,
        externalGameId,
      });
      return { ok: true as const };
    } catch (e) {
      console.error("[casualPlatform] submitScore", e);
      return { ok: false as const, error: "verify_failed" };
    }
  },
});

export const createScoreVerificationNonce = action({
  args: { token: v.string(), externalGameId: v.string() },
  handler: async (_ctx, { token, externalGameId }) => {
    const secret = jwtSecret();
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
