import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import {
  catalogGameType,
  catalogSeedTier,
} from "./seedPoolValidators";
import {
  buildPickOkPayload,
  findMatchSeedPickByMatchId,
  findRolloutsInSeed,
  getEntryBySeedId,
  insertMatchSeedPick,
  loadRolloutSummariesForSeed,
  loadUsedSeedIdsForUids,
  matchesRolloutFilter,
  pickDeterministicSeedAnyTier,
  pickDeterministicSeedForTier,
  recordPlayerSeedsForMatch,
  resolvePoolVersion,
  shuffleRolloutsByKey,
  type CatalogGameType,
  type SeedPoolEntryDoc,
} from "./seedPoolStore";
import type { DatabaseReader } from "../../_generated/server";
import { createIngestTiming } from "../tournament/submit/casualIngestTiming";

const scoreBand = v.object({
  min: v.number(),
  max: v.optional(v.number()),
  count: v.optional(v.number()),
});

/** 首选档位 → 其余档位回退（避免首选空池时开桌失败） */
function uniqueSeedTiersToTry(
  preferred: "easy" | "medium" | "hard"
): Array<"easy" | "medium" | "hard"> {
  const rest = (["easy", "medium", "hard"] as const).filter((t) => t !== preferred);
  return [preferred, ...rest];
}

/** block_blast：在首选档内只抽最难切片（按 scoreP50 升序）。 */
const BLOCK_BLAST_HARDEST_FRACTION = 0.35;

async function pickSeedWithOptionalTier(
  db: DatabaseReader,
  args: {
    gameType: CatalogGameType;
    version: string;
    /** Omit / null = pick across all tiers. */
    preferredTier: "easy" | "medium" | "hard" | null | undefined;
    sessionKey: string;
    excludeSeedIds: ReadonlySet<string>;
    highPlayerEaseFraction?: number;
  }
): Promise<SeedPoolEntryDoc | null> {
  const hardestFraction =
    args.gameType === "block_blast" ? BLOCK_BLAST_HARDEST_FRACTION : undefined;
  const easeOpts =
    typeof args.highPlayerEaseFraction === "number" &&
    args.highPlayerEaseFraction > 0 &&
    args.highPlayerEaseFraction < 1
      ? { highPlayerEaseFraction: args.highPlayerEaseFraction }
      : undefined;
  if (args.preferredTier == null) {
    return pickDeterministicSeedAnyTier(
      db,
      args.gameType,
      args.version,
      args.sessionKey,
      args.excludeSeedIds
    );
  }
  for (const tryTier of uniqueSeedTiersToTry(args.preferredTier)) {
    const entry = await pickDeterministicSeedForTier(
      db,
      args.gameType,
      args.version,
      tryTier,
      args.sessionKey,
      args.excludeSeedIds,
      {
        ...(hardestFraction != null ? { hardestFraction } : {}),
        ...(easeOpts ?? {}),
      }
    );
    if (entry) return entry;
  }
  return null;
}

export const pickCasualMatchSeed = internalMutation({
  args: {
    gameType: catalogGameType,
    matchId: v.string(),
    /** Omit for no preferred tier (whole-pool pick). */
    tier: v.optional(catalogSeedTier),
    /** L3 ritual/transition: keep top fraction by playerEaseScore within tier. */
    highPlayerEaseFraction: v.optional(v.number()),
    poolVersion: v.optional(v.string()),
    sessionKey: v.string(),
    uids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType as CatalogGameType;
    const preferredTier = args.tier;
    const highPlayerEaseFraction = args.highPlayerEaseFraction;
    const uids = [...new Set(args.uids.map((u) => u.trim()).filter(Boolean))];
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const version = await resolvePoolVersion(ctx.db, gameType, args.poolVersion);
    if (!version) {
      return { ok: false as const, error: "no_active_pool" as const };
    }

    const existingPick = await findMatchSeedPickByMatchId(ctx.db, gameType, args.matchId);
    if (existingPick) {
      if (existingPick.poolVersion !== version) {
        return { ok: false as const, error: "match_seed_conflict" as const };
      }
      const entry = await getEntryBySeedId(ctx.db, gameType, version, existingPick.seedId);
      if (!entry) {
        return { ok: false as const, error: "bound_seed_missing_from_pool" as const };
      }
      return buildPickOkPayload(entry, true);
    }

    const usedSeedIds = await loadUsedSeedIdsForUids(ctx.db, gameType, version, uids);
    let entry = await pickSeedWithOptionalTier(ctx.db, {
      gameType,
      version,
      preferredTier,
      sessionKey: args.sessionKey,
      excludeSeedIds: usedSeedIds,
      highPlayerEaseFraction,
    });
    if (!entry) {
      entry = await pickSeedWithOptionalTier(ctx.db, {
        gameType,
        version,
        preferredTier,
        sessionKey: `${args.sessionKey}|reuse`,
        excludeSeedIds: new Set(),
        highPlayerEaseFraction,
      });
    }
    if (!entry) {
      return { ok: false as const, error: "no_unused_seed_for_tier" as const };
    }

    await insertMatchSeedPick(ctx.db, {
      gameType,
      matchId: args.matchId,
      seedId: entry.seedId,
      poolVersion: version,
      uids,
      sessionKey: args.sessionKey,
    });

    return buildPickOkPayload(entry);
  },
});

