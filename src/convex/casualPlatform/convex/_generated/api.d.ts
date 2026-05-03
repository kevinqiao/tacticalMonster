/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as dao_casualPlayerDao from "../dao/casualPlayerDao.js";
import type * as data_casualMissionTemplates from "../data/casualMissionTemplates.js";
import type * as data_casualTournamentConfigs from "../data/casualTournamentConfigs.js";
import type * as http from "../http.js";
import type * as service_auth from "../service/auth.js";
import type * as service_casualRewardRegistry from "../service/casualRewardRegistry.js";
import type * as service_casualSeasonService from "../service/casualSeasonService.js";
import type * as service_casualTaskService from "../service/casualTaskService.js";
import type * as service_casualTournamentActions from "../service/casualTournamentActions.js";
import type * as service_casualTournamentService from "../service/casualTournamentService.js";
import type * as service_playerManager from "../service/playerManager.js";
import type * as service_reward_casualRewardTypes from "../service/reward/casualRewardTypes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "dao/casualPlayerDao": typeof dao_casualPlayerDao;
  "data/casualMissionTemplates": typeof data_casualMissionTemplates;
  "data/casualTournamentConfigs": typeof data_casualTournamentConfigs;
  http: typeof http;
  "service/auth": typeof service_auth;
  "service/casualRewardRegistry": typeof service_casualRewardRegistry;
  "service/casualSeasonService": typeof service_casualSeasonService;
  "service/casualTaskService": typeof service_casualTaskService;
  "service/casualTournamentActions": typeof service_casualTournamentActions;
  "service/casualTournamentService": typeof service_casualTournamentService;
  "service/playerManager": typeof service_playerManager;
  "service/reward/casualRewardTypes": typeof service_reward_casualRewardTypes;
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
