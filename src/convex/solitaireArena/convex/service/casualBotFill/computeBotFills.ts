/**
 * Casual v2 ingest：游戏服只提交 score；bot fill 与 seed 阈值由 casualPlatform（platform_ingest）处理。
 */
import type { ActionCtx } from "../../_generated/server";

import type { PlatformBridge } from "../casualBridgeEnv";
import { fetchCasualMatchSubmitContext } from "../casualBridgeResolve";
import type { BotStrategyPlayerContext, CasualRankRateEntry } from "./botStrategyTypes";

export type SlimCasualSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: "easy" | "medium" | "hard";
};

export type SoloRankPlanningInputs = {
  profile: BotStrategyPlayerContext;
  rankCounts: Record<number, number>;
  rankRates: CasualRankRateEntry[];
  maxPlayers: number;
};

export type ResolveSubmitContext = {
  ok: true;
  mode: "daily" | "single_human" | "mixed";
  templateId: string;
  matchId: string;
  maxPlayers: number;
  humanPlayerCount: number;
  botCount: number;
  seedBinding?: SlimCasualSeedBinding;
  sessionExternalId: string;
  botsSeeded: boolean;
  humanScores: Array<{ uid: string; score: number }>;
  wasHumanReplay: boolean;
  humanReplayEpoch?: number;
  soloRankPlanning?: SoloRankPlanningInputs;
  successThresholdQuantile?: "p75";
  botPolicy?: "game_ingest" | "platform_ingest" | "none";
  isLastGame?: boolean;
};

export type CasualV2IngestPayload = {
  uid: string;
  matchGameId: string;
  score: number;
};

export async function buildCasualV2IngestPayload(args: {
  ctx: ActionCtx;
  uid: string;
  matchGameId: string;
  score: number;
  platformBridge?: PlatformBridge;
}): Promise<{ ok: true; payload: CasualV2IngestPayload } | { ok: false; error: string }> {
  const resolved = await fetchCasualMatchSubmitContext({
    uid: args.uid,
    matchGameId: args.matchGameId,
    score: args.score,
    platformBridge: args.platformBridge,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  return {
    ok: true,
    payload: {
      uid: args.uid,
      matchGameId: args.matchGameId,
      score: args.score,
    },
  };
}
