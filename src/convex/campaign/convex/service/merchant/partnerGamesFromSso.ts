"use node";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const DEV_SSO_CONVEX_URL = "https://cool-salamander-393.convex.cloud";

const getPartnerGamesRef = makeFunctionReference<"query">(
  "service/partner/partnerAdmin:getPartnerGames"
);

function ssoConvexUrl(): string {
  const raw =
    process.env.SSO_CONVEX_URL ??
    process.env.VITE_CONVEX_URL ??
    process.env.CONVEX_URL_SSO;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const t = raw.trim().replace(/\/+$/, "");
    if (t.includes(".convex.site")) {
      return t.replace(".convex.site", ".convex.cloud");
    }
    return t;
  }
  return DEV_SSO_CONVEX_URL;
}

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(ssoConvexUrl());
  }
  return client;
}

/** merchantCampaign → SSO: partner.games allowlist for campaign gameType. */
export async function fetchPartnerGamesFromSso(partnerId: number): Promise<string[]> {
  const row = (await getClient().query(getPartnerGamesRef, { partnerId })) as {
    games: string[];
  } | null;
  if (!row?.games?.length) {
    throw new Error("partner_games_unavailable");
  }
  return row.games;
}

export async function assertGameTypeEnabledForPartner(
  partnerId: number,
  gameType: string
): Promise<void> {
  const games = await fetchPartnerGamesFromSso(partnerId);
  if (!games.includes(gameType)) {
    throw new Error("game_not_enabled_for_partner");
  }
}
