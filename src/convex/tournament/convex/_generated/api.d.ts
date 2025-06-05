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
import type * as dao_eventDao from "../dao/eventDao.js";
import type * as dao_matchQueueDao from "../dao/matchQueueDao.js";
import type * as dao_playerDao from "../dao/playerDao.js";
import type * as http from "../http.js";
import type * as service_auth from "../service/auth.js";
import type * as service_join from "../service/join.js";
import type * as service_match from "../service/match.js";

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
  "dao/eventDao": typeof dao_eventDao;
  "dao/matchQueueDao": typeof dao_matchQueueDao;
  "dao/playerDao": typeof dao_playerDao;
  http: typeof http;
  "service/auth": typeof service_auth;
  "service/join": typeof service_join;
  "service/match": typeof service_match;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
