import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";
import { getPartnerGameRegistration } from "../../../data/partnerGameRegistry";
import { getPortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import { assertRegisteredMatchGameType } from "../settle/async/casualAsyncTypes";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import { findPlayerGameByGameId } from "../shared/casualPlayerGameTypes";

/**
 * ??? Convex `loadGame`(HTTP `find-match-by-game`)???? run ?????
 */
export const findMatchByGameForBridge = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const pg = await findPlayerGameByGameId(ctx, gameId);
    if (!pg) {
      return { ok: false as const, error: "unknown_match_game" as const };
    }
    const pm = await ctx.db.get(pg.playerMatchId);
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" as const };
    }
    const regCheck = assertRegisteredMatchGameType(pg.gameType);
    if (!regCheck.ok) {
      return regCheck;
    }
    if (pg.status !== "open" && pg.status !== "replaying") {
      return { ok: false as const, error: "match_not_open" as const };
    }
    if (pm.status !== "open" && pm.status !== "replaying") {
      return { ok: false as const, error: "match_not_open" as const };
    }
    const replayEpoch = Math.max(
      typeof pg.replayEpoch === "number" && Number.isFinite(pg.replayEpoch)
        ? Math.floor(pg.replayEpoch)
        : 0,
      typeof pm.replayEpoch === "number" && Number.isFinite(pm.replayEpoch)
        ? Math.floor(pm.replayEpoch)
        : 0
    );
    const reg = getPartnerGameRegistration(pg.gameType)!;

    const templateDef = getPortalTournamentDefinition(pg.templateId);
    const inlineP75 =
      templateDef?.seedQuantileSuccess?.quantile === "p75"
        ? pg.seedBinding?.scoreQuantiles?.p75
        : undefined;
    const seedScoreThreshold =
      typeof inlineP75 === "number" && Number.isFinite(inlineP75)
        ? Math.floor(inlineP75)
        : undefined;

    if (reg.bridgeLoadGameSeed === "seed_binding_id") {
      return {
        ok: true as const,
        gameType: pg.gameType,
        match: {
          gameId: pg.gameId,
          seed: pg.seedBinding.seedId,
          seedId: pg.seedBinding.seedId,
          poolVersion: pg.seedBinding.poolVersion,
          seedBinding: pg.seedBinding,
          templateId: pg.templateId,
          replayEpoch,
          uid: pg.uid,
          matchId: pg.matchId,
          ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
        },
      };
    }

    const seedKey = canonicalCasualRunSessionExternalId(pg.matchId);
    const seed = `casual:${pg.matchId}:${pg.templateId}:${seedKey}:${pg.createdAt}`;
    return {
      ok: true as const,
      gameType: pg.gameType,
      match: {
        gameId: pg.gameId,
        seed,
        templateId: pg.templateId,
        replayEpoch,
      },
    };
  },
});

export const getCasualRunMatchGameType = internalQuery({
  args: { matchGameId: v.string() },
  handler: async (ctx, { matchGameId }) => {
    const pg = await findPlayerGameByGameId(ctx, matchGameId);
    return pg?.gameType ?? null;
  },
});
