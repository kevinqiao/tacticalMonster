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
import type * as dao_cuserDao from "../dao/cuserDao.js";
import type * as dao_userDao from "../dao/userDao.js";
import type * as service_AuthManager from "../service/AuthManager.js";
import type * as service_handler_CustomAuthHandler from "../service/handler/CustomAuthHandler.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "dao/cuserDao": typeof dao_cuserDao;
  "dao/userDao": typeof dao_userDao;
  "service/AuthManager": typeof service_AuthManager;
  "service/handler/CustomAuthHandler": typeof service_handler_CustomAuthHandler;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
