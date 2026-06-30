export type MerchantEmbeddedRoute =
  | { view: "home" }
  | { view: "campaigns"; merchantId: string; merchantName?: string }
  | { view: "coupon-defs"; merchantId: string; merchantName?: string }
  | { view: "coupons"; merchantId: string; merchantName?: string; campaignId?: string }
  | { view: "redeem"; merchantId: string; merchantName?: string }
  | { view: "brand"; merchantId: string; merchantName?: string }
  | { view: "team"; merchantId: string; merchantName?: string };

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

/** Deep link / legacy child paths → in-app route (SPA). */
export function parseMerchantRouteFromLocation(
  pathname = typeof window !== "undefined" ? window.location.pathname : "",
  search = typeof window !== "undefined" ? window.location.search : ""
): MerchantEmbeddedRoute | null {
  const params = new URLSearchParams(search);
  const merchantId = (params.get("merchantId") ?? "").trim();
  let viewParam = params.get("view")?.trim() ?? null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "campaign" && parts[1] === "merchant" && parts[2]) {
    viewParam = parts[2];
  }

  if (!merchantId || !isMerchantShellView(viewParam)) {
    return null;
  }

  const campaignId = params.get("campaignId")?.trim();
  const base = { merchantId, merchantName: params.get("merchantName") ?? undefined };

  switch (viewParam) {
    case "campaigns":
      return { view: "campaigns", ...base };
    case "coupon-defs":
      return { view: "coupon-defs", ...base };
    case "coupons":
      return { view: "coupons", ...base, ...(campaignId ? { campaignId } : {}) };
    case "redeem":
      return { view: "redeem", ...base };
    case "brand":
      return { view: "brand", ...base };
    case "team":
      return { view: "team", ...base };
  }
}

/** Shareable URL for SPA (also accepts legacy path segments on load). */
export function merchantRouteHref(route: MerchantEmbeddedRoute): string {
  switch (route.view) {
    case "home":
      return "/campaign/merchant";
    default: {
      const q = new URLSearchParams({
        merchantId: route.merchantId,
        view: route.view,
      });
      if (route.merchantName) q.set("merchantName", route.merchantName);
      if (route.view === "coupons" && route.campaignId) {
        q.set("campaignId", route.campaignId);
      }
      return `/campaign/merchant?${q.toString()}`;
    }
  }
}

export function merchantRouteKey(route: MerchantEmbeddedRoute): string {
  switch (route.view) {
    case "home":
      return "home";
    case "campaigns":
      return `campaigns:${route.merchantId}`;
    case "coupon-defs":
      return `coupon-defs:${route.merchantId}`;
    case "coupons":
      return `coupons:${route.merchantId}:${route.campaignId ?? ""}`;
    case "redeem":
      return `redeem:${route.merchantId}`;
    case "brand":
      return `brand:${route.merchantId}`;
    case "team":
      return `team:${route.merchantId}`;
  }
}
