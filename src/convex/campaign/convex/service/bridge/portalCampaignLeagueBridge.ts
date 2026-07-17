"use node";

import { merchantBridgeSecret } from "./merchantBridgeSecret";

const DEV_PORTAL_SITE_URL = "https://merry-skunk-952.convex.site";

export const MERCHANT_BRIDGE_HEADER = "X-Merchant-Bridge-Secret";

export function portalSiteUrl(): string {
  const raw =
    process.env.PORTAL_SITE_URL ??
    process.env.PORTAL_CONVEX_SITE ??
    process.env.VITE_CONVEX_URL_PORTAL ??
    process.env.VITE_CONVEX_URL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.includes(".convex.cloud")) {
      return t.replace(".convex.cloud", ".convex.site");
    }
    return t;
  }
  return DEV_PORTAL_SITE_URL;
}

export type CampaignLeagueLeaderboardRow = {
  uid: string;
  displayName: string;
  isBot: boolean;
  bestScore?: number;
  rankPoints?: number;
  plays: number;
  botPersonaId?: string;
  rank: number;
};

async function portalCampaignLeaguePost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const url = `${portalSiteUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: merchantBridgeSecret(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[merchantCampaign] portal campaign-league fetch failed", path, e);
    return { ok: false, error: "portal_unreachable" };
  }
  try {
    const parsed = (await response.json()) as T & { ok?: boolean; error?: string };
    if (!response.ok || parsed.ok === false) {
      return { ok: false, error: parsed.error ?? "portal_failed" };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export async function fetchCampaignLeagueLeaderboardViaHttp(args: {
  campaignId: string;
  limit?: number;
  mode?: "solo" | "multi";
}): Promise<
  | { ok: true; rows: CampaignLeagueLeaderboardRow[]; mode: string }
  | { ok: false; error: string }
> {
  const result = await portalCampaignLeaguePost<{
    ok?: boolean;
    rows?: CampaignLeagueLeaderboardRow[];
    mode?: string;
    error?: string;
  }>("/internal/campaign-league/leaderboard", {
    campaignId: args.campaignId,
    ...(args.limit != null ? { limit: args.limit } : {}),
    ...(args.mode ? { mode: args.mode } : {}),
  });
  if (!result.ok) return result;
  return {
    ok: true,
    rows: result.data.rows ?? [],
    mode: result.data.mode ?? "solo",
  };
}

export async function fetchCampaignLeagueHumansRankedViaHttp(args: {
  campaignId: string;
  limit?: number;
  mode?: "solo" | "multi";
}): Promise<
  | { ok: true; rows: CampaignLeagueLeaderboardRow[]; mode: string }
  | { ok: false; error: string }
> {
  const result = await portalCampaignLeaguePost<{
    ok?: boolean;
    rows?: CampaignLeagueLeaderboardRow[];
    mode?: string;
    error?: string;
  }>("/internal/campaign-league/humans-ranked", {
    campaignId: args.campaignId,
    ...(args.limit != null ? { limit: args.limit } : {}),
    ...(args.mode ? { mode: args.mode } : {}),
  });
  if (!result.ok) return result;
  return {
    ok: true,
    rows: result.data.rows ?? [],
    mode: result.data.mode ?? "solo",
  };
}

export async function ensureCampaignLeagueBotsViaHttp(args: {
  campaignId: string;
  partnerId: number;
  mode: "solo" | "multi";
  dueTime: number;
  startsAt?: number;
}): Promise<{ ok: true; seeded: boolean } | { ok: false; error: string }> {
  const result = await portalCampaignLeaguePost<{
    ok?: boolean;
    seeded?: boolean;
    error?: string;
  }>("/internal/campaign-league/ensure-bots", {
    campaignId: args.campaignId,
    partnerId: args.partnerId,
    mode: args.mode,
    dueTime: args.dueTime,
    ...(args.startsAt != null ? { startsAt: args.startsAt } : {}),
  });
  if (!result.ok) return result;
  return { ok: true, seeded: result.data.seeded === true };
}
