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
import type * as service_seedPool_solitaireHumanPersonas from "../service/seedPool/solitaireHumanPersonas.js";
import type * as service_seedPool_solitaireOpCodec from "../service/seedPool/solitaireOpCodec.js";
import type * as service_seedPool_solitaireRecordedOpTypes from "../service/seedPool/solitaireRecordedOpTypes.js";
import type * as service_seedPool_solitaireScoring from "../service/seedPool/solitaireScoring.js";
import type * as service_seedPool_solitaireSeedDifficulty from "../service/seedPool/solitaireSeedDifficulty.js";
import type * as service_seedPool_solitaireSeedPoolActions from "../service/seedPool/solitaireSeedPoolActions.js";
import type * as service_seedPool_solitaireSeedPoolAdmin from "../service/seedPool/solitaireSeedPoolAdmin.js";
import type * as service_seedPool_solitaireSeedPoolLazy from "../service/seedPool/solitaireSeedPoolLazy.js";
import type * as service_seedPool_solitaireSeedPoolQueries from "../service/seedPool/solitaireSeedPoolQueries.js";
import type * as service_seedPool_solitaireSeedPoolReplayVerify from "../service/seedPool/solitaireSeedPoolReplayVerify.js";
import type * as service_seedPool_solitaireSeedPoolRunner from "../service/seedPool/solitaireSeedPoolRunner.js";
import type * as service_seedPool_solitaireSeedPoolStore from "../service/seedPool/solitaireSeedPoolStore.js";
import type * as service_seedPool_solitaireSeedPoolValidators from "../service/seedPool/solitaireSeedPoolValidators.js";
import type * as service_seedPool_solitaireSeedQuickScreen from "../service/seedPool/solitaireSeedQuickScreen.js";
import type * as service_seedPool_solitaireSeedRolloutCompact from "../service/seedPool/solitaireSeedRolloutCompact.js";
import type * as service_seedPool_solitaireSeedScoreLookup from "../service/seedPool/solitaireSeedScoreLookup.js";
import type * as service_seedPool_solitaireSeedSimulator from "../service/seedPool/solitaireSeedSimulator.js";
import type * as service_seedPool_solitaireSimTime from "../service/seedPool/solitaireSimTime.js";
import type * as service_seedPool_solitaireStochasticHumanPolicy from "../service/seedPool/solitaireStochasticHumanPolicy.js";
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
  "service/seedPool/solitaireHumanPersonas": typeof service_seedPool_solitaireHumanPersonas;
  "service/seedPool/solitaireOpCodec": typeof service_seedPool_solitaireOpCodec;
  "service/seedPool/solitaireRecordedOpTypes": typeof service_seedPool_solitaireRecordedOpTypes;
  "service/seedPool/solitaireScoring": typeof service_seedPool_solitaireScoring;
  "service/seedPool/solitaireSeedDifficulty": typeof service_seedPool_solitaireSeedDifficulty;
  "service/seedPool/solitaireSeedPoolActions": typeof service_seedPool_solitaireSeedPoolActions;
  "service/seedPool/solitaireSeedPoolAdmin": typeof service_seedPool_solitaireSeedPoolAdmin;
  "service/seedPool/solitaireSeedPoolLazy": typeof service_seedPool_solitaireSeedPoolLazy;
  "service/seedPool/solitaireSeedPoolQueries": typeof service_seedPool_solitaireSeedPoolQueries;
  "service/seedPool/solitaireSeedPoolReplayVerify": typeof service_seedPool_solitaireSeedPoolReplayVerify;
  "service/seedPool/solitaireSeedPoolRunner": typeof service_seedPool_solitaireSeedPoolRunner;
  "service/seedPool/solitaireSeedPoolStore": typeof service_seedPool_solitaireSeedPoolStore;
  "service/seedPool/solitaireSeedPoolValidators": typeof service_seedPool_solitaireSeedPoolValidators;
  "service/seedPool/solitaireSeedQuickScreen": typeof service_seedPool_solitaireSeedQuickScreen;
  "service/seedPool/solitaireSeedRolloutCompact": typeof service_seedPool_solitaireSeedRolloutCompact;
  "service/seedPool/solitaireSeedScoreLookup": typeof service_seedPool_solitaireSeedScoreLookup;
  "service/seedPool/solitaireSeedSimulator": typeof service_seedPool_solitaireSeedSimulator;
  "service/seedPool/solitaireSimTime": typeof service_seedPool_solitaireSimTime;
  "service/seedPool/solitaireStochasticHumanPolicy": typeof service_seedPool_solitaireStochasticHumanPolicy;
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
