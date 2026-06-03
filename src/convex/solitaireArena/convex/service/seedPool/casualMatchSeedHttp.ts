import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import { solitaireSeedTier } from "./solitaireSeedPoolValidators";
import {
  loadUsedSeedIdsForUids,
  recordPlayerSeedsForMatch,
} from "./playerSeedStore";
import {
  entryDocToSeedPoolEntry,
  findRolloutsInSeed,
  getEntryBySeedId,
  pickDeterministicSeedForTier,
  pickRandomSeedForTier,
  resolvePoolVersion,
} from "./solitaireSeedPoolStore";

const scoreQuantileKey = v.union(
  v.literal("p10"),
  v.literal("p25"),
  v.literal("p30"),
  v.literal("p33"),
  v.literal("p50"),
  v.literal("p66"),
  v.literal("p70"),
  v.literal("p75"),
  v.literal("p90")
);

export const resolveCasualMatchSeed = internalMutation({
  args: {
    tier: v.optional(solitaireSeedTier),
    poolVersion: v.optional(v.string()),
    sessionKey: v.optional(v.string()),
    matchId: v.optional(v.string()),
    /** 本场真人 uid 列表（单人亦传长度为 1 的数组） */
    uids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const tier = args.tier ?? "easy";
    const uids = [...new Set(args.uids.map((u) => u.trim()).filter(Boolean))];
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const version = await resolvePoolVersion(ctx.db, args.poolVersion);
    if (!version) {
      return { ok: false as const, error: "no_active_pool" as const };
    }

    const usedSeedIds = await loadUsedSeedIdsForUids(ctx.db, version, uids);
    const sessionKey = args.sessionKey ?? (args.matchId ? `casual_sess:${args.matchId}` : undefined);
    const entry = sessionKey
      ? await pickDeterministicSeedForTier(ctx.db, version, tier, sessionKey, usedSeedIds)
      : await pickRandomSeedForTier(ctx.db, version, tier, usedSeedIds);
    if (!entry) {
      return { ok: false as const, error: "no_unused_seed_for_tier" as const };
    }

    await recordPlayerSeedsForMatch(ctx.db, {
      uids,
      seedId: entry.seedId,
      poolVersion: version,
      matchId: args.matchId,
    });

    const payload = entryDocToSeedPoolEntry(entry);
    return {
      ok: true as const,
      seedId: payload.seedId,
      poolVersion: payload.poolVersion,
      tier: payload.tier,
      difficultyScore: payload.difficultyScore,
      metrics: {
        scoreQuantiles: payload.metrics.scoreQuantiles,
        rolloutCount: payload.metrics.rolloutCount,
        matchTimeLimitSec: payload.metrics.matchTimeLimitSec,
      },
    };
  },
});

export const rolloutsForCasualMatchSeed = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    scoreQuantileMin: v.optional(scoreQuantileKey),
    scoreQuantileMax: v.optional(scoreQuantileKey),
    minScore: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const version = await resolvePoolVersion(ctx.db, args.poolVersion);
    if (!version) {
      return { ok: false as const, error: "no_active_pool" as const };
    }
    const entry = await getEntryBySeedId(ctx.db, version, args.seedId);
    if (!entry) {
      return { ok: false as const, error: "unknown_seed" as const };
    }

    let minScore = args.minScore;
    let maxScore = args.maxScore;
    const q = entry.metrics.scoreQuantiles;
    if (args.scoreQuantileMin && minScore == null) {
      minScore = q[args.scoreQuantileMin];
    }
    if (args.scoreQuantileMax && maxScore == null) {
      maxScore = q[args.scoreQuantileMax];
    }

    let rollouts = await findRolloutsInSeed(ctx.db, version, args.seedId, {
      minScore,
      maxScore,
    });
    const cap = args.limit != null ? Math.max(1, Math.min(args.limit, 200)) : undefined;
    if (cap != null) rollouts = rollouts.slice(0, cap);

    return {
      ok: true as const,
      rollouts: rollouts.map((r) => ({
        rolloutIndex: r.rolloutIndex,
        finalScore: r.finalScore,
        elapsedTime: r.elapsedSimSeconds,
      })),
    };
  },
});
