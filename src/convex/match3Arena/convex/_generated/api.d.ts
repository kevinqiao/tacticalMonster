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
import type * as service_Match3GameEngine from "../service/Match3GameEngine.js";
import type * as service_Match3RuleManager from "../service/Match3RuleManager.js";
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
import type * as service_match3Scoring from "../service/match3Scoring.js";
import type * as service_seedPool_casualMatchSeedHttp from "../service/seedPool/casualMatchSeedHttp.js";
import type * as service_seedPool_match3OpCodec from "../service/seedPool/match3OpCodec.js";
import type * as service_seedPool_match3RecordedOpTypes from "../service/seedPool/match3RecordedOpTypes.js";
import type * as service_seedPool_match3SeedDifficulty from "../service/seedPool/match3SeedDifficulty.js";
import type * as service_seedPool_match3SeedPoolAdmin from "../service/seedPool/match3SeedPoolAdmin.js";
import type * as service_seedPool_match3SeedPoolQueries from "../service/seedPool/match3SeedPoolQueries.js";
import type * as service_seedPool_match3SeedPoolRunner from "../service/seedPool/match3SeedPoolRunner.js";
import type * as service_seedPool_match3SeedPoolStore from "../service/seedPool/match3SeedPoolStore.js";
import type * as service_seedPool_match3SeedPoolValidators from "../service/seedPool/match3SeedPoolValidators.js";
import type * as service_seedPool_match3SeedSimulator from "../service/seedPool/match3SeedSimulator.js";
import type * as service_seedPool_match3SimTime from "../service/seedPool/match3SimTime.js";
import type * as service_seedPool_match3StochasticHumanPolicy from "../service/seedPool/match3StochasticHumanPolicy.js";
import type * as service_seedPool_matchSeedPickStore from "../service/seedPool/matchSeedPickStore.js";
import type * as service_seedPool_playerSeedStore from "../service/seedPool/playerSeedStore.js";
import type * as shared_botScoreSlots from "../shared/botScoreSlots.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_durationFallback from "../shared/durationFallback.js";
import type * as shared_pseudoUnit from "../shared/pseudoUnit.js";
import type * as shared_rankSampling from "../shared/rankSampling.js";
import type * as shared_rankStatBuckets from "../shared/rankStatBuckets.js";
import type * as shared_scoreQuantiles from "../shared/scoreQuantiles.js";
import type * as types_Match3Types from "../types/Match3Types.js";
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
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "service/Match3GameEngine": typeof service_Match3GameEngine;
  "service/Match3RuleManager": typeof service_Match3RuleManager;
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
  "service/match3Scoring": typeof service_match3Scoring;
  "service/seedPool/casualMatchSeedHttp": typeof service_seedPool_casualMatchSeedHttp;
  "service/seedPool/match3OpCodec": typeof service_seedPool_match3OpCodec;
  "service/seedPool/match3RecordedOpTypes": typeof service_seedPool_match3RecordedOpTypes;
  "service/seedPool/match3SeedDifficulty": typeof service_seedPool_match3SeedDifficulty;
  "service/seedPool/match3SeedPoolAdmin": typeof service_seedPool_match3SeedPoolAdmin;
  "service/seedPool/match3SeedPoolQueries": typeof service_seedPool_match3SeedPoolQueries;
  "service/seedPool/match3SeedPoolRunner": typeof service_seedPool_match3SeedPoolRunner;
  "service/seedPool/match3SeedPoolStore": typeof service_seedPool_match3SeedPoolStore;
  "service/seedPool/match3SeedPoolValidators": typeof service_seedPool_match3SeedPoolValidators;
  "service/seedPool/match3SeedSimulator": typeof service_seedPool_match3SeedSimulator;
  "service/seedPool/match3SimTime": typeof service_seedPool_match3SimTime;
  "service/seedPool/match3StochasticHumanPolicy": typeof service_seedPool_match3StochasticHumanPolicy;
  "service/seedPool/matchSeedPickStore": typeof service_seedPool_matchSeedPickStore;
  "service/seedPool/playerSeedStore": typeof service_seedPool_playerSeedStore;
  "shared/botScoreSlots": typeof shared_botScoreSlots;
  "shared/constants": typeof shared_constants;
  "shared/durationFallback": typeof shared_durationFallback;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
  "shared/rankSampling": typeof shared_rankSampling;
  "shared/rankStatBuckets": typeof shared_rankStatBuckets;
  "shared/scoreQuantiles": typeof shared_scoreQuantiles;
  "types/Match3Types": typeof types_Match3Types;
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
