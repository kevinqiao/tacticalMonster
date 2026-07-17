import { PARTNER_OPERATION_PATH } from "../../partner/partnerPaths";

/**
 * Player coupon QR → store staff redeem deep link.
 * Only `code` is required; staff resolve storeId after login (single store auto / multi pick).
 */
export function merchantCouponRedeemUrl(code: string): string {
  const url = new URL(`${window.location.origin}${PARTNER_OPERATION_PATH}`);
  url.searchParams.set("view", "redeem");
  url.searchParams.set("code", code.trim().toUpperCase());
  return url.toString();
}