export const recordCasualMatchSeedForPlayer = internalMutation({
  args: {
    gameType: catalogGameType,
    matchId: v.string(),
    uid: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType as CatalogGameType;
    const uid = args.uid.trim();
    if (!uid) return { ok: false as const, error: "missing_uid" as const };

    const pick = await findMatchSeedPickByMatchId(ctx.db, gameType, args.matchId);
    if (!pick) return { ok: false as const, error: "unknown_match_pick" as const };
    if (pick.seedId !== args.seedId || pick.poolVersion !== args.poolVersion) {
      return { ok: false as const, error: "seed_mismatch" as const };
    }
    if (!pick.uids.includes(uid)) {
      return { ok: false as const, error: "uid_not_in_match" as const };
    }

    await recordPlayerSeedsForMatch(ctx.db, {
      gameType,
      uids: [uid],
      seedId: args.seedId,
      poolVersion: args.poolVersion,
      matchId: args.matchId,
    });
    return { ok: true as const };
  },
});

export const getSeedEntryBySeedId = internalQuery({
  args: {
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType as CatalogGameType;
    const version = await resolvePoolVersion(ctx.db, gameType, args.poolVersion);
    if (!version) return null;
    return await getEntryBySeedId(ctx.db, gameType, version, args.seedId);
  },
});

/** action/http 侧拉 rollout：用 mutation 直读 DB，避免 action→runQuery 偶发挂起。 */
export const fetchRolloutsForCasualMatchSeed = internalMutation({
  args: {
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    scores: v.array(scoreBand),
  },
  handler: async (ctx, args) => {
    const timing = createIngestTiming(
      "fetchRolloutsForCasualMatchSeed",
      `${args.gameType}:${args.seedId}`
    );
    return rolloutsForCasualMatchSeedCore(
      ctx.db,
      {
        gameType: args.gameType as CatalogGameType,
        seedId: args.seedId,
        poolVersion: args.poolVersion,
        scores: args.scores,
      },
      timing
    );
  },
});

export const fetchSeedEntryBySeedId = internalMutation({
  args: {
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType as CatalogGameType;
    const version = await resolvePoolVersion(ctx.db, gameType, args.poolVersion);
    if (!version) return null;
    return await getEntryBySeedId(ctx.db, gameType, version, args.seedId);
  },
});

export async function rolloutsForCasualMatchSeedCore(
  db: DatabaseReader,
  args: {
    gameType: CatalogGameType;
    seedId: string;
    poolVersion?: string;
    scores: Array<{ min: number; max?: number; count?: number }>;
  },
  timing?: ReturnType<typeof createIngestTiming>
): Promise<
  | {
      ok: true;
      bands: Array<{
        min: number;
        max?: number;
        count: number;
        rollouts: Array<{
          rolloutIndex: number;
          finalScore: number;
          elapsedTime: number;
        }>;
      }>;
    }
  | { ok: false; error: "no_active_pool" | "unknown_seed" | "invalid_scores" | "invalid_score_band" }
