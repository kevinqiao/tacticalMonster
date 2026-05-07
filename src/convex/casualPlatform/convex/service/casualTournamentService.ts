import { v } from "convex/values";
import { internal } from "../_generated/api";
import { resolveSeasonChallengeSettlement } from "../data/casualSeasonChallengeRewards";
import {
  applyPassXpFromModifiers,
  applyScaledCurrencyCost,
  applyVoucherCost,
  getDefaultCasualTournaments,
  getTournamentDefinition,
  listTournamentDefinitions,
  seasonPointsFromScore,
} from "../data/casualTournamentConfigs";
import type { EntryCost } from "../data/casualTournamentConfigs";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";

async function activeSeasonId(ctx: MutationCtx): Promise<string | null> {
  const seasons = await ctx.db.query("casual_seasons").collect();
  const s = seasons.find((r) => r.active) ?? seasons[0];
  return s?.seasonId ?? null;
}

function applyEntryCostToPlayerPatch(
  row: { coins?: number; gems?: number; seasonVouchers?: number },
  cost: EntryCost
): { ok: true; patch: Record<string, number> } | { ok: false; error: string } {
  if (cost.kind === "none") return { ok: true, patch: {} };
  if (cost.kind === "coins") {
    const cur = row.coins ?? 0;
    if (cur < cost.amount) return { ok: false, error: "insufficient_coins" };
    return { ok: true, patch: { coins: cur - cost.amount } };
  }
  if (cost.kind === "gems") {
    const cur = row.gems ?? 0;
    if (cur < cost.amount) return { ok: false, error: "insufficient_gems" };
    return { ok: true, patch: { gems: cur - cost.amount } };
  }
  if (cost.kind === "seasonVouchers") {
    const cur = row.seasonVouchers ?? 0;
    if (cur < cost.amount) return { ok: false, error: "insufficient_vouchers" };
    return { ok: true, patch: { seasonVouchers: cur - cost.amount } };
  }
  return { ok: false, error: "bad_entry_cost" };
}

/** 确保演示锦标存在于 DB（幂等） */
export const seedDemoTournaments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seasons = await ctx.db.query("casual_seasons").collect();
    if (seasons.length === 0) {
      const now = Date.now();
      await ctx.db.insert("casual_seasons", {
        seasonId: "casual_s1",
        name: "Season 1",
        startsAt: now,
        endsAt: now + 90 * 86400000,
        active: true,
      });
    }
    let tournamentsUpserted = 0;
    for (const t of listTournamentDefinitions()) {
      const existing = await ctx.db
        .query("casual_tournaments")
        .withIndex("by_tournamentId", (q) => q.eq("tournamentId", t.tournamentId))
        .unique();
      if (!existing) {
        await ctx.db.insert("casual_tournaments", {
          tournamentId: t.tournamentId,
          title: t.title,
          gameId: t.gameId,
          matchType: t.matchType,
          status: t.status,
        });
        tournamentsUpserted++;
      } else if (
        existing.title !== t.title ||
        existing.gameId !== t.gameId ||
        existing.matchType !== t.matchType ||
        existing.status !== t.status
      ) {
        await ctx.db.patch(existing._id, {
          title: t.title,
          gameId: t.gameId,
          matchType: t.matchType,
          status: t.status,
        });
        tournamentsUpserted++;
      }
    }
    await ctx.runMutation(internal.service.casualShopService.seedShopSkusIfEmpty, {});
    await ctx.runMutation(internal.service.casualActivityService.seedActivitiesIfEmpty, {});
    return { ok: true as const, tournamentsUpserted };
  },
});

export const listTournaments = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("casual_tournaments").collect();
    const mapped =
      rows.length > 0
        ? rows.map((r) => ({
            tournamentId: r.tournamentId,
            title: r.title,
            gameId: r.gameId,
            matchType: r.matchType,
            status: r.status,
          }))
        : getDefaultCasualTournaments();
    return mapped.filter((r) => {
      const d = getTournamentDefinition(r.tournamentId);
      return d?.matchType !== "season_challenge";
    });
  },
});

export const leaderboard = query({
  args: { tournamentId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { tournamentId, limit }) => {
    const defLb = getTournamentDefinition(tournamentId);
    if (defLb?.hideLeaderboard) {
      return [];
    }
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    const entries = await ctx.db
      .query("casual_entries")
      .withIndex("by_tournament_score", (q) => q.eq("tournamentId", tournamentId))
      .order("desc")
      .take(n);
    return entries
      .filter((e) => e.score != null)
      .map((e, i) => ({
        rank: i + 1,
        uid: e.uid,
        score: e.score as number,
        submittedAt: e.submittedAt,
      }));
  },
});

