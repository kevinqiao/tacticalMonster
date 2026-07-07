"use node";

import {
  MERCHANT_BRIDGE_HEADER,
  merchantCampaignBridgeSecret,
  merchantCampaignSiteUrl,
} from "./merchantCampaignBridgeEnv";

export type CampaignPlayLimitsFromAuthorize = {
  maxCouponsPerPlayer: number;
  maxPlaysPerDay?: number;
  dayTimezone: string;
};

export type AuthorizeCampaignJoinResult =
  | {
      ok: true;
      campaignId: string;
      merchantId: string;
      gameType: string;
      mode: "solo" | "multi";
      playLimits: CampaignPlayLimitsFromAuthorize;
    }
  | { ok: false; error: string };

export async function authorizeCampaignJoinViaHttp(args: {
  uid: string;
  merchantSlug: string;
  campaignSlug: string;
}): Promise<AuthorizeCampaignJoinResult> {
  const base = merchantCampaignSiteUrl();
  const url = `${base}/internal/authorize-campaign-join`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: merchantCampaignBridgeSecret(),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[portal] merchant authorize-campaign-join fetch failed", e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    const parsed = (await response.json()) as AuthorizeCampaignJoinResult;
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "bad_response" };
    }
    return parsed;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export type NotifyMerchantOnRunSettledArgs = {
  campaignId: string;
  merchantId: string;
  uid: string;
  matchId: string;
  gameType: string;
  mode: "solo" | "multi";
  score: number;
  rank?: number;
  p75Success?: boolean;
};

export async function notifyMerchantOnRunSettledViaHttp(
  args: NotifyMerchantOnRunSettledArgs
): Promise<{ ok: boolean; error?: string }> {
  const base = merchantCampaignSiteUrl();
  const url = `${base}/internal/on-run-settled`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MERCHANT_BRIDGE_HEADER]: merchantCampaignBridgeSecret(),
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[portal] merchant on-run-settled fetch failed", args.matchId, e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    const parsed = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || parsed.ok === false) {
      return { ok: false, error: parsed.error ?? "notify_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "bad_response" };
  }
}
