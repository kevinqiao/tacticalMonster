/**
 * 休闲 Convex 的显式函数引用（`makeFunctionReference` 固定 UDF 路径，不依赖 `anyApi` 代理）。
 * 服务端另有 `service/casualTournamentService.ts` 重导出，兼容仍请求旧路径的客户端。
 */
import { makeFunctionReference } from "convex/server";

export const casualTournamentFns = {
  listTournaments: makeFunctionReference<"query">("service/tournament/casualTournamentService:listTournaments"),
  leaderboard: makeFunctionReference<"query">("service/tournament/casualTournamentService:leaderboard"),
  periodInstanceSelfStanding: makeFunctionReference<"query">(
    "service/tournament/casualTournamentService:periodInstanceSelfStanding"
  ),
  gameHistory: makeFunctionReference<"query">("service/tournament/casualTournamentService:gameHistory"),
  listOpenCasualRunAssignments: makeFunctionReference<"query">(
    "service/tournament/casualTournamentService:listOpenCasualRunAssignments"
  ),
  listCasualMatchQueueForUid: makeFunctionReference<"query">(
    "service/tournament/casualMatchmaking:listCasualMatchQueueForUid"
  ),
  leaveCasualMatchQueue: makeFunctionReference<"mutation">(
    "service/tournament/casualMatchmaking:leaveCasualMatchQueue"
  ),
  joinTournament: makeFunctionReference<"mutation">("service/tournament/casualTournamentService:joinTournament"),
  startCasualRunReplay: makeFunctionReference<"mutation">(
    "service/tournament/casualReplayPassService:startCasualRunReplay"
  ),
  countUnusedReplayTokensForUid: makeFunctionReference<"query">(
    "service/tournament/casualReplayPassService:countUnusedReplayTokensForUid"
  ),
  previewJoinEntryCharge: makeFunctionReference<"query">(
    "service/tournament/casualTournamentService:previewJoinEntryCharge"
  ),
  claimCasualRunRewards: makeFunctionReference<"mutation">(
    "service/tournament/casualTournamentService:claimCasualRunRewards"
  ),
  claimCasualScoreTierPendingReward: makeFunctionReference<"mutation">(
    "service/tournament/casualTournamentService:claimCasualScoreTierPendingReward"
  ),
  claimCasualScoreTierPendingRewardsBatch: makeFunctionReference<"mutation">(
    "service/tournament/casualTournamentService:claimCasualScoreTierPendingRewardsBatch"
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
    "service/tournament/casualInstanceService:listInstancePendingRewards"
  ),
  claimCasualInstanceRewards: makeFunctionReference<"mutation">(
    "service/tournament/casualInstanceService:claimCasualInstanceRewards"
  ),
} as const;
