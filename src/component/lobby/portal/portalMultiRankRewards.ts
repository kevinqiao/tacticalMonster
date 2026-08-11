/**
 * Client-side multi tournament rank reward schedule (template defaults).
 * Same source as picker 1st-place prize highlight.
 */
import {
  getPortalTournamentDefinition,
  resolveEffectiveTournamentRewards,
} from "@/convex/portal/convex/data/portalTournamentConfigs";

export type MultiRankRewardRow = {
  rank: number;
  points: number;
  /** null when this tournament has no coin column / no payout for the rank. */
  coins: number | null;
};

export type MultiRankRewardsView = {
  tournamentId: string;
  rows: MultiRankRewardRow[];
  showCoins: boolean;
  /** Coin-entry amount when entry.kind === "coins". */
  entryCoins: number | null;
};

function collectRanks(
  rankPoints: Record<number, number> | undefined,
  rankCoins: Record<string, number> | undefined
): number[] {
  const set = new Set<number>();
  if (rankPoints) {
    for (const k of Object.keys(rankPoints)) {
      const n = Number(k);
      if (Number.isFinite(n) && n > 0) set.add(Math.floor(n));
    }
  }
  if (rankCoins) {
    for (const k of Object.keys(rankCoins)) {
      const n = Number(k);
      if (Number.isFinite(n) && n > 0) set.add(Math.floor(n));
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Build 1..N rank rows for a multi_ranked tournament template. */
export function buildMultiRankRewardsView(
  tournamentId: string
): MultiRankRewardsView | null {
  const def = getPortalTournamentDefinition(tournamentId);
  if (!def || def.matchType !== "multi_ranked") return null;
  const rewards = resolveEffectiveTournamentRewards(def);
  const rankPoints = rewards.rankPoints;
  const rankCoins = rewards.coinRewards?.rankCoins;

  const ranks = collectRanks(rankPoints, rankCoins);
  if (ranks.length === 0) return null;

  const showCoins =
    def.entry.kind === "coins" ||
    Object.values(rankCoins ?? {}).some(
      (v) => typeof v === "number" && Number.isFinite(v) && v > 0
    );

  const rows: MultiRankRewardRow[] = ranks.map((rank) => {
    const ptsRaw = rankPoints?.[rank];
    const points =
      typeof ptsRaw === "number" && Number.isFinite(ptsRaw) ? ptsRaw : 0;
    const coinsRaw = rankCoins?.[String(rank)];
    const coins =
      showCoins &&
      typeof coinsRaw === "number" &&
      Number.isFinite(coinsRaw) &&
      coinsRaw > 0
        ? Math.floor(coinsRaw)
        : null;
    return { rank, points, coins };
  });

  const entryCoins =
    def.entry.kind === "coins" &&
    typeof def.entry.amount === "number" &&
    Number.isFinite(def.entry.amount)
      ? Math.floor(def.entry.amount)
      : null;

  return { tournamentId, rows, showCoins, entryCoins };
}
