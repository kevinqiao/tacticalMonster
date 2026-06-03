/**
 * Casual run game row lifecycle: timeout settlement, scheduler cancel (game table only).
 */
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { SoloGameStatus } from "../types/SoloTypes";
import {
  buildSolitaireCashGameReport,
  resolveLiveGameElapsedSec,
  SOLITAIRE_MATCH_TIME_LIMIT_SEC,
} from "./seedPool/solitaireScoring";

export function parseCasualRunGameId(gameId: string): { uid: string } | null {
  if (!gameId.startsWith("game_")) return null;
  const rest = gameId.slice("game_".length);
  const lastUnderscore = rest.lastIndexOf("_");
  if (lastUnderscore <= 0 || lastUnderscore >= rest.length - 1) return null;
  const uid = rest.slice(lastUnderscore + 1);
  if (!uid) return null;
  return { uid };
}

export function isTerminalSolitaireStatus(status: number): boolean {
  return status === SoloGameStatus.COMPLETED || status === SoloGameStatus.CANCELLED;
}

type GameRow = {
  _id: Id<"game">;
  gameId: string;
  status: number;
  score: number;
  playStartedAt?: number;
  casualTimeoutScheduledId?: Id<"_scheduled_functions">;
};

export function resolveCasualIngestScoreFromRow(game: {
  score?: number;
  playStartedAt?: number;
}): number {
  const baseScore = Math.max(0, Math.floor(Number(game.score ?? 0)));
  const elapsedSec = Math.min(
    SOLITAIRE_MATCH_TIME_LIMIT_SEC,
    resolveLiveGameElapsedSec(game.playStartedAt)
  );
  return buildSolitaireCashGameReport(baseScore, elapsedSec).totalScore;
}

export const cancelCasualTimeoutJob = internalMutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const row = await ctx.db
      .query("game")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!row?.casualTimeoutScheduledId) {
      return { ok: true as const, cancelled: false as const };
    }
    const jobId = row.casualTimeoutScheduledId;
    try {
      await ctx.scheduler.cancel(jobId);
    } catch (e) {
      console.warn("[solitaire] cancelCasualTimeoutJob failed", gameId, e);
    }
    await ctx.db.patch(row._id, {
      casualTimeoutScheduledId: undefined,
    });
    return { ok: true as const, cancelled: true as const };
  },
});

export const settleCasualGameFromTable = internalMutation({
  args: {
    gameId: v.string(),
    uid: v.string(),
    gameRowId: v.optional(v.id("game")),
  },
  handler: async (ctx, { gameId, uid, gameRowId }) => {
    const parsed = parseCasualRunGameId(gameId);
    if (!parsed || parsed.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }

    let row: GameRow | null = null;
    if (gameRowId) {
      const byId = await ctx.db.get(gameRowId);
      if (byId && byId.gameId === gameId) {
        row = byId as GameRow;
      }
    }
    if (!row) {
      const found = await ctx.db
        .query("game")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      row = found ? (found as GameRow) : null;
    }

    if (!row) {
      return { ok: false as const, shouldIngest: false as const, reason: "gone" as const };
    }

    const now = Date.now();
    const status = Number(row.status);
    if (!isTerminalSolitaireStatus(status)) {
      const playStartedAt = row.playStartedAt ?? now;
      await ctx.db.patch(row._id, {
        status: SoloGameStatus.CANCELLED,
        playStartedAt,
      });
      row = {
        ...row,
        status: SoloGameStatus.CANCELLED,
        playStartedAt,
      };
    }

    const fresh = await ctx.db.get(row._id);
    if (!fresh) {
      return { ok: false as const, shouldIngest: false as const, reason: "gone" as const };
    }

    const score = resolveCasualIngestScoreFromRow(fresh);
    return {
      ok: true as const,
      shouldIngest: true as const,
      score,
      gameId,
      uid,
      gameRowId: row._id,
    };
  },
});

