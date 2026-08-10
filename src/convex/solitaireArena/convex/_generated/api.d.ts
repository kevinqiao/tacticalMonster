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
import type * as service_SoloGameEngine from "../service/SoloGameEngine.js";
import type * as service_SoloRuleManager from "../service/SoloRuleManager.js";
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
import type * as service_clientCardView from "../service/clientCardView.js";
import type * as service_gameManager from "../service/gameManager.js";
import type * as service_seedPool_solitaireHumanPersonas from "../service/seedPool/solitaireHumanPersonas.js";
import type * as service_seedPool_solitaireOpCodec from "../service/seedPool/solitaireOpCodec.js";
import type * as service_seedPool_solitaireRecordedOpTypes from "../service/seedPool/solitaireRecordedOpTypes.js";
import type * as service_seedPool_solitaireScoring from "../service/seedPool/solitaireScoring.js";
import type * as service_seedPool_solitaireSeedDifficulty from "../service/seedPool/solitaireSeedDifficulty.js";
import type * as service_seedPool_solitaireSeedPoolLazy from "../service/seedPool/solitaireSeedPoolLazy.js";
import type * as service_seedPool_solitaireSeedPoolReplayVerify from "../service/seedPool/solitaireSeedPoolReplayVerify.js";
import type * as service_seedPool_solitaireSeedPoolRunner from "../service/seedPool/solitaireSeedPoolRunner.js";
import type * as service_seedPool_solitaireSeedPoolValidators from "../service/seedPool/solitaireSeedPoolValidators.js";
import type * as service_seedPool_solitaireSeedQuickScreen from "../service/seedPool/solitaireSeedQuickScreen.js";
import type * as service_seedPool_solitaireSeedRolloutCompact from "../service/seedPool/solitaireSeedRolloutCompact.js";
import type * as service_seedPool_solitaireSeedScoreLookup from "../service/seedPool/solitaireSeedScoreLookup.js";
import type * as service_seedPool_solitaireSeedSimulator from "../service/seedPool/solitaireSeedSimulator.js";
import type * as service_seedPool_solitaireSimTime from "../service/seedPool/solitaireSimTime.js";
import type * as service_seedPool_solitaireSolver from "../service/seedPool/solitaireSolver.js";
import type * as service_seedPool_solitaireStochasticHumanPolicy from "../service/seedPool/solitaireStochasticHumanPolicy.js";
import type * as service_solitaireTargetWin from "../service/solitaireTargetWin.js";
import type * as shared_botScoreSlots from "../shared/botScoreSlots.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_durationFallback from "../shared/durationFallback.js";
import type * as shared_pseudoUnit from "../shared/pseudoUnit.js";
import type * as shared_rankSampling from "../shared/rankSampling.js";
import type * as shared_rankStatBuckets from "../shared/rankStatBuckets.js";
import type * as shared_scoreQuantiles from "../shared/scoreQuantiles.js";
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
  "custom/session": typeof custom_session;
  http: typeof http;
  "proxy/controller": typeof proxy_controller;
  "service/SoloGameEngine": typeof service_SoloGameEngine;
  "service/SoloRuleManager": typeof service_SoloRuleManager;
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
  "service/clientCardView": typeof service_clientCardView;
  "service/gameManager": typeof service_gameManager;
  "service/seedPool/solitaireHumanPersonas": typeof service_seedPool_solitaireHumanPersonas;
  "service/seedPool/solitaireOpCodec": typeof service_seedPool_solitaireOpCodec;
  "service/seedPool/solitaireRecordedOpTypes": typeof service_seedPool_solitaireRecordedOpTypes;
  "service/seedPool/solitaireScoring": typeof service_seedPool_solitaireScoring;
  "service/seedPool/solitaireSeedDifficulty": typeof service_seedPool_solitaireSeedDifficulty;
  "service/seedPool/solitaireSeedPoolLazy": typeof service_seedPool_solitaireSeedPoolLazy;
  "service/seedPool/solitaireSeedPoolReplayVerify": typeof service_seedPool_solitaireSeedPoolReplayVerify;
  "service/seedPool/solitaireSeedPoolRunner": typeof service_seedPool_solitaireSeedPoolRunner;
  "service/seedPool/solitaireSeedPoolValidators": typeof service_seedPool_solitaireSeedPoolValidators;
  "service/seedPool/solitaireSeedQuickScreen": typeof service_seedPool_solitaireSeedQuickScreen;
  "service/seedPool/solitaireSeedRolloutCompact": typeof service_seedPool_solitaireSeedRolloutCompact;
  "service/seedPool/solitaireSeedScoreLookup": typeof service_seedPool_solitaireSeedScoreLookup;
  "service/seedPool/solitaireSeedSimulator": typeof service_seedPool_solitaireSeedSimulator;
  "service/seedPool/solitaireSimTime": typeof service_seedPool_solitaireSimTime;
  "service/seedPool/solitaireSolver": typeof service_seedPool_solitaireSolver;
  "service/seedPool/solitaireStochasticHumanPolicy": typeof service_seedPool_solitaireStochasticHumanPolicy;
  "service/solitaireTargetWin": typeof service_solitaireTargetWin;
  "shared/botScoreSlots": typeof shared_botScoreSlots;
  "shared/constants": typeof shared_constants;
  "shared/durationFallback": typeof shared_durationFallback;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
  "shared/rankSampling": typeof shared_rankSampling;
  "shared/rankStatBuckets": typeof shared_rankStatBuckets;
  "shared/scoreQuantiles": typeof shared_scoreQuantiles;
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
