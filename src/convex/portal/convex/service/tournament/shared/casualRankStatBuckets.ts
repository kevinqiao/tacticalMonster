import { CASUAL_RANK_RATES_4B } from "../../../data/portalTournamentConfigs";
import { CASUAL_RANK_STAT_BUCKET_MAX } from "../../../shared/constants";
import { collapseActualRankToStatBucket } from "../../../shared/rankStatBuckets";

export { CASUAL_RANK_RATES_4B };
export { CASUAL_RANK_STAT_BUCKET_MAX };

export {
  collapseActualRankToStatBucket,
  expandStatBucketToTargetRank,
} from "../../../shared/rankStatBuckets";

/** ?? DB ??? legacy?5+???? 4 ? */
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

