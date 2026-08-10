import { v } from "convex/values";

import { isPortalSuccessQuantile } from "../../../data/portalSeedTierPolicy";
import {
  effectiveGameSequence,
  getPortalTournamentDefinition,
  seatGameTypeForTemplate,
} from "../../../data/portalTournamentConfigs";
import {
  getPartnerGameRegistration,
  type CasualBotPolicy,
} from "../../../data/partnerGameRegistry";
import type { Id } from "../../../_generated/dataModel";
import { internalQuery } from "../../../_generated/server";
import type { CasualMatchSeedBinding } from "../join/casualMatchSeedBinding";
import {
  casualAsyncVirtualOpponentCount,
  isCasualAsyncVirtualOpponentUid,
  resolveCasualSubmitMode,
} from "../settle/casualRunSettlementFill";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import {
  findPlayerGameByGameId,
  listPlayerGamesForSeat,
} from "../shared/casualPlayerGameTypes";
import { loadSoloRankPlanningBundle } from "./casualMatchBotPlanningContext";
import { createIngestTiming } from "./casualIngestTiming";
import { inferPortalRunMatchShell } from "../shared/portalRunMatchShell";

function toSlimSeedBinding(
  binding: CasualMatchSeedBinding | undefined
): CasualMatchSeedBinding | undefined {
  if (!binding) return undefined;
  return {
    seedId: binding.seedId,
    poolVersion: binding.poolVersion,
    tier: binding.tier,
    ...(binding.scoreQuantiles ? { scoreQuantiles: binding.scoreQuantiles } : {}),
    ...(binding.successQuantile ? { successQuantile: binding.successQuantile } : {}),
    ...(binding.ritualOneLineClear ? { ritualOneLineClear: true } : {}),
  };
}

function resolveBotPolicy(primaryGameType: string, seatGameType: string): CasualBotPolicy {
  const seatReg = getPartnerGameRegistration(seatGameType);
  if (seatReg?.botPolicy === "platform_ingest" || seatReg?.botPolicy === "game_ingest") {
    return seatReg.botPolicy;
  }
  const primaryReg = getPartnerGameRegistration(primaryGameType);
  return primaryReg?.botPolicy ?? "none";
}

export const resolveMatchSubmitContext = internalQuery({
  args: {
    matchGameId: v.string(),
    uid: v.string(),
    score: v.optional(v.number()),
  },
  handler: async (ctx, { matchGameId, uid, score }) => {
    void score;
    const timing = createIngestTiming("resolveMatchSubmitContext", matchGameId);

    const pg = await findPlayerGameByGameId(ctx, matchGameId);
    timing.mark("findPlayerGameByGameId", { found: Boolean(pg) });
    if (!pg) {
      timing.finish("abort.unknown_match_game");
      return { ok: false as const, error: "unknown_match_game" as const };
    }
    if (pg.uid !== uid) {
      return { ok: false as const, error: "forbidden" as const };
    }

    const pm = await ctx.db.get(pg.playerMatchId);
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" as const };
    }

    const def = getPortalTournamentDefinition(pm.templateId);
    if (!def || seatGameTypeForTemplate(def) !== pm.gameType) {
      return { ok: false as const, error: "bad_tournament" as const };
    }

    const matchDoc = await ctx.db.get(pm.matchId as Id<"portal_run_matches">);
    timing.mark("loadMatchDoc", { hasMatchDoc: Boolean(matchDoc) });
    const inferredShell =
      matchDoc == null
        ? await inferPortalRunMatchShell(
            ctx,
            pm.matchId,
            def,
            pm.tournamentId as Id<"portal_run_tournaments">
          )
        : null;
    if (matchDoc == null) {
      timing.mark("inferPortalRunMatchShell", { inferred: Boolean(inferredShell) });
    }

    const sequence = effectiveGameSequence(def);
    const primaryGameType = sequence[sequence.length - 1] ?? def.gameType;
    const isTriathlon = def.gameType === "triathlon" && sequence.length > 1;
    const isLastGame = pg.gameIndex >= sequence.length - 1;

    const humanPlayerCount = Math.max(
      1,
      matchDoc?.humanPlayerCount ?? inferredShell?.humanPlayerCount ?? 1
    );
    const mode = resolveCasualSubmitMode(def.maxPlayers, humanPlayerCount);
    const botCount = casualAsyncVirtualOpponentCount(def.maxPlayers, humanPlayerCount);
    const sessionExternalId = canonicalCasualRunSessionExternalId(pm.matchId);
    const seedBinding = toSlimSeedBinding(pg.seedBinding);

    let triathlonLegs:
      | Array<{
          gameIndex: number;
          gameType: string;
          seedBinding: NonNullable<ReturnType<typeof toSlimSeedBinding>>;
          humanScore?: number;
        }>
      | undefined;
    if (isTriathlon) {
      const humanGames = await listPlayerGamesForSeat(ctx, pm._id);
      triathlonLegs = humanGames
        .sort((a, b) => a.gameIndex - b.gameIndex)
        .map((g) => {
          const binding = toSlimSeedBinding(g.seedBinding);
          if (!binding) throw new Error(`missing_triathlon_leg_seed:${g.gameIndex}`);
          return {
            gameIndex: g.gameIndex,
            gameType: g.gameType,
            seedBinding: binding,
            ...(g.score != null && Number.isFinite(g.score) ? { humanScore: g.score } : {}),
          };
        });
    }

    const matchRows = await ctx.db
      .query("portal_run_player_matches")
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

    const wasHumanReplay = pg.status === "replaying" || pm.status === "replaying";
    const humanReplayEpoch = pg.replayEpoch ?? pm.replayEpoch ?? 0;

    const soloRankPlanning =
      mode === "solo"
        ? await loadSoloRankPlanningBundle(ctx, {
            uid,
            templateId: pm.templateId,
            def,
          })
        : undefined;
    if (mode === "solo") {
      timing.mark("loadSoloRankPlanningBundle");
    }

    const bindingQuantile = seedBinding?.successQuantile;
    const successThresholdQuantile = isPortalSuccessQuantile(bindingQuantile)
      ? bindingQuantile
      : def.seedQuantileSuccess?.quantile;
    const ritualOneLineClear = seedBinding?.ritualOneLineClear === true;
    const botPolicy = resolveBotPolicy(primaryGameType, pm.gameType);
    timing.finish("ok", {
      templateId: pm.templateId,
      maxPlayers: def.maxPlayers,
      mode,
      botsSeeded: Boolean(matchDoc?.botsSeeded ?? inferredShell?.botsSeeded),
    });

    return {
      ok: true as const,
      mode,
      templateId: pm.templateId,
      matchId: pm.matchId,
      maxPlayers: def.maxPlayers,
      humanPlayerCount,
      effectiveHumans: humanPlayerCount,
      botCount,
      gameType: pg.gameType,
      primaryGameType,
      seedBinding,
      sessionExternalId,
      botsSeeded: Boolean(matchDoc?.botsSeeded ?? inferredShell?.botsSeeded),
      humanScores,
      wasHumanReplay,
      humanReplayEpoch,
      playerStatus: pm.status,
      botPolicy,
      isLastGame,
      isTriathlon,
      pgCreatedAt: pg.createdAt,
      ...(triathlonLegs ? { triathlonLegs } : {}),
      ...(soloRankPlanning ? { soloRankPlanning } : {}),
      ...(successThresholdQuantile ? { successThresholdQuantile } : {}),
      ...(ritualOneLineClear ? { ritualOneLineClear: true } : {}),
    };
  },
});
