import {
  LEGACY_CAMPAIGN_MERCHANT_PATH,
  PARTNER_ADMIN_PATH,
  PARTNER_OPERATION_PATH,
  partnerAdminHref,
  partnerOperationHref,
} from "../../partner/partnerPaths";

export type MerchantEmbeddedRoute =
  | { view: "home" }
  /** Partner-admin embedded nav (partnerId, not store). */
  | { view: "campaigns"; partnerId: string }
  | { view: "coupon-defs"; partnerId: string }
  | { view: "coupons"; partnerId: string; campaignId?: string }
  | { view: "brand"; partnerId: string }
  /** Store console: storeId optional on redeem (QR may only carry code). */
  | { view: "redeem"; storeId?: string; storeName?: string }
  | { view: "team"; storeId: string; storeName?: string };

const MERCHANT_SHELL_VIEWS = [
  "campaigns",
  "coupon-defs",
  "coupons",
  "redeem",
  "brand",
  "team",
] as const;

export type MerchantShellView = (typeof MERCHANT_SHELL_VIEWS)[number];

export function isMerchantShellView(value: string | null): value is MerchantShellView {
  return value !== null && (MERCHANT_SHELL_VIEWS as readonly string[]).includes(value);
}

function isStoreConsolePath(pathname: string): boolean {
  return (
    pathname.startsWith(PARTNER_OPERATION_PATH) ||
    pathname.startsWith(LEGACY_CAMPAIGN_MERCHANT_PATH)
  );
}

function storeIdFromSearch(params: URLSearchParams): string {
  return (params.get("storeId") ?? params.get("merchantId") ?? "").trim();
}

function storeNameFromSearch(params: URLSearchParams): string | undefined {
  return params.get("storeName") ?? params.get("merchantName") ?? undefined;
}

/** Deep link / legacy child paths → in-app route (SPA). */
export function parseMerchantRouteFromLocation(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): MerchantEmbeddedRoute | null {
  if (!isStoreConsolePath(pathname)) {
    return null;
  }

  const params = new URLSearchParams(search);
  const storeId = storeIdFromSearch(params);
  const storeName = storeNameFromSearch(params);
  const code = (params.get("code") ?? "").trim();
  let viewParam = params.get("view")?.trim() ?? null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "cc" && parts[1] === "merchant" && parts[2]) {
    viewParam = parts[2];
  }
  if (parts[0] === "partner" && parts[1] === "operation" && parts[2]) {
    viewParam = parts[2];
  }

  if (!viewParam && code) {
    viewParam = "redeem";
  }

  if (!viewParam) {
    return null;
  }

  if (viewParam === "redeem") {
    return {
      view: "redeem",
      ...(storeId ? { storeId, ...(storeName ? { storeName } : {}) } : {}),
    };
  }

  if (viewParam === "team") {
    if (!storeId) return null;
    return { view: "team", storeId, ...(storeName ? { storeName } : {}) };
  }

  // Partner-ops views on operation console are unused; keep parse for legacy links.
  const partnerId = (params.get("partnerId") ?? storeId).trim();
  if (!partnerId || !isMerchantShellView(viewParam)) {
    return null;
  }

  const campaignId = params.get("campaignId")?.trim();
  switch (viewParam) {
    case "campaigns":
      return { view: "campaigns", partnerId };
    case "coupon-defs":
      return { view: "coupon-defs", partnerId };
    case "coupons":
      return { view: "coupons", partnerId, ...(campaignId ? { campaignId } : {}) };
    case "brand":
      return { view: "brand", partnerId };
    default:
      return null;
  }
}

/** Shareable URL for SPA (also accepts legacy path segments on load). */
export function merchantRouteHref(route: MerchantEmbeddedRoute): string {
  switch (route.view) {
    case "home":
      // Campaign ops live on Partner Admin; store console home stays operation.
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith(PARTNER_ADMIN_PATH)
      ) {
        return PARTNER_ADMIN_PATH;
      }
      return PARTNER_OPERATION_PATH;
    case "redeem": {
      const q = new URLSearchParams({ view: "redeem" });
      if (route.storeId) q.set("storeId", route.storeId);
      if (route.storeName) q.set("storeName", route.storeName);
      return partnerOperationHref(q);
    }
    case "team": {
      const q = new URLSearchParams({
        view: "team",
        storeId: route.storeId,
      });
      if (route.storeName) q.set("storeName", route.storeName);
      return partnerOperationHref(q);
    }
    // Partner-scoped config → /partner/admin (not /partner/operation stub).
    case "campaigns":
      return partnerAdminHref({
        partnerId: route.partnerId,
        section: "campaigns",
      });
    case "coupon-defs":
      return partnerAdminHref({
        partnerId: route.partnerId,
        section: "shop",
      });
    case "coupons":
      return partnerAdminHref({
        partnerId: route.partnerId,
        section: "campaigns",
        ...(route.campaignId ? { campaignId: route.campaignId } : {}),
      });
    case "brand":
      return partnerAdminHref({
        partnerId: route.partnerId,
        section: "brand",
      });
  }
}

export function merchantRouteKey(route: MerchantEmbeddedRoute): string {
  switch (route.view) {
    case "home":
      return "home";
    case "campaigns":
      return `campaigns:${route.partnerId}`;
    case "coupon-defs":
      return `coupon-defs:${route.partnerId}`;
    case "coupons":
      return `coupons:${route.partnerId}:${route.campaignId ?? ""}`;
    case "redeem":
      return `redeem:${route.storeId ?? ""}`;
    case "brand":
      return `brand:${route.partnerId}`;
    case "team":
      return `team:${route.storeId}`;
  }
}
