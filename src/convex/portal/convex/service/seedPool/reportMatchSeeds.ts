/**
 * Dev/ops: list seed details for portal_run_player_games (matches that ran).
 * Invoked via `scripts/portal/report-match-seeds.mjs`.
 */
import { v } from "convex/values";

import {
  getPortalTournamentDefinition,
  resolveScoreMultiplierForSuccessQuantile,
  resolveSoloSeedSuccessThreshold,
} from "../../data/portalTournamentConfigs";
import { internalQuery } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import { isCasualAsyncVirtualOpponentUid } from "../tournament/settle/async/casualAsyncTypes";
import {
  getEntryBySeedId,
  type CatalogGameType,
  type SeedPoolEntryDoc,
} from "./seedPoolStore";
import { catalogGameType } from "./seedPoolValidators";

const CATALOG_GAME_TYPES = new Set([
  "block_blast",
  "solitaire",
  "match_3",
  "tower_arena",
  "yatz",
]);

function asCatalogGameType(gameType: string): CatalogGameType | null {
  return CATALOG_GAME_TYPES.has(gameType) ? (gameType as CatalogGameType) : null;
}

function poolEntrySummary(entry: SeedPoolEntryDoc | null) {
  if (!entry) return null;
  const q = entry.metrics.scoreQuantiles;
  return {
    difficultyScore: entry.difficultyScore,
    tier: entry.tier,
    solvable: entry.solvable ?? null,
    rolloutCount: entry.metrics.rolloutCount,
    scoreMin: entry.metrics.scoreMin,
    scoreP50: entry.metrics.scoreP50,
    scoreP75: q.p75,
    scoreP90: entry.metrics.scoreP90,
    scoreMax: entry.metrics.scoreMax,
    playerEaseScore: entry.metrics.playerEaseScore ?? null,
    clearEaseScore: entry.metrics.clearEaseScore ?? null,
    survivalTimeP25: entry.metrics.survivalTimeP25 ?? null,
    survivalTimeP50: entry.metrics.survivalTimeP50 ?? null,
    survivalTimeP90: entry.metrics.survivalTimeP90 ?? null,
    survivalTimeSpread: entry.metrics.survivalTimeSpread ?? null,
    scoreQuantiles: q,
  };
}

export const listMatchSeedDetails = internalQuery({
  args: {
    gameType: v.optional(catalogGameType),
    uid: v.optional(v.string()),
    templateId: v.optional(v.string()),
    includeBots: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 2000);
    const includeBots = args.includeBots === true;

    let games: Doc<"portal_run_player_games">[];
    if (args.uid) {
      games = await ctx.db
        .query("portal_run_player_games")
        .withIndex("by_uid", (q) => q.eq("uid", args.uid!))
        .collect();
    } else {
      games = await ctx.db.query("portal_run_player_games").collect();
    }

    games = games.filter((g) => {
      if (args.gameType && g.gameType !== args.gameType) return false;
      if (args.templateId && g.templateId !== args.templateId) return false;
      if (!includeBots && isCasualAsyncVirtualOpponentUid(g.uid)) return false;
      return true;
    });
    games.sort((a, b) => b.createdAt - a.createdAt);
    const truncated = games.length > limit;
    games = games.slice(0, limit);

    const entryCache = new Map<string, SeedPoolEntryDoc | null>();
    const pmCache = new Map<string, Doc<"portal_run_player_matches"> | null>();

    const rows = [];
    for (const g of games) {
      const pmKey = String(g.playerMatchId);
      let pm = pmCache.get(pmKey);
      if (pm === undefined) {
        pm = (await ctx.db.get(g.playerMatchId)) ?? null;
        pmCache.set(pmKey, pm);
      }

      const binding = g.seedBinding;
      const catalogGt = asCatalogGameType(g.gameType);
      let poolEntry: SeedPoolEntryDoc | null = null;
      if (catalogGt) {
        const cacheKey = `${g.gameType}|${binding.poolVersion}|${binding.seedId}`;
        if (entryCache.has(cacheKey)) {
          poolEntry = entryCache.get(cacheKey) ?? null;
        } else {
          poolEntry = await getEntryBySeedId(
            ctx.db,
            catalogGt,
            binding.poolVersion,
            binding.seedId
          );
          entryCache.set(cacheKey, poolEntry);
        }
      }

      const def = getPortalTournamentDefinition(g.templateId);
      const quantile =
        binding.successQuantile ??
        def?.seedQuantileSuccess?.quantile ??
        null;
      const scoreMultiplier = resolveScoreMultiplierForSuccessQuantile(
        def?.seedQuantileSuccess,
        quantile
      );
      const quantiles =
        binding.scoreQuantiles ?? poolEntry?.metrics.scoreQuantiles ?? null;
      const resolvedThreshold = resolveSoloSeedSuccessThreshold({
        gameType: g.gameType,
        ritualOneLineClear: binding.ritualOneLineClear,
        quantiles,
        successQuantile: quantile,
        seedQuantileSuccess: def?.seedQuantileSuccess,
      });

      rows.push({
        createdAt: g.createdAt,
        finishedAt: g.finishedAt ?? null,
        matchId: g.matchId,
        gameId: g.gameId,
        gameIndex: g.gameIndex,
        uid: g.uid,
        isBot: isCasualAsyncVirtualOpponentUid(g.uid),
        templateId: g.templateId,
        gameType: g.gameType,
        status: g.status,
        score: g.score ?? null,
        seedId: binding.seedId,
        poolVersion: binding.poolVersion,
        tier: binding.tier,
        successQuantile: quantile,
        scoreMultiplier,
        bindingQuantiles: binding.scoreQuantiles ?? null,
        seedScoreThreshold: pm?.seedScoreThreshold ?? null,
        challengeSuccess: pm?.challengeSuccess ?? null,
        resolvedThreshold: resolvedThreshold ?? null,
        playerEaseScore: poolEntry?.metrics.playerEaseScore ?? null,
        survivalTimeP25: poolEntry?.metrics.survivalTimeP25 ?? null,
        survivalTimeP50: poolEntry?.metrics.survivalTimeP50 ?? null,
        survivalTimeP90: poolEntry?.metrics.survivalTimeP90 ?? null,
        survivalTimeSpread: poolEntry?.metrics.survivalTimeSpread ?? null,
        poolEntry: poolEntrySummary(poolEntry),
      });
    }

    return {
      count: rows.length,
      truncated,
      includeBots,
      filters: {
        gameType: args.gameType ?? null,
        uid: args.uid ?? null,
        templateId: args.templateId ?? null,
        limit,
      },
      rows,
    };
  },
});
