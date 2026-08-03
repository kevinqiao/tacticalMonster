/**
 * 仿真策略预设配置
 * 效用因子权重，用于 PlayerSimulator 评分选动作
 */

import type { StrategyWeights } from "./types";

/** 预设策略：新手、随机、贪心、熟练 */
export const STRATEGY_PRESETS: Record<string, StrategyWeights> = {
  novice: {
    damageDealt: 0.1,
    healValue: 0.05,
    targetHpPercent: 0.05,
    distanceToEnemy: 0.05,
    skillCooldownCost: 0,
    survivalRisk: 0.05,
    randomBias: 0.5,
  },
  random: {
    damageDealt: 0.2,
    healValue: 0.1,
    targetHpPercent: 0.1,
    distanceToEnemy: 0.1,
    skillCooldownCost: 0,
    survivalRisk: 0.1,
    randomBias: 0.5,
  },
  greedy: {
    damageDealt: 1,
    healValue: 0.3,
    targetHpPercent: 0.5,
    distanceToEnemy: 0.2,
    skillCooldownCost: -0.1,
    survivalRisk: 0.2,
    randomBias: 0.1,
  },
  skilled: {
    damageDealt: 0.8,
    healValue: 0.6,
    targetHpPercent: 0.4,
    distanceToEnemy: 0.3,
    skillCooldownCost: -0.05,
    survivalRisk: 0.5,
    randomBias: 0.05,
  },
};

/**
 * 根据技能等级 (0-100) 插值得到权重
 * 0: 纯随机, 50: 贪心, 100: 熟练
 */
export function getWeightsForSkillLevel(level: number): StrategyWeights {
  const clamped = Math.max(0, Math.min(100, level)) / 100;
  const novice = STRATEGY_PRESETS.novice;
  const skilled = STRATEGY_PRESETS.skilled;
  return {
    damageDealt: novice.damageDealt + (skilled.damageDealt - novice.damageDealt) * clamped,
    healValue: novice.healValue + (skilled.healValue - novice.healValue) * clamped,
    targetHpPercent: novice.targetHpPercent + (skilled.targetHpPercent - novice.targetHpPercent) * clamped,
    distanceToEnemy: novice.distanceToEnemy + (skilled.distanceToEnemy - novice.distanceToEnemy) * clamped,
    skillCooldownCost: novice.skillCooldownCost + (skilled.skillCooldownCost - novice.skillCooldownCost) * clamped,
    survivalRisk: novice.survivalRisk + (skilled.survivalRisk - novice.survivalRisk) * clamped,
    randomBias: novice.randomBias + (skilled.randomBias - novice.randomBias) * clamped,
  };
}
