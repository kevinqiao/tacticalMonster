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
import type * as data_casualAchievementTemplates from "../data/casualAchievementTemplates.js";
import type * as data_casualActivityCatalog from "../data/casualActivityCatalog.js";
import type * as data_casualAsyncLeaderboardRowState from "../data/casualAsyncLeaderboardRowState.js";
import type * as data_casualFixedChestCatalog from "../data/casualFixedChestCatalog.js";
import type * as data_casualGameRegistry from "../data/casualGameRegistry.js";
import type * as data_casualInstanceWindow from "../data/casualInstanceWindow.js";
import type * as data_casualMatchmakingConfig from "../data/casualMatchmakingConfig.js";
import type * as data_casualMissionTemplates from "../data/casualMissionTemplates.js";
import type * as data_casualPassRewards from "../data/casualPassRewards.js";
import type * as data_casualPayoutPolicy from "../data/casualPayoutPolicy.js";
import type * as data_casualPlayerStrategyConfig from "../data/casualPlayerStrategyConfig.js";
import type * as data_casualPlayerStrategyTypes from "../data/casualPlayerStrategyTypes.js";
import type * as data_casualSeasonEconomyConstants from "../data/casualSeasonEconomyConstants.js";
import type * as data_casualSeedTierPolicy from "../data/casualSeedTierPolicy.js";
import type * as data_casualShopCatalog from "../data/casualShopCatalog.js";
import type * as data_casualSkinCatalog from "../data/casualSkinCatalog.js";
import type * as data_casualSpotlightGame from "../data/casualSpotlightGame.js";
import type * as data_casualTournamentConfigs from "../data/casualTournamentConfigs.js";
import type * as data_casualTournamentRewardTypes from "../data/casualTournamentRewardTypes.js";
import type * as data_casualWeeklyLeagueConfig from "../data/casualWeeklyLeagueConfig.js";
import type * as http from "../http.js";
import type * as service_achievement_casualAchievementService from "../service/achievement/casualAchievementService.js";
import type * as service_activity_casualActivityService from "../service/activity/casualActivityService.js";
import type * as service_auth_casualAuth from "../service/auth/casualAuth.js";
import type * as service_auth_jwtAccessSecret from "../service/auth/jwtAccessSecret.js";
import type * as service_botFill_botDifficultyConfig from "../service/botFill/botDifficultyConfig.js";
import type * as service_botFill_botRevealSchedule from "../service/botFill/botRevealSchedule.js";
import type * as service_botFill_botScoreSlots from "../service/botFill/botScoreSlots.js";
import type * as service_botFill_computeBotFillsCore from "../service/botFill/computeBotFillsCore.js";
import type * as service_botFill_durationFallback from "../service/botFill/durationFallback.js";
import type * as service_botFill_gameTypeConfig from "../service/botFill/gameTypeConfig.js";
import type * as service_botFill_rankSampling from "../service/botFill/rankSampling.js";
import type * as service_botFill_rolloutPick from "../service/botFill/rolloutPick.js";
import type * as service_botFill_seedRolloutBridge from "../service/botFill/seedRolloutBridge.js";
import type * as service_botFill_soloRankBand from "../service/botFill/soloRankBand.js";
import type * as service_botFill_soloRankRecommend from "../service/botFill/soloRankRecommend.js";
import type * as service_botFill_triathlonBotFill from "../service/botFill/triathlonBotFill.js";
import type * as service_bridge_casualGameBridgeContract from "../service/bridge/casualGameBridgeContract.js";
import type * as service_bridge_casualGameBridgeSecret from "../service/bridge/casualGameBridgeSecret.js";
import type * as service_bridge_casualMatchSeedBridge from "../service/bridge/casualMatchSeedBridge.js";
import type * as service_bridge_casualSeedProvider from "../service/bridge/casualSeedProvider.js";
import type * as service_chest_casualFixedChestService from "../service/chest/casualFixedChestService.js";
import type * as service_payout_casualPayoutDailyQueries from "../service/payout/casualPayoutDailyQueries.js";
import type * as service_payout_casualPayoutDailyService from "../service/payout/casualPayoutDailyService.js";
import type * as service_player_playerManager from "../service/player/playerManager.js";
import type * as service_reward_casualRewardRegistry from "../service/reward/casualRewardRegistry.js";
import type * as service_reward_casualRewardTypes from "../service/reward/casualRewardTypes.js";
import type * as service_season_casualSeasonService from "../service/season/casualSeasonService.js";
import type * as service_seedPool_catalogSeedHttp from "../service/seedPool/catalogSeedHttp.js";
import type * as service_seedPool_seedPoolAdmin from "../service/seedPool/seedPoolAdmin.js";
import type * as service_seedPool_seedPoolDevQueries from "../service/seedPool/seedPoolDevQueries.js";
import type * as service_seedPool_seedPoolQueries from "../service/seedPool/seedPoolQueries.js";
import type * as service_seedPool_seedPoolStore from "../service/seedPool/seedPoolStore.js";
import type * as service_seedPool_seedPoolValidators from "../service/seedPool/seedPoolValidators.js";
import type * as service_shop_casualShopPurchaseLimit from "../service/shop/casualShopPurchaseLimit.js";
import type * as service_shop_casualShopService from "../service/shop/casualShopService.js";
import type * as service_skin_casualSkinService from "../service/skin/casualSkinService.js";
import type * as service_task_casualMissionObjectiveDelta from "../service/task/casualMissionObjectiveDelta.js";
import type * as service_task_casualPrimaryGame from "../service/task/casualPrimaryGame.js";
import type * as service_task_casualTaskService from "../service/task/casualTaskService.js";
import type * as service_tournament_casualTournamentService from "../service/tournament/casualTournamentService.js";
import type * as service_tournament_join_casualJoinMutations from "../service/tournament/join/casualJoinMutations.js";
import type * as service_tournament_join_casualMatchSeedBinding from "../service/tournament/join/casualMatchSeedBinding.js";
import type * as service_tournament_join_casualMatchmaking from "../service/tournament/join/casualMatchmaking.js";
import type * as service_tournament_join_casualMatchmakingCore from "../service/tournament/join/casualMatchmakingCore.js";
import type * as service_tournament_join_casualMatchmakingProfile from "../service/tournament/join/casualMatchmakingProfile.js";
import type * as service_tournament_join_casualOpenTableActions from "../service/tournament/join/casualOpenTableActions.js";
import type * as service_tournament_join_casualOpenTableGuard from "../service/tournament/join/casualOpenTableGuard.js";
import type * as service_tournament_join_casualOpenTableMutations from "../service/tournament/join/casualOpenTableMutations.js";
import type * as service_tournament_join_casualTournamentActions from "../service/tournament/join/casualTournamentActions.js";
import type * as service_tournament_join_casualTournamentJoinCore from "../service/tournament/join/casualTournamentJoinCore.js";
import type * as service_tournament_list_casualInstanceService from "../service/tournament/list/casualInstanceService.js";
import type * as service_tournament_list_casualTournamentQueries from "../service/tournament/list/casualTournamentQueries.js";
import type * as service_tournament_replay_casualReplayPassService from "../service/tournament/replay/casualReplayPassService.js";
import type * as service_tournament_replay_casualReplayTokens from "../service/tournament/replay/casualReplayTokens.js";
import type * as service_tournament_replay_casualRunReplay from "../service/tournament/replay/casualRunReplay.js";
import type * as service_tournament_settle_async_casualAsyncBotDueTime from "../service/tournament/settle/async/casualAsyncBotDueTime.js";
import type * as service_tournament_settle_async_casualAsyncBotPersist from "../service/tournament/settle/async/casualAsyncBotPersist.js";
import type * as service_tournament_settle_async_casualAsyncBotReveal from "../service/tournament/settle/async/casualAsyncBotReveal.js";
import type * as service_tournament_settle_async_casualAsyncTableSummary from "../service/tournament/settle/async/casualAsyncTableSummary.js";
import type * as service_tournament_settle_async_casualAsyncTypes from "../service/tournament/settle/async/casualAsyncTypes.js";
import type * as service_tournament_settle_casualAsyncMatchFinalizeSchedule from "../service/tournament/settle/casualAsyncMatchFinalizeSchedule.js";
import type * as service_tournament_settle_casualOpenRunSettleCheck from "../service/tournament/settle/casualOpenRunSettleCheck.js";
import type * as service_tournament_settle_casualOpenRunSettleCheckAction from "../service/tournament/settle/casualOpenRunSettleCheckAction.js";
import type * as service_tournament_settle_casualRunExpireCron from "../service/tournament/settle/casualRunExpireCron.js";
import type * as service_tournament_settle_casualRunMatchFinalize from "../service/tournament/settle/casualRunMatchFinalize.js";
import type * as service_tournament_settle_casualRunRewardsMutations from "../service/tournament/settle/casualRunRewardsMutations.js";
import type * as service_tournament_settle_casualRunScoreEffects from "../service/tournament/settle/casualRunScoreEffects.js";
import type * as service_tournament_settle_casualRunSettlementFill from "../service/tournament/settle/casualRunSettlementFill.js";
import type * as service_tournament_shared_casualPlayerGameTypes from "../service/tournament/shared/casualPlayerGameTypes.js";
import type * as service_tournament_shared_casualPlayerMatchStatus from "../service/tournament/shared/casualPlayerMatchStatus.js";
import type * as service_tournament_shared_casualPlayerTournamentRankStats from "../service/tournament/shared/casualPlayerTournamentRankStats.js";
import type * as service_tournament_shared_casualRankStatBuckets from "../service/tournament/shared/casualRankStatBuckets.js";
import type * as service_tournament_shared_casualRunSession from "../service/tournament/shared/casualRunSession.js";
import type * as service_tournament_shared_casualSessionOpenCore from "../service/tournament/shared/casualSessionOpenCore.js";
import type * as service_tournament_shared_casualTournamentAdmin from "../service/tournament/shared/casualTournamentAdmin.js";
import type * as service_tournament_shared_casualTournamentTypes from "../service/tournament/shared/casualTournamentTypes.js";
import type * as service_tournament_shared_casualWatchReplaySnapshot from "../service/tournament/shared/casualWatchReplaySnapshot.js";
import type * as service_tournament_submit_casualMatchBotPlanningContext from "../service/tournament/submit/casualMatchBotPlanningContext.js";
import type * as service_tournament_submit_casualMatchSubmitContext from "../service/tournament/submit/casualMatchSubmitContext.js";
import type * as service_tournament_submit_casualPlayerGameIngest from "../service/tournament/submit/casualPlayerGameIngest.js";
import type * as service_tournament_submit_casualRunBridgeQueries from "../service/tournament/submit/casualRunBridgeQueries.js";
import type * as service_tournament_submit_casualRunIngestCore from "../service/tournament/submit/casualRunIngestCore.js";
import type * as service_tournament_submit_casualRunIngestHelpers from "../service/tournament/submit/casualRunIngestHelpers.js";
import type * as service_tournament_submit_casualRunIngestMutations from "../service/tournament/submit/casualRunIngestMutations.js";
import type * as service_weeklyLeague_casualWeeklyLeagueBotFill from "../service/weeklyLeague/casualWeeklyLeagueBotFill.js";
import type * as service_weeklyLeague_casualWeeklyLeagueBotReveal from "../service/weeklyLeague/casualWeeklyLeagueBotReveal.js";
import type * as service_weeklyLeague_casualWeeklyLeagueBotXp from "../service/weeklyLeague/casualWeeklyLeagueBotXp.js";
import type * as service_weeklyLeague_casualWeeklyLeagueClose from "../service/weeklyLeague/casualWeeklyLeagueClose.js";
import type * as service_weeklyLeague_casualWeeklyLeagueCohort from "../service/weeklyLeague/casualWeeklyLeagueCohort.js";
import type * as service_weeklyLeague_casualWeeklyLeagueDev from "../service/weeklyLeague/casualWeeklyLeagueDev.js";
import type * as service_weeklyLeague_casualWeeklyLeagueProfile from "../service/weeklyLeague/casualWeeklyLeagueProfile.js";
import type * as service_weeklyLeague_casualWeeklyLeagueQueries from "../service/weeklyLeague/casualWeeklyLeagueQueries.js";
import type * as service_weeklyLeague_casualWeeklyLeagueService from "../service/weeklyLeague/casualWeeklyLeagueService.js";
import type * as service_weeklyLeague_casualWeeklyLeagueSettle from "../service/weeklyLeague/casualWeeklyLeagueSettle.js";
import type * as service_weeklyLeague_casualWeeklyLeagueXp from "../service/weeklyLeague/casualWeeklyLeagueXp.js";
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
  "data/casualAchievementTemplates": typeof data_casualAchievementTemplates;
  "data/casualActivityCatalog": typeof data_casualActivityCatalog;
  "data/casualAsyncLeaderboardRowState": typeof data_casualAsyncLeaderboardRowState;
  "data/casualFixedChestCatalog": typeof data_casualFixedChestCatalog;
  "data/casualGameRegistry": typeof data_casualGameRegistry;
  "data/casualInstanceWindow": typeof data_casualInstanceWindow;
  "data/casualMatchmakingConfig": typeof data_casualMatchmakingConfig;
  "data/casualMissionTemplates": typeof data_casualMissionTemplates;
  "data/casualPassRewards": typeof data_casualPassRewards;
  "data/casualPayoutPolicy": typeof data_casualPayoutPolicy;
  "data/casualPlayerStrategyConfig": typeof data_casualPlayerStrategyConfig;
  "data/casualPlayerStrategyTypes": typeof data_casualPlayerStrategyTypes;
  "data/casualSeasonEconomyConstants": typeof data_casualSeasonEconomyConstants;
  "data/casualSeedTierPolicy": typeof data_casualSeedTierPolicy;
  "data/casualShopCatalog": typeof data_casualShopCatalog;
  "data/casualSkinCatalog": typeof data_casualSkinCatalog;
  "data/casualSpotlightGame": typeof data_casualSpotlightGame;
  "data/casualTournamentConfigs": typeof data_casualTournamentConfigs;
  "data/casualTournamentRewardTypes": typeof data_casualTournamentRewardTypes;
  "data/casualWeeklyLeagueConfig": typeof data_casualWeeklyLeagueConfig;
  http: typeof http;
  "service/achievement/casualAchievementService": typeof service_achievement_casualAchievementService;
  "service/activity/casualActivityService": typeof service_activity_casualActivityService;
  "service/auth/casualAuth": typeof service_auth_casualAuth;
  "service/auth/jwtAccessSecret": typeof service_auth_jwtAccessSecret;
  "service/botFill/botDifficultyConfig": typeof service_botFill_botDifficultyConfig;
  "service/botFill/botRevealSchedule": typeof service_botFill_botRevealSchedule;
  "service/botFill/botScoreSlots": typeof service_botFill_botScoreSlots;
  "service/botFill/computeBotFillsCore": typeof service_botFill_computeBotFillsCore;
  "service/botFill/durationFallback": typeof service_botFill_durationFallback;
  "service/botFill/gameTypeConfig": typeof service_botFill_gameTypeConfig;
  "service/botFill/rankSampling": typeof service_botFill_rankSampling;
  "service/botFill/rolloutPick": typeof service_botFill_rolloutPick;
  "service/botFill/seedRolloutBridge": typeof service_botFill_seedRolloutBridge;
  "service/botFill/soloRankBand": typeof service_botFill_soloRankBand;
  "service/botFill/soloRankRecommend": typeof service_botFill_soloRankRecommend;
  "service/botFill/triathlonBotFill": typeof service_botFill_triathlonBotFill;
  "service/bridge/casualGameBridgeContract": typeof service_bridge_casualGameBridgeContract;
  "service/bridge/casualGameBridgeSecret": typeof service_bridge_casualGameBridgeSecret;
  "service/bridge/casualMatchSeedBridge": typeof service_bridge_casualMatchSeedBridge;
  "service/bridge/casualSeedProvider": typeof service_bridge_casualSeedProvider;
  "service/chest/casualFixedChestService": typeof service_chest_casualFixedChestService;
  "service/payout/casualPayoutDailyQueries": typeof service_payout_casualPayoutDailyQueries;
  "service/payout/casualPayoutDailyService": typeof service_payout_casualPayoutDailyService;
  "service/player/playerManager": typeof service_player_playerManager;
  "service/reward/casualRewardRegistry": typeof service_reward_casualRewardRegistry;
  "service/reward/casualRewardTypes": typeof service_reward_casualRewardTypes;
  "service/season/casualSeasonService": typeof service_season_casualSeasonService;
  "service/seedPool/catalogSeedHttp": typeof service_seedPool_catalogSeedHttp;
  "service/seedPool/seedPoolAdmin": typeof service_seedPool_seedPoolAdmin;
  "service/seedPool/seedPoolDevQueries": typeof service_seedPool_seedPoolDevQueries;
  "service/seedPool/seedPoolQueries": typeof service_seedPool_seedPoolQueries;
  "service/seedPool/seedPoolStore": typeof service_seedPool_seedPoolStore;
  "service/seedPool/seedPoolValidators": typeof service_seedPool_seedPoolValidators;
  "service/shop/casualShopPurchaseLimit": typeof service_shop_casualShopPurchaseLimit;
  "service/shop/casualShopService": typeof service_shop_casualShopService;
  "service/skin/casualSkinService": typeof service_skin_casualSkinService;
  "service/task/casualMissionObjectiveDelta": typeof service_task_casualMissionObjectiveDelta;
  "service/task/casualPrimaryGame": typeof service_task_casualPrimaryGame;
  "service/task/casualTaskService": typeof service_task_casualTaskService;
  "service/tournament/casualTournamentService": typeof service_tournament_casualTournamentService;
  "service/tournament/join/casualJoinMutations": typeof service_tournament_join_casualJoinMutations;
  "service/tournament/join/casualMatchSeedBinding": typeof service_tournament_join_casualMatchSeedBinding;
  "service/tournament/join/casualMatchmaking": typeof service_tournament_join_casualMatchmaking;
  "service/tournament/join/casualMatchmakingCore": typeof service_tournament_join_casualMatchmakingCore;
  "service/tournament/join/casualMatchmakingProfile": typeof service_tournament_join_casualMatchmakingProfile;
  "service/tournament/join/casualOpenTableActions": typeof service_tournament_join_casualOpenTableActions;
  "service/tournament/join/casualOpenTableGuard": typeof service_tournament_join_casualOpenTableGuard;
  "service/tournament/join/casualOpenTableMutations": typeof service_tournament_join_casualOpenTableMutations;
  "service/tournament/join/casualTournamentActions": typeof service_tournament_join_casualTournamentActions;
  "service/tournament/join/casualTournamentJoinCore": typeof service_tournament_join_casualTournamentJoinCore;
  "service/tournament/list/casualInstanceService": typeof service_tournament_list_casualInstanceService;
  "service/tournament/list/casualTournamentQueries": typeof service_tournament_list_casualTournamentQueries;
  "service/tournament/replay/casualReplayPassService": typeof service_tournament_replay_casualReplayPassService;
  "service/tournament/replay/casualReplayTokens": typeof service_tournament_replay_casualReplayTokens;
  "service/tournament/replay/casualRunReplay": typeof service_tournament_replay_casualRunReplay;
  "service/tournament/settle/async/casualAsyncBotDueTime": typeof service_tournament_settle_async_casualAsyncBotDueTime;
  "service/tournament/settle/async/casualAsyncBotPersist": typeof service_tournament_settle_async_casualAsyncBotPersist;
  "service/tournament/settle/async/casualAsyncBotReveal": typeof service_tournament_settle_async_casualAsyncBotReveal;
  "service/tournament/settle/async/casualAsyncTableSummary": typeof service_tournament_settle_async_casualAsyncTableSummary;
  "service/tournament/settle/async/casualAsyncTypes": typeof service_tournament_settle_async_casualAsyncTypes;
  "service/tournament/settle/casualAsyncMatchFinalizeSchedule": typeof service_tournament_settle_casualAsyncMatchFinalizeSchedule;
  "service/tournament/settle/casualOpenRunSettleCheck": typeof service_tournament_settle_casualOpenRunSettleCheck;
  "service/tournament/settle/casualOpenRunSettleCheckAction": typeof service_tournament_settle_casualOpenRunSettleCheckAction;
  "service/tournament/settle/casualRunExpireCron": typeof service_tournament_settle_casualRunExpireCron;
  "service/tournament/settle/casualRunMatchFinalize": typeof service_tournament_settle_casualRunMatchFinalize;
  "service/tournament/settle/casualRunRewardsMutations": typeof service_tournament_settle_casualRunRewardsMutations;
  "service/tournament/settle/casualRunScoreEffects": typeof service_tournament_settle_casualRunScoreEffects;
  "service/tournament/settle/casualRunSettlementFill": typeof service_tournament_settle_casualRunSettlementFill;
  "service/tournament/shared/casualPlayerGameTypes": typeof service_tournament_shared_casualPlayerGameTypes;
  "service/tournament/shared/casualPlayerMatchStatus": typeof service_tournament_shared_casualPlayerMatchStatus;
  "service/tournament/shared/casualPlayerTournamentRankStats": typeof service_tournament_shared_casualPlayerTournamentRankStats;
  "service/tournament/shared/casualRankStatBuckets": typeof service_tournament_shared_casualRankStatBuckets;
  "service/tournament/shared/casualRunSession": typeof service_tournament_shared_casualRunSession;
  "service/tournament/shared/casualSessionOpenCore": typeof service_tournament_shared_casualSessionOpenCore;
  "service/tournament/shared/casualTournamentAdmin": typeof service_tournament_shared_casualTournamentAdmin;
  "service/tournament/shared/casualTournamentTypes": typeof service_tournament_shared_casualTournamentTypes;
  "service/tournament/shared/casualWatchReplaySnapshot": typeof service_tournament_shared_casualWatchReplaySnapshot;
  "service/tournament/submit/casualMatchBotPlanningContext": typeof service_tournament_submit_casualMatchBotPlanningContext;
  "service/tournament/submit/casualMatchSubmitContext": typeof service_tournament_submit_casualMatchSubmitContext;
  "service/tournament/submit/casualPlayerGameIngest": typeof service_tournament_submit_casualPlayerGameIngest;
  "service/tournament/submit/casualRunBridgeQueries": typeof service_tournament_submit_casualRunBridgeQueries;
  "service/tournament/submit/casualRunIngestCore": typeof service_tournament_submit_casualRunIngestCore;
  "service/tournament/submit/casualRunIngestHelpers": typeof service_tournament_submit_casualRunIngestHelpers;
  "service/tournament/submit/casualRunIngestMutations": typeof service_tournament_submit_casualRunIngestMutations;
  "service/weeklyLeague/casualWeeklyLeagueBotFill": typeof service_weeklyLeague_casualWeeklyLeagueBotFill;
  "service/weeklyLeague/casualWeeklyLeagueBotReveal": typeof service_weeklyLeague_casualWeeklyLeagueBotReveal;
  "service/weeklyLeague/casualWeeklyLeagueBotXp": typeof service_weeklyLeague_casualWeeklyLeagueBotXp;
  "service/weeklyLeague/casualWeeklyLeagueClose": typeof service_weeklyLeague_casualWeeklyLeagueClose;
  "service/weeklyLeague/casualWeeklyLeagueCohort": typeof service_weeklyLeague_casualWeeklyLeagueCohort;
  "service/weeklyLeague/casualWeeklyLeagueDev": typeof service_weeklyLeague_casualWeeklyLeagueDev;
  "service/weeklyLeague/casualWeeklyLeagueProfile": typeof service_weeklyLeague_casualWeeklyLeagueProfile;
  "service/weeklyLeague/casualWeeklyLeagueQueries": typeof service_weeklyLeague_casualWeeklyLeagueQueries;
  "service/weeklyLeague/casualWeeklyLeagueService": typeof service_weeklyLeague_casualWeeklyLeagueService;
  "service/weeklyLeague/casualWeeklyLeagueSettle": typeof service_weeklyLeague_casualWeeklyLeagueSettle;
  "service/weeklyLeague/casualWeeklyLeagueXp": typeof service_weeklyLeague_casualWeeklyLeagueXp;
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
