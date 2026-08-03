import { config } from "./config.js";

type PortalJson = Record<string, unknown>;

async function portalPost(path: string, body: Record<string, unknown>): Promise<PortalJson> {
  const base = config.portalSiteUrl?.replace(/\/$/, "");
  if (!base) {
    throw new Error("PORTAL_CONVEX_SITE_URL is not configured");
  }
  const secret = config.portalBridgeSecret;
  if (!secret) {
    throw new Error("PORTAL_GAME_BRIDGE_SECRET is not configured");
  }

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Portal-Bridge-Secret": secret,
    },
    body: JSON.stringify({ ...body, bridgeSecret: secret }),
  });

  const text = await res.text();
  let json: PortalJson;
  try {
    json = text ? (JSON.parse(text) as PortalJson) : {};
  } catch {
    throw new Error(`portal ${path} non-json: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      typeof json.error === "string" ? json.error : `portal ${path} failed (${res.status})`,
    );
  }
  return json;
}

export const portalLaunchApi = {
  listGames(args: { gameType?: string; maxPlayers?: number }) {
    return portalPost("/mcp/list-games", args);
  },
  launchGame(args: {
    uid: string;
    templateId: string;
    surface?: string;
    partnerId?: number;
    webOrigin?: string;
    autoJoin?: boolean;
  }) {
    return portalPost("/mcp/launch-game", args);
  },
  getPlayResult(args: { token: string }) {
    return portalPost("/mcp/get-play-result", args);
  },
  reportPlayResult(args: {
    token: string;
    score?: number;
    result?: string;
    durationSec?: number;
    payload?: unknown;
  }) {
    return portalPost("/mcp/report-play-result", args);
  },
};
