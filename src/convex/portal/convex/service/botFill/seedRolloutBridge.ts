import { internal } from "../../_generated/api";
import type { ActionCtx, MutationCtx } from "../../_generated/server";
import { getPartnerGameRegistration } from "../../data/partnerGameRegistry";
import type { PortalSeedTier } from "../../data/portalSeedTierPolicy";
import type { ScoreQuantiles } from "../../shared/scoreQuantiles";
import {
  getEntryBySeedId,
  resolvePoolVersion,
  type CatalogGameType,
} from "../seedPool/seedPoolStore";
import { rolloutsForCasualMatchSeedCore } from "../seedPool/catalogSeedHttp";

export type SeedPoolRuntimeCtx =
  | Pick<ActionCtx, "runMutation" | "runQuery">
  | Pick<MutationCtx, "db" | "runMutation" | "runQuery">;

export type SlimSeedBinding = {
  seedId: string;
  poolVersion: string;
  tier: PortalSeedTier;
  scoreQuantiles?: ScoreQuantiles;
};

export type ScoreBand = { min: number; max?: number; count?: number };

export type RolloutBandResult = {
  min: number;
  max?: number;
  count?: number;
  rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime?: number }>;
};

function assertCatalogGameType(gameType: string): CatalogGameType | null {
  const reg = getPartnerGameRegistration(gameType);
  if (!reg || reg.seedStrategy !== "catalog_internal") {
    return null;
  }
  return gameType as CatalogGameType;
}

export async function bridgePickSeed(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: string;
    matchId: string;
    templateId: string;
    uids: string[];
    /** Omit / null = pick across all tiers (multi_ranked). */
    tier?: PortalSeedTier | null;
  }
): Promise<
  | { ok: true; seedBinding: SlimSeedBinding }
  | { ok: false; error: string }
> {
  void args.templateId;
  const catalogGameType = assertCatalogGameType(args.gameType);
  if (!catalogGameType) {
    return { ok: false, error: "unregistered_game_type" };
  }
  const sessionKey = `casual_sess:${args.matchId}`;

  const picked = await ctx.runMutation(
    internal.service.seedPool.catalogSeedHttp.pickCasualMatchSeed,
    {
      gameType: catalogGameType,
      matchId: args.matchId,
      sessionKey,
      uids: args.uids,
      ...(args.tier != null ? { tier: args.tier } : {}),
    }
  );
  if (!picked.ok) return { ok: false, error: picked.error };
  return {
    ok: true,
    seedBinding: {
      seedId: picked.seedId,
      poolVersion: picked.poolVersion,
      tier: picked.tier as PortalSeedTier,
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
  const catalogGameType = assertCatalogGameType(args.gameType);
  if (!catalogGameType) {
    return { ok: false, error: "unregistered_game_type" };
  }
  const result = await ctx.runMutation(
    internal.service.seedPool.catalogSeedHttp.recordCasualMatchSeedForPlayer,
    {
      gameType: catalogGameType,
      matchId: args.matchId,
      uid: args.uid,
      seedId: args.seedId,
      poolVersion: args.poolVersion,
    }
  );
  if (!result.ok) return result;
  return { ok: true };
}

export async function resolveSeedQuantiles(
  ctx: SeedPoolRuntimeCtx,
  binding: SlimSeedBinding,
  gameType: string
): Promise<ScoreQuantiles> {
  if (binding.scoreQuantiles) return binding.scoreQuantiles;
  const catalogGameType = assertCatalogGameType(gameType);
  if (!catalogGameType) throw new Error("unregistered_game_type");

  if ("db" in ctx) {
    const version = await resolvePoolVersion(ctx.db, catalogGameType, binding.poolVersion);
    if (!version) throw new Error("unknown_seed");
    const entry = await getEntryBySeedId(ctx.db, catalogGameType, version, binding.seedId);
    if (!entry) throw new Error("unknown_seed");
    return entry.metrics.scoreQuantiles;
  }

  const entry = await ctx.runMutation(
    internal.service.seedPool.catalogSeedHttp.fetchSeedEntryBySeedId,
    {
      gameType: catalogGameType,
      seedId: binding.seedId,
      poolVersion: binding.poolVersion,
    }
  );
  if (!entry) throw new Error("unknown_seed");
  return entry.metrics.scoreQuantiles;
}

async function fetchRolloutBandsViaMutation(
  ctx: Pick<ActionCtx, "runMutation"> | Pick<MutationCtx, "runMutation">,
  args: {
    gameType: CatalogGameType;
    seedId: string;
    poolVersion: string;
    bands: ScoreBand[];
  }
): Promise<RolloutBandResult[]> {
  const result = await ctx.runMutation(
    internal.service.seedPool.catalogSeedHttp.fetchRolloutsForCasualMatchSeed,
    {
      gameType: args.gameType,
      seedId: args.seedId,
      poolVersion: args.poolVersion,
      scores: args.bands,
    }
  );
  if (!result.ok) return args.bands.map((b) => ({ ...b, rollouts: [] }));
  return result.bands;
}

export async function bridgeFetchRolloutBands(
  ctx: SeedPoolRuntimeCtx,
  args: {
    gameType: string;
    seedBinding: SlimSeedBinding;
    bands: ScoreBand[];
  }
): Promise<RolloutBandResult[]> {
  const catalogGameType = assertCatalogGameType(args.gameType);
  if (!catalogGameType) {
    return args.bands.map((b) => ({ ...b, rollouts: [] }));
  }

  if ("db" in ctx) {
    const result = await rolloutsForCasualMatchSeedCore(ctx.db, {
      gameType: catalogGameType,
      seedId: args.seedBinding.seedId,
      poolVersion: args.seedBinding.poolVersion,
      scores: args.bands,
    });
    if (!result.ok) return args.bands.map((b) => ({ ...b, rollouts: [] }));
    return result.bands;
  }

  return fetchRolloutBandsViaMutation(ctx, {
    gameType: catalogGameType,
    seedId: args.seedBinding.seedId,
    poolVersion: args.seedBinding.poolVersion,
    bands: args.bands,
  });
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
