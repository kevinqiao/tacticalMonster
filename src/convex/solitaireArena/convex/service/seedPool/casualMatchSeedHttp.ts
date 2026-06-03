import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import { solitaireSeedTier } from "./solitaireSeedPoolValidators";
import {
  findBoundSeedIdForMatch,
  loadUsedSeedIdsForUids,
  recordPlayerSeedsForMatch,
} from "./playerSeedStore";
import type { SeedPoolEntryDoc } from "./solitaireSeedPoolStore";
import {
  entryDocToSeedPoolEntry,
  findRolloutsInSeed,
  getEntryBySeedId,
  pickDeterministicSeedForTier,
  pickRandomSeedForTier,
  resolvePoolVersion,
} from "./solitaireSeedPoolStore";

function buildResolveOkPayload(entry: SeedPoolEntryDoc, idempotent?: boolean) {
  const payload = entryDocToSeedPoolEntry(entry);
  return {
    ok: true as const,
    ...(idempotent ? { idempotent: true as const } : {}),
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
}

const scoreBand = v.object({
  min: v.number(),
  max: v.optional(v.number()),
  /** 该区间最多返回条数；缺省 1 */
  count: v.optional(v.number()),
});

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

    if (args.matchId) {
      const bound = await findBoundSeedIdForMatch(ctx.db, version, args.matchId);
      if (bound && "conflict" in bound) {
        return { ok: false as const, error: "match_seed_conflict" as const };
      }
      if (bound && "seedId" in bound) {
        const existing = await getEntryBySeedId(ctx.db, version, bound.seedId);
        if (!existing) {
          return { ok: false as const, error: "bound_seed_missing_from_pool" as const };
        }
        await recordPlayerSeedsForMatch(ctx.db, {
          uids,
          seedId: bound.seedId,
          poolVersion: version,
          matchId: args.matchId,
        });
        return buildResolveOkPayload(existing, true);
      }
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

    return buildResolveOkPayload(entry);
  },
});

export const rolloutsForCasualMatchSeed = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
    /** 按分数区间遍历查询；`max` 缺省表示无上界；`count` 缺省 1 */
    scores: v.array(scoreBand),
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

    for (const band of args.scores) {
      if (band.max != null && band.max < band.min) {
        return { ok: false as const, error: "invalid_score_band" as const };
      }
      const countRaw = band.count ?? 1;
      if (!Number.isFinite(countRaw)) {
        return { ok: false as const, error: "invalid_count" as const };
      }
      const count = Math.floor(countRaw);
      if (count < 1 || count > 200) {
        return { ok: false as const, error: "invalid_count" as const };
      }
      let rollouts = await findRolloutsInSeed(ctx.db, version, args.seedId, {
        minScore: band.min,
        maxScore: band.max,
      });
      rollouts = rollouts.slice(0, count);
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
