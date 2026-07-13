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
import type * as data_campaignBoardBotConfig from "../data/campaignBoardBotConfig.js";
import type * as data_campaignMultiRankPoints from "../data/campaignMultiRankPoints.js";
import type * as http from "../http.js";
import type * as service_auth_jwtAccessSecret from "../service/auth/jwtAccessSecret.js";
import type * as service_bridge_merchantBridgeSecret from "../service/bridge/merchantBridgeSecret.js";
import type * as service_campaignBoard_campaignBoardBotFill from "../service/campaignBoard/campaignBoardBotFill.js";
import type * as service_campaignBoard_campaignBoardBotPoints from "../service/campaignBoard/campaignBoardBotPoints.js";
import type * as service_campaignBoard_campaignBoardBotReveal from "../service/campaignBoard/campaignBoardBotReveal.js";
import type * as service_campaignBoard_campaignBotPersonaDefaults from "../service/campaignBoard/campaignBotPersonaDefaults.js";
import type * as service_campaignBoard_campaignLeaderboardMerge from "../service/campaignBoard/campaignLeaderboardMerge.js";
import type * as service_merchant_campaignExperienceType from "../service/merchant/campaignExperienceType.js";
import type * as service_merchant_campaignJoinAuthorize from "../service/merchant/campaignJoinAuthorize.js";
import type * as service_merchant_campaignLeaderboardSettlement from "../service/merchant/campaignLeaderboardSettlement.js";
import type * as service_merchant_campaignPartnerSession from "../service/merchant/campaignPartnerSession.js";
import type * as service_merchant_campaignPosterUrls from "../service/merchant/campaignPosterUrls.js";
import type * as service_merchant_campaignRankRewardTiers from "../service/merchant/campaignRankRewardTiers.js";
import type * as service_merchant_campaignRewardModel from "../service/merchant/campaignRewardModel.js";
import type * as service_merchant_campaignRuleValidation from "../service/merchant/campaignRuleValidation.js";
import type * as service_merchant_campaignSettleHook from "../service/merchant/campaignSettleHook.js";
import type * as service_merchant_campaignTimeZone from "../service/merchant/campaignTimeZone.js";
import type * as service_merchant_displayCampaignValidation from "../service/merchant/displayCampaignValidation.js";
import type * as service_merchant_merchantCampaignDevBootstrap from "../service/merchant/merchantCampaignDevBootstrap.js";
import type * as service_merchant_merchantCampaigns from "../service/merchant/merchantCampaigns.js";
import type * as service_merchant_merchantCouponDefs from "../service/merchant/merchantCouponDefs.js";
import type * as service_merchant_merchantRedeem from "../service/merchant/merchantRedeem.js";
import type * as service_merchant_merchantStaff from "../service/merchant/merchantStaff.js";
import type * as service_merchant_merchantStaffAdmin from "../service/merchant/merchantStaffAdmin.js";
import type * as service_merchant_merchantThemeSync from "../service/merchant/merchantThemeSync.js";
import type * as service_merchant_merchantThemeSyncMutations from "../service/merchant/merchantThemeSyncMutations.js";
import type * as service_merchant_validators from "../service/merchant/validators.js";
import type * as shared_platformAuth_parsePlatformUid from "../shared/platformAuth/parsePlatformUid.js";
import type * as shared_platformAuth_platformJwtConstants from "../shared/platformAuth/platformJwtConstants.js";
import type * as shared_platformAuth_requireIdentity from "../shared/platformAuth/requireIdentity.js";
import type * as shared_pseudoUnit from "../shared/pseudoUnit.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "custom/session": typeof custom_session;
  "data/campaignBoardBotConfig": typeof data_campaignBoardBotConfig;
  "data/campaignMultiRankPoints": typeof data_campaignMultiRankPoints;
  http: typeof http;
  "service/auth/jwtAccessSecret": typeof service_auth_jwtAccessSecret;
  "service/bridge/merchantBridgeSecret": typeof service_bridge_merchantBridgeSecret;
  "service/campaignBoard/campaignBoardBotFill": typeof service_campaignBoard_campaignBoardBotFill;
  "service/campaignBoard/campaignBoardBotPoints": typeof service_campaignBoard_campaignBoardBotPoints;
  "service/campaignBoard/campaignBoardBotReveal": typeof service_campaignBoard_campaignBoardBotReveal;
  "service/campaignBoard/campaignBotPersonaDefaults": typeof service_campaignBoard_campaignBotPersonaDefaults;
  "service/campaignBoard/campaignLeaderboardMerge": typeof service_campaignBoard_campaignLeaderboardMerge;
  "service/merchant/campaignExperienceType": typeof service_merchant_campaignExperienceType;
  "service/merchant/campaignJoinAuthorize": typeof service_merchant_campaignJoinAuthorize;
  "service/merchant/campaignLeaderboardSettlement": typeof service_merchant_campaignLeaderboardSettlement;
  "service/merchant/campaignPartnerSession": typeof service_merchant_campaignPartnerSession;
  "service/merchant/campaignPosterUrls": typeof service_merchant_campaignPosterUrls;
  "service/merchant/campaignRankRewardTiers": typeof service_merchant_campaignRankRewardTiers;
  "service/merchant/campaignRewardModel": typeof service_merchant_campaignRewardModel;
  "service/merchant/campaignRuleValidation": typeof service_merchant_campaignRuleValidation;
  "service/merchant/campaignSettleHook": typeof service_merchant_campaignSettleHook;
  "service/merchant/campaignTimeZone": typeof service_merchant_campaignTimeZone;
  "service/merchant/displayCampaignValidation": typeof service_merchant_displayCampaignValidation;
  "service/merchant/merchantCampaignDevBootstrap": typeof service_merchant_merchantCampaignDevBootstrap;
  "service/merchant/merchantCampaigns": typeof service_merchant_merchantCampaigns;
  "service/merchant/merchantCouponDefs": typeof service_merchant_merchantCouponDefs;
  "service/merchant/merchantRedeem": typeof service_merchant_merchantRedeem;
  "service/merchant/merchantStaff": typeof service_merchant_merchantStaff;
  "service/merchant/merchantStaffAdmin": typeof service_merchant_merchantStaffAdmin;
  "service/merchant/merchantThemeSync": typeof service_merchant_merchantThemeSync;
  "service/merchant/merchantThemeSyncMutations": typeof service_merchant_merchantThemeSyncMutations;
  "service/merchant/validators": typeof service_merchant_validators;
  "shared/platformAuth/parsePlatformUid": typeof shared_platformAuth_parsePlatformUid;
  "shared/platformAuth/platformJwtConstants": typeof shared_platformAuth_platformJwtConstants;
  "shared/platformAuth/requireIdentity": typeof shared_platformAuth_requireIdentity;
  "shared/pseudoUnit": typeof shared_pseudoUnit;
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
