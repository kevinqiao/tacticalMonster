/**
 * 仿真相关 Convex 函数
 * runStageSimulation action、upsertStageSimulationOverride mutation
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { runBattle } from "./battleSimulator";
import { runStageSimulation as runStageSimulationService } from "./stageSimulationService";
import { getSimulationTeamForRule } from "./simulationConfig";

const teamMonsterValidator = v.object({
  monsterId: v.string(),
  level: v.number(),
  stars: v.number(),
});

export const runSingleBattleMutation = internalMutation({
  args: {
    ruleId: v.string(),
    difficulty: v.number(),
    teamMonsters: v.array(teamMonsterValidator),
    strategyId: v.optional(v.string()),
    seed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await runBattle(ctx, {
      ...args,
      strategyId: args.strategyId ?? "greedy",
    });
  },
});

export const upsertStageSimulationOverride = internalMutation({
  args: {
    ruleId: v.string(),
    suggestedRecommendedPower: v.optional(v.number()),
    suggestedDifficultyMultiplier: v.optional(v.number()),
    expectedWinRate: v.optional(v.number()),
    reasoning: v.optional(v.string()),
    strategyId: v.string(),
    teamPower: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mr_stage_simulation_overrides")
      .withIndex("by_ruleId", (q) => q.eq("ruleId", args.ruleId))
      .first();

    const doc = {
      ruleId: args.ruleId,
      suggestedRecommendedPower: args.suggestedRecommendedPower,
      suggestedDifficultyMultiplier: args.suggestedDifficultyMultiplier,
      expectedWinRate: args.expectedWinRate,
      reasoning: args.reasoning,
      strategyId: args.strategyId,
      teamPower: args.teamPower,
      simulationRunAt: new Date().toISOString(),
      status: "approved" as const,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("mr_stage_simulation_overrides", doc);
  },
});

export const runStageSimulationAction = internalAction({
  args: {
    ruleId: v.string(),
    strategyId: v.optional(v.string()),
    runsPerDifficulty: v.optional(v.number()),
    difficulties: v.optional(v.array(v.number())),
    teamMonsters: v.optional(v.array(teamMonsterValidator)),
  },
  handler: async (ctx, args) => {
    const teamMonsters = args.teamMonsters ?? getSimulationTeamForRule(args.ruleId);

    const report = await runStageSimulationService(ctx, {
      ruleId: args.ruleId,
      strategyId: args.strategyId ?? "greedy",
      teamMonsters,
      difficulties: args.difficulties,
      runsPerDifficulty: args.runsPerDifficulty,
    });

    await ctx.runMutation(
      internal.service.difficulty.simulationActions.upsertStageSimulationOverride,
      {
        ruleId: report.ruleId,
        suggestedRecommendedPower: report.recommendation.suggestedRecommendedPower,
        suggestedDifficultyMultiplier: report.recommendation.suggestedDifficulty,
        expectedWinRate: report.recommendation.expectedWinRate,
        reasoning: report.recommendation.reasoning,
        strategyId: report.strategyId,
        teamPower: report.teamPower,
      }
    );

    return report;
  },
});

/** 对外入口：触发关卡仿真（Dashboard / 前端可调用） */
export const runStageSimulation = action({
  args: {
    ruleId: v.string(),
    strategyId: v.optional(v.string()),
    runsPerDifficulty: v.optional(v.number()),
    difficulties: v.optional(v.array(v.number())),
    teamMonsters: v.optional(v.array(teamMonsterValidator)),
  },
  handler: async (ctx, args): Promise<import("./types").SimulationReport> => {
    return await ctx.runAction(
      internal.service.difficulty.simulationActions.runStageSimulationAction,
      args
    );
  },
});
