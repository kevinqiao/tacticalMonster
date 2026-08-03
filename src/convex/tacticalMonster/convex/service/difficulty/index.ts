/**
 * 难度仿真服务
 */

export { PlayerSimulator } from "./playerSimulator";
export { STRATEGY_PRESETS, getWeightsForSkillLevel } from "./strategyConfigs";
export {
  SIMULATION_DEFAULT_TEAM,
  SIMULATION_RUNS_PER_DIFFICULTY,
  SIMULATION_TARGET_WIN_RATE,
  SIMULATION_TEAM_PRESETS,
  SIMULATION_RULE_TO_TEAM,
  SIMULATION_CHAIN_TO_TEAM,
  getSimulationTeamForRule,
} from "./simulationConfig";
export type { SimulationTeamMember } from "./simulationConfig";
export type {
  ValidAction,
  StrategyWeights,
  BattleResult,
  DifficultyResult,
  SimulationReport,
} from "./types";