export type JoinTournamentCoreResult =
  | {
      ok: true;
      entryId: Id<"casual_entries">;
      vouchersCharged?: number;
      coinsCharged?: number;
      gemsCharged?: number;
      activityIds?: string[];
    }
  | { ok: false; error: string };

/** 锦标 / 赛季专场共用入场逻辑（专场允许多次扣券重入场） */
export const joinTournamentCore = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
  },
  handler: async (ctx, { uid, tournamentId }): Promise<JoinTournamentCoreResult> => {
    await ctx.runMutation(internal.service.casualTournamentService.seedDemoTournaments, {});
    const def = getTournamentDefinition(tournamentId);
    if (!def) {
      return { ok: false as const, error: "unknown_tournament" };
    }

    const existing = await ctx.db
      .query("casual_entries")
      .withIndex("by_uid_tournament", (q) => q.eq("uid", uid).eq("tournamentId", tournamentId))
      .unique();

    if (existing && def.matchType !== "season_challenge") {
      return { ok: true as const, entryId: existing._id };
    }

    const player = await ctx.runQuery(internal.dao.casualPlayerDao.findByUid, { uid });
    if (!player) {
      return { ok: false as const, error: "no_player" };
    }

    let entryCost: EntryCost = def.entry;
    let activityIds: string[] | undefined;
    if (def.matchType === "season_challenge" && def.entry.kind === "seasonVouchers") {
      const modifiers = await ctx.runQuery(
        internal.service.casualActivityService.resolveSeasonActivityModifiers,
        { tournamentId }
      );
      activityIds = modifiers.activityIds;
      entryCost = {
        kind: "seasonVouchers",
        amount: applyVoucherCost(
          def.entry.amount,
          modifiers.voucherCostMultiplier,
          modifiers.voucherCostDelta
        ),
      };
    } else if (def.entry.kind === "coins") {
      const modifiers = await ctx.runQuery(
        internal.service.casualActivityService.resolveSeasonActivityModifiers,
        { tournamentId }
      );
      activityIds = modifiers.activityIds;
      entryCost = {
        kind: "coins",
        amount: applyScaledCurrencyCost(
          def.entry.amount,
          modifiers.coinsCostMultiplier,
          modifiers.coinsCostDelta
        ),
      };
    } else if (def.entry.kind === "gems") {
      const modifiers = await ctx.runQuery(
        internal.service.casualActivityService.resolveSeasonActivityModifiers,
        { tournamentId }
      );
      activityIds = modifiers.activityIds;
      entryCost = {
        kind: "gems",
        amount: applyScaledCurrencyCost(
          def.entry.amount,
          modifiers.gemsCostMultiplier,
          modifiers.gemsCostDelta
        ),
      };
    }

    const costResult = applyEntryCostToPlayerPatch(player, entryCost);
    if (!costResult.ok) {
      return { ok: false as const, error: costResult.error };
    }

    if (Object.keys(costResult.patch).length > 0) {
      await ctx.runMutation(internal.dao.casualPlayerDao.patchByUid, {
        uid,
        ...costResult.patch,
      });
    }

    const vouchersCharged =
      entryCost.kind === "seasonVouchers" ? entryCost.amount : undefined;
    const coinsCharged = entryCost.kind === "coins" ? entryCost.amount : undefined;
    const gemsCharged = entryCost.kind === "gems" ? entryCost.amount : undefined;

    if (existing && def.matchType === "season_challenge") {
      return {
        ok: true as const,
        entryId: existing._id,
        vouchersCharged,
        coinsCharged,
        gemsCharged,
        activityIds,
      };
    }

    const id = await ctx.db.insert("casual_entries", {
      uid,
      tournamentId,
      submittedAt: Date.now(),
      entryStatus: "joined",
    });
    await ctx.runMutation(internal.service.casualTaskService.notifyTournamentJoined, { uid });
    return {
      ok: true as const,
      entryId: id,
      vouchersCharged,
      coinsCharged,
      gemsCharged,
      activityIds,
    };
  },
});

export const joinTournament = mutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
  },
  handler: async (ctx, { uid, tournamentId }): Promise<JoinTournamentCoreResult> => {
    return await ctx.runMutation(internal.service.casualTournamentService.joinTournamentCore, {
      uid,
      tournamentId,
    });
  },
});

