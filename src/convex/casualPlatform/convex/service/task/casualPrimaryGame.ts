import type { QueryCtx } from "../../_generated/server.js";

const PRIMARY_GAME_LOOKBACK_MS = 14 * 86400000;
const DEFAULT_PRIMARY_GAME = "solitaire";

/**
 * 近 14 天有效结算局数最多的平台 `gameId`（`casual_run_player_matches.gameType`）。
 */
export async function resolvePrimaryPlatformGameId(
  ctx: QueryCtx,
  uid: string,
  nowMs: number = Date.now()
): Promise<string> {
  const since = nowMs - PRIMARY_GAME_LOOKBACK_MS;
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "settled" && row.status !== "confirmed" && row.status !== "finished") {
      continue;
    }
    if ((row.updatedAt ?? row.createdAt) < since) continue;
    const gameType = row.gameType?.trim();
    if (!gameType) continue;
    counts.set(gameType, (counts.get(gameType) ?? 0) + 1);
  }

  let best = DEFAULT_PRIMARY_GAME;
  let bestCount = 0;
  for (const [gameId, count] of counts) {
    if (count > bestCount) {
      best = gameId;
      bestCount = count;
    }
  }
  return best;
}
