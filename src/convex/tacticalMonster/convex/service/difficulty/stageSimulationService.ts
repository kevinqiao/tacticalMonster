/**
 * 关卡仿真服务
 * 对指定 ruleId 在多个难度下批量运行 BattleSimulator，产出 SimulationReport
 */

import { getStageRuleConfig, STAGE_RULE_CONFIGS } from "../../data/stageRuleConfigs";
import { calculatePower, MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";
import { internal } from "../../_generated/api";
import type { BattleResult, DifficultyResult, SimulationReport } from "./types";
import {
  SIMULATION_DEFAULT_TEAM,
  SIMULATION_RUNS_PER_DIFFICULTY,
  SIMULATION_TARGET_WIN_RATE,
} from "./simulationConfig";

export function calculateTeamPower(
  teamMonsters: Array<{ monsterId: string; level: number; stars: number }>
): number {
  let total = 0;
  const hpGrowthRate = 0.15;
  const damageGrowthRate = 0.1;
  const defenseGrowthRate = 0.12;
  const starMultiplierPerStar = 0.1;

  for (const m of teamMonsters) {
    const config = MONSTER_CONFIGS_MAP[m.monsterId];
    if (!config) continue;
    const actualHp = config.baseHp * (1 + (m.level - 1) * hpGrowthRate);
    const actualAttack = config.baseDamage * (1 + (m.level - 1) * damageGrowthRate);
    const actualDefense = config.baseDefense * (1 + (m.level - 1) * defenseGrowthRate);
    const starMultiplier = 1 + (m.stars - 1) * starMultiplierPerStar;
    total += Math.floor(calculatePower(actualAttack, actualDefense, actualHp, starMultiplier));
  }
  return total;
}

/**
 * 从同 tier 的 stageRuleConfigs 提取 difficultyMultiplier 列表作为仿真难度
 */
export function getDifficultiesForRuleId(ruleId: string): number[] {
  const config = getStageRuleConfig(ruleId);
  if (!config?.stageChain?.chainId) {
    const base = config?.stageContent?.difficultyAdjustment?.difficultyMultiplier ?? 1.0;
    return [base * 0.9, base, base * 1.1];
  }

  const chainId = config.stageChain.chainId;
  const sameChain = Object.values(STAGE_RULE_CONFIGS)
    .filter((c: any) => c.stageChain?.chainId === chainId)
    .map((c: any) => c.stageContent?.difficultyAdjustment?.difficultyMultiplier ?? 1.0)
    .filter((d): d is number => typeof d === "number")
    .sort((a, b) => a - b);

  return sameChain.length > 0 ? sameChain : [1.0];
}

/**
 * 在仿真结果中选与目标胜率最接近的一档。
 * 距离相同时保留 results 中较前的一项（通常难度更低）。
 */
function pickDifficultyClosestToTargetWinRate(
  results: DifficultyResult[],
  targetWinRate: number
): DifficultyResult | undefined {
  if (results.length === 0) return undefined;
  let best = results[0];
  let bestDist = Math.abs(results[0].winRate - targetWinRate);
  for (let i = 1; i < results.length; i++) {
    const r = results[i];
    const d = Math.abs(r.winRate - targetWinRate);
    if (d < bestDist) {
      best = r;
      bestDist = d;
    }
  }
  return best;
}

/** 胜率既非 0% 也非 100% 的档位，用于推荐「目标胜率」时避免选到过于简单（全胜）或过于难（全败）的极端档 */
function filterNonExtremeWinRates(results: DifficultyResult[]): DifficultyResult[] {
  return results.filter((r) => r.winRate > 0 && r.winRate < 1);
}

/**
 * 运行关卡仿真（需在 action 中调用，ctx 需有 runMutation）
 */
export async function runStageSimulation(
  ctx: { runMutation: (ref: any, args: any) => Promise<any> },
  params: {
    ruleId: string;
    strategyId?: string;
    teamMonsters?: Array<{ monsterId: string; level: number; stars: number }>;
    difficulties?: number[];
    runsPerDifficulty?: number;
  }
): Promise<SimulationReport> {
  const {
    ruleId,
    strategyId = "greedy",
    teamMonsters = SIMULATION_DEFAULT_TEAM,
    difficulties,
    runsPerDifficulty = SIMULATION_RUNS_PER_DIFFICULTY,
  } = params;

  const diffs = difficulties ?? getDifficultiesForRuleId(ruleId);
  const teamPower = calculateTeamPower(teamMonsters);

  const results: DifficultyResult[] = [];

  for (const difficulty of diffs) {
    const battles: BattleResult[] = [];
    for (let i = 0; i < runsPerDifficulty; i++) {
      const result = await ctx.runMutation(
        internal.service.difficulty.simulationActions.runSingleBattleMutation,
        {
          ruleId,
          difficulty,
          teamMonsters,
          strategyId,
          seed: `sim_${ruleId}_d${difficulty}_i${i}`,
        }
      );
      battles.push(result);
    }

    const wins = battles.filter((b) => b.win).length;
    const totalRounds = battles.reduce((s, b) => s + b.rounds, 0);
    const totalSurvival = battles.reduce((s, b) => s + b.survivalCount, 0);
    const totalBossHp = battles.reduce((s, b) => s + b.bossHpRemaining, 0);

    results.push({
      difficulty,
      totalBattles: battles.length,
      wins,
      winRate: battles.length > 0 ? wins / battles.length : 0,
      avgRounds: battles.length > 0 ? totalRounds / battles.length : 0,
      avgSurvival: battles.length > 0 ? totalSurvival / battles.length : 0,
      avgBossHpRemaining: battles.length > 0 ? totalBossHp / battles.length : 0,
    });
  }

  const targetWinRate = SIMULATION_TARGET_WIN_RATE;
  const nonExtreme = filterNonExtremeWinRates(results);
  const pool = nonExtreme.length > 0 ? nonExtreme : results;
  const closest = pickDifficultyClosestToTargetWinRate(pool, targetWinRate);
  const suggestedDifficulty = closest?.difficulty ?? results[results.length - 1]?.difficulty ?? 1.0;
  const expectedWinRate = closest?.winRate ?? results[results.length - 1]?.winRate ?? 0;

  const reasoning =
    nonExtreme.length > 0
      ? `基于 ${strategyId} 策略、战力 ${teamPower} 的 ${runsPerDifficulty * diffs.length} 场仿真。优先在胜率介于 0% 与 100% 之间的档位（排除全胜/全败）中选与目标胜率 ${(targetWinRate * 100).toFixed(0)}% 最接近的一档：难度 ${suggestedDifficulty.toFixed(2)}，该档仿真胜率 ${(expectedWinRate * 100).toFixed(1)}%。`
      : `基于 ${strategyId} 策略、战力 ${teamPower} 的 ${runsPerDifficulty * diffs.length} 场仿真。全部采样档位均为全胜或全败，退化为在全部档位中取与目标胜率 ${(targetWinRate * 100).toFixed(0)}% 最接近的一档：难度 ${suggestedDifficulty.toFixed(2)}，该档仿真胜率 ${(expectedWinRate * 100).toFixed(1)}%。`;

  return {
    ruleId,
    strategyId,
    teamPower,
    results,
    recommendation: {
      suggestedDifficulty,
      suggestedRecommendedPower: teamPower,
      expectedWinRate,
      reasoning,
    },
  };
}
