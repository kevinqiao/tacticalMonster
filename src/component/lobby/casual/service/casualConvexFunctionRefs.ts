/**
 * 休闲 Convex 的显式函数引用（`makeFunctionReference` 固定 UDF 路径，不依赖 `anyApi` 代理）。
 */
import { makeFunctionReference } from "convex/server";

export const casualTournamentFns = {
  listTournaments: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:listTournaments"
  ),
  leaderboard: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:leaderboard"
  ),
  periodInstanceSelfStanding: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:periodInstanceSelfStanding"
  ),
  gameHistory: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:gameHistory"
  ),
  listOpenCasualRunAssignments: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:listOpenCasualRunAssignments"
  ),
  getTriathlonSessionProgress: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:getTriathlonSessionProgress"
  ),
  listCasualMatchQueueForUid: makeFunctionReference<"query">(
    "service/tournament/join/casualMatchmaking:listCasualMatchQueueForUid"
  ),
  leaveCasualMatchQueue: makeFunctionReference<"mutation">(
    "service/tournament/join/casualMatchmaking:leaveCasualMatchQueue"
  ),
  joinTournament: makeFunctionReference<"action">(
    "service/tournament/join/casualTournamentActions:joinTournament"
  ),
  confirmCasualRunWithoutReplay: makeFunctionReference<"mutation">(
    "service/tournament/submit/casualRunIngestMutations:confirmCasualRunWithoutReplay"
  ),
  startCasualRunReplay: makeFunctionReference<"mutation">(
    "service/tournament/replay/casualReplayPassService:startCasualRunReplay"
  ),
  countUnusedReplayTokensForUid: makeFunctionReference<"query">(
    "service/tournament/replay/casualReplayPassService:countUnusedReplayTokensForUid"
  ),
  previewJoinEntryCharge: makeFunctionReference<"query">(
    "service/tournament/join/casualJoinMutations:previewJoinEntryCharge"
  ),
  getCasualAsyncTableSummaryForGame: makeFunctionReference<"query">(
    "service/tournament/submit/casualRunIngestMutations:getCasualAsyncTableSummaryForGame"
  ),
  claimCasualRunRewards: makeFunctionReference<"mutation">(
    "service/tournament/settle/casualRunRewardsMutations:claimCasualRunRewards"
  ),
  claimCasualScoreTierPendingReward: makeFunctionReference<"mutation">(
    "service/tournament/settle/casualRunRewardsMutations:claimCasualScoreTierPendingReward"
  ),
  claimCasualScoreTierPendingRewardsBatch: makeFunctionReference<"mutation">(
    "service/tournament/settle/casualRunRewardsMutations:claimCasualScoreTierPendingRewardsBatch"
  ),
} as const;

export const casualSkinFns = {
  getSkinCatalog: makeFunctionReference<"query">("service/skin/casualSkinService:getSkinCatalog"),
  getPlayerSkinState: makeFunctionReference<"query">("service/skin/casualSkinService:getPlayerSkinState"),
  equipSkin: makeFunctionReference<"mutation">("service/skin/casualSkinService:equipSkin"),
  unequipSkin: makeFunctionReference<"mutation">("service/skin/casualSkinService:unequipSkin"),
} as const;

export const casualInstanceFns = {
  listInstancePendingRewards: makeFunctionReference<"query">(
    "service/tournament/list/casualInstanceService:listInstancePendingRewards"
  ),
  claimCasualInstanceRewards: makeFunctionReference<"mutation">(
    "service/tournament/list/casualInstanceService:claimCasualInstanceRewards"
  ),
} as const;
