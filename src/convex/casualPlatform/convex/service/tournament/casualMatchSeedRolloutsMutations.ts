import { v } from "convex/values";

import { getTournamentDefinition } from "../../data/casualTournamentConfigs";
import { getCasualRankMinScores } from "../../data/casualBotDifficultyConfig";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  clampTargetRank,
  computeNeutralGapBotScoreSlots,
  computeSoloBotScoreSlots,
  evaluateBotDifficultyRules,
  generateNeutralGapBotScores,
  generateSoloBotScores,
  hashSessionSeed,
  resolvePlayerBotStrategyContext,
  sampleTargetRank,
} from "./casualBotDifficultyService";
import { readCasualMatchSeedBinding } from "./casualMatchSeedBinding";
import type { BotScoreSlot } from "./casualMatchSeedRollouts";
import {
  applyAsyncBotFillPlanToMatch,
  casualAsyncVirtualOpponentCount,
  isCasualAsyncVirtualOpponentUid,
  padBotFillsToCount,
} from "./casualRunSettlementFill";
import { readCasualMatchSeedBinding } from "./casualMatchSeedBinding";

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

    const gt =
      def.gameId === "block_blast" || def.gameId === "solitaire" ? def.gameId : "solitaire";
    const rankMinScores = getCasualRankMinScores(def);
    const sessionSeed = hashSessionSeed(`${args.templateId}|${args.sessionExternalId}`);
    const seedBinding = readCasualMatchSeedBinding(matchDoc);
    const humanRows = args.humanScores;

    let slots: BotScoreSlot[] = [];
    let soloPlan: { humanUid: string; effectiveRank: number } | undefined;
    let localBotFills: Array<{ rank: number; score: number }>;

    if (humanRows.length === 1) {
      const human = humanRows[0]!;
      const profile = await resolvePlayerBotStrategyContext(ctx, {
        uid: human.uid,
        templateId: args.templateId,
        def,
      });
      const dist = evaluateBotDifficultyRules(profile);
      const target = sampleTargetRank(dist, def.maxPlayers, sessionSeed);
      const effectiveRank = clampTargetRank(
        target,
        human.score,
        rankMinScores,
        def.maxPlayers
      );
      soloPlan = { humanUid: human.uid, effectiveRank };
      slots = computeSoloBotScoreSlots({
        humanScore: human.score,
        effectiveRank,
        rankMinScores,
        maxPlayers: def.maxPlayers,
        gameType: gt,
      });
      localBotFills = generateSoloBotScores({
        humanUid: human.uid,
        humanScore: human.score,
        effectiveRank,
        rankMinScores,
        maxPlayers: def.maxPlayers,
        gameType: gt,
        sessionSeed,
      });
    } else {
      slots = computeNeutralGapBotScoreSlots({
        humanScores: humanRows,
        rankMinScores,
        maxPlayers: def.maxPlayers,
        gameType: gt,
      });
      localBotFills = generateNeutralGapBotScores({
        humanScores: humanRows,
        rankMinScores,
        maxPlayers: def.maxPlayers,
        gameType: gt,
        sessionSeed,
      });
    }

    localBotFills = padBotFillsToCount({
      fills: localBotFills,
      botCount: args.botCount,
      maxPlayers: def.maxPlayers,
      rankMinScores,
      gameType: gt,
    });

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
    if (matchDoc.botsSeeded) {
      return { ok: false as const, error: "bots_already_seeded" as const };
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
