/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as proxy_controller from "../proxy/controller.js";
import type * as service_SoloGameEngine from "../service/SoloGameEngine.js";
import type * as service_SoloRuleManager from "../service/SoloRuleManager.js";
import type * as service_casualBridgeEnv from "../service/casualBridgeEnv.js";
import type * as service_gameManager from "../service/gameManager.js";
import type * as types_SoloTypes from "../types/SoloTypes.js";
import type * as utils_Utils from "../utils/Utils.js";
import type * as utils_seedRandom from "../utils/seedRandom.js";

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
  "proxy/controller": typeof proxy_controller;
  "service/SoloGameEngine": typeof service_SoloGameEngine;
  "service/SoloRuleManager": typeof service_SoloRuleManager;
  "service/casualBridgeEnv": typeof service_casualBridgeEnv;
  "service/gameManager": typeof service_gameManager;
  "types/SoloTypes": typeof types_SoloTypes;
  "utils/Utils": typeof utils_Utils;
  "utils/seedRandom": typeof utils_seedRandom;
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
