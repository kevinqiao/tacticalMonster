"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { fetchGameMatchRollouts } from "../bridge/casualMatchSeedBridge";
import { botSlotsToScoreBands, pickScoresFromRolloutBands } from "./casualMatchSeedRollouts";

/** 拉取 seed rollouts 并写入虚拟对手分（solitaire + seedBinding） */
export const computeAndApplyAsyncBotFills = internalAction({
  args: {
    templateId: v.string(),
    matchId: v.string(),
    runTournamentId: v.string(),
    sessionExternalId: v.string(),
    humanScores: v.array(v.object({ uid: v.string(), score: v.number() })),
    botCount: v.number(),
    updatedAt: v.number(),
    replaceAllVirtual: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const matchDoc = await ctx.runQuery(
      internal.service.tournament.casualMatchSeedRolloutsMutations.getMatchDocBotsSeeded,
      { matchId: args.matchId }
    );
    if (matchDoc?.botsSeeded && !args.replaceAllVirtual) {
      return { ok: true as const, skipped: true as const };
    }

    const plan = await ctx.runQuery(
      internal.service.tournament.casualMatchSeedRolloutsMutations.planAsyncBotFillSlots,
      {
        templateId: args.templateId,
        matchId: args.matchId,
        sessionExternalId: args.sessionExternalId,
        humanScores: args.humanScores,
        botCount: args.botCount,
      }
    );
    if (!plan.ok) return plan;

    let botFills = plan.localBotFills;

    if (
      plan.gameType === "solitaire" &&
      plan.seedBinding &&
      plan.slots.length > 0
    ) {
      const rollouts = await fetchGameMatchRollouts("solitaire", {
        seedId: plan.seedBinding.seedId,
        poolVersion: plan.seedBinding.poolVersion,
        scores: botSlotsToScoreBands(plan.slots),
      });
      if (rollouts.ok && rollouts.bands.length > 0) {
        botFills = pickScoresFromRolloutBands({
          slots: plan.slots,
          bands: rollouts.bands,
          sessionSeed: plan.sessionSeed,
          gameType: "solitaire",
        });
      }
    }

    return await ctx.runMutation(
      internal.service.tournament.casualMatchSeedRolloutsMutations.applyAsyncBotFillPlan,
      {
        templateId: args.templateId,
        matchId: args.matchId,
        runTournamentId: args.runTournamentId,
        sessionExternalId: args.sessionExternalId,
        matchGameType: plan.gameType,
        botFills,
        soloPlan: plan.soloPlan,
        updatedAt: args.updatedAt,
        replaceAllVirtual: args.replaceAllVirtual,
      }
    );
  },
});

/** HTTP 提交分数后同步拉 rollouts（避免 mutation 内无法 fetch） */
export const syncRolloutBotsAfterScoreSubmit = internalAction({
  args: {
    matchGameId: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, { matchGameId, updatedAt }) => {
    const ctxRow = await ctx.runQuery(
      internal.service.tournament.casualMatchSeedRolloutsMutations.getMatchRolloutBotContext,
      { matchGameId }
    );
    if (!ctxRow?.ok) return ctxRow ?? { ok: false as const, error: "no_context" as const };
    return await ctx.runAction(
      internal.service.tournament.casualMatchSeedRolloutsAction.computeAndApplyAsyncBotFills,
      {
        templateId: ctxRow.templateId,
        matchId: ctxRow.matchId,
        runTournamentId: ctxRow.runTournamentId,
        sessionExternalId: ctxRow.sessionExternalId,
        humanScores: ctxRow.humanScores,
        botCount: ctxRow.botCount,
        updatedAt,
        replaceAllVirtual: ctxRow.replaceAllVirtual,
      }
    );
  },
});
