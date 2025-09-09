/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as custom_session from "../custom/session.js";
import type * as dao_notificationDao from "../dao/notificationDao.js";
import type * as dao_playerDao from "../dao/playerDao.js";
import type * as dao_playerTaskDao from "../dao/playerTaskDao.js";
import type * as dao_taskEventDao from "../dao/taskEventDao.js";
import type * as dao_tournamentDao from "../dao/tournamentDao.js";
import type * as data_taskTemplate from "../data/taskTemplate.js";
import type * as data_tournamentConfigs from "../data/tournamentConfigs.js";
import type * as data_tournamentConfigs_all from "../data/tournamentConfigs_all.js";
import type * as http from "../http.js";
import type * as schemas_battlePassSchema from "../schemas/battlePassSchema.js";
import type * as schemas_config from "../schemas/config.js";
import type * as schemas_exampleNewModule from "../schemas/exampleNewModule.js";
import type * as schemas_leaderboardSchema from "../schemas/leaderboardSchema.js";
import type * as schemas_migrationHelper from "../schemas/migrationHelper.js";
import type * as schemas_propSchema from "../schemas/propSchema.js";
import type * as schemas_segmentSchema from "../schemas/segmentSchema.js";
import type * as schemas_taskSchema from "../schemas/taskSchema.js";
import type * as schemas_ticketSchema from "../schemas/ticketSchema.js";
import type * as schemas_tournamentRulesSchema from "../schemas/tournamentRulesSchema.js";
import type * as schemas_tournamentSchema from "../schemas/tournamentSchema.js";
import type * as schemas_userSchema from "../schemas/userSchema.js";
import type * as service_auth from "../service/auth.js";
import type * as service_battlePass_battlePass from "../service/battlePass/battlePass.js";
import type * as service_battlePass_battlePassSystem from "../service/battlePass/battlePassSystem.js";
import type * as service_join from "../service/join.js";
import type * as service_leaderboard_leaderboardSystem from "../service/leaderboard/leaderboardSystem.js";
import type * as service_leaderboard_leaderboards from "../service/leaderboard/leaderboards.js";
import type * as service_localization_errorCodes from "../service/localization/errorCodes.js";
import type * as service_localization_errorHandler from "../service/localization/errorHandler.js";
import type * as service_localization_index from "../service/localization/index.js";
import type * as service_localization_localizationManager from "../service/localization/localizationManager.js";
import type * as service_localization_messageCodes from "../service/localization/messageCodes.js";
import type * as service_localization_messageHandler from "../service/localization/messageHandler.js";
import type * as service_match from "../service/match.js";
import type * as service_playerManager from "../service/playerManager.js";
import type * as service_recordLogin from "../service/recordLogin.js";
import type * as service_segment_SegmentManager from "../service/segment/SegmentManager.js";
import type * as service_segment_config from "../service/segment/config.js";
import type * as service_segment_dataAccess from "../service/segment/dataAccess.js";
import type * as service_segment_index from "../service/segment/index.js";
import type * as service_segment_segmentFunctions from "../service/segment/segmentFunctions.js";
import type * as service_segment_segmentSystemTest from "../service/segment/segmentSystemTest.js";
import type * as service_segment_tournamentIntegration from "../service/segment/tournamentIntegration.js";
import type * as service_segment_tournamentIntegrationFunctions from "../service/segment/tournamentIntegrationFunctions.js";
import type * as service_segment_types from "../service/segment/types.js";
import type * as service_task_taskIntegration from "../service/task/taskIntegration.js";
import type * as service_task_taskSystem from "../service/task/taskSystem.js";
import type * as service_task_tests_ConditionalTest from "../service/task/tests/ConditionalTest.js";
import type * as service_task_tests_LoginTest from "../service/task/tests/LoginTest.js";
import type * as service_task_tests_MultiStageTest from "../service/task/tests/MultiStageTest.js";
import type * as service_task_tests_TimeBasedTest from "../service/task/tests/TimeBasedTest.js";
import type * as service_ticket_ticketSystem from "../service/ticket/ticketSystem.js";
import type * as service_ticket_tickets from "../service/ticket/tickets.js";
import type * as service_tournament_common from "../service/tournament/common.js";
import type * as service_tournament_errorCodes from "../service/tournament/errorCodes.js";
import type * as service_tournament_errorHandler from "../service/tournament/errorHandler.js";
import type * as service_tournament_handler_base from "../service/tournament/handler/base.js";
import type * as service_tournament_handler_index from "../service/tournament/handler/index.js";
import type * as service_tournament_handler_singlePlayerIndependentTournamentHandler from "../service/tournament/handler/singlePlayerIndependentTournamentHandler.js";
import type * as service_tournament_handler_validator from "../service/tournament/handler/validator.js";
import type * as service_tournament_matchManager from "../service/tournament/matchManager.js";
import type * as service_tournament_playerTournamentStatusManager from "../service/tournament/playerTournamentStatusManager.js";
import type * as service_tournament_pointCalculationExample from "../service/tournament/pointCalculationExample.js";
import type * as service_tournament_pointCalculationService from "../service/tournament/pointCalculationService.js";
import type * as service_tournament_scoreThresholdControl_config_config from "../service/tournament/scoreThresholdControl/config/config.js";
import type * as service_tournament_scoreThresholdControl_config_scoreThresholdSchema from "../service/tournament/scoreThresholdControl/config/scoreThresholdSchema.js";
import type * as service_tournament_scoreThresholdControl_config_types from "../service/tournament/scoreThresholdControl/config/types.js";
import type * as service_tournament_scoreThresholdControl_core_UnifiedSkillAssessment from "../service/tournament/scoreThresholdControl/core/UnifiedSkillAssessment.js";
import type * as service_tournament_scoreThresholdControl_examples_RankingTestExamples from "../service/tournament/scoreThresholdControl/examples/RankingTestExamples.js";
import type * as service_tournament_scoreThresholdControl_functions_consistencyOptimizationFunctions from "../service/tournament/scoreThresholdControl/functions/consistencyOptimizationFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_consistencyPlayerSimulationFunctions from "../service/tournament/scoreThresholdControl/functions/consistencyPlayerSimulationFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_consistencyTestFunctions from "../service/tournament/scoreThresholdControl/functions/consistencyTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_integralSegmentProbabilityTestFunctions from "../service/tournament/scoreThresholdControl/functions/integralSegmentProbabilityTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_segmentManagerIntegrationTestFunctions from "../service/tournament/scoreThresholdControl/functions/segmentManagerIntegrationTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_segmentProbabilityConfigTestFunctions from "../service/tournament/scoreThresholdControl/functions/segmentProbabilityConfigTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_segmentRankingProbabilityTestFunctions from "../service/tournament/scoreThresholdControl/functions/segmentRankingProbabilityTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_singlePlayerSegmentProbabilityTestFunctions from "../service/tournament/scoreThresholdControl/functions/singlePlayerSegmentProbabilityTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_testRankingRecommendation from "../service/tournament/scoreThresholdControl/functions/testRankingRecommendation.js";
import type * as service_tournament_scoreThresholdControl_functions_tiedRankingTestFunctions from "../service/tournament/scoreThresholdControl/functions/tiedRankingTestFunctions.js";
import type * as service_tournament_scoreThresholdControl_functions_unifiedSkillAssessmentFunctions from "../service/tournament/scoreThresholdControl/functions/unifiedSkillAssessmentFunctions.js";
import type * as service_tournament_scoreThresholdControl_index from "../service/tournament/scoreThresholdControl/index.js";
import type * as service_tournament_scoreThresholdControl_managers_MultiPlayerRankingExample from "../service/tournament/scoreThresholdControl/managers/MultiPlayerRankingExample.js";
import type * as service_tournament_scoreThresholdControl_managers_PlayerHistoricalDataManager from "../service/tournament/scoreThresholdControl/managers/PlayerHistoricalDataManager.js";
import type * as service_tournament_scoreThresholdControl_managers_RankingRecommendationManager from "../service/tournament/scoreThresholdControl/managers/RankingRecommendationManager.js";
import type * as service_tournament_scoreThresholdControl_managers_SeedRecommendationManager from "../service/tournament/scoreThresholdControl/managers/SeedRecommendationManager.js";
import type * as service_tournament_scoreThresholdControl_test_ConsistencyCalculationTest from "../service/tournament/scoreThresholdControl/test/ConsistencyCalculationTest.js";
import type * as service_tournament_scoreThresholdControl_test_ConsistencyOptimizationExample from "../service/tournament/scoreThresholdControl/test/ConsistencyOptimizationExample.js";
import type * as service_tournament_scoreThresholdControl_test_ConsistencyPlayerSimulation from "../service/tournament/scoreThresholdControl/test/ConsistencyPlayerSimulation.js";
import type * as service_tournament_scoreThresholdControl_test_ConsistencySimulationDemo from "../service/tournament/scoreThresholdControl/test/ConsistencySimulationDemo.js";
import type * as service_tournament_scoreThresholdControl_test_DualSegmentSystemTest from "../service/tournament/scoreThresholdControl/test/DualSegmentSystemTest.js";
import type * as service_tournament_scoreThresholdControl_test_IntegralSegmentProbabilityTest from "../service/tournament/scoreThresholdControl/test/IntegralSegmentProbabilityTest.js";
import type * as service_tournament_scoreThresholdControl_test_RankingRecommendationTest from "../service/tournament/scoreThresholdControl/test/RankingRecommendationTest.js";
import type * as service_tournament_scoreThresholdControl_test_SegmentManagerIntegrationTest from "../service/tournament/scoreThresholdControl/test/SegmentManagerIntegrationTest.js";
import type * as service_tournament_scoreThresholdControl_test_SegmentProbabilityConfigTest from "../service/tournament/scoreThresholdControl/test/SegmentProbabilityConfigTest.js";
import type * as service_tournament_scoreThresholdControl_test_SegmentProbabilityConflictTest from "../service/tournament/scoreThresholdControl/test/SegmentProbabilityConflictTest.js";
import type * as service_tournament_scoreThresholdControl_test_SegmentRankingProbabilityTest from "../service/tournament/scoreThresholdControl/test/SegmentRankingProbabilityTest.js";
import type * as service_tournament_scoreThresholdControl_test_SinglePlayerSegmentProbabilityTest from "../service/tournament/scoreThresholdControl/test/SinglePlayerSegmentProbabilityTest.js";
import type * as service_tournament_scoreThresholdControl_test_TestRunner from "../service/tournament/scoreThresholdControl/test/TestRunner.js";
import type * as service_tournament_scoreThresholdControl_test_UnifiedSkillAssessmentTest from "../service/tournament/scoreThresholdControl/test/UnifiedSkillAssessmentTest.js";
import type * as service_tournament_scoreThresholdControl_test_tiedRankingTest from "../service/tournament/scoreThresholdControl/test/tiedRankingTest.js";
import type * as service_tournament_tests_General_Test from "../service/tournament/tests/General_Test.js";
import type * as service_tournament_tests_MultiPlayer_multiMatch_Test from "../service/tournament/tests/MultiPlayer_multiMatch_Test.js";
import type * as service_tournament_tests_MultiPlayer_singleMatch_Test from "../service/tournament/tests/MultiPlayer_singleMatch_Test.js";
import type * as service_tournament_tests_SinglePlayer_multiMatch_Test from "../service/tournament/tests/SinglePlayer_multiMatch_Test.js";
import type * as service_tournament_tests_SinglePlayer_singleMatch_Test from "../service/tournament/tests/SinglePlayer_singleMatch_Test.js";
import type * as service_tournament_tests_TimeZoneTest from "../service/tournament/tests/TimeZoneTest.js";
import type * as service_tournament_tournamentMatchingService from "../service/tournament/tournamentMatchingService.js";
import type * as service_tournament_tournamentScheduler from "../service/tournament/tournamentScheduler.js";
import type * as service_tournament_tournamentService from "../service/tournament/tournamentService.js";
import type * as service_updatePlayerProfile from "../service/updatePlayerProfile.js";
import type * as tasks from "../tasks.js";
import type * as util_TimeZoneOffsetDemo from "../util/TimeZoneOffsetDemo.js";
import type * as util_TimeZoneUtils from "../util/TimeZoneUtils.js";
import type * as util_TimeZoneUtilsExamples from "../util/TimeZoneUtilsExamples.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "custom/session": typeof custom_session;
  "dao/notificationDao": typeof dao_notificationDao;
  "dao/playerDao": typeof dao_playerDao;
  "dao/playerTaskDao": typeof dao_playerTaskDao;
  "dao/taskEventDao": typeof dao_taskEventDao;
  "dao/tournamentDao": typeof dao_tournamentDao;
  "data/taskTemplate": typeof data_taskTemplate;
  "data/tournamentConfigs": typeof data_tournamentConfigs;
  "data/tournamentConfigs_all": typeof data_tournamentConfigs_all;
  http: typeof http;
  "schemas/battlePassSchema": typeof schemas_battlePassSchema;
  "schemas/config": typeof schemas_config;
  "schemas/exampleNewModule": typeof schemas_exampleNewModule;
  "schemas/leaderboardSchema": typeof schemas_leaderboardSchema;
  "schemas/migrationHelper": typeof schemas_migrationHelper;
  "schemas/propSchema": typeof schemas_propSchema;
  "schemas/segmentSchema": typeof schemas_segmentSchema;
  "schemas/taskSchema": typeof schemas_taskSchema;
  "schemas/ticketSchema": typeof schemas_ticketSchema;
  "schemas/tournamentRulesSchema": typeof schemas_tournamentRulesSchema;
  "schemas/tournamentSchema": typeof schemas_tournamentSchema;
  "schemas/userSchema": typeof schemas_userSchema;
  "service/auth": typeof service_auth;
  "service/battlePass/battlePass": typeof service_battlePass_battlePass;
  "service/battlePass/battlePassSystem": typeof service_battlePass_battlePassSystem;
  "service/join": typeof service_join;
  "service/leaderboard/leaderboardSystem": typeof service_leaderboard_leaderboardSystem;
  "service/leaderboard/leaderboards": typeof service_leaderboard_leaderboards;
  "service/localization/errorCodes": typeof service_localization_errorCodes;
  "service/localization/errorHandler": typeof service_localization_errorHandler;
  "service/localization/index": typeof service_localization_index;
  "service/localization/localizationManager": typeof service_localization_localizationManager;
  "service/localization/messageCodes": typeof service_localization_messageCodes;
  "service/localization/messageHandler": typeof service_localization_messageHandler;
  "service/match": typeof service_match;
  "service/playerManager": typeof service_playerManager;
  "service/recordLogin": typeof service_recordLogin;
  "service/segment/SegmentManager": typeof service_segment_SegmentManager;
  "service/segment/config": typeof service_segment_config;
  "service/segment/dataAccess": typeof service_segment_dataAccess;
  "service/segment/index": typeof service_segment_index;
  "service/segment/segmentFunctions": typeof service_segment_segmentFunctions;
  "service/segment/segmentSystemTest": typeof service_segment_segmentSystemTest;
  "service/segment/tournamentIntegration": typeof service_segment_tournamentIntegration;
  "service/segment/tournamentIntegrationFunctions": typeof service_segment_tournamentIntegrationFunctions;
  "service/segment/types": typeof service_segment_types;
  "service/task/taskIntegration": typeof service_task_taskIntegration;
  "service/task/taskSystem": typeof service_task_taskSystem;
  "service/task/tests/ConditionalTest": typeof service_task_tests_ConditionalTest;
  "service/task/tests/LoginTest": typeof service_task_tests_LoginTest;
  "service/task/tests/MultiStageTest": typeof service_task_tests_MultiStageTest;
  "service/task/tests/TimeBasedTest": typeof service_task_tests_TimeBasedTest;
  "service/ticket/ticketSystem": typeof service_ticket_ticketSystem;
  "service/ticket/tickets": typeof service_ticket_tickets;
  "service/tournament/common": typeof service_tournament_common;
  "service/tournament/errorCodes": typeof service_tournament_errorCodes;
  "service/tournament/errorHandler": typeof service_tournament_errorHandler;
  "service/tournament/handler/base": typeof service_tournament_handler_base;
  "service/tournament/handler/index": typeof service_tournament_handler_index;
  "service/tournament/handler/singlePlayerIndependentTournamentHandler": typeof service_tournament_handler_singlePlayerIndependentTournamentHandler;
  "service/tournament/handler/validator": typeof service_tournament_handler_validator;
  "service/tournament/matchManager": typeof service_tournament_matchManager;
  "service/tournament/playerTournamentStatusManager": typeof service_tournament_playerTournamentStatusManager;
  "service/tournament/pointCalculationExample": typeof service_tournament_pointCalculationExample;
  "service/tournament/pointCalculationService": typeof service_tournament_pointCalculationService;
  "service/tournament/scoreThresholdControl/config/config": typeof service_tournament_scoreThresholdControl_config_config;
  "service/tournament/scoreThresholdControl/config/scoreThresholdSchema": typeof service_tournament_scoreThresholdControl_config_scoreThresholdSchema;
  "service/tournament/scoreThresholdControl/config/types": typeof service_tournament_scoreThresholdControl_config_types;
  "service/tournament/scoreThresholdControl/core/UnifiedSkillAssessment": typeof service_tournament_scoreThresholdControl_core_UnifiedSkillAssessment;
  "service/tournament/scoreThresholdControl/examples/RankingTestExamples": typeof service_tournament_scoreThresholdControl_examples_RankingTestExamples;
  "service/tournament/scoreThresholdControl/functions/consistencyOptimizationFunctions": typeof service_tournament_scoreThresholdControl_functions_consistencyOptimizationFunctions;
  "service/tournament/scoreThresholdControl/functions/consistencyPlayerSimulationFunctions": typeof service_tournament_scoreThresholdControl_functions_consistencyPlayerSimulationFunctions;
  "service/tournament/scoreThresholdControl/functions/consistencyTestFunctions": typeof service_tournament_scoreThresholdControl_functions_consistencyTestFunctions;
  "service/tournament/scoreThresholdControl/functions/integralSegmentProbabilityTestFunctions": typeof service_tournament_scoreThresholdControl_functions_integralSegmentProbabilityTestFunctions;
  "service/tournament/scoreThresholdControl/functions/segmentManagerIntegrationTestFunctions": typeof service_tournament_scoreThresholdControl_functions_segmentManagerIntegrationTestFunctions;
  "service/tournament/scoreThresholdControl/functions/segmentProbabilityConfigTestFunctions": typeof service_tournament_scoreThresholdControl_functions_segmentProbabilityConfigTestFunctions;
  "service/tournament/scoreThresholdControl/functions/segmentRankingProbabilityTestFunctions": typeof service_tournament_scoreThresholdControl_functions_segmentRankingProbabilityTestFunctions;
  "service/tournament/scoreThresholdControl/functions/singlePlayerSegmentProbabilityTestFunctions": typeof service_tournament_scoreThresholdControl_functions_singlePlayerSegmentProbabilityTestFunctions;
  "service/tournament/scoreThresholdControl/functions/testRankingRecommendation": typeof service_tournament_scoreThresholdControl_functions_testRankingRecommendation;
  "service/tournament/scoreThresholdControl/functions/tiedRankingTestFunctions": typeof service_tournament_scoreThresholdControl_functions_tiedRankingTestFunctions;
  "service/tournament/scoreThresholdControl/functions/unifiedSkillAssessmentFunctions": typeof service_tournament_scoreThresholdControl_functions_unifiedSkillAssessmentFunctions;
  "service/tournament/scoreThresholdControl/index": typeof service_tournament_scoreThresholdControl_index;
  "service/tournament/scoreThresholdControl/managers/MultiPlayerRankingExample": typeof service_tournament_scoreThresholdControl_managers_MultiPlayerRankingExample;
  "service/tournament/scoreThresholdControl/managers/PlayerHistoricalDataManager": typeof service_tournament_scoreThresholdControl_managers_PlayerHistoricalDataManager;
  "service/tournament/scoreThresholdControl/managers/RankingRecommendationManager": typeof service_tournament_scoreThresholdControl_managers_RankingRecommendationManager;
  "service/tournament/scoreThresholdControl/managers/SeedRecommendationManager": typeof service_tournament_scoreThresholdControl_managers_SeedRecommendationManager;
  "service/tournament/scoreThresholdControl/test/ConsistencyCalculationTest": typeof service_tournament_scoreThresholdControl_test_ConsistencyCalculationTest;
  "service/tournament/scoreThresholdControl/test/ConsistencyOptimizationExample": typeof service_tournament_scoreThresholdControl_test_ConsistencyOptimizationExample;
  "service/tournament/scoreThresholdControl/test/ConsistencyPlayerSimulation": typeof service_tournament_scoreThresholdControl_test_ConsistencyPlayerSimulation;
  "service/tournament/scoreThresholdControl/test/ConsistencySimulationDemo": typeof service_tournament_scoreThresholdControl_test_ConsistencySimulationDemo;
  "service/tournament/scoreThresholdControl/test/DualSegmentSystemTest": typeof service_tournament_scoreThresholdControl_test_DualSegmentSystemTest;
  "service/tournament/scoreThresholdControl/test/IntegralSegmentProbabilityTest": typeof service_tournament_scoreThresholdControl_test_IntegralSegmentProbabilityTest;
  "service/tournament/scoreThresholdControl/test/RankingRecommendationTest": typeof service_tournament_scoreThresholdControl_test_RankingRecommendationTest;
  "service/tournament/scoreThresholdControl/test/SegmentManagerIntegrationTest": typeof service_tournament_scoreThresholdControl_test_SegmentManagerIntegrationTest;
  "service/tournament/scoreThresholdControl/test/SegmentProbabilityConfigTest": typeof service_tournament_scoreThresholdControl_test_SegmentProbabilityConfigTest;
  "service/tournament/scoreThresholdControl/test/SegmentProbabilityConflictTest": typeof service_tournament_scoreThresholdControl_test_SegmentProbabilityConflictTest;
  "service/tournament/scoreThresholdControl/test/SegmentRankingProbabilityTest": typeof service_tournament_scoreThresholdControl_test_SegmentRankingProbabilityTest;
  "service/tournament/scoreThresholdControl/test/SinglePlayerSegmentProbabilityTest": typeof service_tournament_scoreThresholdControl_test_SinglePlayerSegmentProbabilityTest;
  "service/tournament/scoreThresholdControl/test/TestRunner": typeof service_tournament_scoreThresholdControl_test_TestRunner;
  "service/tournament/scoreThresholdControl/test/UnifiedSkillAssessmentTest": typeof service_tournament_scoreThresholdControl_test_UnifiedSkillAssessmentTest;
  "service/tournament/scoreThresholdControl/test/tiedRankingTest": typeof service_tournament_scoreThresholdControl_test_tiedRankingTest;
  "service/tournament/tests/General_Test": typeof service_tournament_tests_General_Test;
  "service/tournament/tests/MultiPlayer_multiMatch_Test": typeof service_tournament_tests_MultiPlayer_multiMatch_Test;
  "service/tournament/tests/MultiPlayer_singleMatch_Test": typeof service_tournament_tests_MultiPlayer_singleMatch_Test;
  "service/tournament/tests/SinglePlayer_multiMatch_Test": typeof service_tournament_tests_SinglePlayer_multiMatch_Test;
  "service/tournament/tests/SinglePlayer_singleMatch_Test": typeof service_tournament_tests_SinglePlayer_singleMatch_Test;
  "service/tournament/tests/TimeZoneTest": typeof service_tournament_tests_TimeZoneTest;
  "service/tournament/tournamentMatchingService": typeof service_tournament_tournamentMatchingService;
  "service/tournament/tournamentScheduler": typeof service_tournament_tournamentScheduler;
  "service/tournament/tournamentService": typeof service_tournament_tournamentService;
  "service/updatePlayerProfile": typeof service_updatePlayerProfile;
  tasks: typeof tasks;
  "util/TimeZoneOffsetDemo": typeof util_TimeZoneOffsetDemo;
  "util/TimeZoneUtils": typeof util_TimeZoneUtils;
  "util/TimeZoneUtilsExamples": typeof util_TimeZoneUtilsExamples;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
