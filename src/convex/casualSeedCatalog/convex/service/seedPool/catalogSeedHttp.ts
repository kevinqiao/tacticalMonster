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
  loadUsedSeedIdsForUids,
  pickDeterministicSeedForTier,
  recordPlayerSeedsForMatch,
  resolvePoolVersion,
  shuffleRolloutsByKey,
  type CatalogGameType,
} from "./seedPoolStore";

const scoreBand = v.object({
  min: v.number(),
  max: v.optional(v.number()),
  count: v.optional(v.number()),
});

export const pickCasualMatchSeed = internalMutation({
  args: {
    gameType: catalogGameType,
    matchId: v.string(),
    tier: v.optional(catalogSeedTier),
    poolVersion: v.optional(v.string()),
    sessionKey: v.string(),
    uids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType as CatalogGameType;
    const tier = args.tier ?? "easy";
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
    let entry = await pickDeterministicSeedForTier(
      ctx.db,
      gameType,
      version,
      tier,
      args.sessionKey,
      usedSeedIds
    );
    if (!entry) {
      entry = await pickDeterministicSeedForTier(
        ctx.db,
        gameType,
        version,
        tier,
        `${args.sessionKey}|reuse`,
        new Set()
      );
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

export const rolloutsForCasualMatchSeed = internalQuery({
  args: {
    gameType: catalogGameType,
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    scores: v.array(scoreBand),
  },
  handler: async (ctx, args) => {
    const gameType = args.gameType as CatalogGameType;
    const version = await resolvePoolVersion(ctx.db, gameType, args.poolVersion);
    if (!version) return { ok: false as const, error: "no_active_pool" as const };
    const entry = await getEntryBySeedId(ctx.db, gameType, version, args.seedId);
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

    for (const band of args.scores) {
      if (band.max != null && band.max < band.min) {
        return { ok: false as const, error: "invalid_score_band" as const };
      }
      const count = Math.max(1, Math.min(200, Math.floor(band.count ?? 1)));
      let rollouts = await findRolloutsInSeed(ctx.db, gameType, version, args.seedId, {
        minScore: band.min,
        maxScore: band.max,
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

    return { ok: true as const, bands };
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
