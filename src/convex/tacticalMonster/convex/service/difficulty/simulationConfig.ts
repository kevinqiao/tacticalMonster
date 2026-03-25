/**
 * 仿真配置
 * 支持：1) 每关卡单独队伍  2) 多关卡共享同一队伍
 */

import { getStageRuleConfig } from "../../data/stageRuleConfigs";

export type SimulationTeamMember = {
  monsterId: string;
  level: number;
  stars: number;
};

/**
 * 队伍预设（按名称定义，可被多处引用）
 * 多个关卡可共享同一 preset 名称
 */
export const SIMULATION_TEAM_PRESETS: Record<string, SimulationTeamMember[]> = {
  default: [
    { monsterId: "monster_001", level: 5, stars: 1 },
    { monsterId: "monster_002", level: 6, stars: 2 },
    { monsterId: "monster_008", level: 6, stars: 1 },
    { monsterId: "monster_004", level: 8, stars: 3 },
  ],
  bronze: [
    { monsterId: "monster_001", level: 5, stars: 1 },
    { monsterId: "monster_002", level: 6, stars: 2 },
    { monsterId: "monster_008", level: 6, stars: 1 },
    { monsterId: "monster_004", level: 8, stars: 3 },
  ],
  silver: [
    { monsterId: "monster_001", level: 8, stars: 2 },
    { monsterId: "monster_002", level: 9, stars: 2 },
    { monsterId: "monster_008", level: 9, stars: 2 },
    { monsterId: "monster_004", level: 10, stars: 3 },
  ],
  gold: [
    { monsterId: "monster_001", level: 10, stars: 3 },
    { monsterId: "monster_002", level: 11, stars: 3 },
    { monsterId: "monster_008", level: 11, stars: 2 },
    { monsterId: "monster_004", level: 12, stars: 3 },
  ],
};

/**
 * 按 ruleId 指定队伍
 * - 单关卡单独队伍：为该 ruleId 配置专属队伍或 preset
 * - 多关卡共享：多个 ruleId 指向同一 preset 名称
 * - 未配置的 ruleId 回退到 SIMULATION_CHAIN_TO_TEAM
 */
export const SIMULATION_RULE_TO_TEAM: Record<string, string | SimulationTeamMember[]> = {
  // Bronze 关卡（可逐个配置不同队伍，或共享 "bronze"）
  "monster_rumble_challenge_bronze_boss_1": "bronze",
  "monster_rumble_challenge_bronze_boss_2": "bronze",
  "monster_rumble_challenge_bronze_boss_3": "bronze",
  "monster_rumble_challenge_bronze_boss_4": "bronze",
  "monster_rumble_challenge_bronze_boss_5": "bronze",
  // Silver 关卡
  "monster_rumble_challenge_silver_boss_1": "silver",
  "monster_rumble_challenge_silver_boss_2": "silver",
  "monster_rumble_challenge_silver_boss_3": "silver",
  "monster_rumble_challenge_silver_boss_4": "silver",
  "monster_rumble_challenge_silver_boss_5": "silver",
  // Gold 关卡
  "monster_rumble_challenge_gold_boss_1": "gold",
  "monster_rumble_challenge_gold_boss_2": "gold",
  "monster_rumble_challenge_gold_boss_3": "gold",
  "monster_rumble_challenge_gold_boss_4": "gold",
  "monster_rumble_challenge_gold_boss_5": "gold",
  // 其他关卡
  "monster_rumble_arena_bronze": "bronze",
  "monster_rumble_farm_bronze_boss_1": "bronze",
  "monster_rumble_daily_boss": "default",
  "monster_rumble_weekly_boss": "default",
  // 单关卡单独队伍示例：取消注释并修改即可
  // "monster_rumble_challenge_bronze_boss_3": [
  //   { monsterId: "monster_001", level: 3, stars: 1 },
  //   { monsterId: "monster_002", level: 4, stars: 1 },
  //   ...,
  // ],
};

/**
 * 按 chainId 指定队伍（同 chain 下所有关卡共享）
 */
export const SIMULATION_CHAIN_TO_TEAM: Record<string, string> = {
  challenge_bronze: "bronze",
  challenge_silver: "silver",
  challenge_gold: "gold",
  farm_bronze: "bronze",
  daily: "default",
  weekly: "default",
};

/** 仿真默认队伍（兼容旧逻辑） */
export const SIMULATION_DEFAULT_TEAM: SimulationTeamMember[] =
  SIMULATION_TEAM_PRESETS.default;

function resolveTeam(ref: string | SimulationTeamMember[]): SimulationTeamMember[] {
  if (Array.isArray(ref)) return ref;
  const preset = SIMULATION_TEAM_PRESETS[ref];
  return preset?.length ? preset : SIMULATION_DEFAULT_TEAM;
}

/**
 * 根据 ruleId 获取仿真队伍
 * 优先级：ruleId 精确匹配 > chainId 匹配 > 默认队伍
 */
export function getSimulationTeamForRule(ruleId: string): SimulationTeamMember[] {
  const ruleRef = SIMULATION_RULE_TO_TEAM[ruleId];
  if (ruleRef !== undefined) return resolveTeam(ruleRef);

  const config = getStageRuleConfig(ruleId);
  const chainId = config?.stageChain?.chainId;
  if (chainId) {
    const chainPreset = SIMULATION_CHAIN_TO_TEAM[chainId];
    if (chainPreset) return resolveTeam(chainPreset);
  }

  return SIMULATION_DEFAULT_TEAM;
}

/** 每个难度仿真局数 */
export const SIMULATION_RUNS_PER_DIFFICULTY = 5;

/** 目标胜率（用于推荐难度） */
export const SIMULATION_TARGET_WIN_RATE = 0.7;
