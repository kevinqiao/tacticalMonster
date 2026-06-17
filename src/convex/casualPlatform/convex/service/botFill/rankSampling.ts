import { CASUAL_RANK_STAT_BUCKET_MAX } from "../../shared/constants";
import { pseudoUnit } from "../../shared/pseudoUnit";
import type { CasualRankRateEntry } from "../../data/casualTournamentConfigs";

export type BotRankWeights = {
  weights: Record<number, number>;
};

export function sampleTargetRank(
  dist: BotRankWeights | null,
  maxPlayers: number,
  sessionSeed: number
): number {
  if (!dist) return Math.ceil(maxPlayers / 2);
  const weights: Array<{ rank: number; w: number }> = [];
  let total = 0;
  for (let r = 1; r <= maxPlayers; r++) {
    const w = dist.weights[r] ?? 0;
    if (w > 0) {
      weights.push({ rank: r, w });
      total += w;
    }
  }
  if (total <= 0) return 1;
  let x = pseudoUnit(sessionSeed, 17) * total;
  for (const { rank, w } of weights) {
    x -= w;
    if (x <= 0) return rank;
  }
  return weights[weights.length - 1]!.rank;
}

export function buildBalancedRankWeights(args: {
  rankRates: CasualRankRateEntry[];
  rankCounts: Record<number, number>;
}): BotRankWeights {
  const { rankRates, rankCounts } = args;
  const oddsByRank = new Map<number, number>();
  for (const entry of rankRates) {
    if (
      entry.rank >= 1 &&
      entry.rank <= CASUAL_RANK_STAT_BUCKET_MAX &&
      entry.odd > 0
    ) {
      oddsByRank.set(entry.rank, entry.odd);
    }
  }

  let oddSum = 0;
  for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
    oddSum += oddsByRank.get(r) ?? 0;
  }
  if (oddSum <= 0) {
    return { weights: { 1: 1 } };
  }

  let total = 0;
  for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
    total += rankCounts[r] ?? 0;
  }
  const denom = Math.max(total, 1);

  const weights: Record<number, number> = {};
  for (let r = 1; r <= CASUAL_RANK_STAT_BUCKET_MAX; r++) {
    const odd = oddsByRank.get(r) ?? 0;
    if (odd <= 0) continue;
    const targetShare = odd / oddSum;
    const expected = targetShare * denom;
    const deficit = expected - (rankCounts[r] ?? 0);
    weights[r] = Math.max(1, odd * (1 + deficit / denom));
  }
  return { weights };
}
