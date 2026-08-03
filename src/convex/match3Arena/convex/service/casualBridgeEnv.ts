/**
 * Platform HTTP bridge: explicit `portal` | `casual` (default casual).
 * Portal routes require header `X-Portal-Bridge-Secret`.
 */
export type PlatformBridge = "portal" | "casual";

const DEV_PORTAL_SITE_ORIGIN = "https://merry-skunk-952.convex.site";
const DEV_CASUAL_SITE_ORIGIN = "https://amicable-alpaca-980.convex.site";
const DEV_PORTAL_BRIDGE_SECRET = "dev-local-portal-bridge";
const DEV_CASUAL_BRIDGE_SECRET = "dev-local-casual-bridge";

export type ResolvedCasualBridgeEnv = {
  origin: string;
  secret: string;
  platform: PlatformBridge;
};

export function platformBridgeFromTemplateId(templateId?: string): PlatformBridge {
  return templateId?.startsWith("portal_") ? "portal" : "casual";
}

export function resolveCasualBridgeEnv(platform: PlatformBridge = "casual"): ResolvedCasualBridgeEnv {
  if (platform === "portal") {
    let origin = (process.env.PORTAL_HTTP_ORIGIN ?? process.env.PORTAL_CONVEX_SITE_URL ?? "")
      .trim()
      .replace(/\/$/, "");
    let secret = (process.env.PORTAL_GAME_BRIDGE_SECRET ?? "").trim();

    const usedDefaultOrigin = !origin;
    const usedDefaultSecret = !secret;

    if (!origin) origin = DEV_PORTAL_SITE_ORIGIN;
    if (!secret) secret = DEV_PORTAL_BRIDGE_SECRET;

    if (usedDefaultOrigin || usedDefaultSecret) {
      console.warn("[match3] portal bridge env: using dev defaults", {
        usedDefaultOrigin,
        usedDefaultSecret,
      });
    }

    return { origin, secret, platform: "portal" };
  }

  let origin = (process.env.CASUAL_HTTP_ORIGIN ?? process.env.CASUAL_CONVEX_SITE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  let secret = (process.env.CASUAL_GAME_BRIDGE_SECRET ?? "").trim();

  const usedDefaultOrigin = !origin;
  const usedDefaultSecret = !secret;
  if (!origin) origin = DEV_CASUAL_SITE_ORIGIN;
  if (!secret) secret = DEV_CASUAL_BRIDGE_SECRET;

  if (usedDefaultOrigin || usedDefaultSecret) {
    console.warn("[match3] casual bridge env: using dev defaults for missing vars", {
      usedDefaultOrigin,
      usedDefaultSecret,
    });
  }

  return { origin, secret, platform: "casual" };
}

export function casualBridgeRequestHeaders(env: ResolvedCasualBridgeEnv): Record<string, string> {
  const headerName =
    env.platform === "portal" ? "X-Portal-Bridge-Secret" : "X-Casual-Bridge-Secret";
  return {
    "Content-Type": "application/json",
    [headerName]: env.secret,
  };
}

export function casualGameBridgeSecret(): string {
  return resolveCasualBridgeEnv().secret;
}

export async function resolvePlatformBridgeForCasualGameId(
  gameId: string
): Promise<PlatformBridge> {
  for (const platform of ["portal", "casual"] as const) {
    const bridgeEnv = resolveCasualBridgeEnv(platform);
    try {
      const res = await fetch(`${bridgeEnv.origin}/internal/find-match-by-game`, {
        method: "POST",
        headers: casualBridgeRequestHeaders(bridgeEnv),
        body: JSON.stringify({ gameId }),
      });
      if (!res.ok) continue;
      const parsed = (await res.json()) as { ok?: boolean; match?: unknown };
      if (parsed.ok && parsed.match) return platform;
    } catch {
      // try next bridge
    }
  }
  return "casual";
}
