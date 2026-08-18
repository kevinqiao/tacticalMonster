import { ConvexHttpClient } from "convex/browser";

import { portalTournamentFns } from "@/component/lobby/portal/service/portalConvexFunctionRefs";
import { PORTAL_CONVEX_URL } from "@/component/lobby/portal/service/usePortalManager";
import { resolvePortalAdCoinChannel } from "host/service/ads/rewarded/portalAdCoinSurface";
import { showRewardedAdForReplay } from "host/service/ads/rewarded/rewardedAdOrchestrator";
import { AudioBus } from "host/service/audio";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";

let portalHttpClient: ConvexHttpClient | null = null;

function portalHttp(): ConvexHttpClient {
  if (!portalHttpClient) {
    portalHttpClient = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(portalHttpClient);
  }
  return portalHttpClient;
}

export type PortalAdCoinResult =
  | {
      ok: true;
      coinsGranted: number;
      remaining: number;
      rewardAmount: number;
    }
  | { ok: false; error: string };

/** Portal：begin → 激励广告 → complete → 发金币（isolated 时写入当前 lobby 钱包） */
export async function requestPortalAdCoin(args?: {
  lobbyId?: string | null;
  scopeKey?: string | null;
}): Promise<PortalAdCoinResult> {
  const channel = resolvePortalAdCoinChannel();
  if (!channel || channel === "crazygames") {
    return { ok: false, error: "ad_channel_unsupported" };
  }
  const sessionChannel =
    channel === "partner" || channel === "poki" || channel === "dev"
      ? channel
      : null;
  if (!sessionChannel) {
    return { ok: false, error: "ad_channel_unsupported" };
  }

  const lobbyArg = args?.scopeKey
    ? { scopeKey: args.scopeKey }
    : args?.lobbyId
      ? { lobbyId: args.lobbyId as never }
      : {};

  const http = portalHttp();
  let begin: {
    ok?: boolean;
    error?: string;
    sessionId?: string;
    rewardAmount?: number;
  };
  try {
    begin = (await http.mutation(portalTournamentFns.beginAdCoinSession, {
      channel: sessionChannel,
      ...lobbyArg,
    })) as typeof begin;
  } catch (e) {
    console.warn("[portal ad coin] begin threw", e);
    return { ok: false, error: "begin_failed" };
  }

  if (!begin?.ok || !begin.sessionId) {
    return { ok: false, error: begin?.error ?? "begin_failed" };
  }

  const ad = await showRewardedAdForReplay();
  if (!ad.ok) {
    return { ok: false, error: ad.reason };
  }

  let complete: {
    ok?: boolean;
    error?: string;
    coinsGranted?: number;
    remaining?: number;
    rewardAmount?: number;
  };
  try {
    complete = (await http.mutation(portalTournamentFns.completeAdCoinSession, {
      sessionId: begin.sessionId,
      clientProof: ad.clientProof,
      ...lobbyArg,
    })) as typeof complete;
  } catch (e) {
    console.warn("[portal ad coin] complete threw", e);
    return { ok: false, error: "complete_failed" };
  }

  if (
    !complete?.ok ||
    typeof complete.coinsGranted !== "number" ||
    typeof complete.remaining !== "number"
  ) {
    console.warn("[portal ad coin] complete failed", complete?.error ?? "complete_failed");
    return { ok: false, error: complete?.error ?? "complete_failed" };
  }

  AudioBus.emit("meta.ad.reward");
  return {
    ok: true,
    coinsGranted: complete.coinsGranted,
    remaining: complete.remaining,
    rewardAmount:
      typeof complete.rewardAmount === "number"
        ? complete.rewardAmount
        : (begin.rewardAmount ?? complete.coinsGranted),
  };
}
