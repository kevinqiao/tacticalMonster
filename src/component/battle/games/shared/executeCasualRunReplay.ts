import type { ConvexReactClient } from "convex/react";

import { buildCasualPlatformRunActionArgs } from "./casualPlatformActionArgs";
import { requestPortalAdReplay } from "./requestPortalAdReplay";

type ReplayActionResult = { ok?: boolean; error?: string; replayEpoch?: number; gameId?: string };

/** 按 platformBridge 执行再战：Portal 走广告 Session，其余走 arena replayCasualRun。 */
export async function executeCasualRunReplay(args: {
  convex: ConvexReactClient;
  gameId: string;
  platformBridge?: "portal" | "casual";
  replayAction: (args: { gameId: string; platformBridge?: "portal" | "casual" }) => Promise<ReplayActionResult>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (args.platformBridge === "portal") {
    const result = await requestPortalAdReplay({ matchGameId: args.gameId });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  }

  const rr = await args.replayAction(buildCasualPlatformRunActionArgs({ gameId: args.gameId, platformBridge: args.platformBridge }));
  if (!rr?.ok) {
    return { ok: false, error: rr?.error ?? "replay_failed" };
  }
  return { ok: true };
}
