import { CASUAL_RANK_RATES_4B } from "../../data/casualTournamentConfigs";

export { CASUAL_RANK_RATES_4B };

/** rankRates 平衡与 DB 累计共用：仅 1–4 四档；实际名次 >3 归入第 4 档 */
export const CASUAL_RANK_STAT_BUCKET_MAX = 4;

/** 终局实际名次 → 统计分档：1/2/3 不变，≥4 均为 4 */
export function collapseActualRankToStatBucket(rank: number): number {
  if (!Number.isFinite(rank) || rank < 1) return CASUAL_RANK_STAT_BUCKET_MAX;
  if (rank <= 3) return Math.floor(rank);
  return CASUAL_RANK_STAT_BUCKET_MAX;
}

/** 读取 DB 时合并 legacy「5+」键到第 4 档 */
export function normalizeRankCountsForStats(
  raw: Record<number, number> | Record<string, number>
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const rank = Number(k);
    if (!Number.isFinite(rank) || rank < 1 || typeof v !== "number" || v <= 0) continue;
    const bucket = collapseActualRankToStatBucket(rank);
    out[bucket] = (out[bucket] ?? 0) + v;
  }
  return out;
}

function pseudoUnitForBucketExpand(seed: number, salt: number): number {
  let x = Math.imul(seed ^ (salt * 374761393), 2654435761);
  x ^= x >>> 13;
  x ^= x << 17;
  x ^= x >>> 5;
  return (x >>> 0) / 4294967296;
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
  const u = pseudoUnitForBucketExpand(sessionSeed, 31);
  return CASUAL_RANK_STAT_BUCKET_MAX + Math.floor(u * span);
}