export const applyScore = internalMutation({
  args: {
    uid: v.string(),
    tournamentId: v.string(),
    gameId: v.string(),
    score: v.number(),
    externalGameId: v.optional(v.string()),
  },
  handler: async (ctx, { uid, tournamentId, gameId, score, externalGameId }) => {
    await ctx.runMutation(internal.service.casualTournamentService.seedDemoTournaments, {});
    const def = getTournamentDefinition(tournamentId);
    if (!def || def.gameId !== gameId) {
      return { ok: false as const, error: "bad_tournament" };
    }
    if (!Number.isFinite(score) || score < 0) {
      return { ok: false as const, error: "bad_score" };
    }
    const row = await ctx.db
      .query("casual_entries")
      .withIndex("by_uid_tournament", (q) => q.eq("uid", uid).eq("tournamentId", tournamentId))
      .unique();
    if (!row) {
      return { ok: false as const, error: "must_join_first" };
    }
    if (
      externalGameId &&
      row.externalGameId === externalGameId &&
      row.score === score
    ) {
      return { ok: true as const, entryId: row._id, deduped: true as const };
    }
    const best = row.score == null ? score : Math.max(row.score, score);
    const now = Date.now();
    await ctx.db.patch(row._id, {
      score: best,
      submittedAt: now,
      externalGameId: externalGameId ?? row.externalGameId,
      entryStatus: "submitted",
    });
    const seasonId = await activeSeasonId(ctx);
    const pointsDelta = seasonPointsFromScore(score, def.seasonPointsMultiplier);
    if (seasonId && pointsDelta > 0) {
      const stat = await ctx.db
        .query("casual_player_season_stats")
        .withIndex("by_season_uid", (q) => q.eq("seasonId", seasonId).eq("uid", uid))
        .unique();
      const addMain = pointsDelta;
      const addC = def.matchType === "tournament_c" ? pointsDelta : 0;
      if (!stat) {
        await ctx.db.insert("casual_player_season_stats", {
          uid,
          seasonId,
          mainSeasonPoints: addMain,
          cArenaPoints: addC,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(stat._id, {
          mainSeasonPoints: stat.mainSeasonPoints + addMain,
          cArenaPoints: stat.cArenaPoints + addC,
          updatedAt: now,
        });
      }
    }
    if (def.rewardCoinsOnSettle > 0) {
      await ctx.runMutation(internal.service.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "coins",
        amount: def.rewardCoinsOnSettle,
      });
    }
    if (def.rewardGemsOnSettle > 0) {
      await ctx.runMutation(internal.service.casualRewardRegistry.grantCasualReward, {
        uid,
        kind: "gems",
        amount: def.rewardGemsOnSettle,
      });
    }
    let passXpDelta = def.seasonXpOnSettle;
    if (def.seasonXpOnSettle > 0) {
      const xpMods = await ctx.runQuery(
        internal.service.casualActivityService.resolveSeasonActivityModifiers,
        { tournamentId }
      );
      passXpDelta = applyPassXpFromModifiers(
        def.seasonXpOnSettle,
        xpMods.passXpMultiplier,
        xpMods.passXpDelta
      );
    }
    if (passXpDelta > 0) {
      await ctx.runMutation(internal.service.casualSeasonService.addPassXpFromRun, {
        uid,
        deltaXp: passXpDelta,
      });
    }

    let seasonChallengeSettlement:
      | {
          rating: string;
          challengePointsGranted: number;
          bonusSeasonVoucher?: number;
        }
      | undefined;

    let spotlightChallengePointsEarned = 0;
    if (def.matchType === "season_challenge") {
      const settle = resolveSeasonChallengeSettlement(tournamentId, gameId, score);
      if (settle) {
        spotlightChallengePointsEarned = settle.challengePoints;
        seasonChallengeSettlement = {
          rating: settle.rating,
          challengePointsGranted: settle.challengePoints,
          ...(settle.bonusSeasonVoucher > 0
            ? { bonusSeasonVoucher: settle.bonusSeasonVoucher }
            : {}),
        };
        if (settle.challengePoints > 0) {
          await ctx.runMutation(internal.service.casualRewardRegistry.grantCasualReward, {
            uid,
            kind: "seasonChallengePoints",
            amount: settle.challengePoints,
          });
        }
        if (settle.bonusSeasonVoucher > 0) {
          await ctx.runMutation(internal.service.casualRewardRegistry.grantCasualReward, {
            uid,
            kind: "seasonVoucher",
            amount: settle.bonusSeasonVoucher,
          });
        }
      }
    }

    await ctx.runMutation(internal.service.casualTaskService.notifyScoreSubmitted, {
      uid,
      matchType: def.matchType,
      challengePointsEarned: spotlightChallengePointsEarned,
      spotlightRating: seasonChallengeSettlement?.rating as "S" | "A" | "B" | "C" | undefined,
    });
    return {
      ok: true as const,
      entryId: row._id,
      ...(seasonChallengeSettlement ? { seasonChallengeSettlement } : {}),
    };
  },
});
