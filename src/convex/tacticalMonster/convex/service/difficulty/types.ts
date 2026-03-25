/**
 * 难度仿真相关类型定义
 */

import type { CharacterIdentifier } from "../../types/gameTypes";
import type { GameModel } from "../../types/gameTypes";

/** 合法动作：技能、移动、防守 */
export type ValidAction =
  | {
      type: "useSkill";
      identifier: CharacterIdentifier;
      skillId: string;
      targets: CharacterIdentifier[];
    }
  | {
      type: "walk";
      identifier: CharacterIdentifier;
      to: { q: number; r: number };
      steps: number;
    }
  | {
      type: "defend";
      identifier: CharacterIdentifier;
    };

/** 效用因子权重配置 */
export interface StrategyWeights {
  damageDealt: number;
  healValue: number;
  targetHpPercent: number;
  distanceToEnemy: number;
  skillCooldownCost: number;
  survivalRisk: number;
  randomBias: number;
}

/** 单局战斗结果 */
export interface BattleResult {
  win: boolean;
  rounds: number;
  survivalCount: number;
  bossHpRemaining: number;
}

/** 某难度下的聚合统计 */
export interface DifficultyResult {
  difficulty: number;
  totalBattles: number;
  wins: number;
  winRate: number;
  avgRounds: number;
  avgSurvival: number;
  avgBossHpRemaining: number;
}

/** 仿真报告 */
export interface SimulationReport {
  ruleId: string;
  strategyId: string;
  teamPower: number;
  results: DifficultyResult[];
  recommendation: {
    suggestedDifficulty: number;
    suggestedRecommendedPower: number;
    expectedWinRate: number;
    reasoning: string;
  };
}
