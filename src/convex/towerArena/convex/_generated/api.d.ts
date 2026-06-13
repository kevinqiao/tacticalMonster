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
import type * as proxy_controller from "../proxy/controller.js";
import type * as service_TowerDefenseGameEngine from "../service/TowerDefenseGameEngine.js";
import type * as service_casualBotFill_botDifficulty from "../service/casualBotFill/botDifficulty.js";
import type * as service_casualBotFill_botDifficultyConfig from "../service/casualBotFill/botDifficultyConfig.js";
import type * as service_casualBotFill_botRevealSchedule from "../service/casualBotFill/botRevealSchedule.js";
import type * as service_casualBotFill_botStrategyTypes from "../service/casualBotFill/botStrategyTypes.js";
import type * as service_casualBotFill_casualBridgeProfile from "../service/casualBotFill/casualBridgeProfile.js";
import type * as service_casualBotFill_computeBotFills from "../service/casualBotFill/computeBotFills.js";
import type * as service_casualBotFill_rolloutPick from "../service/casualBotFill/rolloutPick.js";
import type * as service_casualBotFill_soloRankRecommend from "../service/casualBotFill/soloRankRecommend.js";
import type * as service_casualBridgeEnv from "../service/casualBridgeEnv.js";
import type * as service_casualBridgeIngest from "../service/casualBridgeIngest.js";
import type * as service_casualBridgeResolve from "../service/casualBridgeResolve.js";
import type * as service_casualGameLifecycle from "../service/casualGameLifecycle.js";
import type * as service_casualGameTimeoutAction from "../service/casualGameTimeoutAction.js";
import type * as service_gameManager from "../service/gameManager.js";
import type * as service_seedPool_casualMatchSeedHttp from "../service/seedPool/casualMatchSeedHttp.js";
import type * as service_seedPool_matchSeedPickStore from "../service/seedPool/matchSeedPickStore.js";
import type * as service_seedPool_playerSeedStore from "../service/seedPool/playerSeedStore.js";
import type * as service_seedPool_towerRecordedOpTypes from "../service/seedPool/towerRecordedOpTypes.js";
import type * as service_seedPool_towerSeedDifficulty from "../service/seedPool/towerSeedDifficulty.js";
import type * as service_seedPool_towerSeedPoolAdmin from "../service/seedPool/towerSeedPoolAdmin.js";
import type * as service_seedPool_towerSeedPoolDevQueries from "../service/seedPool/towerSeedPoolDevQueries.js";
import type * as service_seedPool_towerSeedPoolQueries from "../service/seedPool/towerSeedPoolQueries.js";
import type * as service_seedPool_towerSeedPoolRunner from "../service/seedPool/towerSeedPoolRunner.js";
import type * as service_seedPool_towerSeedPoolStore from "../service/seedPool/towerSeedPoolStore.js";
import type * as service_seedPool_towerSeedPoolValidators from "../service/seedPool/towerSeedPoolValidators.js";
import type * as service_seedPool_towerSeedSimulator from "../service/seedPool/towerSeedSimulator.js";
import type * as service_seedPool_towerSimTime from "../service/seedPool/towerSimTime.js";
import type * as service_seedPool_towerStochasticHumanPolicy from "../service/seedPool/towerStochasticHumanPolicy.js";
import type * as service_towerOpCodec from "../service/towerOpCodec.js";
import type * as service_towerScoring from "../service/towerScoring.js";
import type * as service_towerWaveSim from "../service/towerWaveSim.js";
import type * as shared_botScoreSlots from "../shared/botScoreSlots.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_durationFallback from "../shared/durationFallback.js";
import type * as shared_pseudoUnit from "../shared/pseudoUnit.js";
import type * as shared_rankSampling from "../shared/rankSampling.js";
import type * as shared_rankStatBuckets from "../shared/rankStatBuckets.js";
import type * as shared_scoreQuantiles from "../shared/scoreQuantiles.js";
import type * as shared_shared_botScoreSlots from "../shared/shared/botScoreSlots.js";
import type * as shared_shared_constants from "../shared/shared/constants.js";
import type * as shared_shared_durationFallback from "../shared/shared/durationFallback.js";
import type * as shared_shared_pseudoUnit from "../shared/shared/pseudoUnit.js";
import type * as shared_shared_rankSampling from "../shared/shared/rankSampling.js";
import type * as shared_shared_rankStatBuckets from "../shared/shared/rankStatBuckets.js";
import type * as shared_shared_scoreQuantiles from "../shared/shared/scoreQuantiles.js";
import type * as shared_towerSeedCatalog from "../shared/towerSeedCatalog.js";
import type * as types_TowerArenaSeed from "../types/TowerArenaSeed.js";
import type * as types_TowerArenaTypes from "../types/TowerArenaTypes.js";
import type * as utils_seedRandom from "../utils/seedRandom.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "service/TowerDefenseGameEngine": typeof service_TowerDefenseGameEngine;
  "service/casualBotFill/botDifficulty": typeof service_casualBotFill_botDifficulty;
  "service/casualBotFill/botDifficultyConfig": typeof service_casualBotFill_botDifficultyConfig;
  "service/casualBotFill/botRevealSchedule": typeof service_casualBotFill_botRevealSchedule;
  "service/casualBotFill/botStrategyTypes": typeof service_casualBotFill_botStrategyTypes;
  "service/casualBotFill/casualBridgeProfile": typeof service_casualBotFill_casualBridgeProfile;
  "service/casualBotFill/computeBotFills": typeof service_casualBotFill_computeBotFills;
  "service/casualBotFill/rolloutPick": typeof service_casualBotFill_rolloutPick;
  "service/casualBotFill/soloRankRecommend": typeof service_casualBotFill_soloRankRecommend;
  "service/casualBridgeEnv": typeof service_casualBridgeEnv;
  "service/casualBridgeIngest": typeof service_casualBridgeIngest;
  "service/casualBridgeResolve": typeof service_casualBridgeResolve;
  "service/casualGameLifecycle": typeof service_casualGameLifecycle;
  "service/casualGameTimeoutAction": typeof service_casualGameTimeoutAction;
  "service/gameManager": typeof service_gameManager;
  "service/seedPool/casualMatchSeedHttp": typeof service_seedPool_casualMatchSeedHttp;
  "service/seedPool/matchSeedPickStore": typeof service_seedPool_matchSeedPickStore;
  "service/seedPool/playerSeedStore": typeof service_seedPool_playerSeedStore;
  "service/seedPool/towerRecordedOpTypes": typeof service_seedPool_towerRecordedOpTypes;
  "service/seedPool/towerSeedDifficulty": typeof service_seedPool_towerSeedDifficulty;
  "service/seedPool/towerSeedPoolAdmin": typeof service_seedPool_towerSeedPoolAdmin;
  "service/seedPool/towerSeedPoolDevQueries": typeof service_seedPool_towerSeedPoolDevQueries;
  "service/seedPool/towerSeedPoolQueries": typeof service_seedPool_towerSeedPoolQueries;
  "service/seedPool/towerSeedPoolRunner": typeof service_seedPool_towerSeedPoolRunner;
  "service/seedPool/towerSeedPoolStore": typeof service_seedPool_towerSeedPoolStore;
  "service/seedPool/towerSeedPoolValidators": typeof service_seedPool_towerSeedPoolValidators;
  "service/seedPool/towerSeedSimulator": typeof service_seedPool_towerSeedSimulator;
  "service/seedPool/towerSimTime": typeof service_seedPool_towerSimTime;
  "service/seedPool/towerStochasticHumanPolicy": typeof service_seedPool_towerStochasticHumanPolicy;
  "service/towerOpCodec": typeof service_towerOpCodec;
  "service/towerScoring": typeof service_towerScoring;
  "service/towerWaveSim": typeof service_towerWaveSim;
  "shared/botScoreSlots": typeof shared_botScoreSlots;
  "shared/constants": typeof shared_constants;
  "shared/durationFallback": typeof shared_durationFallback;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
  "shared/rankSampling": typeof shared_rankSampling;
  "shared/rankStatBuckets": typeof shared_rankStatBuckets;
  "shared/scoreQuantiles": typeof shared_scoreQuantiles;
  "shared/shared/botScoreSlots": typeof shared_shared_botScoreSlots;
  "shared/shared/constants": typeof shared_shared_constants;
  "shared/shared/durationFallback": typeof shared_shared_durationFallback;
  "shared/shared/pseudoUnit": typeof shared_shared_pseudoUnit;
  "shared/shared/rankSampling": typeof shared_shared_rankSampling;
  "shared/shared/rankStatBuckets": typeof shared_shared_rankStatBuckets;
  "shared/shared/scoreQuantiles": typeof shared_shared_scoreQuantiles;
  "shared/towerSeedCatalog": typeof shared_towerSeedCatalog;
  "types/TowerArenaSeed": typeof types_TowerArenaSeed;
  "types/TowerArenaTypes": typeof types_TowerArenaTypes;
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
