import { getTournamentDefinition } from "./casualTournamentConfigs";

export type SeasonChallengeTierRating = "S" | "A" | "B" | "C";

export interface SeasonChallengeTierRow {
  rating: SeasonChallengeTierRating;
  /** 含端：score >= minScore 命中该档（降序遍历） */
  minScore: number;
  challengePoints: number;
  bonusSeasonVoucher?: number;
}

const BLOCK_BLAST_SEASON_CHALLENGE_TIERS: SeasonChallengeTierRow[] = [
  { rating: "S", minScore: 12_000, challengePoints: 12, bonusSeasonVoucher: 1 },
  { rating: "A", minScore: 7000, challengePoints: 8 },
  { rating: "B", minScore: 3500, challengePoints: 5 },
  { rating: "C", minScore: 0, challengePoints: 2 },
];

export interface SeasonChallengeSettlement {
  rating: SeasonChallengeTierRating;
  challengePoints: number;
  bonusSeasonVoucher: number;
}

/**
 * 单场提交成绩对应的档位奖励（按本局 score，非历史最佳）。
 * 仅 `season_challenge` + 已配置玩法生效。
 */
export function resolveSeasonChallengeSettlement(
  tournamentId: string,
  gameId: string,
  score: number
): SeasonChallengeSettlement | null {
  const def = getTournamentDefinition(tournamentId);
  if (!def || def.matchType !== "season_challenge") return null;
  if (gameId !== "block_blast") return null;

  for (const row of BLOCK_BLAST_SEASON_CHALLENGE_TIERS) {
    if (score >= row.minScore) {
      return {
        rating: row.rating,
        challengePoints: row.challengePoints,
        bonusSeasonVoucher: row.bonusSeasonVoucher ?? 0,
      };
    }
  }
  return null;
}
