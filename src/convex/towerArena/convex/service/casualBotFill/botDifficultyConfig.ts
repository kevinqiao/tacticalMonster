import { CASUAL_CONSECUTIVE_LOSS_THRESHOLD } from "./botStrategyTypes";
import type { BotRankDistribution, BotStrategyPlayerContext } from "./botStrategyTypes";

export type BotDifficultyRule = {
  id: string;
  priority: number;
  condition: (ctx: BotStrategyPlayerContext) => boolean;
  strategy: BotRankDistribution | null;
};

/** solo 交分后按画像决定 bot 目标名次分布（与 casualPlatform BOT_DIFFICULTY_RULES 同步） */
export const BOT_DIFFICULTY_RULES: BotDifficultyRule[] = [
  {
    id: "consecutive_loss_recovery",
    priority: 110,
    condition: (ctx) => ctx.consecutiveLossStreak >= CASUAL_CONSECUTIVE_LOSS_THRESHOLD,
    strategy: { weights: { 1: 85, 2: 12, 3: 3, 4: 2, 5: 1 } },
  },
  {
    id: "returning_player",
    priority: 100,
    condition: (ctx) => ctx.daysSinceLastMatch > 14,
    strategy: { weights: { 1: 70, 2: 25, 3: 5, 4: 2, 5: 1 } },
  },
  {
    id: "coin_poor",
    priority: 90,
    condition: (ctx) => ctx.coinsBalance < 90,
    strategy: { weights: { 1: 60, 2: 30, 3: 10, 4: 5, 5: 2 } },
  },
  {
    id: "paid_pass_early",
    priority: 80,
    condition: (ctx) =>
      ctx.passTrack !== "none" &&
      ctx.passLevel <= 8 &&
      ctx.completedMultiplayerMatches <= 6,
    strategy: { weights: { 1: 55, 2: 30, 3: 15, 4: 5, 5: 2 } },
  },
  {
    id: "early_game_1_3",
    priority: 50,
    condition: (ctx) =>
      ctx.completedMultiplayerMatches <= 3 && ctx.seasonLadderPoints <= 20,
    strategy: { weights: { 1: 70, 2: 25, 3: 5, 4: 2, 5: 1 } },
  },
  {
    id: "early_game_4_10",
    priority: 40,
    condition: (ctx) =>
      ctx.completedMultiplayerMatches <= 10 && ctx.seasonLadderPoints <= 50,
    strategy: { weights: { 1: 40, 2: 35, 3: 20, 4: 5, 5: 2 } },
  },
  {
    id: "high_pass_level",
    priority: 35,
    condition: (ctx) => ctx.passLevel >= 15,
    strategy: null,
  },
];

export function evaluateBotDifficultyRulesWithMeta(
  ctx: BotStrategyPlayerContext
): { strategy: BotRankDistribution | null; matchedRuleId: string | null } {
  const sorted = [...BOT_DIFFICULTY_RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.condition(ctx)) {
      return { strategy: rule.strategy, matchedRuleId: rule.id };
    }
  }
  return { strategy: null, matchedRuleId: null };
}

export {
  buildBalancedRankWeights,
  sampleTargetRank,
} from "../../shared/rankSampling";
