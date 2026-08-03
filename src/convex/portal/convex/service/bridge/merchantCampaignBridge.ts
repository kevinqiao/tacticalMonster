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

export type CampaignReplaySettingsFromAuthorize = {
  maxReplaysPerMatch?: number;
  adReplayEnabled?: boolean;
  adReplayDailyCap?: number;
  ticketReplayEnabled?: boolean;
  ticketReplayPriceTickets?: number;
  coinReplayEnabled?: boolean;
  coinReplayPriceCoins?: number;
  coinReplayDailyCap?: number | null;
};

export type AuthorizeCampaignJoinResult =
  | {
      ok: true;
      campaignId: string;
      partnerId: number;
      /** Portal tournament template id (desk SoT). */
      tournamentId: string;
      gameType: string;
      mode: "solo" | "multi";
      rewardMode: "pass_per_run" | "competitive_leaderboard";
      dueTime: number;
      playLimits: CampaignPlayLimitsFromAuthorize;
      replaySettings?: CampaignReplaySettingsFromAuthorize;
    }
  | { ok: false; error: string };

export async function authorizeCampaignJoinViaHttp(args: {
  uid: string;
  /** From platform uid / FE PartnerManager — must match campaign.partnerId. */
  partnerId: number;
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
    console.error("[portal] authorize-campaign-join fetch failed", e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    const parsed = (await response.json()) as AuthorizeCampaignJoinResult & {
      rewardMode?: string;
      dueTime?: number;
    };
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "bad_response" };
    }
    if (parsed.ok === true) {
      if (
        parsed.rewardMode !== "pass_per_run" &&
        parsed.rewardMode !== "competitive_leaderboard"
      ) {
        return { ok: false, error: "reward_mode_required" };
      }
      const tournamentId =
        typeof (parsed as { tournamentId?: unknown }).tournamentId === "string"
          ? (parsed as { tournamentId: string }).tournamentId.trim()
          : "";
      if (!tournamentId) {
        return { ok: false, error: "tournament_required" };
      }
      const rewardMode = parsed.rewardMode;
      const dueTime =
        rewardMode === "competitive_leaderboard" &&
        typeof parsed.dueTime === "number" &&
        Number.isFinite(parsed.dueTime)
          ? parsed.dueTime
          : 0;
      return { ...parsed, tournamentId, rewardMode, dueTime };
    }
    return parsed;
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export type IssuedCouponFromMerchant = {
  couponId: string;
  code: string;
  ruleId: string;
  rewardLabel: string;
};

export type NotifyOnRunSettledArgs = {
  campaignId: string;
  partnerId: number;
  uid: string;
  runTournamentId: string;
  matchId?: string;
  gameType: string;
  mode: "solo" | "multi";
  score: number;
  rank?: number;
  isPassed?: boolean;
};

export type NotifyOnRunSettledResult =
  | { ok: true; issued: IssuedCouponFromMerchant[] }
  | { ok: false; error: string };

function parseIssuedCoupons(raw: unknown): IssuedCouponFromMerchant[] {
  if (!Array.isArray(raw)) return [];
  const out: IssuedCouponFromMerchant[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const couponId = typeof r.couponId === "string" ? r.couponId : "";
    const code = typeof r.code === "string" ? r.code : "";
    const ruleId = typeof r.ruleId === "string" ? r.ruleId : "";
    const rewardLabel = typeof r.rewardLabel === "string" ? r.rewardLabel : "";
    if (!couponId || !ruleId) continue;
    out.push({ couponId, code, ruleId, rewardLabel });
  }
  return out;
}

export async function notifyMerchantOnRunSettledViaHttp(
  args: NotifyOnRunSettledArgs
): Promise<NotifyOnRunSettledResult> {
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
    console.error("[portal] on-run-settled fetch failed", args.runTournamentId, e);
    return { ok: false, error: "merchant_unreachable" };
  }
  try {
    const parsed = (await response.json()) as {
      ok?: boolean;
      error?: string;
      issued?: unknown;
    };
    if (!response.ok || parsed.ok === false) {
      return { ok: false, error: parsed.error ?? "notify_failed" };
    }
    return { ok: true, issued: parseIssuedCoupons(parsed.issued) };
  } catch {
    return { ok: false, error: "bad_response" };
  }
}
