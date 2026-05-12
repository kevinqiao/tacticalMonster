/**
 * Casual HTTP bridge for blockBlast Convex actions（与 solitaireArena `casualBridgeEnv` 对齐）。
 * 部署须配置 `CASUAL_HTTP_ORIGIN` + `CASUAL_GAME_BRIDGE_SECRET`，与 casualPlatform 一致。
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
    console.warn("[blockBlast] casual bridge env: using dev defaults for missing vars", {
      usedDefaultOrigin,
      usedDefaultSecret,
    });
  }

  return { origin, secret };
}
