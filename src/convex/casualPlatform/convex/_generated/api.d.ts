/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as custom_session from "../custom/session.js";
import type * as dao_casualPlayerDao from "../dao/casualPlayerDao.js";
import type * as data_casualActivityCatalog from "../data/casualActivityCatalog.js";
import type * as data_casualAsyncLeaderboardRowState from "../data/casualAsyncLeaderboardRowState.js";
import type * as data_casualFixedChestCatalog from "../data/casualFixedChestCatalog.js";
import type * as data_casualInstanceWindow from "../data/casualInstanceWindow.js";
import type * as data_casualMatchmakingConfig from "../data/casualMatchmakingConfig.js";
import type * as data_casualMissionTemplates from "../data/casualMissionTemplates.js";
import type * as data_casualPassRewards from "../data/casualPassRewards.js";
import type * as data_casualPayoutPolicy from "../data/casualPayoutPolicy.js";
import type * as data_casualPlayerStrategyConfig from "../data/casualPlayerStrategyConfig.js";
import type * as data_casualPlayerStrategyTypes from "../data/casualPlayerStrategyTypes.js";
import type * as data_casualSeasonLadderConfig from "../data/casualSeasonLadderConfig.js";
import type * as data_casualSeedTierPolicy from "../data/casualSeedTierPolicy.js";
import type * as data_casualShopCatalog from "../data/casualShopCatalog.js";
import type * as data_casualSkinCatalog from "../data/casualSkinCatalog.js";
import type * as data_casualSpotlightGame from "../data/casualSpotlightGame.js";
import type * as data_casualTournamentConfigs from "../data/casualTournamentConfigs.js";
import type * as data_casualTournamentRewardTypes from "../data/casualTournamentRewardTypes.js";
import type * as http from "../http.js";
import type * as service_activity_casualActivityService from "../service/activity/casualActivityService.js";
import type * as service_auth_casualAuth from "../service/auth/casualAuth.js";
import type * as service_auth_jwtAccessSecret from "../service/auth/jwtAccessSecret.js";
import type * as service_bridge_casualGameBridgeSecret from "../service/bridge/casualGameBridgeSecret.js";
import type * as service_bridge_casualMatchSeedBridge from "../service/bridge/casualMatchSeedBridge.js";
import type * as service_chest_casualFixedChestService from "../service/chest/casualFixedChestService.js";
import type * as service_payout_casualPayoutDailyService from "../service/payout/casualPayoutDailyService.js";
import type * as service_player_playerManager from "../service/player/playerManager.js";
import type * as service_reward_casualRewardRegistry from "../service/reward/casualRewardRegistry.js";
import type * as service_reward_casualRewardTypes from "../service/reward/casualRewardTypes.js";
import type * as service_season_casualSeasonLadder from "../service/season/casualSeasonLadder.js";
import type * as service_season_casualSeasonService from "../service/season/casualSeasonService.js";
import type * as service_shop_casualShopService from "../service/shop/casualShopService.js";
import type * as service_skin_casualSkinService from "../service/skin/casualSkinService.js";
import type * as service_task_casualPrimaryGame from "../service/task/casualPrimaryGame.js";
import type * as service_task_casualTaskService from "../service/task/casualTaskService.js";
import type * as service_tournament_casualTournamentService from "../service/tournament/casualTournamentService.js";
import type * as service_tournament_join_casualJoinMutations from "../service/tournament/join/casualJoinMutations.js";
import type * as service_tournament_join_casualMatchSeedActions from "../service/tournament/join/casualMatchSeedActions.js";
import type * as service_tournament_join_casualMatchSeedBinding from "../service/tournament/join/casualMatchSeedBinding.js";
import type * as service_tournament_join_casualMatchSeedMutations from "../service/tournament/join/casualMatchSeedMutations.js";
import type * as service_tournament_join_casualMatchmaking from "../service/tournament/join/casualMatchmaking.js";
import type * as service_tournament_join_casualMatchmakingProfile from "../service/tournament/join/casualMatchmakingProfile.js";
import type * as service_tournament_join_casualTournamentActions from "../service/tournament/join/casualTournamentActions.js";
import type * as service_tournament_join_casualTournamentJoinCore from "../service/tournament/join/casualTournamentJoinCore.js";
import type * as service_tournament_list_casualInstanceService from "../service/tournament/list/casualInstanceService.js";
import type * as service_tournament_list_casualTournamentQueries from "../service/tournament/list/casualTournamentQueries.js";
import type * as service_tournament_replay_casualReplayPassService from "../service/tournament/replay/casualReplayPassService.js";
import type * as service_tournament_replay_casualReplayTokens from "../service/tournament/replay/casualReplayTokens.js";
import type * as service_tournament_replay_casualRunReplay from "../service/tournament/replay/casualRunReplay.js";
import type * as service_tournament_settle_async_casualAsyncBotPersist from "../service/tournament/settle/async/casualAsyncBotPersist.js";
import type * as service_tournament_settle_async_casualAsyncBotReveal from "../service/tournament/settle/async/casualAsyncBotReveal.js";
import type * as service_tournament_settle_async_casualAsyncTableSummary from "../service/tournament/settle/async/casualAsyncTableSummary.js";
import type * as service_tournament_settle_async_casualAsyncTypes from "../service/tournament/settle/async/casualAsyncTypes.js";
import type * as service_tournament_settle_casualRunExpireCron from "../service/tournament/settle/casualRunExpireCron.js";
import type * as service_tournament_settle_casualRunMatchFinalize from "../service/tournament/settle/casualRunMatchFinalize.js";
import type * as service_tournament_settle_casualRunRewardsMutations from "../service/tournament/settle/casualRunRewardsMutations.js";
import type * as service_tournament_settle_casualRunScoreEffects from "../service/tournament/settle/casualRunScoreEffects.js";
import type * as service_tournament_settle_casualRunSettlementFill from "../service/tournament/settle/casualRunSettlementFill.js";
import type * as service_tournament_shared_casualPlayerMatchStatus from "../service/tournament/shared/casualPlayerMatchStatus.js";
import type * as service_tournament_shared_casualPlayerTournamentRankStats from "../service/tournament/shared/casualPlayerTournamentRankStats.js";
import type * as service_tournament_shared_casualRankStatBuckets from "../service/tournament/shared/casualRankStatBuckets.js";
import type * as service_tournament_shared_casualRunSession from "../service/tournament/shared/casualRunSession.js";
import type * as service_tournament_shared_casualTournamentAdmin from "../service/tournament/shared/casualTournamentAdmin.js";
import type * as service_tournament_shared_casualTournamentTypes from "../service/tournament/shared/casualTournamentTypes.js";
import type * as service_tournament_submit_casualMatchBotPlanningContext from "../service/tournament/submit/casualMatchBotPlanningContext.js";
import type * as service_tournament_submit_casualMatchSubmitContext from "../service/tournament/submit/casualMatchSubmitContext.js";
import type * as service_tournament_submit_casualRunBridgeQueries from "../service/tournament/submit/casualRunBridgeQueries.js";
import type * as service_tournament_submit_casualRunIngestCore from "../service/tournament/submit/casualRunIngestCore.js";
import type * as service_tournament_submit_casualRunIngestHelpers from "../service/tournament/submit/casualRunIngestHelpers.js";
import type * as service_tournament_submit_casualRunIngestMutations from "../service/tournament/submit/casualRunIngestMutations.js";
import type * as shared_constants from "../shared/constants.js";
import type * as shared_durationFallback from "../shared/durationFallback.js";
import type * as shared_pseudoUnit from "../shared/pseudoUnit.js";
import type * as shared_rankSampling from "../shared/rankSampling.js";
import type * as shared_rankStatBuckets from "../shared/rankStatBuckets.js";
import type * as shared_scoreQuantiles from "../shared/scoreQuantiles.js";
import type * as utils_casualTaskPeriod from "../utils/casualTaskPeriod.js";

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
  crons: typeof crons;
  "custom/session": typeof custom_session;
  "dao/casualPlayerDao": typeof dao_casualPlayerDao;
  "data/casualActivityCatalog": typeof data_casualActivityCatalog;
  "data/casualAsyncLeaderboardRowState": typeof data_casualAsyncLeaderboardRowState;
  "data/casualFixedChestCatalog": typeof data_casualFixedChestCatalog;
  "data/casualInstanceWindow": typeof data_casualInstanceWindow;
  "data/casualMatchmakingConfig": typeof data_casualMatchmakingConfig;
  "data/casualMissionTemplates": typeof data_casualMissionTemplates;
  "data/casualPassRewards": typeof data_casualPassRewards;
  "data/casualPayoutPolicy": typeof data_casualPayoutPolicy;
  "data/casualPlayerStrategyConfig": typeof data_casualPlayerStrategyConfig;
  "data/casualPlayerStrategyTypes": typeof data_casualPlayerStrategyTypes;
  "data/casualSeasonLadderConfig": typeof data_casualSeasonLadderConfig;
  "data/casualSeedTierPolicy": typeof data_casualSeedTierPolicy;
  "data/casualShopCatalog": typeof data_casualShopCatalog;
  "data/casualSkinCatalog": typeof data_casualSkinCatalog;
  "data/casualSpotlightGame": typeof data_casualSpotlightGame;
  "data/casualTournamentConfigs": typeof data_casualTournamentConfigs;
  "data/casualTournamentRewardTypes": typeof data_casualTournamentRewardTypes;
  http: typeof http;
  "service/activity/casualActivityService": typeof service_activity_casualActivityService;
  "service/auth/casualAuth": typeof service_auth_casualAuth;
  "service/auth/jwtAccessSecret": typeof service_auth_jwtAccessSecret;
  "service/bridge/casualGameBridgeSecret": typeof service_bridge_casualGameBridgeSecret;
  "service/bridge/casualMatchSeedBridge": typeof service_bridge_casualMatchSeedBridge;
  "service/chest/casualFixedChestService": typeof service_chest_casualFixedChestService;
  "service/payout/casualPayoutDailyService": typeof service_payout_casualPayoutDailyService;
  "service/player/playerManager": typeof service_player_playerManager;
  "service/reward/casualRewardRegistry": typeof service_reward_casualRewardRegistry;
  "service/reward/casualRewardTypes": typeof service_reward_casualRewardTypes;
  "service/season/casualSeasonLadder": typeof service_season_casualSeasonLadder;
  "service/season/casualSeasonService": typeof service_season_casualSeasonService;
  "service/shop/casualShopService": typeof service_shop_casualShopService;
  "service/skin/casualSkinService": typeof service_skin_casualSkinService;
  "service/task/casualPrimaryGame": typeof service_task_casualPrimaryGame;
  "service/task/casualTaskService": typeof service_task_casualTaskService;
  "service/tournament/casualTournamentService": typeof service_tournament_casualTournamentService;
  "service/tournament/join/casualJoinMutations": typeof service_tournament_join_casualJoinMutations;
  "service/tournament/join/casualMatchSeedActions": typeof service_tournament_join_casualMatchSeedActions;
  "service/tournament/join/casualMatchSeedBinding": typeof service_tournament_join_casualMatchSeedBinding;
  "service/tournament/join/casualMatchSeedMutations": typeof service_tournament_join_casualMatchSeedMutations;
  "service/tournament/join/casualMatchmaking": typeof service_tournament_join_casualMatchmaking;
  "service/tournament/join/casualMatchmakingProfile": typeof service_tournament_join_casualMatchmakingProfile;
  "service/tournament/join/casualTournamentActions": typeof service_tournament_join_casualTournamentActions;
  "service/tournament/join/casualTournamentJoinCore": typeof service_tournament_join_casualTournamentJoinCore;
  "service/tournament/list/casualInstanceService": typeof service_tournament_list_casualInstanceService;
  "service/tournament/list/casualTournamentQueries": typeof service_tournament_list_casualTournamentQueries;
  "service/tournament/replay/casualReplayPassService": typeof service_tournament_replay_casualReplayPassService;
  "service/tournament/replay/casualReplayTokens": typeof service_tournament_replay_casualReplayTokens;
  "service/tournament/replay/casualRunReplay": typeof service_tournament_replay_casualRunReplay;
  "service/tournament/settle/async/casualAsyncBotPersist": typeof service_tournament_settle_async_casualAsyncBotPersist;
  "service/tournament/settle/async/casualAsyncBotReveal": typeof service_tournament_settle_async_casualAsyncBotReveal;
  "service/tournament/settle/async/casualAsyncTableSummary": typeof service_tournament_settle_async_casualAsyncTableSummary;
  "service/tournament/settle/async/casualAsyncTypes": typeof service_tournament_settle_async_casualAsyncTypes;
  "service/tournament/settle/casualRunExpireCron": typeof service_tournament_settle_casualRunExpireCron;
  "service/tournament/settle/casualRunMatchFinalize": typeof service_tournament_settle_casualRunMatchFinalize;
  "service/tournament/settle/casualRunRewardsMutations": typeof service_tournament_settle_casualRunRewardsMutations;
  "service/tournament/settle/casualRunScoreEffects": typeof service_tournament_settle_casualRunScoreEffects;
  "service/tournament/settle/casualRunSettlementFill": typeof service_tournament_settle_casualRunSettlementFill;
  "service/tournament/shared/casualPlayerMatchStatus": typeof service_tournament_shared_casualPlayerMatchStatus;
  "service/tournament/shared/casualPlayerTournamentRankStats": typeof service_tournament_shared_casualPlayerTournamentRankStats;
  "service/tournament/shared/casualRankStatBuckets": typeof service_tournament_shared_casualRankStatBuckets;
  "service/tournament/shared/casualRunSession": typeof service_tournament_shared_casualRunSession;
  "service/tournament/shared/casualTournamentAdmin": typeof service_tournament_shared_casualTournamentAdmin;
  "service/tournament/shared/casualTournamentTypes": typeof service_tournament_shared_casualTournamentTypes;
  "service/tournament/submit/casualMatchBotPlanningContext": typeof service_tournament_submit_casualMatchBotPlanningContext;
  "service/tournament/submit/casualMatchSubmitContext": typeof service_tournament_submit_casualMatchSubmitContext;
  "service/tournament/submit/casualRunBridgeQueries": typeof service_tournament_submit_casualRunBridgeQueries;
  "service/tournament/submit/casualRunIngestCore": typeof service_tournament_submit_casualRunIngestCore;
  "service/tournament/submit/casualRunIngestHelpers": typeof service_tournament_submit_casualRunIngestHelpers;
  "service/tournament/submit/casualRunIngestMutations": typeof service_tournament_submit_casualRunIngestMutations;
  "shared/constants": typeof shared_constants;
  "shared/durationFallback": typeof shared_durationFallback;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
  "shared/rankSampling": typeof shared_rankSampling;
  "shared/rankStatBuckets": typeof shared_rankStatBuckets;
  "shared/scoreQuantiles": typeof shared_scoreQuantiles;
  "utils/casualTaskPeriod": typeof utils_casualTaskPeriod;
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
