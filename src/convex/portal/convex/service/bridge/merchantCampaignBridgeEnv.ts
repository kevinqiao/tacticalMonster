/** Portal → campaign internal HTTP (server-to-server; not platform JWT). */
export const MERCHANT_BRIDGE_HEADER = "X-Merchant-Bridge-Secret";

const DEV_CAMPAIGN_SITE_URL = "https://curious-goldfish-112.convex.site";
const DEV_CAMPAIGN_BRIDGE_SECRET = "dev-local-merchant-campaign-bridge";

export function merchantCampaignSiteUrl(): string {
  const raw =
    process.env.CAMPAIGN_SITE_URL ??
    process.env.CAMPAIGN_CONVEX_SITE ??
    process.env.VITE_CONVEX_URL_CAMPAIGN;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim();
    if (t.includes(".convex.cloud")) {
      return t.replace(".convex.cloud", ".convex.site");
    }
    return t.replace(/\/+$/, "");
  }
  return DEV_CAMPAIGN_SITE_URL;
}

export function merchantCampaignBridgeSecret(): string {
  const s = process.env.CAMPAIGN_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_CAMPAIGN_BRIDGE_SECRET;
}
