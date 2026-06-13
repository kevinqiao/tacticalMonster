/**
 * Casual run game row lifecycle for match3_game table.
 */
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { Match3GameStatus } from "../types/Match3Types";
import {
  buildMatch3GameReport,
  MATCH3_MATCH_TIME_LIMIT_SEC,
  resolveLiveGameElapsedSec,
} from "./match3Scoring";

export function parseCasualRunGameId(gameId: string): { uid: string; matchId: string } | null {
  if (!gameId.startsWith("game_")) return null;
  const rest = gameId.slice("game_".length);
  const sep = rest.indexOf("_");
  if (sep <= 0 || sep >= rest.length - 1) return null;
  const matchId = rest.slice(0, sep);
  const uid = rest.slice(sep + 1);
  if (!matchId || !uid) return null;
  return { uid, matchId };
}

export function isTerminalMatch3Status(status: number): boolean {
  return status === Match3GameStatus.COMPLETED || status === Match3GameStatus.CANCELLED;
}

type GameRow = {
  _id: Id<"match3_game">;
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
    MATCH3_MATCH_TIME_LIMIT_SEC,
    resolveLiveGameElapsedSec(game.playStartedAt)
  );
  return buildMatch3GameReport(baseScore, elapsedSec).totalScore;
}

export const cancelCasualTimeoutJob = internalMutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const row = await ctx.db
      .query("match3_game")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!row?.casualTimeoutScheduledId) {
      return { ok: true as const, cancelled: false as const };
    }
    const jobId = row.casualTimeoutScheduledId;
    try {
      await ctx.scheduler.cancel(jobId);
    } catch (e) {
      console.warn("[match3] cancelCasualTimeoutJob failed", gameId, e);
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
    gameRowId: v.optional(v.id("match3_game")),
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
        .query("match3_game")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();
      row = found ? (found as GameRow) : null;
    }

    if (!row) {
      return { ok: false as const, shouldIngest: false as const, reason: "gone" as const };
    }

    const now = Date.now();
    const status = Number(row.status);
    if (!isTerminalMatch3Status(status)) {
      const playStartedAt = row.playStartedAt ?? now;
      await ctx.db.patch(row._id, {
        status: Match3GameStatus.CANCELLED,
        playStartedAt,
      });
      row = {
        ...row,
        status: Match3GameStatus.CANCELLED,
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
