/** Merchant staff redeem page URL encoded in player coupon QR codes (SPA deep link). */
export function merchantCouponRedeemUrl(merchantId: string, code: string): string {
  const url = new URL(`${window.location.origin}/campaign/merchant`);
  url.searchParams.set("view", "redeem");
  url.searchParams.set("merchantId", merchantId);
  url.searchParams.set("code", code.trim().toUpperCase());
  return url.toString();
}
