import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { getTournamentDefinition } from "../../../data/casualTournamentConfigs";
import { readCasualMatchSeedBinding } from "../join/casualMatchSeedBinding";
import { canonicalCasualRunSessionExternalId } from "../shared/casualRunSession";
/**
 * 供 solitaireArena / blockBlast `loadGame`（HTTP `find-match-by-game`）解析休闲 run 建局参数。
 * 仅 `status === "open"` 且玩法为 solitaire 或 block_blast；已结算则拒绝重复建局。
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
    if (pm.gameType !== "solitaire" && pm.gameType !== "block_blast") {
      return { ok: false as const, error: "wrong_game_type" as const };
    }
    if (pm.status !== "open" && pm.status !== "replaying") {
      return { ok: false as const, error: "match_not_open" as const };
    }
    const replayEpoch = pm.replayEpoch ?? 0;

    if (pm.gameType === "solitaire") {
      const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
      if (!matchDoc) {
        return { ok: false as const, error: "unknown_match" as const };
      }
      const seedBinding = readCasualMatchSeedBinding(matchDoc);
      if (seedBinding) {
        return {
          ok: true as const,
          match: {
            gameId: pm.gameId,
            seed: seedBinding.seedId,
            seedId: seedBinding.seedId,
            templateId: pm.templateId,
            replayEpoch,
          },
        };
      }
      if (matchDoc.seedResolveError) {
        const recoverable = new Set([
          "missing_seed_binding",
          "game_unreachable",
          "bad_response",
          "invalid_seed_payload",
        ]);
        if (recoverable.has(matchDoc.seedResolveError)) {
          return { ok: false as const, error: "seed_pending" as const };
        }
        return { ok: false as const, error: "seed_unavailable" as const };
      }
      return { ok: false as const, error: "seed_pending" as const };
    }

    const seedKey = canonicalCasualRunSessionExternalId(pm.matchId);
    const seed = `casual:${pm.matchId}:${pm.templateId}:${seedKey}:${pm.createdAt}`;
    return {
      ok: true as const,
      match: {
        gameId: pm.gameId,
        seed,
        templateId: pm.templateId,
        replayEpoch,
      },
    };
  },
});

/** find-match-by-game：seed 未就绪时供 HTTP 层触发 bind 重试 */
export const getMatchBindContextForBridge = internalQuery({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!pm || pm.gameType !== "solitaire") {
      return { ok: false as const, error: "not_solitaire" as const };
    }
    const def = getTournamentDefinition(pm.templateId);
    if (!def || def.gameType !== "solitaire") {
      return { ok: false as const, error: "bad_tournament" as const };
    }
    const sessionKey = canonicalCasualRunSessionExternalId(pm.matchId);
    return {
      ok: true as const,
      matchId: pm.matchId,
      templateId: pm.templateId,
      sessionKey,
    };
  },
});
