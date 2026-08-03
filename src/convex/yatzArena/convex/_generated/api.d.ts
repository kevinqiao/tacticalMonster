/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as custom_session from "../custom/session.js";
import type * as http from "../http.js";
import type * as proxy_controller from "../proxy/controller.js";
import type * as service_YatzGameEngine from "../service/YatzGameEngine.js";
import type * as service_casualBotFill_computeBotFills from "../service/casualBotFill/computeBotFills.js";
import type * as service_casualBridgeEnv from "../service/casualBridgeEnv.js";
import type * as service_casualBridgeIngest from "../service/casualBridgeIngest.js";
import type * as service_casualBridgeResolve from "../service/casualBridgeResolve.js";
import type * as service_casualGameLifecycle from "../service/casualGameLifecycle.js";
import type * as service_casualGameTimeoutAction from "../service/casualGameTimeoutAction.js";
import type * as service_gameManager from "../service/gameManager.js";
import type * as service_seedPool_yatzHumanPersonas from "../service/seedPool/yatzHumanPersonas.js";
import type * as service_seedPool_yatzOpCodec from "../service/seedPool/yatzOpCodec.js";
import type * as service_seedPool_yatzRecordedOpTypes from "../service/seedPool/yatzRecordedOpTypes.js";
import type * as service_seedPool_yatzSeedPoolRunner from "../service/seedPool/yatzSeedPoolRunner.js";
import type * as service_seedPool_yatzSeedSimulator from "../service/seedPool/yatzSeedSimulator.js";
import type * as service_seedPool_yatzSimTime from "../service/seedPool/yatzSimTime.js";
import type * as service_yatzScoring from "../service/yatzScoring.js";
import type * as service_yatzSeedManifest from "../service/yatzSeedManifest.js";
import type * as service_yatzWatchReplayPayload from "../service/yatzWatchReplayPayload.js";
import type * as types_YatzTypes from "../types/YatzTypes.js";
import type * as utils_seedRandom from "../utils/seedRandom.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "custom/session": typeof custom_session;
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "service/YatzGameEngine": typeof service_YatzGameEngine;
  "service/casualBotFill/computeBotFills": typeof service_casualBotFill_computeBotFills;
  "service/casualBridgeEnv": typeof service_casualBridgeEnv;
  "service/casualBridgeIngest": typeof service_casualBridgeIngest;
  "service/casualBridgeResolve": typeof service_casualBridgeResolve;
  "service/casualGameLifecycle": typeof service_casualGameLifecycle;
  "service/casualGameTimeoutAction": typeof service_casualGameTimeoutAction;
  "service/gameManager": typeof service_gameManager;
  "service/seedPool/yatzHumanPersonas": typeof service_seedPool_yatzHumanPersonas;
  "service/seedPool/yatzOpCodec": typeof service_seedPool_yatzOpCodec;
  "service/seedPool/yatzRecordedOpTypes": typeof service_seedPool_yatzRecordedOpTypes;
  "service/seedPool/yatzSeedPoolRunner": typeof service_seedPool_yatzSeedPoolRunner;
  "service/seedPool/yatzSeedSimulator": typeof service_seedPool_yatzSeedSimulator;
  "service/seedPool/yatzSimTime": typeof service_seedPool_yatzSimTime;
  "service/yatzScoring": typeof service_yatzScoring;
  "service/yatzSeedManifest": typeof service_yatzSeedManifest;
  "service/yatzWatchReplayPayload": typeof service_yatzWatchReplayPayload;
  "types/YatzTypes": typeof types_YatzTypes;
  "utils/seedRandom": typeof utils_seedRandom;
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
