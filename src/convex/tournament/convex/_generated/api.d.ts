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
import type * as api_propAPI from "../api/propAPI.js";
import type * as custom_session from "../custom/session.js";
import type * as dao_notificationDao from "../dao/notificationDao.js";
import type * as dao_playerDao from "../dao/playerDao.js";
import type * as dao_playerTaskDao from "../dao/playerTaskDao.js";
import type * as dao_taskEventDao from "../dao/taskEventDao.js";
import type * as dao_tournamentDao from "../dao/tournamentDao.js";
import type * as data_tournamentConfigs from "../data/tournamentConfigs.js";
import type * as data_tournamentConfigs_all from "../data/tournamentConfigs_all.js";
import type * as http from "../http.js";
import type * as schemas_config from "../schemas/config.js";
import type * as schemas_exampleNewModule from "../schemas/exampleNewModule.js";
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
import type * as service_playerManager from "../service/playerManager.js";
import type * as service_props_propEffectSystem from "../service/props/propEffectSystem.js";
import type * as service_props_propShop from "../service/props/propShop.js";
import type * as service_props_propSystem from "../service/props/propSystem.js";
import type * as service_recordLogin from "../service/recordLogin.js";
import type * as service_simpleTimezoneUtils from "../service/simpleTimezoneUtils.js";
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
import type * as service_tournament_common from "../service/tournament/common.js";
import type * as service_tournament_errorCodes from "../service/tournament/errorCodes.js";
import type * as service_tournament_errorHandler from "../service/tournament/errorHandler.js";
import type * as service_tournament_errorMigrationExample from "../service/tournament/errorMigrationExample.js";
import type * as service_tournament_errorUsageExample from "../service/tournament/errorUsageExample.js";
import type * as service_tournament_handler_base from "../service/tournament/handler/base.js";
import type * as service_tournament_handler_index from "../service/tournament/handler/index.js";
import type * as service_tournament_handler_multiPlayerHandler from "../service/tournament/handler/multiPlayerHandler.js";
import type * as service_tournament_handler_multiPlayerIndependentMatchHandler from "../service/tournament/handler/multiPlayerIndependentMatchHandler.js";
import type * as service_tournament_handler_multiPlayerSharedMatchHandler from "../service/tournament/handler/multiPlayerSharedMatchHandler.js";
import type * as service_tournament_handler_singlePlayerIndependentTournamentHandler from "../service/tournament/handler/singlePlayerIndependentTournamentHandler.js";
import type * as service_tournament_matchManager from "../service/tournament/matchManager.js";
import type * as service_tournament_playerTournamentStatusManager from "../service/tournament/playerTournamentStatusManager.js";
import type * as service_tournament_pointCalculator from "../service/tournament/pointCalculator.js";
import type * as service_tournament_ruleEngine from "../service/tournament/ruleEngine.js";
import type * as service_tournament_tests_tournamentTest from "../service/tournament/tests/tournamentTest.js";
import type * as service_tournament_tournamentMatchingService from "../service/tournament/tournamentMatchingService.js";
import type * as service_tournament_tournamentScheduler from "../service/tournament/tournamentScheduler.js";
import type * as service_tournament_tournamentService from "../service/tournament/tournamentService.js";
import type * as service_tournament_utils_tournamentTypeUtils from "../service/tournament/utils/tournamentTypeUtils.js";
import type * as service_updatePlayerProfile from "../service/updatePlayerProfile.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "api/propAPI": typeof api_propAPI;
  "custom/session": typeof custom_session;
  "dao/notificationDao": typeof dao_notificationDao;
  "dao/playerDao": typeof dao_playerDao;
  "dao/playerTaskDao": typeof dao_playerTaskDao;
  "dao/taskEventDao": typeof dao_taskEventDao;
  "dao/tournamentDao": typeof dao_tournamentDao;
  "data/tournamentConfigs": typeof data_tournamentConfigs;
  "data/tournamentConfigs_all": typeof data_tournamentConfigs_all;
  http: typeof http;
  "schemas/config": typeof schemas_config;
  "schemas/exampleNewModule": typeof schemas_exampleNewModule;
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
  "service/playerManager": typeof service_playerManager;
  "service/props/propEffectSystem": typeof service_props_propEffectSystem;
  "service/props/propShop": typeof service_props_propShop;
  "service/props/propSystem": typeof service_props_propSystem;
  "service/recordLogin": typeof service_recordLogin;
  "service/simpleTimezoneUtils": typeof service_simpleTimezoneUtils;
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
  "service/tournament/common": typeof service_tournament_common;
  "service/tournament/errorCodes": typeof service_tournament_errorCodes;
  "service/tournament/errorHandler": typeof service_tournament_errorHandler;
  "service/tournament/errorMigrationExample": typeof service_tournament_errorMigrationExample;
  "service/tournament/errorUsageExample": typeof service_tournament_errorUsageExample;
  "service/tournament/handler/base": typeof service_tournament_handler_base;
  "service/tournament/handler/index": typeof service_tournament_handler_index;
  "service/tournament/handler/multiPlayerHandler": typeof service_tournament_handler_multiPlayerHandler;
  "service/tournament/handler/multiPlayerIndependentMatchHandler": typeof service_tournament_handler_multiPlayerIndependentMatchHandler;
  "service/tournament/handler/multiPlayerSharedMatchHandler": typeof service_tournament_handler_multiPlayerSharedMatchHandler;
  "service/tournament/handler/singlePlayerIndependentTournamentHandler": typeof service_tournament_handler_singlePlayerIndependentTournamentHandler;
  "service/tournament/matchManager": typeof service_tournament_matchManager;
  "service/tournament/playerTournamentStatusManager": typeof service_tournament_playerTournamentStatusManager;
  "service/tournament/pointCalculator": typeof service_tournament_pointCalculator;
  "service/tournament/ruleEngine": typeof service_tournament_ruleEngine;
  "service/tournament/tests/tournamentTest": typeof service_tournament_tests_tournamentTest;
  "service/tournament/tournamentMatchingService": typeof service_tournament_tournamentMatchingService;
  "service/tournament/tournamentScheduler": typeof service_tournament_tournamentScheduler;
  "service/tournament/tournamentService": typeof service_tournament_tournamentService;
  "service/tournament/utils/tournamentTypeUtils": typeof service_tournament_utils_tournamentTypeUtils;
  "service/updatePlayerProfile": typeof service_updatePlayerProfile;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
