import { v } from "convex/values";

import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import type { Id } from "../../../_generated/dataModel";
import { internalQuery } from "../../../_generated/server";
import { readCasualMatchSeedBinding, type SlimCasualMatchSeedBinding } from "../join/casualMatchSeedBinding";
import {
  casualAsyncVirtualOpponentCount,
  isCasualAsyncVirtualOpponentUid,
  resolveCasualSubmitMode,
} from "../settle/casualRunSettlementFill";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import { loadSoloRankPlanningBundle } from "./casualMatchBotPlanningContext";

function toSlimSeedBinding(
  binding: ReturnType<typeof readCasualMatchSeedBinding>
): SlimCasualMatchSeedBinding | undefined {
  if (!binding) return undefined;
  return {
    seedId: binding.seedId,
    poolVersion: binding.poolVersion,
    tier: binding.tier,
  };
}

export const resolveMatchSubmitContext = internalQuery({
  args: {
    matchGameId: v.string(),
    uid: v.string(),
    score: v.optional(v.number()),
  },
  handler: async (ctx, { matchGameId, uid, score }) => {
    void score;

    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", matchGameId))
      .unique();
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" as const };
    }
    if (pm.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }

    const def = getTournamentDefinition(pm.templateId);
    if (!def || def.gameType !== pm.gameType) {
      return { ok: false as const, error: "bad_tournament" as const };
    }

    const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
    if (!matchDoc) {
      return { ok: false as const, error: "match_not_found" as const };
    }

    const humanPlayerCount = Math.max(1, matchDoc.humanPlayerCount ?? 1);
    const mode = resolveCasualSubmitMode(def.maxPlayers, humanPlayerCount);
    const botCount = casualAsyncVirtualOpponentCount(def.maxPlayers, humanPlayerCount);
    const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);
    const seedBinding = toSlimSeedBinding(readCasualMatchSeedBinding(matchDoc));

    const matchRows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();

    const humanScores = matchRows
      .filter(
        (r) =>
          !isCasualAsyncVirtualOpponentUid(r.uid) &&
          r.score != null &&
          Number.isFinite(r.score)
      )
      .map((r) => ({ uid: r.uid, score: r.score as number }));

    const wasHumanReplay = pm.status === "replaying";
    const humanReplayEpoch = pm.replayEpoch ?? 0;

    const soloRankPlanning =
      mode === "solo"
        ? await loadSoloRankPlanningBundle(ctx, {
            uid,
            templateId: pm.templateId,
            def,
          })
        : undefined;

    return {
      ok: true as const,
      mode,
      templateId: pm.templateId,
      matchId: pm.matchId,
      maxPlayers: def.maxPlayers,
      humanPlayerCount,
      effectiveHumans: humanPlayerCount,
      botCount,
      gameType: pm.gameType,
      seedBinding,
      sessionExternalId,
      botsSeeded: Boolean(matchDoc.botsSeeded),
      humanScores,
      wasHumanReplay,
      humanReplayEpoch,
      playerStatus: pm.status,
      ...(soloRankPlanning ? { soloRankPlanning } : {}),
    };
  },
});
