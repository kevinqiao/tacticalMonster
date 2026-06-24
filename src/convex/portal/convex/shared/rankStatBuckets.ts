import { CASUAL_RANK_STAT_BUCKET_MAX } from "./constants";
import { pseudoUnit } from "./pseudoUnit";

/** 终局实际名次 → 统计分档：1/2/3 不变，≥4 均为 4 */
export function collapseActualRankToStatBucket(rank: number): number {
  if (!Number.isFinite(rank) || rank < 1) return CASUAL_RANK_STAT_BUCKET_MAX;
  if (rank <= 3) return Math.floor(rank);
  return CASUAL_RANK_STAT_BUCKET_MAX;
}

/** 统计分档 → 本局 targetRank；第 4 档在 maxPlayers>4 时展开为 4..maxPlayers */
export function expandStatBucketToTargetRank(
  statBucket: number,
  maxPlayers: number,
  sessionSeed: number
): number {
  const mp = Math.max(1, Math.floor(maxPlayers));
  const bucket = collapseActualRankToStatBucket(statBucket);
  if (bucket <= 3) return Math.min(bucket, mp);
  if (mp <= CASUAL_RANK_STAT_BUCKET_MAX) return mp;
  const span = mp - CASUAL_RANK_STAT_BUCKET_MAX + 1;
  const u = pseudoUnit(sessionSeed, 31);
  return CASUAL_RANK_STAT_BUCKET_MAX + Math.floor(u * span);
}
