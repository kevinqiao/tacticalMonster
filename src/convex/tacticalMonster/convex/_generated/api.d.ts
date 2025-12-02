/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as config_tournamentConfig from "../config/tournamentConfig.js";
import type * as crons from "../crons.js";
import type * as dao_gameDao from "../dao/gameDao.js";
import type * as dao_participantDao from "../dao/participantDao.js";
import type * as data_bossConfigs from "../data/bossConfigs.js";
import type * as data_levelConfigs from "../data/levelConfigs.js";
import type * as data_monsterConfigs from "../data/monsterConfigs.js";
import type * as data_tierConfigs from "../data/tierConfigs.js";
import type * as data_tierMappingConfig from "../data/tierMappingConfig.js";
import type * as http from "../http.js";
import type * as proxy_controller from "../proxy/controller.js";
import type * as schemas_bossSchema from "../schemas/bossSchema.js";
import type * as schemas_chestSchema from "../schemas/chestSchema.js";
import type * as schemas_energySchema from "../schemas/energySchema.js";
import type * as schemas_levelSchema from "../schemas/levelSchema.js";
import type * as schemas_monsterRumbleSchema from "../schemas/monsterRumbleSchema.js";
import type * as schemas_monsterSchema from "../schemas/monsterSchema.js";
import type * as schemas_tierSchema from "../schemas/tierSchema.js";
import type * as service_battlePass_battlePass from "../service/battlePass/battlePass.js";
import type * as service_battlePass_battlePassIntegration from "../service/battlePass/battlePassIntegration.js";
import type * as service_battlePass_battlePassPoints from "../service/battlePass/battlePassPoints.js";
import type * as service_battlePass_index from "../service/battlePass/index.js";
import type * as service_boss_ai_behaviorTreeExecutor from "../service/boss/ai/behaviorTreeExecutor.js";
import type * as service_boss_ai_bossAIActions from "../service/boss/ai/bossAIActions.js";
import type * as service_boss_ai_bossAIService from "../service/boss/ai/bossAIService.js";
import type * as service_boss_ai_bossTurnHandler from "../service/boss/ai/bossTurnHandler.js";
import type * as service_boss_ai_conditionEvaluator from "../service/boss/ai/conditionEvaluator.js";
import type * as service_boss_ai_index from "../service/boss/ai/index.js";
import type * as service_boss_ai_phaseManager from "../service/boss/ai/phaseManager.js";
import type * as service_boss_ai_targetSelector from "../service/boss/ai/targetSelector.js";
import type * as service_boss_bossConfigService from "../service/boss/bossConfigService.js";
import type * as service_boss_bossInstanceService from "../service/boss/bossInstanceService.js";
import type * as service_boss_bossSelectionService from "../service/boss/bossSelectionService.js";
import type * as service_calculation_config_dailyLimitConfig from "../service/calculation/config/dailyLimitConfig.js";
import type * as service_calculation_config_expRewardConfig from "../service/calculation/config/expRewardConfig.js";
import type * as service_calculation_config_index from "../service/calculation/config/index.js";
import type * as service_calculation_config_seasonPointsConfig from "../service/calculation/config/seasonPointsConfig.js";
import type * as service_calculation_exp_activityExpCalculation from "../service/calculation/exp/activityExpCalculation.js";
import type * as service_calculation_exp_index from "../service/calculation/exp/index.js";
import type * as service_calculation_exp_taskExpCalculation from "../service/calculation/exp/taskExpCalculation.js";
import type * as service_calculation_exp_tournamentExpCalculation from "../service/calculation/exp/tournamentExpCalculation.js";
import type * as service_calculation_index from "../service/calculation/index.js";
import type * as service_calculation_limits_dailyLimitService from "../service/calculation/limits/dailyLimitService.js";
import type * as service_calculation_limits_index from "../service/calculation/limits/index.js";
import type * as service_calculation_seasonPoints_gameExpCalculation from "../service/calculation/seasonPoints/gameExpCalculation.js";
import type * as service_calculation_seasonPoints_index from "../service/calculation/seasonPoints/index.js";
import type * as service_calculation_seasonPoints_upgradeExpCalculation from "../service/calculation/seasonPoints/upgradeExpCalculation.js";
import type * as service_chest_chest from "../service/chest/chest.js";
import type * as service_chest_chestService from "../service/chest/chestService.js";
import type * as service_energy_energyService from "../service/energy/energyService.js";
import type * as service_game_gameEndLogic from "../service/game/gameEndLogic.js";
import type * as service_game_gameEndService from "../service/game/gameEndService.js";
import type * as service_game_gameInstanceService from "../service/game/gameInstanceService.js";
import type * as service_game_gameMatchingService from "../service/game/gameMatchingService.js";
import type * as service_game_gameService from "../service/game/gameService.js";
import type * as service_game_gameTimeoutService from "../service/game/gameTimeoutService.js";
import type * as service_game_playerFinishService from "../service/game/playerFinishService.js";
import type * as service_game_tests_testData from "../service/game/tests/testData.js";
import type * as service_game_tests_utils_assertions from "../service/game/tests/utils/assertions.js";
import type * as service_game_tests_utils_cleanup from "../service/game/tests/utils/cleanup.js";
import type * as service_game_tests_utils_simulators from "../service/game/tests/utils/simulators.js";
import type * as service_level_levelConfigService from "../service/level/levelConfigService.js";
import type * as service_level_levelGenerationService from "../service/level/levelGenerationService.js";
import type * as service_monster_monsterDataSeeder from "../service/monster/monsterDataSeeder.js";
import type * as service_monster_monsterService from "../service/monster/monsterService.js";
import type * as service_monster_monsterUpgradeService from "../service/monster/monsterUpgradeService.js";
import type * as service_monster_shardService from "../service/monster/shardService.js";
import type * as service_player_playerExpCalculation from "../service/player/playerExpCalculation.js";
import type * as service_player_playerLevelService from "../service/player/playerLevelService.js";
import type * as service_resource_resourceProxyService from "../service/resource/resourceProxyService.js";
import type * as service_reward_gameSpecificRewardService from "../service/reward/gameSpecificRewardService.js";
import type * as service_task_taskIntegration from "../service/task/taskIntegration.js";
import type * as service_team_teamService from "../service/team/teamService.js";
import type * as service_tier_monsterRumbleTierService from "../service/tier/monsterRumbleTierService.js";
import type * as service_tier_tierMappingService from "../service/tier/tierMappingService.js";
import type * as service_tournament_tournamentProxyService from "../service/tournament/tournamentProxyService.js";
import type * as utils_hexUtils from "../utils/hexUtils.js";
import type * as utils_seededRandom from "../utils/seededRandom.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "config/tournamentConfig": typeof config_tournamentConfig;
  crons: typeof crons;
  "dao/gameDao": typeof dao_gameDao;
  "dao/participantDao": typeof dao_participantDao;
  "data/bossConfigs": typeof data_bossConfigs;
  "data/levelConfigs": typeof data_levelConfigs;
  "data/monsterConfigs": typeof data_monsterConfigs;
  "data/tierConfigs": typeof data_tierConfigs;
  "data/tierMappingConfig": typeof data_tierMappingConfig;
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "schemas/bossSchema": typeof schemas_bossSchema;
  "schemas/chestSchema": typeof schemas_chestSchema;
  "schemas/energySchema": typeof schemas_energySchema;
  "schemas/levelSchema": typeof schemas_levelSchema;
  "schemas/monsterRumbleSchema": typeof schemas_monsterRumbleSchema;
  "schemas/monsterSchema": typeof schemas_monsterSchema;
  "schemas/tierSchema": typeof schemas_tierSchema;
  "service/battlePass/battlePass": typeof service_battlePass_battlePass;
  "service/battlePass/battlePassIntegration": typeof service_battlePass_battlePassIntegration;
  "service/battlePass/battlePassPoints": typeof service_battlePass_battlePassPoints;
  "service/battlePass/index": typeof service_battlePass_index;
  "service/boss/ai/behaviorTreeExecutor": typeof service_boss_ai_behaviorTreeExecutor;
  "service/boss/ai/bossAIActions": typeof service_boss_ai_bossAIActions;
  "service/boss/ai/bossAIService": typeof service_boss_ai_bossAIService;
  "service/boss/ai/bossTurnHandler": typeof service_boss_ai_bossTurnHandler;
  "service/boss/ai/conditionEvaluator": typeof service_boss_ai_conditionEvaluator;
  "service/boss/ai/index": typeof service_boss_ai_index;
  "service/boss/ai/phaseManager": typeof service_boss_ai_phaseManager;
  "service/boss/ai/targetSelector": typeof service_boss_ai_targetSelector;
  "service/boss/bossConfigService": typeof service_boss_bossConfigService;
  "service/boss/bossInstanceService": typeof service_boss_bossInstanceService;
  "service/boss/bossSelectionService": typeof service_boss_bossSelectionService;
  "service/calculation/config/dailyLimitConfig": typeof service_calculation_config_dailyLimitConfig;
  "service/calculation/config/expRewardConfig": typeof service_calculation_config_expRewardConfig;
  "service/calculation/config/index": typeof service_calculation_config_index;
  "service/calculation/config/seasonPointsConfig": typeof service_calculation_config_seasonPointsConfig;
  "service/calculation/exp/activityExpCalculation": typeof service_calculation_exp_activityExpCalculation;
  "service/calculation/exp/index": typeof service_calculation_exp_index;
  "service/calculation/exp/taskExpCalculation": typeof service_calculation_exp_taskExpCalculation;
  "service/calculation/exp/tournamentExpCalculation": typeof service_calculation_exp_tournamentExpCalculation;
  "service/calculation/index": typeof service_calculation_index;
  "service/calculation/limits/dailyLimitService": typeof service_calculation_limits_dailyLimitService;
  "service/calculation/limits/index": typeof service_calculation_limits_index;
  "service/calculation/seasonPoints/gameExpCalculation": typeof service_calculation_seasonPoints_gameExpCalculation;
  "service/calculation/seasonPoints/index": typeof service_calculation_seasonPoints_index;
  "service/calculation/seasonPoints/upgradeExpCalculation": typeof service_calculation_seasonPoints_upgradeExpCalculation;
  "service/chest/chest": typeof service_chest_chest;
  "service/chest/chestService": typeof service_chest_chestService;
  "service/energy/energyService": typeof service_energy_energyService;
  "service/game/gameEndLogic": typeof service_game_gameEndLogic;
  "service/game/gameEndService": typeof service_game_gameEndService;
  "service/game/gameInstanceService": typeof service_game_gameInstanceService;
  "service/game/gameMatchingService": typeof service_game_gameMatchingService;
  "service/game/gameService": typeof service_game_gameService;
  "service/game/gameTimeoutService": typeof service_game_gameTimeoutService;
  "service/game/playerFinishService": typeof service_game_playerFinishService;
  "service/game/tests/testData": typeof service_game_tests_testData;
  "service/game/tests/utils/assertions": typeof service_game_tests_utils_assertions;
  "service/game/tests/utils/cleanup": typeof service_game_tests_utils_cleanup;
  "service/game/tests/utils/simulators": typeof service_game_tests_utils_simulators;
  "service/level/levelConfigService": typeof service_level_levelConfigService;
  "service/level/levelGenerationService": typeof service_level_levelGenerationService;
  "service/monster/monsterDataSeeder": typeof service_monster_monsterDataSeeder;
  "service/monster/monsterService": typeof service_monster_monsterService;
  "service/monster/monsterUpgradeService": typeof service_monster_monsterUpgradeService;
  "service/monster/shardService": typeof service_monster_shardService;
  "service/player/playerExpCalculation": typeof service_player_playerExpCalculation;
  "service/player/playerLevelService": typeof service_player_playerLevelService;
  "service/resource/resourceProxyService": typeof service_resource_resourceProxyService;
  "service/reward/gameSpecificRewardService": typeof service_reward_gameSpecificRewardService;
  "service/task/taskIntegration": typeof service_task_taskIntegration;
  "service/team/teamService": typeof service_team_teamService;
  "service/tier/monsterRumbleTierService": typeof service_tier_monsterRumbleTierService;
  "service/tier/tierMappingService": typeof service_tier_tierMappingService;
  "service/tournament/tournamentProxyService": typeof service_tournament_tournamentProxyService;
  "utils/hexUtils": typeof utils_hexUtils;
  "utils/seededRandom": typeof utils_seededRandom;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
