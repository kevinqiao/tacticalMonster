import { ConvexHttpClient } from "convex/browser";

import { portalTournamentFns } from "@/component/lobby/portal/service/portalConvexFunctionRefs";
import { PORTAL_CONVEX_URL } from "@/component/lobby/portal/service/usePortalManager";
import { resolveRewardedAdChannel } from "host/service/ads/rewarded/registry";
import { showRewardedAdForReplay } from "host/service/ads/rewarded/rewardedAdOrchestrator";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";

let portalHttpClient: ConvexHttpClient | null = null;

function portalHttp(): ConvexHttpClient {
  if (!portalHttpClient) {
    portalHttpClient = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(portalHttpClient);
  }
  return portalHttpClient;
}

export type PortalAdEntryResult =
  | { ok: true; grantId: string }
  | { ok: false; error: string };

/** Portal entry: begin → rewarded ad → complete grant (then join with adEntry). */
export async function requestPortalAdEntry(args: {
  mode: "solo" | "multi";
  templateId: string;
  lobbyId?: string | null;
}): Promise<PortalAdEntryResult> {
  const channel = resolveRewardedAdChannel();
  if (!channel) {
    return { ok: false, error: "ad_channel_unsupported" };
  }

  const http = portalHttp();
  let begin: {
    ok?: boolean;
    error?: string;
    sessionId?: string;
    grantId?: string;
    alreadyGranted?: boolean;
  };
  try {
    begin = (await http.mutation(portalTournamentFns.beginAdEntrySession, {
      mode: args.mode,
      templateId: args.templateId,
      channel,
      ...(args.lobbyId ? { lobbyId: args.lobbyId as never } : {}),
    })) as typeof begin;
  } catch (e) {
    console.warn("[portal ad entry] begin threw", e);
    return { ok: false, error: "begin_failed" };
  }

  if (!begin?.ok) {
    return { ok: false, error: begin?.error ?? "begin_failed" };
  }
  if (begin.alreadyGranted && typeof begin.grantId === "string") {
    return { ok: true, grantId: begin.grantId };
  }
  if (!begin.sessionId) {
    return { ok: false, error: "begin_failed" };
  }

  const ad = await showRewardedAdForReplay();
  if (!ad.ok) {
    return { ok: false, error: ad.reason };
  }

  let complete: { ok?: boolean; error?: string; grantId?: string };
  try {
    complete = (await http.mutation(portalTournamentFns.completeAdEntrySession, {
      sessionId: begin.sessionId,
      clientProof: ad.clientProof,
    })) as typeof complete;
  } catch (e) {
    console.warn("[portal ad entry] complete threw", e);
    return { ok: false, error: "complete_failed" };
  }

  if (!complete?.ok || typeof complete.grantId !== "string") {
    return { ok: false, error: complete?.error ?? "complete_failed" };
  }
  return { ok: true, grantId: complete.grantId };
}
