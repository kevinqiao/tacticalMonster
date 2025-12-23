/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as api_mapTemplate from "../api/mapTemplate.js";
import type * as config_tournamentConfig from "../config/tournamentConfig.js";
import type * as crons from "../crons.js";
import type * as dao_gameDao from "../dao/gameDao.js";
import type * as dao_participantDao from "../dao/participantDao.js";
import type * as data_bossConfigs from "../data/bossConfigs.js";
import type * as data_mapTemplateConfigs from "../data/mapTemplateConfigs.js";
import type * as data_monsterConfigs from "../data/monsterConfigs.js";
import type * as data_monsterSkillHelper from "../data/monsterSkillHelper.js";
import type * as data_skillConfigs from "../data/skillConfigs.js";
import type * as data_stageRuleConfigs from "../data/stageRuleConfigs.js";
import type * as http from "../http.js";
import type * as proxy_controller from "../proxy/controller.js";
import type * as schemas_chestSchema from "../schemas/chestSchema.js";
import type * as schemas_mainSchema from "../schemas/mainSchema.js";
import type * as schemas_monsterSchema from "../schemas/monsterSchema.js";
import type * as schemas_tierSchema from "../schemas/tierSchema.js";
import type * as service_battlePass_battlePass from "../service/battlePass/battlePass.js";
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
import type * as service_game_characterPositionService from "../service/game/characterPositionService.js";
import type * as service_game_gameActionValidator from "../service/game/gameActionValidator.js";
import type * as service_game_gameEventService from "../service/game/gameEventService.js";
import type * as service_game_gameRuleConfigService from "../service/game/gameRuleConfigService.js";
import type * as service_game_gameService from "../service/game/gameService.js";
import type * as service_monster_config_upgradeStrategyConfig from "../service/monster/config/upgradeStrategyConfig.js";
import type * as service_monster_monsterService from "../service/monster/monsterService.js";
import type * as service_monster_monsterUpgradeService from "../service/monster/monsterUpgradeService.js";
import type * as service_player_playerExpCalculation from "../service/player/playerExpCalculation.js";
import type * as service_reward_rewardService from "../service/reward/rewardService.js";
import type * as service_reward_rewards from "../service/reward/rewards.js";
import type * as service_skill_index from "../service/skill/index.js";
import type * as service_skill_skillManager from "../service/skill/skillManager.js";
import type * as service_stage_index from "../service/stage/index.js";
import type * as service_stage_mapTemplateService from "../service/stage/mapTemplateService.js";
import type * as service_stage_stageManagerService from "../service/stage/stageManagerService.js";
import type * as service_stage_tests_testData from "../service/stage/tests/testData.js";
import type * as service_task_taskIntegration from "../service/task/taskIntegration.js";
import type * as service_team_teamService from "../service/team/teamService.js";
import type * as service_tournament_tournamentProxyService from "../service/tournament/tournamentProxyService.js";
import type * as service_tournament_tournamentService from "../service/tournament/tournamentService.js";
import type * as types_monsterTypes from "../types/monsterTypes.js";
import type * as utils_hexUtils from "../utils/hexUtils.js";
import type * as utils_seededRandom from "../utils/seededRandom.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "api/mapTemplate": typeof api_mapTemplate;
  "config/tournamentConfig": typeof config_tournamentConfig;
  crons: typeof crons;
  "dao/gameDao": typeof dao_gameDao;
  "dao/participantDao": typeof dao_participantDao;
  "data/bossConfigs": typeof data_bossConfigs;
  "data/mapTemplateConfigs": typeof data_mapTemplateConfigs;
  "data/monsterConfigs": typeof data_monsterConfigs;
  "data/monsterSkillHelper": typeof data_monsterSkillHelper;
  "data/skillConfigs": typeof data_skillConfigs;
  "data/stageRuleConfigs": typeof data_stageRuleConfigs;
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "schemas/chestSchema": typeof schemas_chestSchema;
  "schemas/mainSchema": typeof schemas_mainSchema;
  "schemas/monsterSchema": typeof schemas_monsterSchema;
  "schemas/tierSchema": typeof schemas_tierSchema;
  "service/battlePass/battlePass": typeof service_battlePass_battlePass;
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
  "service/game/characterPositionService": typeof service_game_characterPositionService;
  "service/game/gameActionValidator": typeof service_game_gameActionValidator;
  "service/game/gameEventService": typeof service_game_gameEventService;
  "service/game/gameRuleConfigService": typeof service_game_gameRuleConfigService;
  "service/game/gameService": typeof service_game_gameService;
  "service/monster/config/upgradeStrategyConfig": typeof service_monster_config_upgradeStrategyConfig;
  "service/monster/monsterService": typeof service_monster_monsterService;
  "service/monster/monsterUpgradeService": typeof service_monster_monsterUpgradeService;
  "service/player/playerExpCalculation": typeof service_player_playerExpCalculation;
  "service/reward/rewardService": typeof service_reward_rewardService;
  "service/reward/rewards": typeof service_reward_rewards;
  "service/skill/index": typeof service_skill_index;
  "service/skill/skillManager": typeof service_skill_skillManager;
  "service/stage/index": typeof service_stage_index;
  "service/stage/mapTemplateService": typeof service_stage_mapTemplateService;
  "service/stage/stageManagerService": typeof service_stage_stageManagerService;
  "service/stage/tests/testData": typeof service_stage_tests_testData;
  "service/task/taskIntegration": typeof service_task_taskIntegration;
  "service/team/teamService": typeof service_team_teamService;
  "service/tournament/tournamentProxyService": typeof service_tournament_tournamentProxyService;
  "service/tournament/tournamentService": typeof service_tournament_tournamentService;
  "types/monsterTypes": typeof types_monsterTypes;
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
