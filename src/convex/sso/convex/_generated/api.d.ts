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
import type * as dao_cuserDao from "../dao/cuserDao.js";
import type * as dao_eventDao from "../dao/eventDao.js";
import type * as dao_userDao from "../dao/userDao.js";
import type * as http from "../http.js";
import type * as service_AuthManager from "../service/AuthManager.js";
import type * as service_EventQuery from "../service/EventQuery.js";
import type * as service_EventReceiver from "../service/EventReceiver.js";
import type * as service_handler_CustomAuthHandler from "../service/handler/CustomAuthHandler.js";
import type * as service_PlatformManager from "../service/PlatformManager.js";

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
  "dao/cuserDao": typeof dao_cuserDao;
  "dao/eventDao": typeof dao_eventDao;
  "dao/userDao": typeof dao_userDao;
  http: typeof http;
  "service/AuthManager": typeof service_AuthManager;
  "service/EventQuery": typeof service_EventQuery;
  "service/EventReceiver": typeof service_EventReceiver;
  "service/handler/CustomAuthHandler": typeof service_handler_CustomAuthHandler;
  "service/PlatformManager": typeof service_PlatformManager;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
