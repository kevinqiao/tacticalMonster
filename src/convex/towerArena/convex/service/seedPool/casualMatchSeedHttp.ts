import { v } from "convex/values";

import { internalMutation, internalQuery } from "../../_generated/server";
import { towerSeedTier } from "./towerSeedPoolValidators";
import { findMatchSeedPickByMatchId, insertMatchSeedPick } from "./matchSeedPickStore";
import { loadUsedSeedIdsForUids, recordPlayerSeedsForMatch } from "./playerSeedStore";
import type { SeedPoolEntryDoc } from "./towerSeedPoolStore";
import {
  entryDocToSeedPoolEntry,
  findRolloutsInSeed,
  getEntryBySeedId,
  pickDeterministicSeedForTier,
  resolvePoolVersion,
} from "./towerSeedPoolStore";

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
    tier: v.optional(towerSeedTier),
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

    await recordPlayerSeedsForMatch(ctx.db, {
      uids: [uid],
      seedId: args.seedId,
      poolVersion: args.poolVersion,
      matchId: args.matchId,
    });
    return { ok: true as const };
  },
});

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
      return { ok: false as const, error: "seed_not_found" as const };
    }

    const rollouts: Array<{
      rolloutIndex: number;
      finalScore: number;
      moves: number;
      completed: boolean;
      terminalReason: string;
      elapsedSimSeconds: number;
      opCount: number;
    }> = [];

    for (const band of args.scores) {
      const count = band.count ?? 1;
      let found = await findRolloutsInSeed(ctx.db, version, args.seedId, {
        minScore: band.min,
        maxScore: band.max,
      });
      if (found.length === 0) {
        found = await findRolloutsInSeed(ctx.db, version, args.seedId, {});
      }
      found = found.slice(0, count);
      rollouts.push(...found);
    }

    return {
      ok: true as const,
      seedId: args.seedId,
      poolVersion: version,
      rollouts,
    };
  },
});
