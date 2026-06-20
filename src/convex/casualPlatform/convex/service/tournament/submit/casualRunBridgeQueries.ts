import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";
import { getCasualGameRegistration } from "../../../data/casualGameRegistry";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { assertRegisteredMatchGameType } from "../settle/async/casualAsyncTypes";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
import { findPlayerGameByGameId } from "../shared/casualPlayerGameTypes";

/**
 * 供游戏 Convex `loadGame`（HTTP `find-match-by-game`）解析休闲 run 建局参数。
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
    const replayEpoch = pg.replayEpoch ?? pm.replayEpoch ?? 0;
    const reg = getCasualGameRegistration(pg.gameType)!;

    const templateDef = getTournamentDefinition(pg.templateId);
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
        recordSeedOnHttp: reg.seedStrategy === "remote_http",
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
      recordSeedOnHttp: false,
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
