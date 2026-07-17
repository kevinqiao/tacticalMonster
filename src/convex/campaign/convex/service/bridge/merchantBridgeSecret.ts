const DEV_CAMPAIGN_BRIDGE_SECRET = "dev-local-merchant-campaign-bridge";

/** Portal → campaign server-to-server internal HTTP (not platform JWT). */
export const MERCHANT_BRIDGE_HEADER = "X-Merchant-Bridge-Secret";

export function merchantBridgeSecret(): string {
  const s = process.env.CAMPAIGN_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_CAMPAIGN_BRIDGE_SECRET;
}

export function portalBridgeSecret(): string {
  const s =
    process.env.PORTAL_GAME_BRIDGE_SECRET ??
    process.env.CASUAL_GAME_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return "dev-local-portal-bridge";
}
