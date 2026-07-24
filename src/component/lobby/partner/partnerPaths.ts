import { CAMPAIGN_URL_PREFIX } from "@/host/util/appUrlSegments";

/** Partner HQ console. */
export const PARTNER_ADMIN_PATH = "/partner/admin";

/** Store staff console: redeem + store team (store_staff only). */
export const PARTNER_OPERATION_PATH = "/partner/operation";

/** Legacy store console path — keep for QR / bookmarks; redirect to operation. */
export const LEGACY_CAMPAIGN_MERCHANT_PATH = `${CAMPAIGN_URL_PREFIX}/merchant`;

export function isPartnerOperationPath(
  pathname = typeof window !== "undefined" ? window.location.pathname : ""
): boolean {
  return (
    pathname.startsWith(PARTNER_OPERATION_PATH) ||
    pathname.startsWith(LEGACY_CAMPAIGN_MERCHANT_PATH)
  );
}

/** Build operation URL; preserves query (view, storeId, code, …). */
export function partnerOperationHref(
  search: string | URLSearchParams | Record<string, string> = ""
): string {
  let q: URLSearchParams;
  if (typeof search === "string") {
    q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } else if (search instanceof URLSearchParams) {
    q = new URLSearchParams(search);
  } else {
    q = new URLSearchParams(search);
  }
  const s = q.toString();
  return s ? `${PARTNER_OPERATION_PATH}?${s}` : PARTNER_OPERATION_PATH;
}

/** Deep link into Partner Admin modal section (campaign ops live here, not /partner/operation). */
export function partnerAdminHref(args: {
  partnerId: number | string;
  section:
    | "profile"
    | "auth"
    | "team"
    | "campaigns"
    | "coupon-defs"
    | "coupons"
    | "brand"
    | "stores";
  campaignId?: string;
}): string {
  const q = new URLSearchParams({
    partnerId: String(args.partnerId),
    section: args.section,
  });
  if (args.campaignId) q.set("campaignId", args.campaignId);
  return `${PARTNER_ADMIN_PATH}?${q.toString()}`;
}
