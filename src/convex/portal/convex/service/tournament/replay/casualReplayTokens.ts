/**
 * ???:?? / ?? / near-miss ???
 */
import { CASUAL_NEAR_MISS_GAP_RATIO } from "../../../data/portalPlayerStrategyTypes";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";

export async function countUnusedReplayTokens(ctx: QueryCtx, uid: string): Promise<number> {
  const rows = await ctx.db
    .query("casual_replay_tokens")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .collect();
  return rows.filter((r) => r.usedAt == null).length;
}

export async function consumeReplayToken(
  ctx: MutationCtx,
  args: { uid: string; tokenId: Id<"casual_replay_tokens">; tournamentId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await ctx.db.get(args.tokenId);
  if (!row || row.uid !== args.uid) return { ok: false, error: "token_invalid" };
  if (row.usedAt != null) return { ok: false, error: "token_used" };
  await ctx.db.patch(args.tokenId, {
    usedAt: Date.now(),
    usedForTournamentId: args.tournamentId,
  });
  return { ok: true };
}

export async function grantReplayTokens(
  ctx: MutationCtx,
  uid: string,
  count: number
): Promise<void> {
  const n = Math.min(Math.max(count, 0), 50);
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    await ctx.db.insert("casual_replay_tokens", {
      uid,
      createdAt: now,
    });
  }
}

export function isNearMissTableSummary(
  summary: { rows: Array<{ rank: number; score: number; isYou: boolean }> } | null | undefined
): boolean {
  if (!summary?.rows?.length) return false;
  const you = summary.rows.find((r) => r.isYou);
  const first = summary.rows.find((r) => r.rank === 1);
  if (!you || !first || you.rank === 1) return false;
  if (first.score <= 0) return false;
  const gap = (first.score - you.score) / first.score;
  return gap >= 0 && gap <= CASUAL_NEAR_MISS_GAP_RATIO;
}
