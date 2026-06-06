import { v } from "convex/values";

import { getTournamentDefinition } from "../../data/casualTournamentConfigs";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  computeNeutralGapBotScoreSlots,
  computeSoloBotScoreSlots,
  hashSessionSeed,
  type BotScoreSlot,
} from "./casualBotDifficultyService";
import { readCasualMatchSeedBinding } from "./casualMatchSeedBinding";
import {
  applyAsyncBotFillPlanToMatch,
  buildBotFillsForAsyncMatch,
  casualAsyncVirtualOpponentCount,
  deriveRankFloorsForMatch,
  isCasualAsyncVirtualOpponentUid,
} from "./casualRunSettlementFill";

export { type BotScoreSlot };

export const planAsyncBotFillSlots = internalQuery({
  args: {
    templateId: v.string(),
    matchId: v.string(),
    sessionExternalId: v.string(),
    humanScores: v.array(v.object({ uid: v.string(), score: v.number() })),
    botCount: v.number(),
  },
  handler: async (ctx, args) => {
    const def = getTournamentDefinition(args.templateId);
    if (!def) return { ok: false as const, error: "unknown_tournament" as const };

    const matchDoc = await ctx.db.get(args.matchId as Id<"casual_run_matches">);
    if (!matchDoc) return { ok: false as const, error: "unknown_match" as const };

    const floors = deriveRankFloorsForMatch(matchDoc, def.maxPlayers);
    const seedBinding = readCasualMatchSeedBinding(matchDoc);
    if (!floors || !seedBinding) {
      return { ok: false as const, error: "no_seed_binding" as const };
    }

    const gt =
      def.gameId === "block_blast" || def.gameId === "solitaire" ? def.gameId : "solitaire";
    const sessionSeed = hashSessionSeed(`${args.templateId}|${args.sessionExternalId}`);
    const humanRows = args.humanScores;
    const humanCountPlanned = Math.max(1, matchDoc.humanPlayerCount ?? humanRows.length);
    const isMixedTable = humanCountPlanned >= 2;

    const { botFills: localBotFills, soloPlan } = await buildBotFillsForAsyncMatch(ctx, {
      def,
      templateId: args.templateId,
      sessionExternalId: args.sessionExternalId,
      humanRows,
      rankFloors: floors,
      seedBinding,
      botCount: args.botCount,
      humanCountPlanned,
    });

    let slots: BotScoreSlot[] = [];
    if (!isMixedTable && humanRows.length === 1 && soloPlan) {
      const human = humanRows[0]!;
      slots = computeSoloBotScoreSlots({
        humanScore: human.score,
        effectiveRank: soloPlan.effectiveRank,
        rankFloors: floors,
        maxPlayers: def.maxPlayers,
        gameType: gt,
      });
    } else {
      slots = computeNeutralGapBotScoreSlots({
        humanScores: humanRows,
        rankFloors: floors,
        maxPlayers: def.maxPlayers,
        gameType: gt,
      });
      slots = [...slots].sort((a, b) => a.rank - b.rank).slice(0, args.botCount);
    }

    return {
      ok: true as const,
      gameType: gt,
      seedBinding,
      sessionSeed,
      slots,
      soloPlan,
      localBotFills,
      maxPlayers: def.maxPlayers,
    };
  },
});

export const getMatchDocBotsSeeded = internalQuery({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
    if (!matchDoc) return null;
    return { botsSeeded: Boolean(matchDoc.botsSeeded) };
  },
});

export const getMatchRolloutBotContext = internalQuery({
  args: { matchGameId: v.string() },
  handler: async (ctx, { matchGameId }) => {
    const pm = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_gameId", (q) => q.eq("gameId", matchGameId))
      .unique();
    if (!pm || pm.gameType !== "solitaire") {
      return { ok: false as const, error: "not_solitaire" as const };
    }
    const matchDoc = await ctx.db.get(pm.matchId as Id<"casual_run_matches">);
    if (!matchDoc || !readCasualMatchSeedBinding(matchDoc)) {
      return { ok: false as const, error: "no_seed_binding" as const };
    }
    const def = getTournamentDefinition(pm.templateId);
    if (!def || def.maxPlayers <= 1) {
      return { ok: false as const, error: "not_multi_async" as const };
    }
    const rows = await ctx.db
      .query("casual_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", pm.matchId))
      .collect();
    const humanScores = rows
      .filter(
        (r) =>
          !isCasualAsyncVirtualOpponentUid(r.uid) &&
          r.score != null &&
          Number.isFinite(r.score)
      )
      .map((r) => ({ uid: r.uid, score: r.score as number }));
    if (humanScores.length === 0) {
      return { ok: false as const, error: "no_human_scores" as const };
    }
    const botCount = casualAsyncVirtualOpponentCount(
      def.maxPlayers,
      Math.max(1, matchDoc.humanPlayerCount ?? humanScores.length)
    );
    if (botCount <= 0) {
      return { ok: false as const, error: "no_bot_slots" as const };
    }
    const virtualRows = rows.filter((r) => isCasualAsyncVirtualOpponentUid(r.uid));
    if (matchDoc.botsSeeded && virtualRows.length >= botCount) {
      return { ok: false as const, error: "bots_already_seeded" as const };
    }
    const sessionExternalId =
      typeof pm.externalGameId === "string" && pm.externalGameId.trim().startsWith("casual_sess:")
        ? pm.externalGameId.trim()
        : `casual_sess:${pm.matchId}`;
    return {
      ok: true as const,
      templateId: pm.templateId,
      matchId: pm.matchId,
      runTournamentId: pm.tournamentId,
      sessionExternalId,
      humanScores,
      botCount,
      replaceAllVirtual: true,
    };
  },
});

export const applyAsyncBotFillPlan = internalMutation({
  args: {
    templateId: v.string(),
    matchId: v.string(),
    runTournamentId: v.string(),
    sessionExternalId: v.string(),
    matchGameType: v.union(v.literal("solitaire"), v.literal("block_blast")),
    botFills: v.array(v.object({ rank: v.number(), score: v.number() })),
    soloPlan: v.optional(
      v.object({
        humanUid: v.string(),
        effectiveRank: v.number(),
      })
    ),
    updatedAt: v.number(),
    replaceAllVirtual: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const def = getTournamentDefinition(args.templateId);
    if (!def) return { ok: false as const, error: "unknown_tournament" as const };
    await applyAsyncBotFillPlanToMatch(ctx, {
      def,
      templateId: args.templateId,
      matchId: args.matchId,
      runTournamentId: args.runTournamentId,
      sessionExternalId: args.sessionExternalId,
      matchGameType: args.matchGameType,
      botFills: args.botFills,
      soloPlan: args.soloPlan,
      updatedAt: args.updatedAt,
      replaceAllVirtual: args.replaceAllVirtual,
    });
    return { ok: true as const };
  },
});
