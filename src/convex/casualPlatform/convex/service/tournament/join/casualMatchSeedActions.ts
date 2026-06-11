"use node";

import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { resolveSeedTierForTemplate } from "../../../data/casualSeedTierPolicy";
import {
  fetchGameMatchSeed,
  type ResolveSeedResponse,
} from "../../bridge/casualMatchSeedBridge";
import type { CasualMatchSeedBinding } from "./casualMatchSeedBinding";

function extractScoreQuantiles(
  metrics: ResolveSeedResponse["metrics"]
): ResolveSeedResponse["metrics"]["scoreQuantiles"] | null {
  const q = metrics?.scoreQuantiles;
  if (!q) return null;
  return q;
}

export type BindCasualMatchSeedResult =
  | { ok: true; seedId: string }
  | { ok: true; alreadyBound: true }
  | { ok: true; skipped: true }
  | { ok: false; error: string };

type BindCasualMatchTemplateQuantilesResult =
  | { ok: true; seedId?: string; alreadyBound?: true }
  | { ok: false; error: string };

async function bindCasualMatchSeedHandler(
  ctx: ActionCtx,
  {
    matchId,
    templateId,
    sessionKey,
  }: {
    matchId: string;
    templateId: string;
    sessionKey?: string;
  }
): Promise<BindCasualMatchSeedResult> {
    const def = getTournamentDefinition(templateId);
    if (!def) {
      await ctx.runMutation(internal.service.tournament.join.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: "unknown_tournament",
      });
      return { ok: false as const, error: "unknown_tournament" as const };
    }
    if (def.gameType === "block_blast") {
      const bind: BindCasualMatchTemplateQuantilesResult = await ctx.runMutation(
        internal.service.tournament.join.casualMatchSeedMutations.bindCasualMatchTemplateQuantiles,
        { matchId, templateId }
      );
      if (!bind.ok) {
        return { ok: false as const, error: bind.error ?? "missing_reference_quantiles" };
      }
      if (bind.alreadyBound) {
        return { ok: true as const, alreadyBound: true as const };
      }
      return { ok: true as const, seedId: bind.seedId ?? `template:${templateId}` };
    }
    if (def.gameType !== "solitaire") {
      return { ok: true as const, skipped: true as const };
    }

    const matchRow = await ctx.runQuery(
      internal.service.tournament.join.casualMatchSeedMutations.getMatchForSeedBind,
      { matchId }
    );
    if (!matchRow) {
      return { ok: false as const, error: "unknown_match" as const };
    }
    if (matchRow.seedBinding) {
      return { ok: true as const, alreadyBound: true as const };
    }

    const uids = matchRow.uids;
    if (uids.length === 0) {
      await ctx.runMutation(internal.service.tournament.join.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: "missing_uids",
      });
      return { ok: false as const, error: "missing_uids" as const };
    }

    const tier = resolveSeedTierForTemplate(def);
    const resolved = await fetchGameMatchSeed("solitaire", {
      templateId,
      matchId,
      gameType: def.gameType,
      tier,
      maxPlayers: def.maxPlayers,
      humanPlayerCount: matchRow.humanPlayerCount ?? uids.length,
      sessionKey: sessionKey ?? `casual_sess:${matchId}`,
      uids,
    });

    if (!resolved.ok) {
      await ctx.runMutation(internal.service.tournament.join.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: resolved.error,
      });
      return { ok: false as const, error: resolved.error };
    }

    const quantiles = extractScoreQuantiles(resolved.metrics);
    if (!quantiles) {
      await ctx.runMutation(internal.service.tournament.join.casualMatchSeedMutations.markCasualMatchSeedError, {
        matchId,
        error: "missing_score_quantiles",
      });
      return { ok: false as const, error: "missing_score_quantiles" as const };
    }

    const seedBinding: CasualMatchSeedBinding = {
      seedId: resolved.seedId,
      poolVersion: resolved.poolVersion,
      tier: resolved.tier,
    };
    await ctx.runMutation(internal.service.tournament.join.casualMatchSeedMutations.patchCasualRunMatchSeed, {
      matchId,
      seedBinding,
    });
    return { ok: true as const, seedId: resolved.seedId };
}

export const bindCasualMatchSeed = internalAction({
  args: {
    matchId: v.string(),
    templateId: v.string(),
    sessionKey: v.optional(v.string()),
  },
  handler: bindCasualMatchSeedHandler,
});
