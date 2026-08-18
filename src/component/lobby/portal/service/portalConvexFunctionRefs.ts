import { makeFunctionReference } from "convex/server";

export const portalTournamentFns = {
  resolvePortalLobby: makeFunctionReference<"mutation">(
    "service/lobby/portalLobbyMutations:resolvePortalLobby"
  ),
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
  listPortalPlayerBadges: makeFunctionReference<"query">(
    "service/badge/portalBadgeService:listPortalPlayerBadges"
  ),
  dismissPortalSeasonMarks: makeFunctionReference<"mutation">(
    "service/badge/portalBadgeService:dismissPortalSeasonMarks"
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
  createStripeCheckout: makeFunctionReference<"action">(
    "service/shop/stripeCheckoutAction:createStripeCheckout"
  ),
  reconcileStripeCheckout: makeFunctionReference<"action">(
    "service/shop/stripeCheckoutAction:reconcileStripeCheckout"
  ),
  listMyBackpackItems: makeFunctionReference<"query">(
    "service/backpack/portalBackpackService:listMyBackpackItems"
  ),
  requestUseBackpackVoucher: makeFunctionReference<"mutation">(
    "service/backpack/portalBackpackService:requestUseBackpackVoucher"
  ),
  cancelUseBackpackVoucher: makeFunctionReference<"mutation">(
    "service/backpack/portalBackpackService:cancelUseBackpackVoucher"
  ),
  syncRedemptionProfile: makeFunctionReference<"mutation">(
    "service/giftcard/giftCardQueries:syncRedemptionProfile"
  ),
  getPortalPlayerProfile: makeFunctionReference<"query">(
    "service/player/portalPlayerProfile:getPortalPlayerProfile"
  ),
  updatePortalDisplayName: makeFunctionReference<"mutation">(
    "service/player/portalPlayerProfile:updatePortalDisplayName"
  ),
  listMyGiftCardOrders: makeFunctionReference<"query">(
    "service/giftcard/giftCardQueries:listMyGiftCardOrders"
  ),
  listMyShopOrders: makeFunctionReference<"query">(
    "service/shop/shopOrdersQueries:listMyShopOrders"
  ),
  getGiftCardRedemption: makeFunctionReference<"query">(
    "service/giftcard/giftCardQueries:getGiftCardRedemption"
  ),
  getRedemptionProfile: makeFunctionReference<"query">(
    "service/giftcard/giftCardQueries:getRedemptionProfile"
  ),
  refreshGiftCardRedemption: makeFunctionReference<"action">(
    "service/giftcard/giftCardActions:refreshGiftCardRedemption"
  ),
  resendGiftCardEmail: makeFunctionReference<"action">(
    "service/giftcard/giftCardActions:resendGiftCardEmail"
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
  resolvePortalTown: makeFunctionReference<"mutation">(
    "service/town/portalTownMutations:resolvePortalTown"
  ),
  townGetProgress: makeFunctionReference<"query">(
    "service/town/townProgress:getProgress"
  ),
  townValidateEntry: makeFunctionReference<"query">(
    "service/town/gate:validateEntry"
  ),
  townRecordEntry: makeFunctionReference<"mutation">(
    "service/town/gate:recordEntry"
  ),
  townDevelopZone: makeFunctionReference<"mutation">(
    "service/town/zones:developZoneMutation"
  ),
  townUpgradeZone: makeFunctionReference<"mutation">(
    "service/town/zones:upgradeZoneMutation"
  ),
  townDevelopDistrict: makeFunctionReference<"mutation">(
    "service/town/zones:developDistrictMutation"
  ),
  townUpgradeDistrict: makeFunctionReference<"mutation">(
    "service/town/zones:upgradeDistrictMutation"
  ),
  townRebrandDistrict: makeFunctionReference<"mutation">(
    "service/town/zones:rebrandDistrictMutation"
  ),
  townClaimTermPass: makeFunctionReference<"mutation">(
    "service/town/zones:claimTermPassMutation"
  ),
  townClaimGameOps: makeFunctionReference<"mutation">(
    "service/town/zones:claimGameOpsMutation"
  ),
  townCollectPassive: makeFunctionReference<"mutation">(
    "service/town/zones:collectPassiveMutation"
  ),
  townExpandDistrict: makeFunctionReference<"mutation">(
    "service/town/zones:expandDistrictMutation"
  ),
  townSetCurrentDistrict: makeFunctionReference<"mutation">(
    "service/town/zones:setCurrentDistrictMutation"
  ),
  townEnsureZones: makeFunctionReference<"mutation">(
    "service/town/zones:ensureZones"
  ),
  getCampaignDailyPlayQuota: makeFunctionReference<"query">(
    "service/tournament/join/campaignDailyPlayLimit:getCampaignDailyPlayQuota"
  ),
  getPortalDailyPlayQuota: makeFunctionReference<"query">(
    "service/tournament/join/portalDailyPlayLimit:getPortalDailyPlayQuota"
  ),
  getPortalTournamentDailyPlayQuotas: makeFunctionReference<"query">(
    "service/tournament/join/portalDailyPlayLimit:getPortalTournamentDailyPlayQuotas"
  ),
  getTicketEntryOffer: makeFunctionReference<"query">(
    "service/ads/portalTicketEntryQueries:getTicketEntryOffer"
  ),
  getAdEntryOffer: makeFunctionReference<"query">(
    "service/ads/portalAdEntryQueries:getAdEntryOffer"
  ),
  beginAdEntrySession: makeFunctionReference<"mutation">(
    "service/ads/portalAdEntryMutations:beginAdEntrySession"
  ),
  completeAdEntrySession: makeFunctionReference<"mutation">(
    "service/ads/portalAdEntryMutations:completeAdEntrySession"
  ),
  listCampaignPlayHistory: makeFunctionReference<"query">(
    "service/tournament/join/campaignPlayHistory:listCampaignPlayHistory"
  ),
  getCampaignPlayReport: makeFunctionReference<"query">(
    "service/tournament/join/campaignPlayHistory:getCampaignPlayReport"
  ),
  beginAdReplaySession: makeFunctionReference<"mutation">(
    "service/ads/portalAdReplayMutations:beginAdReplaySession"
  ),
  completeAdReplaySession: makeFunctionReference<"mutation">(
    "service/ads/portalAdReplayMutations:completeAdReplaySession"
  ),
  confirmCasualRunWithoutReplay: makeFunctionReference<"mutation">(
    "service/tournament/submit/casualRunIngestMutations:confirmCasualRunWithoutReplay"
  ),
  countUnusedReplayTokensForUid: makeFunctionReference<"query">(
    "service/tournament/replay/casualReplayPassService:countUnusedReplayTokensForUid"
  ),
  getAdReplayDailyRemaining: makeFunctionReference<"query">(
    "service/ads/portalAdReplayQueries:getAdReplayDailyRemaining"
  ),
  getAdCoinOffer: makeFunctionReference<"query">(
    "service/ads/portalAdCoinQueries:getAdCoinOffer"
  ),
  beginAdCoinSession: makeFunctionReference<"mutation">(
    "service/ads/portalAdCoinMutations:beginAdCoinSession"
  ),
  completeAdCoinSession: makeFunctionReference<"mutation">(
    "service/ads/portalAdCoinMutations:completeAdCoinSession"
  ),
  getDailyCheckinStatus: makeFunctionReference<"query">(
    "service/reward/portalDailyCheckinQueries:getDailyCheckinStatus"
  ),
  claimDailyCheckin: makeFunctionReference<"mutation">(
    "service/reward/portalDailyCheckinMutations:claimDailyCheckin"
  ),
  getPortalRewardedAdMode: makeFunctionReference<"query">(
    "service/ads/portalRewardedAdModeQuery:getPortalRewardedAdMode"
  ),
} as const;
