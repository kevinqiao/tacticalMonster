import type { CampaignCouponView } from "./campaignTypes";

/** 与 Campaign authorize 一致：issued + redeemed 计入上限 */
export function countActiveCampaignCoupons(coupons: CampaignCouponView[]): number {
  return coupons.filter((c) => c.status === "issued" || c.status === "redeemed").length;
}

export function remainingCampaignCouponSlots(
  claimedCount: number,
  maxCouponsPerPlayer: number
): number {
  return Math.max(0, maxCouponsPerPlayer - claimedCount);
}

export function isCampaignCouponLimitReached(
  claimedCount: number,
  maxCouponsPerPlayer: number
): boolean {
  return claimedCount >= maxCouponsPerPlayer;
}

export function sortCampaignCouponsNewestFirst(
  coupons: CampaignCouponView[]
): CampaignCouponView[] {
  return [...coupons]
    .filter((c) => c.status !== "void")
    .sort((a, b) => b.issuedAt - a.issuedAt);
}

export function latestIssuedCampaignCoupon(
  coupons: CampaignCouponView[]
): CampaignCouponView | null {
  return (
    sortCampaignCouponsNewestFirst(coupons).find((c) => c.status === "issued") ?? null
  );
}
