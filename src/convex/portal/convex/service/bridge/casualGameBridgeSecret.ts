/**
 * Shared secret for server-only routes: `/internal/casual-run-ingest`,
 * `/internal/find-match-by-game`. Header `X-Portal-Bridge-Secret` must match.
 *
 * When Dashboard omits `CASUAL_GAME_BRIDGE_SECRET`, use the same dev default as
 * solitaireArena `casualBridgeEnv.ts` so local / cloud dev works without manual env.
 * Production: set a strong random value on casual **and** game Convex deployments.
 */
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";

export function portalGameBridgeSecret(): string {
  const s = process.env.PORTAL_GAME_BRIDGE_SECRET ?? process.env.CASUAL_GAME_BRIDGE_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return DEV_PORTAL_BRIDGE_SECRET;
}

/** @deprecated alias */
export const casualGameBridgeSecret = portalGameBridgeSecret;
