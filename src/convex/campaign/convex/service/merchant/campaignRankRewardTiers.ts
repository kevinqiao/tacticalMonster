/** Shared rank-band helpers for leaderboard reward rules. */

export function rankRuleBounds(rule: {
  rankFrom?: number;
  rankTo?: number;
  topN?: number;
}): { from: number; to: number } {
  if (
    typeof rule.rankFrom === "number" &&
    typeof rule.rankTo === "number" &&
    rule.rankFrom >= 1 &&
    rule.rankTo >= rule.rankFrom
  ) {
    return { from: rule.rankFrom, to: rule.rankTo };
  }
  const topN = Math.max(1, rule.topN ?? 1);
  return { from: 1, to: topN };
}

export function rankMatchesLeaderboardRule(
  rank: number,
  rule: { rankFrom?: number; rankTo?: number; topN?: number }
): boolean {
  const { from, to } = rankRuleBounds(rule);
  return rank >= from && rank <= to;
}

export function assertNonOverlappingRankTiers(
  rules: Array<{ rankFrom?: number; rankTo?: number; topN?: number }>
): void {
  const bands = rules.map((r) => rankRuleBounds(r));
  for (let i = 0; i < bands.length; i += 1) {
    const band = bands[i];
    if (band.from > band.to || band.to > 20 || band.from < 1) {
      throw new Error("invalid_rank_tier");
    }
    for (let j = i + 1; j < bands.length; j += 1) {
      const other = bands[j];
      if (band.from <= other.to && other.from <= band.to) {
        throw new Error("rank_tiers_overlap");
      }
    }
  }
}

export function maxLeaderboardRankFromRules(
  rules: Array<{ rankFrom?: number; rankTo?: number; topN?: number }>
): number {
  if (rules.length === 0) return 0;
  return Math.max(...rules.map((r) => rankRuleBounds(r).to));
}
