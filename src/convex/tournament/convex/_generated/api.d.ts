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
import type * as crons from "../crons.js";
import type * as custom_session from "../custom/session.js";
import type * as dao_matchDao from "../dao/matchDao.js";
import type * as dao_matchQueueDao from "../dao/matchQueueDao.js";
import type * as dao_playerDao from "../dao/playerDao.js";
import type * as dao_rewardDao from "../dao/rewardDao.js";
import type * as http from "../http.js";
import type * as init_initPlayers from "../init/initPlayers.js";
import type * as init_initTournamentTypes from "../init/initTournamentTypes.js";
import type * as service_auth from "../service/auth.js";
import type * as service_handler_base from "../service/handler/base.js";
import type * as service_handler_dailySpecial from "../service/handler/dailySpecial.js";
import type * as service_handler_index from "../service/handler/index.js";
import type * as service_handler_multiAttemptRanked from "../service/handler/multiAttemptRanked.js";
import type * as service_join from "../service/join.js";
import type * as service_match from "../service/match.js";
import type * as service_ruleEngine from "../service/ruleEngine.js";
import type * as service_seasons from "../service/seasons.js";
import type * as service_task_processTaskEvents from "../service/task/processTaskEvents.js";
import type * as service_task_recordShare from "../service/task/recordShare.js";
import type * as service_task_scheduledTaskProcessor from "../service/task/scheduledTaskProcessor.js";
import type * as service_task_submitMatchResult from "../service/task/submitMatchResult.js";
import type * as service_task_tasks from "../service/task/tasks.js";
import type * as service_tournaments from "../service/tournaments.js";
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
  crons: typeof crons;
  "custom/session": typeof custom_session;
  "dao/matchDao": typeof dao_matchDao;
  "dao/matchQueueDao": typeof dao_matchQueueDao;
  "dao/playerDao": typeof dao_playerDao;
  "dao/rewardDao": typeof dao_rewardDao;
  http: typeof http;
  "init/initPlayers": typeof init_initPlayers;
  "init/initTournamentTypes": typeof init_initTournamentTypes;
  "service/auth": typeof service_auth;
  "service/handler/base": typeof service_handler_base;
  "service/handler/dailySpecial": typeof service_handler_dailySpecial;
  "service/handler/index": typeof service_handler_index;
  "service/handler/multiAttemptRanked": typeof service_handler_multiAttemptRanked;
  "service/join": typeof service_join;
  "service/match": typeof service_match;
  "service/ruleEngine": typeof service_ruleEngine;
  "service/seasons": typeof service_seasons;
  "service/task/processTaskEvents": typeof service_task_processTaskEvents;
  "service/task/recordShare": typeof service_task_recordShare;
  "service/task/scheduledTaskProcessor": typeof service_task_scheduledTaskProcessor;
  "service/task/submitMatchResult": typeof service_task_submitMatchResult;
  "service/task/tasks": typeof service_task_tasks;
  "service/tournaments": typeof service_tournaments;
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
