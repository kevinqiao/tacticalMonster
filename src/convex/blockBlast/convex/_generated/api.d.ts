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
import type * as service_BlockBlastGameEngine from "../service/BlockBlastGameEngine.js";
import type * as service_BlockBlastRuleManager from "../service/BlockBlastRuleManager.js";
import type * as service_blockBlastScoreModel from "../service/blockBlastScoreModel.js";
import type * as service_blockBlastShapeCatalog from "../service/blockBlastShapeCatalog.js";
import type * as service_casualBotFill_botDifficulty from "../service/casualBotFill/botDifficulty.js";
import type * as service_casualBotFill_botDifficultyConfig from "../service/casualBotFill/botDifficultyConfig.js";
import type * as service_casualBotFill_botRevealSchedule from "../service/casualBotFill/botRevealSchedule.js";
import type * as service_casualBotFill_botStrategyTypes from "../service/casualBotFill/botStrategyTypes.js";
import type * as service_casualBotFill_computeBotFills from "../service/casualBotFill/computeBotFills.js";
import type * as service_casualBotFill_rolloutPick from "../service/casualBotFill/rolloutPick.js";
import type * as service_casualBotFill_soloRankRecommend from "../service/casualBotFill/soloRankRecommend.js";
import type * as service_casualBridgeEnv from "../service/casualBridgeEnv.js";
import type * as service_casualBridgeIngest from "../service/casualBridgeIngest.js";
import type * as service_casualBridgeResolve from "../service/casualBridgeResolve.js";
import type * as service_casualGameLifecycle from "../service/casualGameLifecycle.js";
import type * as service_casualGameTimeoutAction from "../service/casualGameTimeoutAction.js";
import type * as service_casualPlatform_casualTemplateQuantiles from "../service/casualPlatform/casualTemplateQuantiles.js";
import type * as service_gameManager from "../service/gameManager.js";
import type * as service_seedPool_blockBlastHumanPersonas from "../service/seedPool/blockBlastHumanPersonas.js";
import type * as service_seedPool_blockBlastOpCodec from "../service/seedPool/blockBlastOpCodec.js";
import type * as service_seedPool_blockBlastRecordedOpTypes from "../service/seedPool/blockBlastRecordedOpTypes.js";
import type * as service_seedPool_blockBlastScoring from "../service/seedPool/blockBlastScoring.js";
import type * as service_seedPool_blockBlastSeedDifficulty from "../service/seedPool/blockBlastSeedDifficulty.js";
import type * as service_seedPool_blockBlastSeedPoolLazy from "../service/seedPool/blockBlastSeedPoolLazy.js";
import type * as service_seedPool_blockBlastSeedPoolReplayVerify from "../service/seedPool/blockBlastSeedPoolReplayVerify.js";
import type * as service_seedPool_blockBlastSeedPoolRunner from "../service/seedPool/blockBlastSeedPoolRunner.js";
import type * as service_seedPool_blockBlastSeedPoolValidators from "../service/seedPool/blockBlastSeedPoolValidators.js";
import type * as service_seedPool_blockBlastSeedQuickScreen from "../service/seedPool/blockBlastSeedQuickScreen.js";
import type * as service_seedPool_blockBlastSeedRandom from "../service/seedPool/blockBlastSeedRandom.js";
import type * as service_seedPool_blockBlastSeedRolloutCompact from "../service/seedPool/blockBlastSeedRolloutCompact.js";
import type * as service_seedPool_blockBlastSeedScoreLookup from "../service/seedPool/blockBlastSeedScoreLookup.js";
import type * as service_seedPool_blockBlastSeedSimulator from "../service/seedPool/blockBlastSeedSimulator.js";
import type * as service_seedPool_blockBlastSimTime from "../service/seedPool/blockBlastSimTime.js";
import type * as service_seedPool_blockBlastStochasticHumanPolicy from "../service/seedPool/blockBlastStochasticHumanPolicy.js";
import type * as shared_botScoreSlots from "../shared/botScoreSlots.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_durationFallback from "../shared/durationFallback.js";
import type * as shared_pseudoUnit from "../shared/pseudoUnit.js";
import type * as shared_rankSampling from "../shared/rankSampling.js";
import type * as shared_rankStatBuckets from "../shared/rankStatBuckets.js";
import type * as shared_scoreQuantiles from "../shared/scoreQuantiles.js";
import type * as types_BlockBlastTypes from "../types/BlockBlastTypes.js";
import type * as types_blockBlastGridConfig from "../types/blockBlastGridConfig.js";
import type * as utils_gameRules from "../utils/gameRules.js";

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
  "service/BlockBlastGameEngine": typeof service_BlockBlastGameEngine;
  "service/BlockBlastRuleManager": typeof service_BlockBlastRuleManager;
  "service/blockBlastScoreModel": typeof service_blockBlastScoreModel;
  "service/blockBlastShapeCatalog": typeof service_blockBlastShapeCatalog;
  "service/casualBotFill/botDifficulty": typeof service_casualBotFill_botDifficulty;
  "service/casualBotFill/botDifficultyConfig": typeof service_casualBotFill_botDifficultyConfig;
  "service/casualBotFill/botRevealSchedule": typeof service_casualBotFill_botRevealSchedule;
  "service/casualBotFill/botStrategyTypes": typeof service_casualBotFill_botStrategyTypes;
  "service/casualBotFill/computeBotFills": typeof service_casualBotFill_computeBotFills;
  "service/casualBotFill/rolloutPick": typeof service_casualBotFill_rolloutPick;
  "service/casualBotFill/soloRankRecommend": typeof service_casualBotFill_soloRankRecommend;
  "service/casualBridgeEnv": typeof service_casualBridgeEnv;
  "service/casualBridgeIngest": typeof service_casualBridgeIngest;
  "service/casualBridgeResolve": typeof service_casualBridgeResolve;
  "service/casualGameLifecycle": typeof service_casualGameLifecycle;
  "service/casualGameTimeoutAction": typeof service_casualGameTimeoutAction;
  "service/casualPlatform/casualTemplateQuantiles": typeof service_casualPlatform_casualTemplateQuantiles;
  "service/gameManager": typeof service_gameManager;
  "service/seedPool/blockBlastHumanPersonas": typeof service_seedPool_blockBlastHumanPersonas;
  "service/seedPool/blockBlastOpCodec": typeof service_seedPool_blockBlastOpCodec;
  "service/seedPool/blockBlastRecordedOpTypes": typeof service_seedPool_blockBlastRecordedOpTypes;
  "service/seedPool/blockBlastScoring": typeof service_seedPool_blockBlastScoring;
  "service/seedPool/blockBlastSeedDifficulty": typeof service_seedPool_blockBlastSeedDifficulty;
  "service/seedPool/blockBlastSeedPoolLazy": typeof service_seedPool_blockBlastSeedPoolLazy;
  "service/seedPool/blockBlastSeedPoolReplayVerify": typeof service_seedPool_blockBlastSeedPoolReplayVerify;
  "service/seedPool/blockBlastSeedPoolRunner": typeof service_seedPool_blockBlastSeedPoolRunner;
  "service/seedPool/blockBlastSeedPoolValidators": typeof service_seedPool_blockBlastSeedPoolValidators;
  "service/seedPool/blockBlastSeedQuickScreen": typeof service_seedPool_blockBlastSeedQuickScreen;
  "service/seedPool/blockBlastSeedRandom": typeof service_seedPool_blockBlastSeedRandom;
  "service/seedPool/blockBlastSeedRolloutCompact": typeof service_seedPool_blockBlastSeedRolloutCompact;
  "service/seedPool/blockBlastSeedScoreLookup": typeof service_seedPool_blockBlastSeedScoreLookup;
  "service/seedPool/blockBlastSeedSimulator": typeof service_seedPool_blockBlastSeedSimulator;
  "service/seedPool/blockBlastSimTime": typeof service_seedPool_blockBlastSimTime;
  "service/seedPool/blockBlastStochasticHumanPolicy": typeof service_seedPool_blockBlastStochasticHumanPolicy;
  "shared/botScoreSlots": typeof shared_botScoreSlots;
  "shared/constants": typeof shared_constants;
  "shared/durationFallback": typeof shared_durationFallback;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
  "shared/rankSampling": typeof shared_rankSampling;
  "shared/rankStatBuckets": typeof shared_rankStatBuckets;
  "shared/scoreQuantiles": typeof shared_scoreQuantiles;
  "types/BlockBlastTypes": typeof types_BlockBlastTypes;
  "types/blockBlastGridConfig": typeof types_blockBlastGridConfig;
  "utils/gameRules": typeof utils_gameRules;
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
