import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import {
  getCasualGameRegistration,
} from "../../../data/casualGameRegistry";
import { readCasualMatchSeedBinding } from "../join/casualMatchSeedBinding";
import { assertRegisteredMatchGameType } from "../settle/async/casualAsyncTypes";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";

/**
 * 供游戏 Convex `loadGame`（HTTP `find-match-by-game`）解析休闲 run 建局参数。
 */
export const findMatchByGameForBridge = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!pm) {
      return { ok: false as const, error: "unknown_match_game" as const };
    }
    const regCheck = assertRegisteredMatchGameType(pm.gameType);
    if (!regCheck.ok) {
      return regCheck;
    }
    if (pm.status !== "open" && pm.status !== "replaying") {
      return { ok: false as const, error: "match_not_open" as const };
    }
    const replayEpoch = pm.replayEpoch ?? 0;
    const reg = getCasualGameRegistration(pm.gameType)!;

    if (reg.bridgeLoadGameSeed === "seed_binding_id") {
      const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
      if (!matchDoc) {
        return { ok: false as const, error: "unknown_match" as const };
      }
      const seedBinding = readCasualMatchSeedBinding(matchDoc);
      if (!seedBinding) {
        if (matchDoc.seedResolveError) {
          return { ok: false as const, error: "seed_unavailable" as const };
        }
        return { ok: false as const, error: "seed_pending" as const };
      }
      return {
        ok: true as const,
        gameType: pm.gameType,
        match: {
          gameId: pm.gameId,
          seed: seedBinding.seedId,
          seedId: seedBinding.seedId,
          poolVersion: seedBinding.poolVersion,
          templateId: pm.templateId,
          replayEpoch,
          uid: pm.uid,
          matchId: pm.matchId,
        },
        recordSeedOnHttp: reg.seedStrategy === "remote_http",
      };
    }

    const seedKey = canonicalCasualRunSessionExternalId(pm.matchId);
    const seed = `casual:${pm.matchId}:${pm.templateId}:${seedKey}:${pm.createdAt}`;
    return {
      ok: true as const,
      gameType: pm.gameType,
      match: {
        gameId: pm.gameId,
        seed,
        templateId: pm.templateId,
        replayEpoch,
      },
      recordSeedOnHttp: false,
    };
  },
});
