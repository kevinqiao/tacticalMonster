export type WeeklyLeagueSettlePayload = Record<string, never>;

export function isP75ChallengeSuccess(
  def: { matchType: string },
  score: number,
  seedScoreThreshold?: number
): boolean {
  if (def.matchType !== "solo_p75" && def.matchType !== "solo_p75_challenge") return false;
  if (typeof seedScoreThreshold !== "number" || !Number.isFinite(seedScoreThreshold)) return false;
  return score >= seedScoreThreshold;
}
