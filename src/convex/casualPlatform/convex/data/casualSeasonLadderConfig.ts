import type { CasualTournamentDefinition } from "./casualTournamentConfigs";
import {
  effectiveInstanceScope,
  findCasualRankRewardEntry,
  seasonPointsFromScore,
} from "./casualTournamentConfigs";

/** 段位门槛（`minPoints` 升序）；`tierId` 由积分落在的最高档决定 */
export const CASUAL_LADDER_TIER_THRESHOLDS: ReadonlyArray<{
  tierId: string;
  minPoints: number;
}> = [
  { tierId: "bronze", minPoints: -999_999 },
  { tierId: "silver", minPoints: 0 },
  { tierId: "gold", minPoints: 50 },
  { tierId: "platinum", minPoints: 150 },
  { tierId: "diamond", minPoints: 300 },
];

export function computeCasualLadderTier(points: number): string {
  let tierId = CASUAL_LADDER_TIER_THRESHOLDS[0]!.tierId;
  for (const row of CASUAL_LADDER_TIER_THRESHOLDS) {
    if (points >= row.minPoints) tierId = row.tierId;
  }
  return tierId;
}

export type CasualLadderParticipation = "multiplayer_rank" | "daily_score" | "none";

/** PRD：日榜计入；纯单人不计；多人/专场按名次 ± */
export function casualLadderParticipation(def: CasualTournamentDefinition): CasualLadderParticipation {
  if (effectiveInstanceScope(def) === "daily") {
    return "daily_score";
  }
  const hasRankSeasonPoints = def.rewards.rankRewards?.some(
    (r) => typeof r.seasonPoints === "number"
  );
  if (hasRankSeasonPoints && def.maxPlayers > 1) {
    return "multiplayer_rank";
  }
  if (def.matchType === "season_challenge") {
    return "multiplayer_rank";
  }
  return "none";
}

/**
 * 本场应对 `(seasonId, uid)` 竞技积分累加的 Δ；`null` 表示不写天梯分。
 */
export function resolveCasualLadderPointsDelta(
  def: CasualTournamentDefinition,
  args: { score: number; multiplayerFinalRank?: number }
): number | null {
  const mode = casualLadderParticipation(def);
  if (mode === "none") return null;

  if (mode === "daily_score") {
    const delta = seasonPointsFromScore(args.score, def.seasonPointsMultiplier);
    return delta !== 0 ? delta : null;
  }

  const mpRank = args.multiplayerFinalRank;
  if (typeof mpRank !== "number" || mpRank < 1) return null;
  const rr = findCasualRankRewardEntry(def.rewards.rankRewards, mpRank);
  if (rr && typeof rr.seasonPoints === "number") {
    return rr.seasonPoints;
  }
  const penalty = def.rewards.seasonPointsRankMissPenalty ?? 0;
  return penalty !== 0 ? penalty : null;
}
