import type { MutationCtx, QueryCtx } from "../../../_generated/server";

/** 每 uid 全局最多一桌 open / replaying */
export async function assertNoGlobalOpenCasualMatch(
  ctx: MutationCtx | QueryCtx,
  uids: string[]
): Promise<{ ok: true } | { ok: false; error: "already_in_open_match"; uid: string }> {
  const unique = [...new Set(uids.map((u) => u.trim()).filter(Boolean))];
  for (const uid of unique) {
    const rows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const active = rows.find((r) => r.status === "open" || r.status === "replaying");
    if (active) {
      return { ok: false as const, error: "already_in_open_match" as const, uid };
    }
  }
  return { ok: true as const };
}

export async function findAnyGlobalOpenCasualMatch(
  ctx: MutationCtx | QueryCtx,
  uid: string
): Promise<{ gameId: string; matchId: string; templateId: string } | null> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  const open = rows
    .filter((r) => r.status === "open" || r.status === "replaying")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!open) return null;
  return {
    gameId: open.gameId,
    matchId: open.matchId,
    templateId: open.templateId,
    runTournamentId: String(open.tournamentId),
  };
}
