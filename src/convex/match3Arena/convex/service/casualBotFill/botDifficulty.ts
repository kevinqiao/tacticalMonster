export type { CasualBotGameType } from "../../shared/constants";
export type {
  BotScoreSlot,
  RankedEntity,
} from "../../shared/botScoreSlots";
export {
  assignRanksByScoreDesc,
  clampTargetRank,
  computeFixedTopBotScoreSlots,
  computeSoloBotScoreSlots,
  eligibleMaxRank,
  generateSoloBotScores,
  hashSessionSeed,
  scoreForRankSlot,
} from "../../shared/botScoreSlots";
export type {
  RankScoreFloorsByRank,
  ScoreQuantiles,
} from "../../shared/scoreQuantiles";
export {
  deriveRankScoreFloorsFromQuantiles,
  recommendTargetRankFromQuantileProximity,
} from "../../shared/scoreQuantiles";
export { pickDurationFallbackMs } from "../../shared/durationFallback";
