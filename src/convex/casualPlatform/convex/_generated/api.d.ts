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
import type * as data_casualInstanceWindow from "../data/casualInstanceWindow.js";
import type * as data_casualMissionTemplates from "../data/casualMissionTemplates.js";
import type * as data_casualPassRewards from "../data/casualPassRewards.js";
import type * as data_casualSeasonChallengeRewards from "../data/casualSeasonChallengeRewards.js";
import type * as data_casualSeasonShelfCatalog from "../data/casualSeasonShelfCatalog.js";
import type * as data_casualShopCatalog from "../data/casualShopCatalog.js";
import type * as data_casualTournamentConfigs from "../data/casualTournamentConfigs.js";
import type * as data_casualTournamentRewardTypes from "../data/casualTournamentRewardTypes.js";
import type * as http from "../http.js";
import type * as service_activity_casualActivityService from "../service/activity/casualActivityService.js";
import type * as service_auth_casualAuth from "../service/auth/casualAuth.js";
import type * as service_auth_jwtAccessSecret from "../service/auth/jwtAccessSecret.js";
import type * as service_bridge_casualGameBridgeSecret from "../service/bridge/casualGameBridgeSecret.js";
import type * as service_casualTournamentService from "../service/casualTournamentService.js";
import type * as service_chest_casualFixedChestService from "../service/chest/casualFixedChestService.js";
import type * as service_player_playerManager from "../service/player/playerManager.js";
import type * as service_reward_casualRewardRegistry from "../service/reward/casualRewardRegistry.js";
import type * as service_reward_casualRewardTypes from "../service/reward/casualRewardTypes.js";
import type * as service_season_casualSeasonService from "../service/season/casualSeasonService.js";
import type * as service_season_casualSeasonShelfService from "../service/season/casualSeasonShelfService.js";
import type * as service_shop_casualShopService from "../service/shop/casualShopService.js";
import type * as service_task_casualTaskService from "../service/task/casualTaskService.js";
import type * as service_tournament_casualInstanceService from "../service/tournament/casualInstanceService.js";
import type * as service_tournament_casualMatchmaking from "../service/tournament/casualMatchmaking.js";
import type * as service_tournament_casualRunSettlementFill from "../service/tournament/casualRunSettlementFill.js";
import type * as service_tournament_casualTournamentActions from "../service/tournament/casualTournamentActions.js";
import type * as service_tournament_casualTournamentJoinCore from "../service/tournament/casualTournamentJoinCore.js";
import type * as service_tournament_casualTournamentService from "../service/tournament/casualTournamentService.js";
import type * as service_tournament_casualTournamentTypes from "../service/tournament/casualTournamentTypes.js";
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
  "data/casualActivityCatalog": typeof data_casualActivityCatalog;
  "data/casualInstanceWindow": typeof data_casualInstanceWindow;
  "data/casualMissionTemplates": typeof data_casualMissionTemplates;
  "data/casualPassRewards": typeof data_casualPassRewards;
  "data/casualSeasonChallengeRewards": typeof data_casualSeasonChallengeRewards;
  "data/casualSeasonShelfCatalog": typeof data_casualSeasonShelfCatalog;
  "data/casualShopCatalog": typeof data_casualShopCatalog;
  "data/casualTournamentConfigs": typeof data_casualTournamentConfigs;
  "data/casualTournamentRewardTypes": typeof data_casualTournamentRewardTypes;
  http: typeof http;
  "service/activity/casualActivityService": typeof service_activity_casualActivityService;
  "service/auth/casualAuth": typeof service_auth_casualAuth;
  "service/auth/jwtAccessSecret": typeof service_auth_jwtAccessSecret;
  "service/bridge/casualGameBridgeSecret": typeof service_bridge_casualGameBridgeSecret;
  "service/casualTournamentService": typeof service_casualTournamentService;
  "service/chest/casualFixedChestService": typeof service_chest_casualFixedChestService;
  "service/player/playerManager": typeof service_player_playerManager;
  "service/reward/casualRewardRegistry": typeof service_reward_casualRewardRegistry;
  "service/reward/casualRewardTypes": typeof service_reward_casualRewardTypes;
  "service/season/casualSeasonService": typeof service_season_casualSeasonService;
  "service/season/casualSeasonShelfService": typeof service_season_casualSeasonShelfService;
  "service/shop/casualShopService": typeof service_shop_casualShopService;
  "service/task/casualTaskService": typeof service_task_casualTaskService;
  "service/tournament/casualInstanceService": typeof service_tournament_casualInstanceService;
  "service/tournament/casualMatchmaking": typeof service_tournament_casualMatchmaking;
  "service/tournament/casualRunSettlementFill": typeof service_tournament_casualRunSettlementFill;
  "service/tournament/casualTournamentActions": typeof service_tournament_casualTournamentActions;
  "service/tournament/casualTournamentJoinCore": typeof service_tournament_casualTournamentJoinCore;
  "service/tournament/casualTournamentService": typeof service_tournament_casualTournamentService;
  "service/tournament/casualTournamentTypes": typeof service_tournament_casualTournamentTypes;
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
