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
import type * as data_tournamentConfigUsage from "../data/tournamentConfigUsage.js";
import type * as data_tournamentConfigs from "../data/tournamentConfigs.js";
import type * as http from "../http.js";
import type * as init_initPlayers from "../init/initPlayers.js";
import type * as init_initTournamentTypes from "../init/initTournamentTypes.js";
import type * as init_loadTaskTemplatesFromJson from "../init/loadTaskTemplatesFromJson.js";
import type * as schemas_config from "../schemas/config.js";
import type * as schemas_exampleNewModule from "../schemas/exampleNewModule.js";
import type * as schemas_index from "../schemas/index.js";
import type * as schemas_migrationHelper from "../schemas/migrationHelper.js";
import type * as schemas_propSchema from "../schemas/propSchema.js";
import type * as schemas_segmentSchema from "../schemas/segmentSchema.js";
import type * as schemas_taskSchema from "../schemas/taskSchema.js";
import type * as schemas_ticketSchema from "../schemas/ticketSchema.js";
import type * as schemas_tournamentSchema from "../schemas/tournamentSchema.js";
import type * as schemas_userSchema from "../schemas/userSchema.js";
import type * as service_auth from "../service/auth.js";
import type * as service_join from "../service/join.js";
import type * as service_leaderboard from "../service/leaderboard.js";
import type * as service_localization_errorCodes from "../service/localization/errorCodes.js";
import type * as service_localization_errorHandler from "../service/localization/errorHandler.js";
import type * as service_localization_index from "../service/localization/index.js";
import type * as service_localization_localizationManager from "../service/localization/localizationManager.js";
import type * as service_localization_messageCodes from "../service/localization/messageCodes.js";
import type * as service_localization_messageHandler from "../service/localization/messageHandler.js";
import type * as service_match from "../service/match.js";
import type * as service_migration_migrateMatchesToPlayerMatches from "../service/migration/migrateMatchesToPlayerMatches.js";
import type * as service_playerManager from "../service/playerManager.js";
import type * as service_prop_gameIntegrationExample from "../service/prop/gameIntegrationExample.js";
import type * as service_prop_gameIntegrationExamples from "../service/prop/gameIntegrationExamples.js";
import type * as service_prop_gameModeAdapter from "../service/prop/gameModeAdapter.js";
import type * as service_prop_inventoryManager from "../service/prop/inventoryManager.js";
import type * as service_prop_propManager from "../service/prop/propManager.js";
import type * as service_prop_propUsageExample from "../service/prop/propUsageExample.js";
import type * as service_prop_smartPropUsage from "../service/prop/smartPropUsage.js";
import type * as service_prop_testDeductionIdFix from "../service/prop/testDeductionIdFix.js";
import type * as service_prop_testUnifiedPropManager from "../service/prop/testUnifiedPropManager.js";
import type * as service_prop_unifiedPropManager from "../service/prop/unifiedPropManager.js";
import type * as service_recordLogin from "../service/recordLogin.js";
import type * as service_seasons from "../service/seasons.js";
import type * as service_segment_leaderboardManager from "../service/segment/leaderboardManager.js";
import type * as service_segment_rewardManager from "../service/segment/rewardManager.js";
import type * as service_segment_segmentDataLoader from "../service/segment/segmentDataLoader.js";
import type * as service_segment_segmentManager from "../service/segment/segmentManager.js";
import type * as service_segment_segmentScoringSystem from "../service/segment/segmentScoringSystem.js";
import type * as service_segment_softSegmentSystem from "../service/segment/softSegmentSystem.js";
import type * as service_segment_testScoringSystem from "../service/segment/testScoringSystem.js";
import type * as service_segment_testSoftSegmentSystem from "../service/segment/testSoftSegmentSystem.js";
import type * as service_task_assignTasks from "../service/task/assignTasks.js";
import type * as service_task_processTaskEvents from "../service/task/processTaskEvents.js";
import type * as service_task_recordShare from "../service/task/recordShare.js";
import type * as service_task_resetTasks from "../service/task/resetTasks.js";
import type * as service_task_scheduleTaskAssignment from "../service/task/scheduleTaskAssignment.js";
import type * as service_task_submitMatchResult from "../service/task/submitMatchResult.js";
import type * as service_task_test_testComplexTasks from "../service/task/test/testComplexTasks.js";
import type * as service_task_test_testSeasonTasks from "../service/task/test/testSeasonTasks.js";
import type * as service_task_test_testTaskHandlers from "../service/task/test/testTaskHandlers.js";
import type * as service_task_test_testTaskSystem from "../service/task/test/testTaskSystem.js";
import type * as service_task_testTaskTemplates from "../service/task/testTaskTemplates.js";
import type * as service_ticket_taskIntegration from "../service/ticket/taskIntegration.js";
import type * as service_ticket_testTaskIntegration from "../service/ticket/testTaskIntegration.js";
import type * as service_ticket_testTicketSystem from "../service/ticket/testTicketSystem.js";
import type * as service_ticket_testTournamentIntegration from "../service/ticket/testTournamentIntegration.js";
import type * as service_ticket_ticketSchema from "../service/ticket/ticketSchema.js";
import type * as service_ticket_ticketSystem from "../service/ticket/ticketSystem.js";
import type * as service_ticket_tournamentIntegration from "../service/ticket/tournamentIntegration.js";
import type * as service_tournament_errorCodes from "../service/tournament/errorCodes.js";
import type * as service_tournament_errorHandler from "../service/tournament/errorHandler.js";
import type * as service_tournament_errorMigrationExample from "../service/tournament/errorMigrationExample.js";
import type * as service_tournament_errorUsageExample from "../service/tournament/errorUsageExample.js";
import type * as service_tournament_examples_tournamentTypeExamples from "../service/tournament/examples/tournamentTypeExamples.js";
import type * as service_tournament_handler_base from "../service/tournament/handler/base.js";
import type * as service_tournament_handler_casualHandler from "../service/tournament/handler/casualHandler.js";
import type * as service_tournament_handler_championshipHandler from "../service/tournament/handler/championshipHandler.js";
import type * as service_tournament_handler_dailyHandler from "../service/tournament/handler/dailyHandler.js";
import type * as service_tournament_handler_exampleHandler from "../service/tournament/handler/exampleHandler.js";
import type * as service_tournament_handler_index from "../service/tournament/handler/index.js";
import type * as service_tournament_handler_multiPlayerTournament from "../service/tournament/handler/multiPlayerTournament.js";
import type * as service_tournament_handler_rankedHandler from "../service/tournament/handler/rankedHandler.js";
import type * as service_tournament_handler_seasonalHandler from "../service/tournament/handler/seasonalHandler.js";
import type * as service_tournament_handler_specialHandler from "../service/tournament/handler/specialHandler.js";
import type * as service_tournament_handler_tournamentHandler from "../service/tournament/handler/tournamentHandler.js";
import type * as service_tournament_handler_usageExamples from "../service/tournament/handler/usageExamples.js";
import type * as service_tournament_handler_weeklyHandler from "../service/tournament/handler/weeklyHandler.js";
import type * as service_tournament_matchManager from "../service/tournament/matchManager.js";
import type * as service_tournament_ruleEngine from "../service/tournament/ruleEngine.js";
import type * as service_tournament_tests_index from "../service/tournament/tests/index.js";
import type * as service_tournament_tests_runAutoCreateTests from "../service/tournament/tests/runAutoCreateTests.js";
import type * as service_tournament_tests_runBaseHandlerIntegrationTests from "../service/tournament/tests/runBaseHandlerIntegrationTests.js";
import type * as service_tournament_tests_runGetAvailableTournamentsTests from "../service/tournament/tests/runGetAvailableTournamentsTests.js";
import type * as service_tournament_tests_runRealtimeUpdateTests from "../service/tournament/tests/runRealtimeUpdateTests.js";
import type * as service_tournament_tests_runThresholdTests from "../service/tournament/tests/runThresholdTests.js";
import type * as service_tournament_tests_testAutoCreateTournaments from "../service/tournament/tests/testAutoCreateTournaments.js";
import type * as service_tournament_tests_testBaseHandlerIntegration from "../service/tournament/tests/testBaseHandlerIntegration.js";
import type * as service_tournament_tests_testGetAvailableTournaments from "../service/tournament/tests/testGetAvailableTournaments.js";
import type * as service_tournament_tests_testJoinTournament from "../service/tournament/tests/testJoinTournament.js";
import type * as service_tournament_tests_testLimits from "../service/tournament/tests/testLimits.js";
import type * as service_tournament_tests_testRealtimeUpdates from "../service/tournament/tests/testRealtimeUpdates.js";
import type * as service_tournament_tests_testSettleTournament from "../service/tournament/tests/testSettleTournament.js";
import type * as service_tournament_tests_testSubmitScore from "../service/tournament/tests/testSubmitScore.js";
import type * as service_tournament_tests_testThresholdTournament from "../service/tournament/tests/testThresholdTournament.js";
import type * as service_tournament_tests_testThresholdTournamentIntegration from "../service/tournament/tests/testThresholdTournamentIntegration.js";
import type * as service_tournament_tests_testUtils from "../service/tournament/tests/testUtils.js";
import type * as service_tournament_tournamentMatchingService from "../service/tournament/tournamentMatchingService.js";
import type * as service_tournament_tournamentScheduler from "../service/tournament/tournamentScheduler.js";
import type * as service_tournament_tournamentService from "../service/tournament/tournamentService.js";
import type * as service_updateActivity from "../service/updateActivity.js";
import type * as service_updatePlayerProfile from "../service/updatePlayerProfile.js";
import type * as service_utils from "../service/utils.js";

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
  "data/tournamentConfigUsage": typeof data_tournamentConfigUsage;
  "data/tournamentConfigs": typeof data_tournamentConfigs;
  http: typeof http;
  "init/initPlayers": typeof init_initPlayers;
  "init/initTournamentTypes": typeof init_initTournamentTypes;
  "init/loadTaskTemplatesFromJson": typeof init_loadTaskTemplatesFromJson;
  "schemas/config": typeof schemas_config;
  "schemas/exampleNewModule": typeof schemas_exampleNewModule;
  "schemas/index": typeof schemas_index;
  "schemas/migrationHelper": typeof schemas_migrationHelper;
  "schemas/propSchema": typeof schemas_propSchema;
  "schemas/segmentSchema": typeof schemas_segmentSchema;
  "schemas/taskSchema": typeof schemas_taskSchema;
  "schemas/ticketSchema": typeof schemas_ticketSchema;
  "schemas/tournamentSchema": typeof schemas_tournamentSchema;
  "schemas/userSchema": typeof schemas_userSchema;
  "service/auth": typeof service_auth;
  "service/join": typeof service_join;
  "service/leaderboard": typeof service_leaderboard;
  "service/localization/errorCodes": typeof service_localization_errorCodes;
  "service/localization/errorHandler": typeof service_localization_errorHandler;
  "service/localization/index": typeof service_localization_index;
  "service/localization/localizationManager": typeof service_localization_localizationManager;
  "service/localization/messageCodes": typeof service_localization_messageCodes;
  "service/localization/messageHandler": typeof service_localization_messageHandler;
  "service/match": typeof service_match;
  "service/migration/migrateMatchesToPlayerMatches": typeof service_migration_migrateMatchesToPlayerMatches;
  "service/playerManager": typeof service_playerManager;
  "service/prop/gameIntegrationExample": typeof service_prop_gameIntegrationExample;
  "service/prop/gameIntegrationExamples": typeof service_prop_gameIntegrationExamples;
  "service/prop/gameModeAdapter": typeof service_prop_gameModeAdapter;
  "service/prop/inventoryManager": typeof service_prop_inventoryManager;
  "service/prop/propManager": typeof service_prop_propManager;
  "service/prop/propUsageExample": typeof service_prop_propUsageExample;
  "service/prop/smartPropUsage": typeof service_prop_smartPropUsage;
  "service/prop/testDeductionIdFix": typeof service_prop_testDeductionIdFix;
  "service/prop/testUnifiedPropManager": typeof service_prop_testUnifiedPropManager;
  "service/prop/unifiedPropManager": typeof service_prop_unifiedPropManager;
  "service/recordLogin": typeof service_recordLogin;
  "service/seasons": typeof service_seasons;
  "service/segment/leaderboardManager": typeof service_segment_leaderboardManager;
  "service/segment/rewardManager": typeof service_segment_rewardManager;
  "service/segment/segmentDataLoader": typeof service_segment_segmentDataLoader;
  "service/segment/segmentManager": typeof service_segment_segmentManager;
  "service/segment/segmentScoringSystem": typeof service_segment_segmentScoringSystem;
  "service/segment/softSegmentSystem": typeof service_segment_softSegmentSystem;
  "service/segment/testScoringSystem": typeof service_segment_testScoringSystem;
  "service/segment/testSoftSegmentSystem": typeof service_segment_testSoftSegmentSystem;
  "service/task/assignTasks": typeof service_task_assignTasks;
  "service/task/processTaskEvents": typeof service_task_processTaskEvents;
  "service/task/recordShare": typeof service_task_recordShare;
  "service/task/resetTasks": typeof service_task_resetTasks;
  "service/task/scheduleTaskAssignment": typeof service_task_scheduleTaskAssignment;
  "service/task/submitMatchResult": typeof service_task_submitMatchResult;
  "service/task/test/testComplexTasks": typeof service_task_test_testComplexTasks;
  "service/task/test/testSeasonTasks": typeof service_task_test_testSeasonTasks;
  "service/task/test/testTaskHandlers": typeof service_task_test_testTaskHandlers;
  "service/task/test/testTaskSystem": typeof service_task_test_testTaskSystem;
  "service/task/testTaskTemplates": typeof service_task_testTaskTemplates;
  "service/ticket/taskIntegration": typeof service_ticket_taskIntegration;
  "service/ticket/testTaskIntegration": typeof service_ticket_testTaskIntegration;
  "service/ticket/testTicketSystem": typeof service_ticket_testTicketSystem;
  "service/ticket/testTournamentIntegration": typeof service_ticket_testTournamentIntegration;
  "service/ticket/ticketSchema": typeof service_ticket_ticketSchema;
  "service/ticket/ticketSystem": typeof service_ticket_ticketSystem;
  "service/ticket/tournamentIntegration": typeof service_ticket_tournamentIntegration;
  "service/tournament/errorCodes": typeof service_tournament_errorCodes;
  "service/tournament/errorHandler": typeof service_tournament_errorHandler;
  "service/tournament/errorMigrationExample": typeof service_tournament_errorMigrationExample;
  "service/tournament/errorUsageExample": typeof service_tournament_errorUsageExample;
  "service/tournament/examples/tournamentTypeExamples": typeof service_tournament_examples_tournamentTypeExamples;
  "service/tournament/handler/base": typeof service_tournament_handler_base;
  "service/tournament/handler/casualHandler": typeof service_tournament_handler_casualHandler;
  "service/tournament/handler/championshipHandler": typeof service_tournament_handler_championshipHandler;
  "service/tournament/handler/dailyHandler": typeof service_tournament_handler_dailyHandler;
  "service/tournament/handler/exampleHandler": typeof service_tournament_handler_exampleHandler;
  "service/tournament/handler/index": typeof service_tournament_handler_index;
  "service/tournament/handler/multiPlayerTournament": typeof service_tournament_handler_multiPlayerTournament;
  "service/tournament/handler/rankedHandler": typeof service_tournament_handler_rankedHandler;
  "service/tournament/handler/seasonalHandler": typeof service_tournament_handler_seasonalHandler;
  "service/tournament/handler/specialHandler": typeof service_tournament_handler_specialHandler;
  "service/tournament/handler/tournamentHandler": typeof service_tournament_handler_tournamentHandler;
  "service/tournament/handler/usageExamples": typeof service_tournament_handler_usageExamples;
  "service/tournament/handler/weeklyHandler": typeof service_tournament_handler_weeklyHandler;
  "service/tournament/matchManager": typeof service_tournament_matchManager;
  "service/tournament/ruleEngine": typeof service_tournament_ruleEngine;
  "service/tournament/tests/index": typeof service_tournament_tests_index;
  "service/tournament/tests/runAutoCreateTests": typeof service_tournament_tests_runAutoCreateTests;
  "service/tournament/tests/runBaseHandlerIntegrationTests": typeof service_tournament_tests_runBaseHandlerIntegrationTests;
  "service/tournament/tests/runGetAvailableTournamentsTests": typeof service_tournament_tests_runGetAvailableTournamentsTests;
  "service/tournament/tests/runRealtimeUpdateTests": typeof service_tournament_tests_runRealtimeUpdateTests;
  "service/tournament/tests/runThresholdTests": typeof service_tournament_tests_runThresholdTests;
  "service/tournament/tests/testAutoCreateTournaments": typeof service_tournament_tests_testAutoCreateTournaments;
  "service/tournament/tests/testBaseHandlerIntegration": typeof service_tournament_tests_testBaseHandlerIntegration;
  "service/tournament/tests/testGetAvailableTournaments": typeof service_tournament_tests_testGetAvailableTournaments;
  "service/tournament/tests/testJoinTournament": typeof service_tournament_tests_testJoinTournament;
  "service/tournament/tests/testLimits": typeof service_tournament_tests_testLimits;
  "service/tournament/tests/testRealtimeUpdates": typeof service_tournament_tests_testRealtimeUpdates;
  "service/tournament/tests/testSettleTournament": typeof service_tournament_tests_testSettleTournament;
  "service/tournament/tests/testSubmitScore": typeof service_tournament_tests_testSubmitScore;
  "service/tournament/tests/testThresholdTournament": typeof service_tournament_tests_testThresholdTournament;
  "service/tournament/tests/testThresholdTournamentIntegration": typeof service_tournament_tests_testThresholdTournamentIntegration;
  "service/tournament/tests/testUtils": typeof service_tournament_tests_testUtils;
  "service/tournament/tournamentMatchingService": typeof service_tournament_tournamentMatchingService;
  "service/tournament/tournamentScheduler": typeof service_tournament_tournamentScheduler;
  "service/tournament/tournamentService": typeof service_tournament_tournamentService;
  "service/updateActivity": typeof service_updateActivity;
  "service/updatePlayerProfile": typeof service_updatePlayerProfile;
  "service/utils": typeof service_utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
