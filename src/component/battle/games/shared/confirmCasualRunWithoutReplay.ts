import { ConvexHttpClient } from "convex/browser";

import { portalTournamentFns } from "@/component/lobby/portal/service/portalConvexFunctionRefs";
import { PORTAL_CONVEX_URL } from "@/component/lobby/portal/service/usePortalManager";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";

let portalHttpClient: ConvexHttpClient | null = null;

function portalHttp(): ConvexHttpClient {
  if (!portalHttpClient) {
    portalHttpClient = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(portalHttpClient);
  }
  return portalHttpClient;
}

export type ConfirmCasualRunWithoutReplayResult =
  | { ok: true; finalized?: boolean; confirmed?: boolean }
  | { ok: false; error: string };

/** Portal：放弃再战后确认结算（走 portal Convex，非 casualPlatform）。 */
export async function confirmPortalCasualRunWithoutReplay(
  matchGameId: string
): Promise<ConfirmCasualRunWithoutReplayResult> {
  try {
    const res = (await portalHttp().mutation(
      portalTournamentFns.confirmCasualRunWithoutReplay,
      { matchGameId }
    )) as ConfirmCasualRunWithoutReplayResult;
    if (!res?.ok) {
      return { ok: false, error: (res as { error?: string })?.error ?? "confirm_failed" };
    }
    return res;
  } catch (e) {
    console.warn("[portal] confirmCasualRunWithoutReplay", e);
    return { ok: false, error: "confirm_failed" };
  }
}

/** 按 platformBridge 确认放弃再战并结算。 */
export async function confirmCasualRunWithoutReplayForBridge(args: {
  matchGameId: string;
  platformBridge?: "portal" | "casual";
  casualConfirm: (matchGameId: string) => Promise<ConfirmCasualRunWithoutReplayResult>;
}): Promise<ConfirmCasualRunWithoutReplayResult> {
  if (args.platformBridge === "portal") {
    return confirmPortalCasualRunWithoutReplay(args.matchGameId);
  }
  return args.casualConfirm(args.matchGameId);
}
