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
import type * as data_chestConfigs from "../data/chestConfigs.js";
import type * as data_mapTemplateConfigs from "../data/mapTemplateConfigs.js";
import type * as data_monsterConfigs from "../data/monsterConfigs.js";
import type * as data_monsterSkillHelper from "../data/monsterSkillHelper.js";
import type * as data_scoringConfigs from "../data/scoringConfigs.js";
import type * as data_skillConfigs from "../data/skillConfigs.js";
import type * as data_stageRuleConfigs from "../data/stageRuleConfigs.js";
import type * as data_upgradeStrategyConfig from "../data/upgradeStrategyConfig.js";
import type * as http from "../http.js";
import type * as proxy_controller from "../proxy/controller.js";
import type * as schemas_chestSchema from "../schemas/chestSchema.js";
import type * as schemas_loadMonsterTestDataMutation from "../schemas/loadMonsterTestDataMutation.js";
import type * as schemas_loadMonsterTestDataWithCrypto from "../schemas/loadMonsterTestDataWithCrypto.js";
import type * as schemas_mainSchema from "../schemas/mainSchema.js";
import type * as schemas_monsterSchema from "../schemas/monsterSchema.js";
import type * as schemas_testData from "../schemas/testData.js";
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
import type * as service_errorCodes from "../service/errorCodes.js";
import type * as service_game_characterEnricher from "../service/game/characterEnricher.js";
import type * as service_game_characterPositionService from "../service/game/characterPositionService.js";
import type * as service_game_characterQueryService from "../service/game/characterQueryService.js";
import type * as service_game_characterUpdateService from "../service/game/characterUpdateService.js";
import type * as service_game_gameActionService from "../service/game/gameActionService.js";
import type * as service_game_gameActionValidator from "../service/game/gameActionValidator.js";
import type * as service_game_gameEventService from "../service/game/gameEventService.js";
import type * as service_game_gameLifecycleService from "../service/game/gameLifecycleService.js";
import type * as service_game_gamePhaseService from "../service/game/gamePhaseService.js";
import type * as service_game_gameRuleConfigService from "../service/game/gameRuleConfigService.js";
import type * as service_game_gameScoreService from "../service/game/gameScoreService.js";
import type * as service_game_gameService from "../service/game/gameService.js";
import type * as service_game_roundService from "../service/game/roundService.js";
import type * as service_game_sharedScoreService from "../service/game/sharedScoreService.js";
import type * as service_game_skillTargetService from "../service/game/skillTargetService.js";
import type * as service_game_tests_combat_combatE2E from "../service/game/tests/combat/combatE2E.js";
import type * as service_game_tests_combat_combatIntegration from "../service/game/tests/combat/combatIntegration.js";
import type * as service_game_tests_combat_combatTestData from "../service/game/tests/combat/combatTestData.js";
import type * as service_game_tests_combat_replayModeE2E from "../service/game/tests/combat/replayModeE2E.js";
import type * as service_game_tests_combat_stateChangesIntegration from "../service/game/tests/combat/stateChangesIntegration.js";
import type * as service_game_tests_combat_watchModeE2E from "../service/game/tests/combat/watchModeE2E.js";
import type * as service_game_tests_unit_characterQueryService from "../service/game/tests/unit/characterQueryService.js";
import type * as service_game_tests_unit_gameActionValidator from "../service/game/tests/unit/gameActionValidator.js";
import type * as service_game_tests_unit_testUtils from "../service/game/tests/unit/testUtils.js";
import type * as service_monster_config_upgradeStrategyConfig from "../service/monster/config/upgradeStrategyConfig.js";
import type * as service_monster_monsterService from "../service/monster/monsterService.js";
import type * as service_monster_monsterUpgradeService from "../service/monster/monsterUpgradeService.js";
import type * as service_player_playerExpCalculation from "../service/player/playerExpCalculation.js";
import type * as service_reward_rewardService from "../service/reward/rewardService.js";
import type * as service_reward_rewards from "../service/reward/rewards.js";
import type * as service_skill_StatusEffectProcessor from "../service/skill/StatusEffectProcessor.js";
import type * as service_skill_damageCalculator from "../service/skill/damageCalculator.js";
import type * as service_skill_effects_EffectHandler from "../service/skill/effects/EffectHandler.js";
import type * as service_skill_effects_EffectHandlerRegistry from "../service/skill/effects/EffectHandlerRegistry.js";
import type * as service_skill_effects_duration_BuffHandler from "../service/skill/effects/duration/BuffHandler.js";
import type * as service_skill_effects_duration_DebuffHandler from "../service/skill/effects/duration/DebuffHandler.js";
import type * as service_skill_effects_duration_DotHandler from "../service/skill/effects/duration/DotHandler.js";
import type * as service_skill_effects_duration_HotHandler from "../service/skill/effects/duration/HotHandler.js";
import type * as service_skill_effects_duration_StunHandler from "../service/skill/effects/duration/StunHandler.js";
import type * as service_skill_effects_immediate_DamageHandler from "../service/skill/effects/immediate/DamageHandler.js";
import type * as service_skill_effects_immediate_HealHandler from "../service/skill/effects/immediate/HealHandler.js";
import type * as service_skill_effects_immediate_MovementHandler from "../service/skill/effects/immediate/MovementHandler.js";
import type * as service_skill_effects_immediate_MpDrainHandler from "../service/skill/effects/immediate/MpDrainHandler.js";
import type * as service_skill_effects_immediate_MpRestoreHandler from "../service/skill/effects/immediate/MpRestoreHandler.js";
import type * as service_skill_effects_immediate_ShieldHandler from "../service/skill/effects/immediate/ShieldHandler.js";
import type * as service_skill_effects_immediate_TeleportHandler from "../service/skill/effects/immediate/TeleportHandler.js";
import type * as service_skill_index from "../service/skill/index.js";
import type * as service_skill_skillManager from "../service/skill/skillManager.js";
import type * as service_stage_index from "../service/stage/index.js";
import type * as service_stage_mapGenerationService from "../service/stage/mapGenerationService.js";
import type * as service_stage_stageManagerService from "../service/stage/stageManagerService.js";
import type * as service_stage_stageUtils from "../service/stage/stageUtils.js";
import type * as service_stage_tests_testData from "../service/stage/tests/testData.js";
import type * as service_task_taskIntegration from "../service/task/taskIntegration.js";
import type * as service_team_teamService from "../service/team/teamService.js";
import type * as service_tournament_tournamentProxyService from "../service/tournament/tournamentProxyService.js";
import type * as service_tournament_tournamentService from "../service/tournament/tournamentService.js";
import type * as test_loadMonster from "../test/loadMonster.js";
import type * as test_testData from "../test/testData.js";
import type * as types_bossTypes from "../types/bossTypes.js";
import type * as types_chestTypes from "../types/chestTypes.js";
import type * as types_gameTypes from "../types/gameTypes.js";
import type * as types_monsterTypes from "../types/monsterTypes.js";
import type * as types_obstacleTypes from "../types/obstacleTypes.js";
import type * as types_skillTypes from "../types/skillTypes.js";
import type * as types_stageRuleTypes from "../types/stageRuleTypes.js";
import type * as types_upgradeStrategyTypes from "../types/upgradeStrategyTypes.js";
import type * as utils_hashUtils from "../utils/hashUtils.js";
import type * as utils_hexUtils from "../utils/hexUtils.js";
import type * as utils_obstacleUtils from "../utils/obstacleUtils.js";
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
  "data/chestConfigs": typeof data_chestConfigs;
  "data/mapTemplateConfigs": typeof data_mapTemplateConfigs;
  "data/monsterConfigs": typeof data_monsterConfigs;
  "data/monsterSkillHelper": typeof data_monsterSkillHelper;
  "data/scoringConfigs": typeof data_scoringConfigs;
  "data/skillConfigs": typeof data_skillConfigs;
  "data/stageRuleConfigs": typeof data_stageRuleConfigs;
  "data/upgradeStrategyConfig": typeof data_upgradeStrategyConfig;
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "schemas/chestSchema": typeof schemas_chestSchema;
  "schemas/loadMonsterTestDataMutation": typeof schemas_loadMonsterTestDataMutation;
  "schemas/loadMonsterTestDataWithCrypto": typeof schemas_loadMonsterTestDataWithCrypto;
  "schemas/mainSchema": typeof schemas_mainSchema;
  "schemas/monsterSchema": typeof schemas_monsterSchema;
  "schemas/testData": typeof schemas_testData;
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
  "service/errorCodes": typeof service_errorCodes;
  "service/game/characterEnricher": typeof service_game_characterEnricher;
  "service/game/characterPositionService": typeof service_game_characterPositionService;
  "service/game/characterQueryService": typeof service_game_characterQueryService;
  "service/game/characterUpdateService": typeof service_game_characterUpdateService;
  "service/game/gameActionService": typeof service_game_gameActionService;
  "service/game/gameActionValidator": typeof service_game_gameActionValidator;
  "service/game/gameEventService": typeof service_game_gameEventService;
  "service/game/gameLifecycleService": typeof service_game_gameLifecycleService;
  "service/game/gamePhaseService": typeof service_game_gamePhaseService;
  "service/game/gameRuleConfigService": typeof service_game_gameRuleConfigService;
  "service/game/gameScoreService": typeof service_game_gameScoreService;
  "service/game/gameService": typeof service_game_gameService;
  "service/game/roundService": typeof service_game_roundService;
  "service/game/sharedScoreService": typeof service_game_sharedScoreService;
  "service/game/skillTargetService": typeof service_game_skillTargetService;
  "service/game/tests/combat/combatE2E": typeof service_game_tests_combat_combatE2E;
  "service/game/tests/combat/combatIntegration": typeof service_game_tests_combat_combatIntegration;
  "service/game/tests/combat/combatTestData": typeof service_game_tests_combat_combatTestData;
  "service/game/tests/combat/replayModeE2E": typeof service_game_tests_combat_replayModeE2E;
  "service/game/tests/combat/stateChangesIntegration": typeof service_game_tests_combat_stateChangesIntegration;
  "service/game/tests/combat/watchModeE2E": typeof service_game_tests_combat_watchModeE2E;
  "service/game/tests/unit/characterQueryService": typeof service_game_tests_unit_characterQueryService;
  "service/game/tests/unit/gameActionValidator": typeof service_game_tests_unit_gameActionValidator;
  "service/game/tests/unit/testUtils": typeof service_game_tests_unit_testUtils;
  "service/monster/config/upgradeStrategyConfig": typeof service_monster_config_upgradeStrategyConfig;
  "service/monster/monsterService": typeof service_monster_monsterService;
  "service/monster/monsterUpgradeService": typeof service_monster_monsterUpgradeService;
  "service/player/playerExpCalculation": typeof service_player_playerExpCalculation;
  "service/reward/rewardService": typeof service_reward_rewardService;
  "service/reward/rewards": typeof service_reward_rewards;
  "service/skill/StatusEffectProcessor": typeof service_skill_StatusEffectProcessor;
  "service/skill/damageCalculator": typeof service_skill_damageCalculator;
  "service/skill/effects/EffectHandler": typeof service_skill_effects_EffectHandler;
  "service/skill/effects/EffectHandlerRegistry": typeof service_skill_effects_EffectHandlerRegistry;
  "service/skill/effects/duration/BuffHandler": typeof service_skill_effects_duration_BuffHandler;
  "service/skill/effects/duration/DebuffHandler": typeof service_skill_effects_duration_DebuffHandler;
  "service/skill/effects/duration/DotHandler": typeof service_skill_effects_duration_DotHandler;
  "service/skill/effects/duration/HotHandler": typeof service_skill_effects_duration_HotHandler;
  "service/skill/effects/duration/StunHandler": typeof service_skill_effects_duration_StunHandler;
  "service/skill/effects/immediate/DamageHandler": typeof service_skill_effects_immediate_DamageHandler;
  "service/skill/effects/immediate/HealHandler": typeof service_skill_effects_immediate_HealHandler;
  "service/skill/effects/immediate/MovementHandler": typeof service_skill_effects_immediate_MovementHandler;
  "service/skill/effects/immediate/MpDrainHandler": typeof service_skill_effects_immediate_MpDrainHandler;
  "service/skill/effects/immediate/MpRestoreHandler": typeof service_skill_effects_immediate_MpRestoreHandler;
  "service/skill/effects/immediate/ShieldHandler": typeof service_skill_effects_immediate_ShieldHandler;
  "service/skill/effects/immediate/TeleportHandler": typeof service_skill_effects_immediate_TeleportHandler;
  "service/skill/index": typeof service_skill_index;
  "service/skill/skillManager": typeof service_skill_skillManager;
  "service/stage/index": typeof service_stage_index;
  "service/stage/mapGenerationService": typeof service_stage_mapGenerationService;
  "service/stage/stageManagerService": typeof service_stage_stageManagerService;
  "service/stage/stageUtils": typeof service_stage_stageUtils;
  "service/stage/tests/testData": typeof service_stage_tests_testData;
  "service/task/taskIntegration": typeof service_task_taskIntegration;
  "service/team/teamService": typeof service_team_teamService;
  "service/tournament/tournamentProxyService": typeof service_tournament_tournamentProxyService;
  "service/tournament/tournamentService": typeof service_tournament_tournamentService;
  "test/loadMonster": typeof test_loadMonster;
  "test/testData": typeof test_testData;
  "types/bossTypes": typeof types_bossTypes;
  "types/chestTypes": typeof types_chestTypes;
  "types/gameTypes": typeof types_gameTypes;
  "types/monsterTypes": typeof types_monsterTypes;
  "types/obstacleTypes": typeof types_obstacleTypes;
  "types/skillTypes": typeof types_skillTypes;
  "types/stageRuleTypes": typeof types_stageRuleTypes;
  "types/upgradeStrategyTypes": typeof types_upgradeStrategyTypes;
  "utils/hashUtils": typeof utils_hashUtils;
  "utils/hexUtils": typeof utils_hexUtils;
  "utils/obstacleUtils": typeof utils_obstacleUtils;
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
