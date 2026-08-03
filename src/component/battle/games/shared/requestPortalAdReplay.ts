import { ConvexHttpClient } from "convex/browser";

import { portalTournamentFns } from "@/component/lobby/portal/service/portalConvexFunctionRefs";
import { PORTAL_CONVEX_URL } from "@/component/lobby/portal/service/usePortalManager";
import { resolveRewardedAdChannel } from "host/service/ads/rewarded/registry";
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

export type PortalAdReplayResult =
  | {
      ok: true;
      gameId: string;
      replayEpoch?: number;
    }
  | { ok: false; error: string };

/** Portal：begin → 激励广告 → complete（含 authorize） */
export async function requestPortalAdReplay(args: {
  matchGameId: string;
  pauseForAd?: () => void;
  resumeAfterAd?: () => void;
}): Promise<PortalAdReplayResult> {
  const channel = resolveRewardedAdChannel();
  if (!channel) {
    return { ok: false, error: "ad_channel_unsupported" };
  }

  const http = portalHttp();
  let begin: { ok?: boolean; error?: string; sessionId?: string };
  try {
    begin = (await http.mutation(portalTournamentFns.beginAdReplaySession, {
      matchGameId: args.matchGameId,
      channel,
    })) as typeof begin;
  } catch (e) {
    console.warn("[portal ad replay] begin threw", e);
    return { ok: false, error: "begin_failed" };
  }

  if (!begin?.ok || !begin.sessionId) {
    return { ok: false, error: begin?.error ?? "begin_failed" };
  }

  args.pauseForAd?.();
  const ad = await showRewardedAdForReplay({
    onAdStarted: args.pauseForAd,
    onAdFinished: args.resumeAfterAd,
  });
  if (!ad.ok) {
    args.resumeAfterAd?.();
    return { ok: false, error: ad.reason };
  }

  let complete: {
    ok?: boolean;
    error?: string;
    gameId?: string;
    replayEpoch?: number;
  };
  try {
    complete = (await http.mutation(portalTournamentFns.completeAdReplaySession, {
      sessionId: begin.sessionId,
      clientProof: ad.clientProof,
    })) as typeof complete;
  } catch (e) {
    args.resumeAfterAd?.();
    console.warn("[portal ad replay] complete threw", e);
    return { ok: false, error: "complete_failed" };
  }

  args.resumeAfterAd?.();

  if (!complete?.ok || typeof complete.gameId !== "string") {
    console.warn("[portal ad replay] complete failed", complete?.error ?? "complete_failed");
    return { ok: false, error: complete?.error ?? "complete_failed" };
  }

  AudioBus.emit("meta.ad.reward");
  return {
    ok: true,
    gameId: complete.gameId,
    replayEpoch: complete.replayEpoch,
  };
}
