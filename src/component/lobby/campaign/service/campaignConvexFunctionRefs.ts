import { makeFunctionReference } from "convex/server";

/**
 * Convex function refs for campaign deployment.
 * Partner-scoped campaign ops use campaignPartnerGameActions (actions + partnerId).
 * Store CRUD / store_staff live in SSO; redeem validate/redeem/void stay here via storeId.
 */
export const merchantCampaignFns = {
  // Public campaign reads are plain **queries** that take an already-resolved
  // `partnerId` — the FE resolves partnerSlug -> partnerId itself via
  // `usePartnerManager()` (SSO `PartnerManager.findByPartnerSlug`), same
  // pattern Portal uses for `/gc/{slug}`. No SSO HTTP round-trip happens in
  // the Campaign backend for these. See service/merchant/merchantCampaigns.ts.
  getCampaignPublic: makeFunctionReference<"query">(
    "service/merchant/merchantCampaigns:getCampaignPublic"
  ),

  listPartnerCampaignsPublic: makeFunctionReference<"query">(
    "service/merchant/merchantCampaigns:listPartnerCampaignsPublic"
  ),

  // Slug-resolving action kept for non-FE / legacy callers only — the FE
  // resolves partnerSlug -> partnerId via `usePartnerManager()` instead and
  // does not call this. See merchantCampaignPublicActions.ts.
  resolvePartnerByPartnerSlug: makeFunctionReference<"action">(
    "service/merchant/merchantCampaignPublicActions:resolvePartnerByPartnerSlug"
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

  getCampaignPlayerProfile: makeFunctionReference<"action">(
    "service/player/campaignPlayerProfile:getCampaignPlayerProfile"
  ),

  updateCampaignDisplayName: makeFunctionReference<"action">(
    "service/player/campaignPlayerProfile:updateCampaignDisplayName"
  ),

  syncCampaignContactProfile: makeFunctionReference<"action">(
    "service/player/campaignPlayerProfile:syncCampaignContactProfile"
  ),

  listCampaignCouponsForStaff: makeFunctionReference<"action">(
    "service/merchant/campaignSettleHookActions:listCampaignCouponsForStaff"
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

  validateCouponCode: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:validateCouponCode"
  ),

  redeemCoupon: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:redeemCoupon"
  ),

  voidCoupon: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:voidCoupon"
  ),

  /** Partner-admin void by campaign + code (no storeId) — used by the merchant coupon list. */
  voidCouponForStaff: makeFunctionReference<"action">(
    "service/merchant/merchantRedeemActions:voidCouponForStaff"
  ),

  getCampaignReport: makeFunctionReference<"query">(
    "service/merchant/campaignSettleHook:getCampaignReport"
  ),

  listCouponDefsForStaff: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:listCouponDefsForStaff"
  ),
  listPartnerVoucherSkusForStaff: makeFunctionReference<"action">(
    "service/merchant/campaignPartnerGameActions:listPartnerVoucherSkusForStaff"
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

  passkitAvailability: makeFunctionReference<"query">(
    "service/wallet/passkitAvailability:passkitAvailability"
  ),

  createAppleWalletPass: makeFunctionReference<"action">(
    "service/wallet/applePassActions:createAppleWalletPass"
  ),
} as const;
