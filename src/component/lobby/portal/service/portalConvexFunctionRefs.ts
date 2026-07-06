import { makeFunctionReference } from "convex/server";

export const portalTournamentFns = {
  listTournaments: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:listTournaments"
  ),
  gameHistory: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:gameHistory"
  ),
  listOpenCasualRunAssignments: makeFunctionReference<"query">(
    "service/tournament/list/casualTournamentQueries:listOpenCasualRunAssignments"
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
  getCasualAsyncTableSummaryForGame: makeFunctionReference<"query">(
    "service/tournament/submit/casualRunIngestMutations:getCasualAsyncTableSummaryForGame"
  ),
  getWeeklyLeaderboard: makeFunctionReference<"query">(
    "service/points/portalLeaderboardQueries:getWeeklyLeaderboard"
  ),
  getPortalWeeklyTotalLeaderboard: makeFunctionReference<"query">(
    "service/points/portalLeaderboardQueries:getPortalWeeklyTotalLeaderboard"
  ),
  ensureWeeklyTotalPointsForGame: makeFunctionReference<"mutation">(
    "service/points/portalLeaderboardQueries:ensureWeeklyTotalPointsForGame"
  ),
  ensurePortalWeeklyLeagueMember: makeFunctionReference<"mutation">(
    "service/weeklyLeague/portalWeeklyLeagueQueries:ensurePortalWeeklyLeagueMemberMutation"
  ),
  getPortalWeeklyLeagueTierView: makeFunctionReference<"query">(
    "service/weeklyLeague/portalWeeklyLeagueQueries:getPortalWeeklyLeagueTierView"
  ),
  getPortalWeeklyLeagueCohortLeaderboard: makeFunctionReference<"query">(
    "service/weeklyLeague/portalWeeklyLeagueQueries:getPortalWeeklyLeagueCohortLeaderboard"
  ),
  claimPortalWeeklyLeagueRewards: makeFunctionReference<"mutation">(
    "service/weeklyLeague/portalWeeklyLeagueQueries:claimPortalWeeklyLeagueRewards"
  ),
  dismissPortalWeeklyLeagueClose: makeFunctionReference<"mutation">(
    "service/weeklyLeague/portalWeeklyLeagueQueries:dismissPortalWeeklyLeagueClose"
  ),
  getPortalPlayerWallet: makeFunctionReference<"query">(
    "service/player/playerManager:getPortalPlayerWallet"
  ),
  listPortalShopSkus: makeFunctionReference<"query">(
    "service/shop/portalShopService:listPortalShopSkus"
  ),
  purchasePortalShopSku: makeFunctionReference<"mutation">(
    "service/shop/portalShopService:purchasePortalShopSku"
  ),
  getMyWeeklyPoints: makeFunctionReference<"query">(
    "service/points/portalLeaderboardQueries:getMyWeeklyPoints"
  ),
  ensureWeeklyBoardBotsForGame: makeFunctionReference<"mutation">(
    "service/points/portalLeaderboardQueries:ensureWeeklyBoardBotsForGame"
  ),
  reconcilePendingCasualHistorySettlements: makeFunctionReference<"mutation">(
    "service/tournament/settle/casualHistorySettleReconcile:reconcilePendingCasualHistorySettlements"
  ),
  reconcileExpiredOpenCasualRuns: makeFunctionReference<"action">(
    "service/tournament/settle/casualOpenRunReconcileAction:reconcileExpiredOpenCasualRuns"
  ),
  authenticatePlayer: makeFunctionReference<"action">(
    "service/auth/portalAuth:authenticate"
  ),
  getCampaignDailyPlayQuota: makeFunctionReference<"query">(
    "service/tournament/join/campaignDailyPlayLimit:getCampaignDailyPlayQuota"
  ),
  listCampaignPlayHistory: makeFunctionReference<"query">(
    "service/tournament/join/campaignPlayHistory:listCampaignPlayHistory"
  ),
} as const;
