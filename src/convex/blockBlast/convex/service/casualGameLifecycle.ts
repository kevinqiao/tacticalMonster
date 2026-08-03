/**
 * Casual run game row lifecycle for blockBlast_game table.
 */
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { BlockBlastGameStatus } from "../types/BlockBlastTypes";
import { computeBlockBlastTotalScore } from "./blockBlastScoreModel";

export function parseCasualRunGameId(gameId: string): { uid: string; matchId: string } | null {
  if (!gameId.startsWith("game_")) return null;
  let rest = gameId.slice("game_".length);
  const gameIndexSuffix = rest.match(/_g(\d+)$/);
  if (gameIndexSuffix) {
    rest = rest.slice(0, rest.length - gameIndexSuffix[0].length);
  }
  const sep = rest.indexOf("_");
  if (sep <= 0 || sep >= rest.length - 1) return null;
  const matchId = rest.slice(0, sep);
  const uid = rest.slice(sep + 1);
  if (!matchId || !uid) return null;
  return { uid, matchId };
}

export function isTerminalBlockBlastStatus(status: number): boolean {
  return (
    status === BlockBlastGameStatus.WON ||
    status === BlockBlastGameStatus.LOST ||
    status === BlockBlastGameStatus.COMPLETED ||
    status === BlockBlastGameStatus.CANCELLED
  );
}

type GameRow = {
  _id: Id<"blockBlast_game">;
  gameId: string;
  status: number;
  score: number;
  lines: number;
  moves: number;
  casualTimeoutScheduledId?: Id<"_scheduled_functions">;
};

export function resolveCasualIngestScoreFromRow(game: {
  score?: number;
  lines?: number;
  moves?: number;
}): number {
  return computeBlockBlastTotalScore(
    Number(game.score ?? 0),
    Number(game.lines ?? 0),
    Number(game.moves ?? 0)
  );
}

export const cancelCasualTimeoutJob = internalMutation({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const rows = await ctx.db
      .query("blockBlast_game")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    const row = rows.sort((a, b) => b._creationTime - a._creationTime)[0];
    if (!row?.casualTimeoutScheduledId) {
      return { ok: true as const, cancelled: false as const };
    }
    const jobId = row.casualTimeoutScheduledId;
    try {
      await ctx.scheduler.cancel(jobId);
    } catch (e) {
      console.warn("[blockBlast] cancelCasualTimeoutJob failed", gameId, e);
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
    gameRowId: v.optional(v.id("blockBlast_game")),
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
      const rows = await ctx.db
        .query("blockBlast_game")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .collect();
      const found = rows.sort((a, b) => b._creationTime - a._creationTime)[0];
      row = found ? (found as GameRow) : null;
    }

    if (!row) {
      return { ok: false as const, shouldIngest: false as const, reason: "gone" as const };
    }

    const status = Number(row.status);
    if (!isTerminalBlockBlastStatus(status)) {
      await ctx.db.patch(row._id, {
        status: BlockBlastGameStatus.CANCELLED,
      });
      row = {
        ...row,
        status: BlockBlastGameStatus.CANCELLED,
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
