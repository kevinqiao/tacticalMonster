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
import type * as service_casualBotFill_botDifficulty from "../service/casualBotFill/botDifficulty.js";
import type * as service_casualBotFill_botDifficultyConfig from "../service/casualBotFill/botDifficultyConfig.js";
import type * as service_casualBotFill_botRevealSchedule from "../service/casualBotFill/botRevealSchedule.js";
import type * as service_casualBotFill_botStrategyTypes from "../service/casualBotFill/botStrategyTypes.js";
import type * as service_casualBotFill_computeBotFills from "../service/casualBotFill/computeBotFills.js";
import type * as service_casualBotFill_soloRankRecommend from "../service/casualBotFill/soloRankRecommend.js";
import type * as service_casualBridgeEnv from "../service/casualBridgeEnv.js";
import type * as service_casualBridgeIngest from "../service/casualBridgeIngest.js";
import type * as service_casualBridgeResolve from "../service/casualBridgeResolve.js";
import type * as service_casualPlatform_casualMatchSeedHttp from "../service/casualPlatform/casualMatchSeedHttp.js";
import type * as service_casualPlatform_casualTemplateQuantiles from "../service/casualPlatform/casualTemplateQuantiles.js";
import type * as service_casualPlatform_matchSeedPickStore from "../service/casualPlatform/matchSeedPickStore.js";
import type * as service_gameManager from "../service/gameManager.js";
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
  "service/casualBotFill/botDifficulty": typeof service_casualBotFill_botDifficulty;
  "service/casualBotFill/botDifficultyConfig": typeof service_casualBotFill_botDifficultyConfig;
  "service/casualBotFill/botRevealSchedule": typeof service_casualBotFill_botRevealSchedule;
  "service/casualBotFill/botStrategyTypes": typeof service_casualBotFill_botStrategyTypes;
  "service/casualBotFill/computeBotFills": typeof service_casualBotFill_computeBotFills;
  "service/casualBotFill/soloRankRecommend": typeof service_casualBotFill_soloRankRecommend;
  "service/casualBridgeEnv": typeof service_casualBridgeEnv;
  "service/casualBridgeIngest": typeof service_casualBridgeIngest;
  "service/casualBridgeResolve": typeof service_casualBridgeResolve;
  "service/casualPlatform/casualMatchSeedHttp": typeof service_casualPlatform_casualMatchSeedHttp;
  "service/casualPlatform/casualTemplateQuantiles": typeof service_casualPlatform_casualTemplateQuantiles;
  "service/casualPlatform/matchSeedPickStore": typeof service_casualPlatform_matchSeedPickStore;
  "service/gameManager": typeof service_gameManager;
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
