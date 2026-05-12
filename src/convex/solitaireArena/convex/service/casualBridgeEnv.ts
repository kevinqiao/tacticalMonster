/**
 * Casual HTTP bridge for solitaire Convex actions (`find-match-by-game`, `casual-run-ingest`).
 * Any missing env is filled from repo-aligned dev defaults (same as `casualPlatform/.env.local`).
 * Production: set both `CASUAL_HTTP_ORIGIN` (`.convex.site`) and `CASUAL_GAME_BRIDGE_SECRET` on this deployment.
 */
const DEV_CASUAL_SITE_ORIGIN = "https://amicable-alpaca-980.convex.site";
const DEV_CASUAL_BRIDGE_SECRET = "dev-local-casual-bridge";

export function resolveCasualBridgeEnv(): { origin: string; secret: string } {
  let origin = (process.env.CASUAL_HTTP_ORIGIN ?? process.env.CASUAL_CONVEX_SITE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  let secret = (process.env.CASUAL_GAME_BRIDGE_SECRET ?? "").trim();

  const usedDefaultOrigin = !origin;
  const usedDefaultSecret = !secret;
  if (!origin) origin = DEV_CASUAL_SITE_ORIGIN;
  if (!secret) secret = DEV_CASUAL_BRIDGE_SECRET;

  if (usedDefaultOrigin || usedDefaultSecret) {
    console.warn("[solitaire] casual bridge env: using dev defaults for missing vars", {
      usedDefaultOrigin,
      usedDefaultSecret,
    });
  }

  return { origin, secret };
}
