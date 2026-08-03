"use node";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import {
  getCasualGameRegistration,
  resolveSeedRemoteOrigin,
  type CasualSeedStrategy,
} from "../../data/casualGameRegistry";
import {
  fetchPickCasualMatchSeed,
  fetchRecordCasualMatchSeed,
} from "../bridge/casualMatchSeedBridge";
import { casualGameBridgeSecret } from "../bridge/casualGameBridgeSecret";
import type { CasualSeedTier } from "../../data/casualSeedTierPolicy";
import type { ScoreQuantiles } from "../../shared/scoreQuantiles";
import type { CatalogGameType } from "./seedPool/seedPoolStore";

export type SeedPoolRuntimeCtx = Pick<ActionCtx, "runMutation" | "runQuery">;

export type SlimSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: CasualSeedTier;
  scoreQuantiles?: ScoreQuantiles;
};

export type ScoreBand = { min: number; max?: number; count?: number };

export type RolloutBandResult = {
  min: number;
  max?: number;
  count?: number;
  rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime?: number }>;
};

function seedStrategyFor(gameType: string): CasualSeedStrategy {
  return getCasualGameRegistration(gameType)?.seedStrategy ?? "remote_http";
}

function isCatalogInternal(strategy: CasualSeedStrategy): boolean {
  return strategy === "catalog_internal";
}

export async function bridgePickSeed(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: string;
    matchId: string;
    templateId: string;
    uids: string[];
    tier: CasualSeedTier;
  }
): Promise<
  | { ok: true; seedBinding: SlimSeedBinding }
  | { ok: false; error: string }
> {
  const strategy = seedStrategyFor(args.gameType);
  const sessionKey = `casual_sess:${args.matchId}`;

  if (isCatalogInternal(strategy)) {
    const picked = await ctx.runMutation(
      internal.service.seedPool.catalogSeedHttp.pickCasualMatchSeed,
      {
        gameType: args.gameType as CatalogGameType,
        matchId: args.matchId,
        sessionKey,
        uids: args.uids,
        tier: args.tier,
      }
    );
    if (!picked.ok) return { ok: false, error: picked.error };
    return {
      ok: true,
      seedBinding: {
        seedId: picked.seedId,
        poolVersion: picked.poolVersion,
        tier: picked.tier as CasualSeedTier,
        scoreQuantiles: picked.metrics.scoreQuantiles,
      },
    };
  }

  const reg = getCasualGameRegistration(args.gameType);
  if (!reg) return { ok: false, error: "unregistered_game_type" };
  const origin = resolveSeedRemoteOrigin(reg);
  if (!origin) return { ok: false, error: "missing_seed_remote_origin" };
  const picked = await fetchPickCasualMatchSeed(
    {
      matchId: args.matchId,
      templateId: args.templateId,
      sessionKey,
      uids: args.uids,
      tier: args.tier,
    },
    origin
  );
  if (!picked.ok) return picked;
  return {
    ok: true,
    seedBinding: {
      seedId: picked.seedId,
      poolVersion: picked.poolVersion,
      tier: picked.tier,
      scoreQuantiles: picked.metrics.scoreQuantiles,
    },
  };
}

export async function bridgeRecordSeed(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: string;
    matchId: string;
    uid: string;
    seedId: string;
    poolVersion: string;
  }
): Promise<{ ok: true; alreadyRecorded?: true } | { ok: false; error: string }> {
  const strategy = seedStrategyFor(args.gameType);
  if (isCatalogInternal(strategy)) {
    const result = await ctx.runMutation(
      internal.service.seedPool.catalogSeedHttp.recordCasualMatchSeedForPlayer,
      {
        gameType: args.gameType as CatalogGameType,
        matchId: args.matchId,
        uid: args.uid,
        seedId: args.seedId,
        poolVersion: args.poolVersion,
      }
    );
    if (!result.ok) return result;
    return { ok: true };
  }
  const reg = getCasualGameRegistration(args.gameType);
  if (!reg) return { ok: false, error: "unregistered_game_type" };
  const origin = resolveSeedRemoteOrigin(reg);
  if (!origin) return { ok: false, error: "missing_seed_remote_origin" };
  return fetchRecordCasualMatchSeed(
    {
      matchId: args.matchId,
      uid: args.uid,
      seedId: args.seedId,
      poolVersion: args.poolVersion,
    },
    origin
  );
}