> {
  const gameType = args.gameType;
  const version = await resolvePoolVersion(db, gameType, args.poolVersion);
  timing?.mark("resolvePoolVersion", { version: version ?? null });
  if (!version) return { ok: false as const, error: "no_active_pool" as const };
  const entry = await getEntryBySeedId(db, gameType, version, args.seedId);
  timing?.mark("getEntryBySeedId", { found: Boolean(entry) });
  if (!entry) return { ok: false as const, error: "unknown_seed" as const };
  if (args.scores.length === 0) {
    return { ok: false as const, error: "invalid_scores" as const };
  }

  const bands: Array<{
    min: number;
    max?: number;
    count: number;
    rollouts: Array<{
      rolloutIndex: number;
      finalScore: number;
      elapsedTime: number;
    }>;
  }> = [];
  const usedAcrossBands = new Set<number>();
  const allRollouts = await loadRolloutSummariesForSeed(db, gameType, version, args.seedId);
  timing?.mark("loadRolloutSummariesForSeed", { rolloutCount: allRollouts.length });

  for (const band of args.scores) {
    if (band.max != null && band.max < band.min) {
      return { ok: false as const, error: "invalid_score_band" as const };
    }
    const count = Math.max(1, Math.min(200, Math.floor(band.count ?? 1)));
    const bandStart = Date.now();
    let rollouts = allRollouts.filter((s) =>
      matchesRolloutFilter(s, {
        minScore: band.min,
        maxScore: band.max,
      })
    );
    timing?.mark("findRolloutsInSeed.band", {
      bandMin: band.min,
      bandMax: band.max ?? null,
      rolloutCount: rollouts.length,
      bandMs: Date.now() - bandStart,
    });
    rollouts = rollouts.filter((r) => !usedAcrossBands.has(r.rolloutIndex));
    const bandKey = `${gameType}|${args.seedId}|${band.min}|${band.max ?? "inf"}`;
    rollouts = shuffleRolloutsByKey(rollouts, bandKey).slice(0, count);
    for (const r of rollouts) usedAcrossBands.add(r.rolloutIndex);
    bands.push({
      min: band.min,
      count,
      ...(band.max != null ? { max: band.max } : {}),
      rollouts: rollouts.map((r) => ({
        rolloutIndex: r.rolloutIndex,
        finalScore: r.finalScore,
        elapsedTime: r.elapsedSimSeconds,
      })),
    });
  }

  timing?.finish("ok", { bandCount: bands.length });
  return { ok: true as const, bands };
}

export const rolloutsForCasualMatchSeed = internalQuery({
  args: {
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    scores: v.array(scoreBand),
  },
  handler: async (ctx, args) => {
    const timing = createIngestTiming(
      "rolloutsForCasualMatchSeed",
      `${args.gameType}:${args.seedId}`
    );
    return rolloutsForCasualMatchSeedCore(
      ctx.db,
      {
        gameType: args.gameType as CatalogGameType,
        seedId: args.seedId,
        poolVersion: args.poolVersion,
        scores: args.scores,
      },
      timing
    );
  },
});

export const rolloutsForTriathlonSeed = internalQuery({
  args: {
    legs: v.array(
      v.object({
        gameType: catalogGameType,
        seedId: v.string(),
        poolVersion: v.string(),
      })
    ),
    scores: v.array(scoreBand),
  },
  handler: async (ctx, args) => {
    const bands: Array<{
      min: number;
      max?: number;
      count: number;
      rollouts: Array<{ rolloutIndex: number; finalScore: number; elapsedTime: number }>;
    }> = [];

    for (const band of args.scores) {
      const count = Math.max(1, Math.min(200, Math.floor(band.count ?? 1)));
      const merged: Array<{ rolloutIndex: number; finalScore: number; elapsedTime: number }> = [];
      for (const leg of args.legs) {
        const gameType = leg.gameType as CatalogGameType;
        const rollouts = await findRolloutsInSeed(
          ctx.db,
          gameType,
          leg.poolVersion,
          leg.seedId,
          { minScore: band.min, maxScore: band.max }
        );
        for (const r of rollouts.slice(0, count)) {
          merged.push({
            rolloutIndex: r.rolloutIndex,
            finalScore: r.finalScore,
            elapsedTime: r.elapsedSimSeconds,
          });
        }
      }
      bands.push({
        min: band.min,
        count,
        ...(band.max != null ? { max: band.max } : {}),
        rollouts: merged,
      });
    }

    return { ok: true as const, bands };
  },
});
