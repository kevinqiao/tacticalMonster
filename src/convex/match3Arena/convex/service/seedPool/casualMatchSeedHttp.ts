import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import { match3SeedTier } from "./match3SeedPoolValidators";
import { findMatchSeedPickByMatchId, insertMatchSeedPick } from "./matchSeedPickStore";
import { loadUsedSeedIdsForUids, recordPlayerSeedsForMatch } from "./playerSeedStore";
import type { SeedPoolEntryDoc } from "./match3SeedPoolStore";
import {
  entryDocToSeedPoolEntry,
  findRolloutsInSeed,
  getEntryBySeedId,
  pickDeterministicSeedForTier,
  resolvePoolVersion,
} from "./match3SeedPoolStore";

function buildPickOkPayload(entry: SeedPoolEntryDoc, idempotent?: boolean) {
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
  count: v.optional(v.number()),
});

export const pickCasualMatchSeed = internalMutation({
  args: {
    matchId: v.string(),
    tier: v.optional(match3SeedTier),
    poolVersion: v.optional(v.string()),
    sessionKey: v.string(),
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

    const existingPick = await findMatchSeedPickByMatchId(ctx.db, args.matchId);
    if (existingPick) {
      if (existingPick.poolVersion !== version) {
        return { ok: false as const, error: "match_seed_conflict" as const };
      }
      const entry = await getEntryBySeedId(ctx.db, version, existingPick.seedId);
      if (!entry) {
        return { ok: false as const, error: "bound_seed_missing_from_pool" as const };
      }
      return buildPickOkPayload(entry, true);
    }

    const usedSeedIds = await loadUsedSeedIdsForUids(ctx.db, version, uids);
    const entry = await pickDeterministicSeedForTier(
      ctx.db,
      version,
      tier,
      args.sessionKey,
      usedSeedIds
    );
    if (!entry) {
      return { ok: false as const, error: "no_unused_seed_for_tier" as const };
    }

    await insertMatchSeedPick(ctx.db, {
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
    matchId: v.string(),
    uid: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const uid = args.uid.trim();
    if (!uid) {
      return { ok: false as const, error: "missing_uid" as const };
    }

    const pick = await findMatchSeedPickByMatchId(ctx.db, args.matchId);
    if (!pick) {
      return { ok: false as const, error: "unknown_match_pick" as const };
    }
    if (pick.seedId !== args.seedId || pick.poolVersion !== args.poolVersion) {
      return { ok: false as const, error: "seed_mismatch" as const };
    }
    if (!pick.uids.includes(uid)) {
      return { ok: false as const, error: "uid_not_in_match" as const };
    }

    const existing = await ctx.db
      .query("player_seeds")
      .withIndex("by_uid_poolVersion_and_seedId", (q) =>
        q.eq("uid", uid).eq("poolVersion", args.poolVersion).eq("seedId", args.seedId)
      )
      .unique();
    if (existing) {
      return { ok: true as const, alreadyRecorded: true as const };
    }

    await recordPlayerSeedsForMatch(ctx.db, {
      uids: [uid],
      seedId: args.seedId,
      poolVersion: args.poolVersion,
      matchId: args.matchId,
    });
    return { ok: true as const };
  },
});

function hashMix(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleRolloutsByKey<T>(items: T[], key: string): T[] {
  const out = [...items];
  let state = hashMix(key);
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const rolloutsForCasualMatchSeed = internalQuery({
  args: {
    seedId: v.string(),
    poolVersion: v.optional(v.string()),
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
    const usedAcrossBands = new Set<number>();

    for (const band of args.scores) {
      if (band.max != null && band.max < band.min) {
        return { ok: false as const, error: "invalid_score_band" as const };
      }
      const countRaw = band.count ?? 1;
      const count = Math.floor(countRaw);
      if (count < 1 || count > 200) {
        return { ok: false as const, error: "invalid_count" as const };
      }
      let rollouts = await findRolloutsInSeed(ctx.db, version, args.seedId, {
        minScore: band.min,
        maxScore: band.max,
      });
      rollouts = rollouts.filter((r) => !usedAcrossBands.has(r.rolloutIndex));
      const bandKey = `${args.seedId}|${band.min}|${band.max ?? "inf"}`;
      rollouts = shuffleRolloutsByKey(rollouts, bandKey).slice(0, count);
      for (const r of rollouts) {
        usedAcrossBands.add(r.rolloutIndex);
      }
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