export async function resolveSeedQuantiles(
  ctx: SeedPoolRuntimeCtx,
  binding: SlimSeedBinding,
  gameType: string
): Promise<ScoreQuantiles> {
  if (binding.scoreQuantiles) return binding.scoreQuantiles;
  const strategy = seedStrategyFor(gameType);
  if (isCatalogInternal(strategy)) {
    const entry = await ctx.runQuery(internal.service.seedPool.catalogSeedHttp.getSeedEntryBySeedId, {
      gameType: gameType as CatalogGameType,
      seedId: binding.seedId,
      poolVersion: binding.poolVersion,
    });
    if (!entry) throw new Error("unknown_seed");
    return entry.metrics.scoreQuantiles;
  }
  throw new Error("missing_seed_quantiles");
}

export async function bridgeFetchRolloutBands(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: string;
    seedBinding: SlimSeedBinding;
    bands: ScoreBand[];
  }
): Promise<RolloutBandResult[]> {
  const strategy = seedStrategyFor(args.gameType);
  if (isCatalogInternal(strategy)) {
    const result = await ctx.runQuery(
      internal.service.seedPool.catalogSeedHttp.rolloutsForCasualMatchSeed,
      {
        gameType: args.gameType as CatalogGameType,
        seedId: args.seedBinding.seedId,
        poolVersion: args.seedBinding.poolVersion,
        scores: args.bands,
      }
    );
    if (!result.ok) return args.bands.map((b) => ({ ...b, rollouts: [] }));
    return result.bands;
  }

  const reg = getCasualGameRegistration(args.gameType);
  if (!reg) return args.bands.map((b) => ({ ...b, rollouts: [] }));
  const origin = resolveSeedRemoteOrigin(reg);
  if (!origin) return args.bands.map((b) => ({ ...b, rollouts: [] }));

  let response: Response;
  try {
    response = await fetch(`${origin}/internal/casual-match-rollouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Casual-Bridge-Secret": casualGameBridgeSecret(),
      },
      body: JSON.stringify({
        seedId: args.seedBinding.seedId,
        poolVersion: args.seedBinding.poolVersion,
        scores: args.bands,
      }),
    });
  } catch {
    return args.bands.map((b) => ({ ...b, rollouts: [] }));
  }
  try {
    const parsed = (await response.json()) as {
      ok?: boolean;
      bands?: RolloutBandResult[];
    };
    if (!response.ok || parsed.ok === false) {
      return args.bands.map((b) => ({ ...b, rollouts: [] }));
    }
    return parsed.bands ?? args.bands.map((b) => ({ ...b, rollouts: [] }));
  } catch {
    return args.bands.map((b) => ({ ...b, rollouts: [] }));
  }
}

export async function bridgeFetchTriathlonLegRollouts(
  ctx: SeedPoolRuntimeCtx,
  args: {
    legs: Array<{ gameIndex: number; gameType: string; seedBinding: SlimSeedBinding }>;
    /** 与 legs 等长：每局单独的 score band */
    legBands: Array<{ min: number; max?: number; count?: number }>;
  }
): Promise<
  Array<{
    gameIndex: number;
    gameType: string;
    rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime?: number }>;
  }>
> {
  const out: Array<{
    gameIndex: number;
    gameType: string;
    rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime?: number }>;
  }> = [];

  for (let i = 0; i < args.legs.length; i++) {
    const leg = args.legs[i]!;
    const band = args.legBands[i] ?? { min: 0, count: 16 };
    const bands = await bridgeFetchRolloutBands(ctx, {
      gameType: leg.gameType,
      seedBinding: leg.seedBinding,
      bands: [
        {
          min: band.min,
          ...(band.max != null ? { max: band.max } : {}),
          count: band.count ?? 16,
        },
      ],
    });
    const rollouts = bands.flatMap((b) => b.rollouts ?? []);
    out.push({ gameIndex: leg.gameIndex, gameType: leg.gameType, rollouts });
  }
  return out;
}
