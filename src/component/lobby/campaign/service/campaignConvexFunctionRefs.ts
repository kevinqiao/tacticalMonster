import { makeFunctionReference } from "convex/server";



export const merchantCampaignFns = {

  getCampaignPublic: makeFunctionReference<"query">(

    "service/merchant/merchantCampaigns:getCampaignPublic"

  ),

  resolvePartnerByMerchantSlug: makeFunctionReference<"query">(

    "service/merchant/merchantCampaigns:resolvePartnerByMerchantSlug"

  ),

  listMerchantCampaignsPublic: makeFunctionReference<"query">(

    "service/merchant/merchantCampaigns:listMerchantCampaignsPublic"

  ),

  getMyCampaignCoupon: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:getMyCampaignCoupon"

  ),

  getCampaignLeaderboard: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:getCampaignLeaderboard"

  ),

  getCampaignSettlementStatus: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:getCampaignSettlementStatus"

  ),

  triggerCampaignLeaderboardSettlement: makeFunctionReference<"mutation">(

    "service/merchant/campaignSettleHook:triggerCampaignLeaderboardSettlement"

  ),

  ensureCampaignBoardBotsForLeaderboard: makeFunctionReference<"mutation">(

    "service/merchant/campaignSettleHook:ensureCampaignBoardBotsForLeaderboard"

  ),

  listPlayerCoupons: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:listPlayerCoupons"

  ),

  listPlayerCouponsForMerchant: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:listPlayerCouponsForMerchant"

  ),

  listCampaignCouponsForStaff: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:listCampaignCouponsForStaff"

  ),

  createMerchant: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:createMerchant"

  ),

  listMyMerchants: makeFunctionReference<"query">(

    "service/merchant/merchantCampaigns:listMyMerchants"

  ),

  listMerchantTeam: makeFunctionReference<"query">(
    "service/merchant/merchantStaffAdmin:listMerchantTeam"
  ),

  addMerchantStaff: makeFunctionReference<"mutation">(
    "service/merchant/merchantStaffAdmin:addMerchantStaff"
  ),

  removeMerchantStaff: makeFunctionReference<"mutation">(
    "service/merchant/merchantStaffAdmin:removeMerchantStaff"
  ),

  createCampaign: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:createCampaign"

  ),

  updateCampaign: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:updateCampaign"

  ),

  getCampaignForStaff: makeFunctionReference<"query">(

    "service/merchant/merchantCampaigns:getCampaignForStaff"

  ),

  listCampaigns: makeFunctionReference<"query">(

    "service/merchant/merchantCampaigns:listCampaigns"

  ),

  updateCampaignStatus: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:updateCampaignStatus"

  ),

  finalizeCampaignLeaderboardRewardsStaff: makeFunctionReference<"mutation">(

    "service/merchant/campaignSettleHook:finalizeCampaignLeaderboardRewardsStaff"

  ),

  generatePosterUploadUrl: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:generatePosterUploadUrl"

  ),

  attachCampaignPoster: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:attachCampaignPoster"

  ),

  updateMerchantBrandUrl: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:updateMerchantBrandUrl"

  ),

  approveMerchantTheme: makeFunctionReference<"mutation">(

    "service/merchant/merchantCampaigns:approveMerchantTheme"

  ),

  syncThemeFromUrl: makeFunctionReference<"action">(

    "service/merchant/merchantThemeSync:syncThemeFromUrl"

  ),

  validateCouponCode: makeFunctionReference<"query">(

    "service/merchant/merchantRedeem:validateCouponCode"

  ),

  redeemCoupon: makeFunctionReference<"mutation">(

    "service/merchant/merchantRedeem:redeemCoupon"

  ),

  voidCoupon: makeFunctionReference<"mutation">(

    "service/merchant/merchantRedeem:voidCoupon"

  ),

  getCampaignReport: makeFunctionReference<"query">(

    "service/merchant/campaignSettleHook:getCampaignReport"

  ),

  listCouponDefsForStaff: makeFunctionReference<"query">(
    "service/merchant/merchantCouponDefs:listCouponDefsForStaff"
  ),
  createCouponDef: makeFunctionReference<"mutation">(
    "service/merchant/merchantCouponDefs:createCouponDef"
  ),
  updateCouponDef: makeFunctionReference<"mutation">(
    "service/merchant/merchantCouponDefs:updateCouponDef"
  ),
  archiveCouponDef: makeFunctionReference<"mutation">(
    "service/merchant/merchantCouponDefs:archiveCouponDef"
  ),

} as const;

