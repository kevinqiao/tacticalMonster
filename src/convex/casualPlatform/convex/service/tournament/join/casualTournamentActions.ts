"use node";
import { v } from "convex/values";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { internal } from "../../../_generated/api";
import { action } from "../../../_generated/server";
import { jwtAccessSecret } from "../../auth/jwtAccessSecret";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import type { JoinCasualRunResult } from "../shared/casualTournamentTypes";
import { requiresDailySoloPlayCostAck } from "./casualTournamentJoinCore";

/**
 * 日榜（maxPlayers<=1）：openCasualDailySoloTable；异步场仅入队。
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
      const preview = await ctx.runQuery(
        internal.service.tournament.join.casualJoinMutations.previewJoinEntryChargeInternal,
        { uid, tournamentId }
      );
      if (!preview.ok) {
        return { ok: false as const, error: preview.error };
      }
      if (
        requiresDailySoloPlayCostAck(tournamentId, preview.willChargeEntry) &&
        dailySoloCostAck !== true
      ) {
        return { ok: false as const, error: "needs_cost_ack" };
      }

      return await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.openCasualDailySoloTable,
        { uid, templateId: tournamentId }
      );
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
