import { makeFunctionReference } from "convex/server";

/**
 * Convex function refs for campaign deployment.
 * Partner-scoped campaign ops use campaignPartnerGameActions (actions + partnerId).
 * Store CRUD / store_staff live in SSO; redeem validate/redeem/void stay here via storeId.
 */
export const merchantCampaignFns = {
  getCampaignPublic: makeFunctionReference<"query">(
    "service/merchant/merchantCampaigns:getCampaignPublic"
  ),

  resolvePartnerByPartnerSlug: makeFunctionReference<"query">(
    "service/merchant/merchantCampaigns:resolvePartnerByPartnerSlug"
  ),

  listPartnerCampaignsPublic: makeFunctionReference<"query">(
    "service/merchant/merchantCampaigns:listPartnerCampaignsPublic"
  ),

  getMyCampaignCoupon: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:getMyCampaignCoupon"
  ),

  getCampaignLeaderboard: makeFunctionReference<"action">(
    "service/merchant/campaignSettleHookActions:getCampaignLeaderboard"
  ),

  getCampaignSettlementStatus: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:getCampaignSettlementStatus"
  ),

  triggerCampaignLeaderboardSettlement: makeFunctionReference<"action">(
    "service/merchant/campaignSettleHookActions:triggerCampaignLeaderboardSettlement"
  ),

  ensureCampaignBoardBotsForLeaderboard: makeFunctionReference<"action">(
    "service/merchant/campaignSettleHookActions:ensureCampaignBoardBotsForLeaderboard"
  ),

  listPlayerCoupons: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:listPlayerCoupons"
  ),

  listPlayerCouponsForPartner: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:listPlayerCouponsForPartner"
  ),

  getCampaignPlayerProfile: makeFunctionReference<"query">(
    "service/player/campaignPlayerProfile:getCampaignPlayerProfile"
  ),

  updateCampaignDisplayName: makeFunctionReference<"mutation">(
    "service/player/campaignPlayerProfile:updateCampaignDisplayName"
  ),

  syncCampaignContactProfile: makeFunctionReference<"mutation">(
    "service/player/campaignPlayerProfile:syncCampaignContactProfile"
  ),

  listCampaignCouponsForStaff: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:listCampaignCouponsForStaff"
  ),

  /** Partner-scoped campaign CRUD (actions). */
  createCampaign: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:createCampaign"
  ),

  updateCampaign: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:updateCampaign"
  ),

  getCampaignForStaff: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:getCampaignForStaff"
  ),

  listCampaigns: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:listCampaigns"
  ),

  updateCampaignStatus: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:updateCampaignStatus"
  ),

  finalizeCampaignLeaderboardRewardsStaff: makeFunctionReference<"action">(
    "service/merchant/campaignSettleHookActions:finalizeCampaignLeaderboardRewardsStaff"
  ),

  generatePosterUploadUrl: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:generatePosterUploadUrl"
  ),

  attachCampaignPoster: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:attachCampaignPoster"
  ),

  updateMerchantBrandUrl: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:updatePartnerBrandUrl"
  ),

  approveMerchantTheme: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:approvePartnerTheme"
  ),

  syncThemeFromUrl: makeFunctionReference<"action">(
    "service/merchant/merchantThemeSync:syncThemeFromUrl"
  ),

  validateCouponCode: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:validateCouponCode"
  ),

  redeemCoupon: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:redeemCoupon"
  ),

  voidCoupon: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:voidCoupon"
  ),

  getCampaignReport: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:getCampaignReport"
  ),

  listCouponDefsForStaff: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:listCouponDefsForStaff"
  ),
  createCouponDef: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:createCouponDef"
  ),
  updateCouponDef: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:updateCouponDef"
  ),
  archiveCouponDef: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:archiveCouponDef"
  ),

  upsertPartnerBrand: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:upsertPartnerBrand"
  ),

  passkitAvailability: makeFunctionReference<"query">(
    "service/wallet/passkitAvailability:passkitAvailability"
  ),

  createAppleWalletPass: makeFunctionReference<"action">(
    "service/wallet/applePassActions:createAppleWalletPass"
  ),
} as const;
