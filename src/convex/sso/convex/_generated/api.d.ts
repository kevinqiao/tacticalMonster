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
import type * as dao_platformDao from "../dao/platformDao.js";
import type * as dao_userDao from "../dao/userDao.js";
import type * as http from "../http.js";
import type * as service_AuthManager from "../service/AuthManager.js";
import type * as service_EventManager from "../service/EventManager.js";
import type * as service_handler_AuthHandlerFactory from "../service/handler/AuthHandlerFactory.js";
import type * as service_handler_CustomAuthHandler from "../service/handler/CustomAuthHandler.js";
import type * as service_handler_TelegramAuthHandler from "../service/handler/TelegramAuthHandler.js";
import type * as service_PlatformManager from "../service/PlatformManager.js";
import type * as service_TelegramAuthenticator from "../service/TelegramAuthenticator.js";
import type * as service_WebAuthenticator from "../service/WebAuthenticator.js";

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
  "dao/platformDao": typeof dao_platformDao;
  "dao/userDao": typeof dao_userDao;
  http: typeof http;
  "service/AuthManager": typeof service_AuthManager;
  "service/EventManager": typeof service_EventManager;
  "service/handler/AuthHandlerFactory": typeof service_handler_AuthHandlerFactory;
  "service/handler/CustomAuthHandler": typeof service_handler_CustomAuthHandler;
  "service/handler/TelegramAuthHandler": typeof service_handler_TelegramAuthHandler;
  "service/PlatformManager": typeof service_PlatformManager;
  "service/TelegramAuthenticator": typeof service_TelegramAuthenticator;
  "service/WebAuthenticator": typeof service_WebAuthenticator;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
