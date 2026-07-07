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
import type * as dao_portalPlayerDao from "../dao/portalPlayerDao.js";
import type * as data_casualAsyncLeaderboardRowState from "../data/casualAsyncLeaderboardRowState.js";
import type * as data_casualMatchmakingConfig from "../data/casualMatchmakingConfig.js";
import type * as data_casualPayoutPolicy from "../data/casualPayoutPolicy.js";
import type * as data_casualPlayerStrategyTypes from "../data/casualPlayerStrategyTypes.js";
import type * as data_casualSeedTierPolicy from "../data/casualSeedTierPolicy.js";
import type * as data_casualTournamentRewardTypes from "../data/casualTournamentRewardTypes.js";
import type * as data_casualWeeklyLeagueConfig from "../data/casualWeeklyLeagueConfig.js";
import type * as data_portalAsyncLeaderboardRowState from "../data/portalAsyncLeaderboardRowState.js";
import type * as data_portalGameRegistry from "../data/portalGameRegistry.js";
import type * as data_portalGiftCardEconomy from "../data/portalGiftCardEconomy.js";
import type * as data_portalInstanceWindow from "../data/portalInstanceWindow.js";
import type * as data_portalMatchmakingConfig from "../data/portalMatchmakingConfig.js";
import type * as data_portalPlayerStrategyTypes from "../data/portalPlayerStrategyTypes.js";
import type * as data_portalSeedTierPolicy from "../data/portalSeedTierPolicy.js";
import type * as data_portalShopCatalog from "../data/portalShopCatalog.js";
import type * as data_portalShopPartner from "../data/portalShopPartner.js";
import type * as data_portalTournamentConfigs from "../data/portalTournamentConfigs.js";
import type * as data_portalTournamentRewardTypes from "../data/portalTournamentRewardTypes.js";
import type * as data_portalWeeklyBoardBotConfig from "../data/portalWeeklyBoardBotConfig.js";
import type * as data_portalWeeklyLeagueConfig from "../data/portalWeeklyLeagueConfig.js";
import type * as http from "../http.js";
import type * as service_activity_casualActivityService from "../service/activity/casualActivityService.js";
import type * as service_auth_jwtAccessSecret from "../service/auth/jwtAccessSecret.js";
import type * as service_auth_platformJwtVerify from "../service/auth/platformJwtVerify.js";
import type * as service_auth_portalAuth from "../service/auth/portalAuth.js";
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
import type * as service_botFill_soloRankEnforce from "../service/botFill/soloRankEnforce.js";
import type * as service_botFill_soloRankRecommend from "../service/botFill/soloRankRecommend.js";
import type * as service_botFill_triathlonBotFill from "../service/botFill/triathlonBotFill.js";
import type * as service_botPersona_portalBotPersonaDefaults from "../service/botPersona/portalBotPersonaDefaults.js";
import type * as service_botPersona_portalBotPersonaService from "../service/botPersona/portalBotPersonaService.js";
import type * as service_bridge_casualGameBridgeContract from "../service/bridge/casualGameBridgeContract.js";
import type * as service_bridge_casualGameBridgeSecret from "../service/bridge/casualGameBridgeSecret.js";
import type * as service_bridge_casualMatchSeedBridge from "../service/bridge/casualMatchSeedBridge.js";
import type * as service_bridge_casualSeedProvider from "../service/bridge/casualSeedProvider.js";
import type * as service_bridge_merchantCampaignBridge from "../service/bridge/merchantCampaignBridge.js";
import type * as service_bridge_merchantCampaignBridgeActions from "../service/bridge/merchantCampaignBridgeActions.js";
import type * as service_bridge_merchantCampaignBridgeEnv from "../service/bridge/merchantCampaignBridgeEnv.js";
import type * as service_giftcard_giftCardActions from "../service/giftcard/giftCardActions.js";
import type * as service_giftcard_giftCardDevHarness from "../service/giftcard/giftCardDevHarness.js";
import type * as service_giftcard_giftCardEligibility from "../service/giftcard/giftCardEligibility.js";
import type * as service_giftcard_giftCardFulfillmentAction from "../service/giftcard/giftCardFulfillmentAction.js";
import type * as service_giftcard_giftCardOrderDao from "../service/giftcard/giftCardOrderDao.js";
import type * as service_giftcard_giftCardQueries from "../service/giftcard/giftCardQueries.js";
import type * as service_giftcard_tangoClient from "../service/giftcard/tangoClient.js";
import type * as service_giftcard_tangoTypes from "../service/giftcard/tangoTypes.js";
import type * as service_player_playerManager from "../service/player/playerManager.js";
import type * as service_points_portalLeaderboardMerge from "../service/points/portalLeaderboardMerge.js";
import type * as service_points_portalLeaderboardQueries from "../service/points/portalLeaderboardQueries.js";
import type * as service_points_portalWeeklyBoardBotFill from "../service/points/portalWeeklyBoardBotFill.js";
import type * as service_points_portalWeeklyBoardBotPoints from "../service/points/portalWeeklyBoardBotPoints.js";
import type * as service_points_portalWeeklyBoardBotReveal from "../service/points/portalWeeklyBoardBotReveal.js";
import type * as service_points_portalWeeklyPointsService from "../service/points/portalWeeklyPointsService.js";
import type * as service_points_portalWeeklyTotalPointsService from "../service/points/portalWeeklyTotalPointsService.js";
import type * as service_reward_casualRewardRegistry from "../service/reward/casualRewardRegistry.js";
import type * as service_season_casualSeasonService from "../service/season/casualSeasonService.js";
import type * as service_seedPool_catalogSeedHttp from "../service/seedPool/catalogSeedHttp.js";
import type * as service_seedPool_seedPoolAdmin from "../service/seedPool/seedPoolAdmin.js";
import type * as service_seedPool_seedPoolDevQueries from "../service/seedPool/seedPoolDevQueries.js";
import type * as service_seedPool_seedPoolQueries from "../service/seedPool/seedPoolQueries.js";
import type * as service_seedPool_seedPoolStore from "../service/seedPool/seedPoolStore.js";
import type * as service_seedPool_seedPoolValidators from "../service/seedPool/seedPoolValidators.js";
import type * as service_shop_portalShopService from "../service/shop/portalShopService.js";
import type * as service_task_casualTaskService from "../service/task/casualTaskService.js";
import type * as service_tournament_casualTournamentService from "../service/tournament/casualTournamentService.js";
import type * as service_tournament_join_campaignDailyPlayLimit from "../service/tournament/join/campaignDailyPlayLimit.js";
import type * as service_tournament_join_campaignPlayHistory from "../service/tournament/join/campaignPlayHistory.js";
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
import type * as service_tournament_join_portalTournamentJoinCore from "../service/tournament/join/portalTournamentJoinCore.js";
import type * as service_tournament_list_casualInstanceService from "../service/tournament/list/casualInstanceService.js";
import type * as service_tournament_list_casualTournamentQueries from "../service/tournament/list/casualTournamentQueries.js";
import type * as service_tournament_list_portalInstanceService from "../service/tournament/list/portalInstanceService.js";
import type * as service_tournament_replay_casualReplayPassService from "../service/tournament/replay/casualReplayPassService.js";
import type * as service_tournament_replay_casualReplayTokens from "../service/tournament/replay/casualReplayTokens.js";
import type * as service_tournament_replay_casualRunReplay from "../service/tournament/replay/casualRunReplay.js";
import type * as service_tournament_settle_async_casualAsyncBotDueTime from "../service/tournament/settle/async/casualAsyncBotDueTime.js";
import type * as service_tournament_settle_async_casualAsyncBotPersist from "../service/tournament/settle/async/casualAsyncBotPersist.js";
import type * as service_tournament_settle_async_casualAsyncBotReveal from "../service/tournament/settle/async/casualAsyncBotReveal.js";
import type * as service_tournament_settle_async_casualAsyncTableSummary from "../service/tournament/settle/async/casualAsyncTableSummary.js";
import type * as service_tournament_settle_async_casualAsyncTypes from "../service/tournament/settle/async/casualAsyncTypes.js";
import type * as service_tournament_settle_campaignBridgeNotify from "../service/tournament/settle/campaignBridgeNotify.js";
import type * as service_tournament_settle_casualArenaForceEnd from "../service/tournament/settle/casualArenaForceEnd.js";
import type * as service_tournament_settle_casualAsyncMatchFinalizeSchedule from "../service/tournament/settle/casualAsyncMatchFinalizeSchedule.js";
import type * as service_tournament_settle_casualHistorySettleReconcile from "../service/tournament/settle/casualHistorySettleReconcile.js";
import type * as service_tournament_settle_casualOpenRunReconcileAction from "../service/tournament/settle/casualOpenRunReconcileAction.js";
import type * as service_tournament_settle_casualOpenRunReconcileQueries from "../service/tournament/settle/casualOpenRunReconcileQueries.js";
import type * as service_tournament_settle_casualOpenRunSettleCheck from "../service/tournament/settle/casualOpenRunSettleCheck.js";
import type * as service_tournament_settle_casualOpenRunSettleCheckAction from "../service/tournament/settle/casualOpenRunSettleCheckAction.js";
import type * as service_tournament_settle_casualRunExpireCron from "../service/tournament/settle/casualRunExpireCron.js";
import type * as service_tournament_settle_casualRunMatchFinalize from "../service/tournament/settle/casualRunMatchFinalize.js";
import type * as service_tournament_settle_casualRunRewardsMutations from "../service/tournament/settle/casualRunRewardsMutations.js";
import type * as service_tournament_settle_casualRunScoreEffects from "../service/tournament/settle/casualRunScoreEffects.js";
import type * as service_tournament_settle_casualRunSettlementFill from "../service/tournament/settle/casualRunSettlementFill.js";
import type * as service_tournament_settle_portalRunScoreEffects from "../service/tournament/settle/portalRunScoreEffects.js";
import type * as service_tournament_shared_casualPlayerGameTypes from "../service/tournament/shared/casualPlayerGameTypes.js";
import type * as service_tournament_shared_casualPlayerMatchStatus from "../service/tournament/shared/casualPlayerMatchStatus.js";
import type * as service_tournament_shared_casualPlayerTournamentRankStats from "../service/tournament/shared/casualPlayerTournamentRankStats.js";
import type * as service_tournament_shared_casualRankStatBuckets from "../service/tournament/shared/casualRankStatBuckets.js";
import type * as service_tournament_shared_casualRunSession from "../service/tournament/shared/casualRunSession.js";
import type * as service_tournament_shared_casualSessionOpenCore from "../service/tournament/shared/casualSessionOpenCore.js";
import type * as service_tournament_shared_casualTournamentTypes from "../service/tournament/shared/casualTournamentTypes.js";
import type * as service_tournament_shared_casualWatchReplaySnapshot from "../service/tournament/shared/casualWatchReplaySnapshot.js";
import type * as service_tournament_shared_portalRunMatchShell from "../service/tournament/shared/portalRunMatchShell.js";
import type * as service_tournament_shared_portalRunMatchShellAdmin from "../service/tournament/shared/portalRunMatchShellAdmin.js";
import type * as service_tournament_submit_casualIngestPlatformBotFill from "../service/tournament/submit/casualIngestPlatformBotFill.js";
import type * as service_tournament_submit_casualIngestTiming from "../service/tournament/submit/casualIngestTiming.js";
import type * as service_tournament_submit_casualMatchBotPlanningContext from "../service/tournament/submit/casualMatchBotPlanningContext.js";
import type * as service_tournament_submit_casualMatchSubmitContext from "../service/tournament/submit/casualMatchSubmitContext.js";
import type * as service_tournament_submit_casualPlayerGameIngest from "../service/tournament/submit/casualPlayerGameIngest.js";
import type * as service_tournament_submit_casualRunBridgeQueries from "../service/tournament/submit/casualRunBridgeQueries.js";
import type * as service_tournament_submit_casualRunIngestCore from "../service/tournament/submit/casualRunIngestCore.js";
import type * as service_tournament_submit_casualRunIngestHelpers from "../service/tournament/submit/casualRunIngestHelpers.js";
import type * as service_tournament_submit_casualRunIngestMutations from "../service/tournament/submit/casualRunIngestMutations.js";
import type * as service_weeklyLeague_casualWeeklyLeagueProfile from "../service/weeklyLeague/casualWeeklyLeagueProfile.js";
import type * as service_weeklyLeague_casualWeeklyLeagueService from "../service/weeklyLeague/casualWeeklyLeagueService.js";
import type * as service_weeklyLeague_casualWeeklyLeagueSettle from "../service/weeklyLeague/casualWeeklyLeagueSettle.js";
import type * as service_weeklyLeague_casualWeeklyLeagueXp from "../service/weeklyLeague/casualWeeklyLeagueXp.js";
import type * as service_weeklyLeague_portalWeeklyLeagueBotFill from "../service/weeklyLeague/portalWeeklyLeagueBotFill.js";
import type * as service_weeklyLeague_portalWeeklyLeagueBotPoints from "../service/weeklyLeague/portalWeeklyLeagueBotPoints.js";
import type * as service_weeklyLeague_portalWeeklyLeagueBotReveal from "../service/weeklyLeague/portalWeeklyLeagueBotReveal.js";
import type * as service_weeklyLeague_portalWeeklyLeagueClose from "../service/weeklyLeague/portalWeeklyLeagueClose.js";
import type * as service_weeklyLeague_portalWeeklyLeagueCohort from "../service/weeklyLeague/portalWeeklyLeagueCohort.js";
import type * as service_weeklyLeague_portalWeeklyLeagueDev from "../service/weeklyLeague/portalWeeklyLeagueDev.js";
import type * as service_weeklyLeague_portalWeeklyLeagueMemberSync from "../service/weeklyLeague/portalWeeklyLeagueMemberSync.js";
import type * as service_weeklyLeague_portalWeeklyLeagueQueries from "../service/weeklyLeague/portalWeeklyLeagueQueries.js";
import type * as service_weeklyLeague_portalWeeklyLeagueService from "../service/weeklyLeague/portalWeeklyLeagueService.js";
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

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "custom/session": typeof custom_session;
  "dao/casualPlayerDao": typeof dao_casualPlayerDao;
  "dao/portalPlayerDao": typeof dao_portalPlayerDao;
  "data/casualAsyncLeaderboardRowState": typeof data_casualAsyncLeaderboardRowState;
  "data/casualMatchmakingConfig": typeof data_casualMatchmakingConfig;
  "data/casualPayoutPolicy": typeof data_casualPayoutPolicy;
  "data/casualPlayerStrategyTypes": typeof data_casualPlayerStrategyTypes;
  "data/casualSeedTierPolicy": typeof data_casualSeedTierPolicy;
  "data/casualTournamentRewardTypes": typeof data_casualTournamentRewardTypes;
  "data/casualWeeklyLeagueConfig": typeof data_casualWeeklyLeagueConfig;
  "data/portalAsyncLeaderboardRowState": typeof data_portalAsyncLeaderboardRowState;
  "data/portalGameRegistry": typeof data_portalGameRegistry;
  "data/portalGiftCardEconomy": typeof data_portalGiftCardEconomy;
  "data/portalInstanceWindow": typeof data_portalInstanceWindow;
  "data/portalMatchmakingConfig": typeof data_portalMatchmakingConfig;
  "data/portalPlayerStrategyTypes": typeof data_portalPlayerStrategyTypes;
  "data/portalSeedTierPolicy": typeof data_portalSeedTierPolicy;
  "data/portalShopCatalog": typeof data_portalShopCatalog;
  "data/portalShopPartner": typeof data_portalShopPartner;
  "data/portalTournamentConfigs": typeof data_portalTournamentConfigs;
  "data/portalTournamentRewardTypes": typeof data_portalTournamentRewardTypes;
  "data/portalWeeklyBoardBotConfig": typeof data_portalWeeklyBoardBotConfig;
  "data/portalWeeklyLeagueConfig": typeof data_portalWeeklyLeagueConfig;
  http: typeof http;
  "service/activity/casualActivityService": typeof service_activity_casualActivityService;
  "service/auth/jwtAccessSecret": typeof service_auth_jwtAccessSecret;
  "service/auth/platformJwtVerify": typeof service_auth_platformJwtVerify;
  "service/auth/portalAuth": typeof service_auth_portalAuth;
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
  "service/botFill/soloRankEnforce": typeof service_botFill_soloRankEnforce;
  "service/botFill/soloRankRecommend": typeof service_botFill_soloRankRecommend;
  "service/botFill/triathlonBotFill": typeof service_botFill_triathlonBotFill;
  "service/botPersona/portalBotPersonaDefaults": typeof service_botPersona_portalBotPersonaDefaults;
  "service/botPersona/portalBotPersonaService": typeof service_botPersona_portalBotPersonaService;
  "service/bridge/casualGameBridgeContract": typeof service_bridge_casualGameBridgeContract;
  "service/bridge/casualGameBridgeSecret": typeof service_bridge_casualGameBridgeSecret;
  "service/bridge/casualMatchSeedBridge": typeof service_bridge_casualMatchSeedBridge;
  "service/bridge/casualSeedProvider": typeof service_bridge_casualSeedProvider;
  "service/bridge/merchantCampaignBridge": typeof service_bridge_merchantCampaignBridge;
  "service/bridge/merchantCampaignBridgeActions": typeof service_bridge_merchantCampaignBridgeActions;
  "service/bridge/merchantCampaignBridgeEnv": typeof service_bridge_merchantCampaignBridgeEnv;
  "service/giftcard/giftCardActions": typeof service_giftcard_giftCardActions;
  "service/giftcard/giftCardDevHarness": typeof service_giftcard_giftCardDevHarness;
  "service/giftcard/giftCardEligibility": typeof service_giftcard_giftCardEligibility;
  "service/giftcard/giftCardFulfillmentAction": typeof service_giftcard_giftCardFulfillmentAction;
  "service/giftcard/giftCardOrderDao": typeof service_giftcard_giftCardOrderDao;
  "service/giftcard/giftCardQueries": typeof service_giftcard_giftCardQueries;
  "service/giftcard/tangoClient": typeof service_giftcard_tangoClient;
  "service/giftcard/tangoTypes": typeof service_giftcard_tangoTypes;
  "service/player/playerManager": typeof service_player_playerManager;
  "service/points/portalLeaderboardMerge": typeof service_points_portalLeaderboardMerge;
  "service/points/portalLeaderboardQueries": typeof service_points_portalLeaderboardQueries;
  "service/points/portalWeeklyBoardBotFill": typeof service_points_portalWeeklyBoardBotFill;
  "service/points/portalWeeklyBoardBotPoints": typeof service_points_portalWeeklyBoardBotPoints;
  "service/points/portalWeeklyBoardBotReveal": typeof service_points_portalWeeklyBoardBotReveal;
  "service/points/portalWeeklyPointsService": typeof service_points_portalWeeklyPointsService;
  "service/points/portalWeeklyTotalPointsService": typeof service_points_portalWeeklyTotalPointsService;
  "service/reward/casualRewardRegistry": typeof service_reward_casualRewardRegistry;
  "service/season/casualSeasonService": typeof service_season_casualSeasonService;
  "service/seedPool/catalogSeedHttp": typeof service_seedPool_catalogSeedHttp;
  "service/seedPool/seedPoolAdmin": typeof service_seedPool_seedPoolAdmin;
  "service/seedPool/seedPoolDevQueries": typeof service_seedPool_seedPoolDevQueries;
  "service/seedPool/seedPoolQueries": typeof service_seedPool_seedPoolQueries;
  "service/seedPool/seedPoolStore": typeof service_seedPool_seedPoolStore;
  "service/seedPool/seedPoolValidators": typeof service_seedPool_seedPoolValidators;
  "service/shop/portalShopService": typeof service_shop_portalShopService;
  "service/task/casualTaskService": typeof service_task_casualTaskService;
  "service/tournament/casualTournamentService": typeof service_tournament_casualTournamentService;
  "service/tournament/join/campaignDailyPlayLimit": typeof service_tournament_join_campaignDailyPlayLimit;
  "service/tournament/join/campaignPlayHistory": typeof service_tournament_join_campaignPlayHistory;
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
  "service/tournament/join/portalTournamentJoinCore": typeof service_tournament_join_portalTournamentJoinCore;
  "service/tournament/list/casualInstanceService": typeof service_tournament_list_casualInstanceService;
  "service/tournament/list/casualTournamentQueries": typeof service_tournament_list_casualTournamentQueries;
  "service/tournament/list/portalInstanceService": typeof service_tournament_list_portalInstanceService;
  "service/tournament/replay/casualReplayPassService": typeof service_tournament_replay_casualReplayPassService;
  "service/tournament/replay/casualReplayTokens": typeof service_tournament_replay_casualReplayTokens;
  "service/tournament/replay/casualRunReplay": typeof service_tournament_replay_casualRunReplay;
  "service/tournament/settle/async/casualAsyncBotDueTime": typeof service_tournament_settle_async_casualAsyncBotDueTime;
  "service/tournament/settle/async/casualAsyncBotPersist": typeof service_tournament_settle_async_casualAsyncBotPersist;
  "service/tournament/settle/async/casualAsyncBotReveal": typeof service_tournament_settle_async_casualAsyncBotReveal;
  "service/tournament/settle/async/casualAsyncTableSummary": typeof service_tournament_settle_async_casualAsyncTableSummary;
  "service/tournament/settle/async/casualAsyncTypes": typeof service_tournament_settle_async_casualAsyncTypes;
  "service/tournament/settle/campaignBridgeNotify": typeof service_tournament_settle_campaignBridgeNotify;
  "service/tournament/settle/casualArenaForceEnd": typeof service_tournament_settle_casualArenaForceEnd;
  "service/tournament/settle/casualAsyncMatchFinalizeSchedule": typeof service_tournament_settle_casualAsyncMatchFinalizeSchedule;
  "service/tournament/settle/casualHistorySettleReconcile": typeof service_tournament_settle_casualHistorySettleReconcile;
  "service/tournament/settle/casualOpenRunReconcileAction": typeof service_tournament_settle_casualOpenRunReconcileAction;
  "service/tournament/settle/casualOpenRunReconcileQueries": typeof service_tournament_settle_casualOpenRunReconcileQueries;
  "service/tournament/settle/casualOpenRunSettleCheck": typeof service_tournament_settle_casualOpenRunSettleCheck;
  "service/tournament/settle/casualOpenRunSettleCheckAction": typeof service_tournament_settle_casualOpenRunSettleCheckAction;
  "service/tournament/settle/casualRunExpireCron": typeof service_tournament_settle_casualRunExpireCron;
  "service/tournament/settle/casualRunMatchFinalize": typeof service_tournament_settle_casualRunMatchFinalize;
  "service/tournament/settle/casualRunRewardsMutations": typeof service_tournament_settle_casualRunRewardsMutations;
  "service/tournament/settle/casualRunScoreEffects": typeof service_tournament_settle_casualRunScoreEffects;
  "service/tournament/settle/casualRunSettlementFill": typeof service_tournament_settle_casualRunSettlementFill;
  "service/tournament/settle/portalRunScoreEffects": typeof service_tournament_settle_portalRunScoreEffects;
  "service/tournament/shared/casualPlayerGameTypes": typeof service_tournament_shared_casualPlayerGameTypes;
  "service/tournament/shared/casualPlayerMatchStatus": typeof service_tournament_shared_casualPlayerMatchStatus;
  "service/tournament/shared/casualPlayerTournamentRankStats": typeof service_tournament_shared_casualPlayerTournamentRankStats;
  "service/tournament/shared/casualRankStatBuckets": typeof service_tournament_shared_casualRankStatBuckets;
  "service/tournament/shared/casualRunSession": typeof service_tournament_shared_casualRunSession;
  "service/tournament/shared/casualSessionOpenCore": typeof service_tournament_shared_casualSessionOpenCore;
  "service/tournament/shared/casualTournamentTypes": typeof service_tournament_shared_casualTournamentTypes;
  "service/tournament/shared/casualWatchReplaySnapshot": typeof service_tournament_shared_casualWatchReplaySnapshot;
  "service/tournament/shared/portalRunMatchShell": typeof service_tournament_shared_portalRunMatchShell;
  "service/tournament/shared/portalRunMatchShellAdmin": typeof service_tournament_shared_portalRunMatchShellAdmin;
  "service/tournament/submit/casualIngestPlatformBotFill": typeof service_tournament_submit_casualIngestPlatformBotFill;
  "service/tournament/submit/casualIngestTiming": typeof service_tournament_submit_casualIngestTiming;
  "service/tournament/submit/casualMatchBotPlanningContext": typeof service_tournament_submit_casualMatchBotPlanningContext;
  "service/tournament/submit/casualMatchSubmitContext": typeof service_tournament_submit_casualMatchSubmitContext;
  "service/tournament/submit/casualPlayerGameIngest": typeof service_tournament_submit_casualPlayerGameIngest;
  "service/tournament/submit/casualRunBridgeQueries": typeof service_tournament_submit_casualRunBridgeQueries;
  "service/tournament/submit/casualRunIngestCore": typeof service_tournament_submit_casualRunIngestCore;
  "service/tournament/submit/casualRunIngestHelpers": typeof service_tournament_submit_casualRunIngestHelpers;
  "service/tournament/submit/casualRunIngestMutations": typeof service_tournament_submit_casualRunIngestMutations;
  "service/weeklyLeague/casualWeeklyLeagueProfile": typeof service_weeklyLeague_casualWeeklyLeagueProfile;
  "service/weeklyLeague/casualWeeklyLeagueService": typeof service_weeklyLeague_casualWeeklyLeagueService;
  "service/weeklyLeague/casualWeeklyLeagueSettle": typeof service_weeklyLeague_casualWeeklyLeagueSettle;
  "service/weeklyLeague/casualWeeklyLeagueXp": typeof service_weeklyLeague_casualWeeklyLeagueXp;
  "service/weeklyLeague/portalWeeklyLeagueBotFill": typeof service_weeklyLeague_portalWeeklyLeagueBotFill;
  "service/weeklyLeague/portalWeeklyLeagueBotPoints": typeof service_weeklyLeague_portalWeeklyLeagueBotPoints;
  "service/weeklyLeague/portalWeeklyLeagueBotReveal": typeof service_weeklyLeague_portalWeeklyLeagueBotReveal;
  "service/weeklyLeague/portalWeeklyLeagueClose": typeof service_weeklyLeague_portalWeeklyLeagueClose;
  "service/weeklyLeague/portalWeeklyLeagueCohort": typeof service_weeklyLeague_portalWeeklyLeagueCohort;
  "service/weeklyLeague/portalWeeklyLeagueDev": typeof service_weeklyLeague_portalWeeklyLeagueDev;
  "service/weeklyLeague/portalWeeklyLeagueMemberSync": typeof service_weeklyLeague_portalWeeklyLeagueMemberSync;
  "service/weeklyLeague/portalWeeklyLeagueQueries": typeof service_weeklyLeague_portalWeeklyLeagueQueries;
  "service/weeklyLeague/portalWeeklyLeagueService": typeof service_weeklyLeague_portalWeeklyLeagueService;
  "shared/constants": typeof shared_constants;
  "shared/durationFallback": typeof shared_durationFallback;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
  "shared/rankSampling": typeof shared_rankSampling;
  "shared/rankStatBuckets": typeof shared_rankStatBuckets;
  "shared/scoreQuantiles": typeof shared_scoreQuantiles;
  "utils/casualTaskPeriod": typeof utils_casualTaskPeriod;
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
