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
import type * as init_initTicketSystem from "../init/initTicketSystem.js";
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
import type * as service_props_propEffectSystem from "../service/props/propEffectSystem.js";
import type * as service_props_propShop from "../service/props/propShop.js";
import type * as service_props_propSystem from "../service/props/propSystem.js";
import type * as service_recordLogin from "../service/recordLogin.js";
import type * as service_segment_SegmentManager from "../service/segment/SegmentManager.js";
import type * as service_segment_config from "../service/segment/config.js";
import type * as service_segment_dataAccess from "../service/segment/dataAccess.js";
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
import type * as service_tournament_scoreThresholdControl_examples_RankingTestExamples from "../service/tournament/scoreThresholdControl/examples/RankingTestExamples.js";
import type * as service_tournament_scoreThresholdControl_functions_testRankingRecommendation from "../service/tournament/scoreThresholdControl/functions/testRankingRecommendation.js";
import type * as service_tournament_scoreThresholdControl_index from "../service/tournament/scoreThresholdControl/index.js";
import type * as service_tournament_scoreThresholdControl_managers_MultiPlayerRankingExample from "../service/tournament/scoreThresholdControl/managers/MultiPlayerRankingExample.js";
import type * as service_tournament_scoreThresholdControl_managers_PlayerHistoricalDataManager from "../service/tournament/scoreThresholdControl/managers/PlayerHistoricalDataManager.js";
import type * as service_tournament_scoreThresholdControl_managers_RankingRecommendationManager from "../service/tournament/scoreThresholdControl/managers/RankingRecommendationManager.js";
import type * as service_tournament_scoreThresholdControl_managers_SeedRecommendationManager from "../service/tournament/scoreThresholdControl/managers/SeedRecommendationManager.js";
import type * as service_tournament_scoreThresholdControl_test_RankingRecommendationTest from "../service/tournament/scoreThresholdControl/test/RankingRecommendationTest.js";
import type * as service_tournament_scoreThresholdControl_test_TestRunner from "../service/tournament/scoreThresholdControl/test/TestRunner.js";
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
  "init/initTicketSystem": typeof init_initTicketSystem;
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
  "service/props/propEffectSystem": typeof service_props_propEffectSystem;
  "service/props/propShop": typeof service_props_propShop;
  "service/props/propSystem": typeof service_props_propSystem;
  "service/recordLogin": typeof service_recordLogin;
  "service/segment/SegmentManager": typeof service_segment_SegmentManager;
  "service/segment/config": typeof service_segment_config;
  "service/segment/dataAccess": typeof service_segment_dataAccess;
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
  "service/tournament/scoreThresholdControl/examples/RankingTestExamples": typeof service_tournament_scoreThresholdControl_examples_RankingTestExamples;
  "service/tournament/scoreThresholdControl/functions/testRankingRecommendation": typeof service_tournament_scoreThresholdControl_functions_testRankingRecommendation;
  "service/tournament/scoreThresholdControl/index": typeof service_tournament_scoreThresholdControl_index;
  "service/tournament/scoreThresholdControl/managers/MultiPlayerRankingExample": typeof service_tournament_scoreThresholdControl_managers_MultiPlayerRankingExample;
  "service/tournament/scoreThresholdControl/managers/PlayerHistoricalDataManager": typeof service_tournament_scoreThresholdControl_managers_PlayerHistoricalDataManager;
  "service/tournament/scoreThresholdControl/managers/RankingRecommendationManager": typeof service_tournament_scoreThresholdControl_managers_RankingRecommendationManager;
  "service/tournament/scoreThresholdControl/managers/SeedRecommendationManager": typeof service_tournament_scoreThresholdControl_managers_SeedRecommendationManager;
  "service/tournament/scoreThresholdControl/test/RankingRecommendationTest": typeof service_tournament_scoreThresholdControl_test_RankingRecommendationTest;
  "service/tournament/scoreThresholdControl/test/TestRunner": typeof service_tournament_scoreThresholdControl_test_TestRunner;
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
