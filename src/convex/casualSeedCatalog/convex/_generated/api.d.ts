/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as service_seedPool_catalogSeedHttp from "../service/seedPool/catalogSeedHttp.js";
import type * as service_seedPool_seedPoolAdmin from "../service/seedPool/seedPoolAdmin.js";
import type * as service_seedPool_seedPoolQueries from "../service/seedPool/seedPoolQueries.js";
import type * as service_seedPool_seedPoolStore from "../service/seedPool/seedPoolStore.js";
import type * as service_seedPool_seedPoolValidators from "../service/seedPool/seedPoolValidators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  http: typeof http;
  "service/seedPool/catalogSeedHttp": typeof service_seedPool_catalogSeedHttp;
  "service/seedPool/seedPoolAdmin": typeof service_seedPool_seedPoolAdmin;
  "service/seedPool/seedPoolQueries": typeof service_seedPool_seedPoolQueries;
  "service/seedPool/seedPoolStore": typeof service_seedPool_seedPoolStore;
  "service/seedPool/seedPoolValidators": typeof service_seedPool_seedPoolValidators;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
