"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { getTournamentDefinition } from "../../data/casualTournamentConfigs";
import { resolveSeedTierForTemplate } from "../../data/casualSeedTierPolicy";
import {
  fetchGameMatchSeed,
  type ResolveSeedResponse,
} from "../bridge/casualMatchSeedBridge";

function extractScoreQuantiles(
  metrics: ResolveSeedResponse["metrics"]
): ResolveSeedResponse["metrics"]["scoreQuantiles"] | null {
  const q = metrics?.scoreQuantiles;
  if (!q) return null;
  return q;
}

export const bindCasualMatchSeed = internalAction({
  args: {
    matchId: v.string(),
    templateId: v.string(),
    sessionKey: v.optional(v.string()),
  },
  handler: async (ctx, { matchId, templateId, sessionKey }) => {
    const def = getTournamentDefinition(templateId);
    if (!def) {
      await ctx.runMutation(internal.service.tournament.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: "unknown_tournament",
      });
      return { ok: false as const, error: "unknown_tournament" as const };
    }
    if (def.gameId !== "solitaire") {
      return { ok: true as const, skipped: true as const };
    }

    const matchRow = await ctx.runQuery(
      internal.service.tournament.casualMatchSeedMutations.getMatchForSeedBind,
      { matchId }
    );
    if (!matchRow) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    if (matchRow.seedId) {
      return { ok: true as const, alreadyBound: true as const };
    }

    const uids = matchRow.uids;
    if (uids.length === 0) {
      await ctx.runMutation(internal.service.tournament.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: "missing_uids",
      });
      return { ok: false as const, error: "missing_uids" as const };
    }

    const tier = resolveSeedTierForTemplate(def);
    const resolved = await fetchGameMatchSeed("solitaire", {
      templateId,
      matchId,
      gameType: def.gameId,
      tier,
      maxPlayers: def.maxPlayers,
      humanPlayerCount: matchRow.humanPlayerCount ?? uids.length,
      sessionKey: sessionKey ?? `casual_sess:${matchId}`,
      uids,
    });

    if (!resolved.ok) {
      await ctx.runMutation(internal.service.tournament.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: resolved.error,
      });
      return { ok: false as const, error: resolved.error };
    }

    const quantiles = extractScoreQuantiles(resolved.metrics);
    if (!quantiles) {
      await ctx.runMutation(internal.service.tournament.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: "missing_score_quantiles",
      });
      return { ok: false as const, error: "missing_score_quantiles" as const };
    }

    await ctx.runMutation(internal.service.tournament.casualMatchSeedMutations.patchCasualRunMatchSeed, {
      matchId,
      seedId: resolved.seedId,
      seedPoolVersion: resolved.poolVersion,
      seedTier: resolved.tier,
      seedScoreQuantiles: quantiles,
    });
    return { ok: true as const, seedId: resolved.seedId };
  },
});
