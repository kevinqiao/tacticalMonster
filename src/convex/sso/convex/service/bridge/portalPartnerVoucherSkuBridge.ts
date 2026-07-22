"use node";

const DEV_PORTAL_SITE_URL = "https://loyal-starfish-697.convex.site";
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";

function portalSiteUrl(): string {
  const raw =
    process.env.PORTAL_SITE_URL ??
    process.env.PORTAL_CONVEX_URL ??
    process.env.VITE_CONVEX_URL_PORTAL;
  if (typeof raw === "string" && raw.trim()) {
    const url = raw.trim().replace(/\/+$/, "");
    return url.includes(".convex.cloud") ? url.replace(".convex.cloud", ".convex.site") : url;
  }
  return DEV_PORTAL_SITE_URL;
}

function portalBridgeSecret(): string {
  const secret =
    process.env.PORTAL_GAME_BRIDGE_SECRET ??
    process.env.CASUAL_GAME_BRIDGE_SECRET ??
    process.env.PORTAL_BRIDGE_SECRET;
  return typeof secret === "string" && secret.trim() ? secret.trim() : DEV_PORTAL_BRIDGE_SECRET;
}

export type PortalPartnerVoucherOperation = "list" | "confirm" | "reject" | "redeem" | "void";

export async function portalPartnerVoucherRequest(
  body: { partnerId: number; operation: PortalPartnerVoucherOperation; itemId?: string; code?: string }
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${portalSiteUrl()}/internal/partner-vouchers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Portal-Bridge-Secret": portalBridgeSecret(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: `portal_${response.status}` };
    }
    return payload as Record<string, unknown>;
  } catch {
    return { ok: false, error: "portal_unreachable" };
  }
}

export type PortalPartnerShopSkuKind = "virtual" | "voucher";
export type PortalPartnerShopSkuOperation = "list" | "upsert" | "setActive" | "delete";

export async function portalPartnerShopSkuRequest(
  body: {
    partnerId: number;
    operation: PortalPartnerShopSkuOperation;
    kind?: PortalPartnerShopSkuKind;
    skuId?: string;
    title?: string;
    description?: string;
    priceCoins?: number;
    grantReplayTokenCount?: number;
    weeklyPurchaseLimit?: number | null;
    sortOrder?: number;
    active?: boolean;
    voucherRewardText?: string;
    voucherValidityDays?: number | null;
    listInShop?: boolean;
  }
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${portalSiteUrl()}/internal/partner-shop-skus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Portal-Bridge-Secret": portalBridgeSecret(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    return payload && typeof payload === "object"
      ? payload as Record<string, unknown>
      : { ok: false, error: `portal_${response.status}` };
  } catch {
    return { ok: false, error: "portal_unreachable" };
  }
}
