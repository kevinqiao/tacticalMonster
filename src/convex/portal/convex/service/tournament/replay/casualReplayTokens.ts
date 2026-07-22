/** Portal replay-ticket balance and legacy-token migration helpers. */
import { v } from "convex/values";
import { CASUAL_NEAR_MISS_GAP_RATIO } from "../../../data/portalPlayerStrategyTypes";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { internalMutation } from "../../../_generated/server";
import { internal } from "../../../_generated/api";

export async function readPortalTicketBalance(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<number> {
  const player = await ctx.db
    .query("portal_players")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  return Math.max(0, Math.floor(player?.tickets ?? 0));
}

/** @deprecated Use readPortalTicketBalance. */
export async function countUnusedReplayTokens(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<number> {
  return readPortalTicketBalance(ctx, uid);
}

/**
 * One-user, idempotent migration. Run this for every legacy-token holder
 * before deleting `casual_replay_tokens` from the Portal schema.
 */
export const migrateLegacyReplayTokensToTickets = internalMutation({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const rows = await ctx.db
      .query("casual_replay_tokens")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .collect();
    const unused = rows.filter((row) => row.usedAt == null);
    if (unused.length === 0) return { ok: true as const, migrated: 0 };

    const granted = await ctx.runMutation(
      internal.service.reward.casualRewardRegistry.grantPortalTickets,
      { uid, amount: unused.length, reason: "legacy_replay_token_migration" }
    );
    if (!granted.ok) return { ok: false as const, error: granted.error, migrated: 0 };

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { ok: true as const, migrated: unused.length };
  }
});

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
