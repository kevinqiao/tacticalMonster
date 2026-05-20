import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';

/** 与后端 `CASUAL_NEAR_MISS_GAP_RATIO` 对齐 */
export const CASUAL_NEAR_MISS_GAP_RATIO = 0.1;

export function isCasualNearMissTableSummary(
  summary: CasualAsyncTableSummaryUI | null | undefined
): boolean {
  if (!summary?.rows?.length) return false;
  const you = summary.rows.find((r) => r.isYou);
  const first = summary.rows.find((r) => r.rank === 1);
  if (!you || !first || you.rank === 1) return false;
  if (first.score <= 0) return false;
  const gap = (first.score - you.score) / first.score;
  return gap >= 0 && gap <= CASUAL_NEAR_MISS_GAP_RATIO;
}
