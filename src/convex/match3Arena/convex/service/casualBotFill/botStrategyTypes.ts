/** Bot strategy types mirrored from casualPlatform for solo rank recommend (solitaire-only). */
import { CASUAL_RANK_STAT_BUCKET_MAX } from "../../shared/constants";

export const CASUAL_CONSECUTIVE_LOSS_THRESHOLD = 3;

export type BotRankDistribution = {
  weights: Record<number, number>;
};

export type BotStrategyPlayerContext = {
  uid: string;
  tournamentId: string;
  templateId: string;
  matchType: string;
  gameType: "solitaire" | "block_blast" | "match_3";
  maxPlayers: number;
  seasonLadderPoints: number;
  completedMultiplayerMatches: number;
  coinsBalance: number;
  daysSinceLastMatch: number;
  passLevel: number;
  passTrack: "none" | "standard" | "deluxe";
  consecutiveLossStreak: number;
};

export type CasualRankRateEntry = { rank: number; odd: number };

export { CASUAL_RANK_STAT_BUCKET_MAX };
export {
  collapseActualRankToStatBucket,
  expandStatBucketToTargetRank,
} from "../../shared/rankStatBuckets";
