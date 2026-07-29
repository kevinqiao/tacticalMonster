/** Portal replay-ticket balance helpers (legacy token table removed). */
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { CASUAL_NEAR_MISS_GAP_RATIO } from "../../../data/portalPlayerStrategyTypes";
import { getPlayerWalletBalances } from "../../economy/portalWalletDao";

export async function readPortalTicketBalance(
  ctx: QueryCtx | MutationCtx,
  uid: string,
  scopeKey: string = "shared"
): Promise<number> {
  const bal = await getPlayerWalletBalances(ctx, uid, scopeKey);
  return bal.tickets;
}

/** @deprecated Use readPortalTicketBalance. */
export async function countUnusedReplayTokens(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<number> {
  return readPortalTicketBalance(ctx, uid);
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
