/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as custom_session from "../custom/session.js";
import type * as dao_authChannelDao from "../dao/authChannelDao.js";
import type * as dao_authIdentityDao from "../dao/authIdentityDao.js";
import type * as dao_authIdentityHelpers from "../dao/authIdentityHelpers.js";
import type * as dao_partnerStaffDao from "../dao/partnerStaffDao.js";
import type * as dao_platformStaffDao from "../dao/platformStaffDao.js";
import type * as dao_storeStaffSignInDao from "../dao/storeStaffSignInDao.js";
import type * as dao_userDao from "../dao/userDao.js";
import type * as dataTypes from "../dataTypes.js";
import type * as http from "../http.js";
import type * as service_auth_authChannelCatalog from "../service/auth/authChannelCatalog.js";
import type * as service_auth_authenticateWithChannel from "../service/auth/authenticateWithChannel.js";
import type * as service_auth_partnerAuth from "../service/auth/partnerAuth.js";
import type * as service_auth_partnerChannelPolicy from "../service/auth/partnerChannelPolicy.js";
import type * as service_auth_platformAuth from "../service/auth/platformAuth.js";
import type * as service_auth_platformClientUser from "../service/auth/platformClientUser.js";
import type * as service_auth_platformJwt from "../service/auth/platformJwt.js";
import type * as service_auth_platformJwtConstants from "../service/auth/platformJwtConstants.js";
import type * as service_auth_platformJwtVerify from "../service/auth/platformJwtVerify.js";
import type * as service_auth_platformUid from "../service/auth/platformUid.js";
import type * as service_auth_webConsoleAuth from "../service/auth/webConsoleAuth.js";
import type * as service_auth_webPassword from "../service/auth/webPassword.js";
import type * as service_AuthManager from "../service/AuthManager.js";
import type * as service_bridge_merchantCampaignResolve from "../service/bridge/merchantCampaignResolve.js";
import type * as service_bridge_merchantCampaignStaffBridge from "../service/bridge/merchantCampaignStaffBridge.js";
import type * as service_bridge_portalAdReplayCapPush from "../service/bridge/portalAdReplayCapPush.js";
import type * as service_bridge_portalPartnerVoucherSkuBridge from "../service/bridge/portalPartnerVoucherSkuBridge.js";
import type * as service_bridge_ssoBridgeSecret from "../service/bridge/ssoBridgeSecret.js";
import type * as service_clerk_completeClerkSession from "../service/clerk/completeClerkSession.js";
import type * as service_embed_completeEmbedSession from "../service/embed/completeEmbedSession.js";
import type * as service_embed_embedAuthConstants from "../service/embed/embedAuthConstants.js";
import type * as service_embed_embedAuthOrchestrator from "../service/embed/embedAuthOrchestrator.js";
import type * as service_embed_embedAuthRegistry from "../service/embed/embedAuthRegistry.js";
import type * as service_embed_embedAuthTypes from "../service/embed/embedAuthTypes.js";
import type * as service_embed_partnerEmbedConfig from "../service/embed/partnerEmbedConfig.js";
import type * as service_embed_providers_CrazyGamesEmbedAuthProvider from "../service/embed/providers/CrazyGamesEmbedAuthProvider.js";
import type * as service_embed_providers_JwtLocalEmbedAuthProvider from "../service/embed/providers/JwtLocalEmbedAuthProvider.js";
import type * as service_partner_ensureStaffIdentity from "../service/partner/ensureStaffIdentity.js";
import type * as service_partner_partnerAdmin from "../service/partner/partnerAdmin.js";
import type * as service_partner_partnerAdReplayConfig from "../service/partner/partnerAdReplayConfig.js";
import type * as service_partner_partnerAdReplayConfigInternal from "../service/partner/partnerAdReplayConfigInternal.js";
import type * as service_partner_partnerCapabilities from "../service/partner/partnerCapabilities.js";
import type * as service_partner_partnerEmbedBootstrap from "../service/partner/partnerEmbedBootstrap.js";
import type * as service_partner_partnerPartnerShopSkuAdmin from "../service/partner/partnerPartnerShopSkuAdmin.js";
import type * as service_partner_partnerPartnerVoucherAdmin from "../service/partner/partnerPartnerVoucherAdmin.js";
import type * as service_partner_partnerStaff from "../service/partner/partnerStaff.js";
import type * as service_partner_platformAdmin from "../service/partner/platformAdmin.js";
import type * as service_partner_platformAdminAccount from "../service/partner/platformAdminAccount.js";
import type * as service_partner_platformAdminAuth from "../service/partner/platformAdminAuth.js";
import type * as service_partner_platformAdminBootstrap from "../service/partner/platformAdminBootstrap.js";
import type * as service_partner_platformAdminBrandSync from "../service/partner/platformAdminBrandSync.js";
import type * as service_partner_platformOperator from "../service/partner/platformOperator.js";
import type * as service_partner_platformStaff from "../service/partner/platformStaff.js";
import type * as service_partner_portalPartnerConfig from "../service/partner/portalPartnerConfig.js";
import type * as service_partner_staffAccountActions from "../service/partner/staffAccountActions.js";
import type * as service_partner_storeAdmin from "../service/partner/storeAdmin.js";
import type * as service_partner_storeStaff from "../service/partner/storeStaff.js";
import type * as service_partner_storeStaffIdentity from "../service/partner/storeStaffIdentity.js";
import type * as service_PartnerManager from "../service/PartnerManager.js";
import type * as service_provider_AuthenticatorFactory from "../service/provider/AuthenticatorFactory.js";
import type * as service_provider_ClerkAuthenticator from "../service/provider/ClerkAuthenticator.js";
import type * as service_provider_EmbedAuthenticator from "../service/provider/EmbedAuthenticator.js";
import type * as service_provider_TelegramAuthenticator from "../service/provider/TelegramAuthenticator.js";
import type * as service_provider_WebAuthenticator from "../service/provider/WebAuthenticator.js";
import type * as utils_hashUtils from "../utils/hashUtils.js";
import type * as utils_webIdentity from "../utils/webIdentity.js";

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
  "dao/authChannelDao": typeof dao_authChannelDao;
  "dao/authIdentityDao": typeof dao_authIdentityDao;
  "dao/authIdentityHelpers": typeof dao_authIdentityHelpers;
  "dao/partnerStaffDao": typeof dao_partnerStaffDao;
  "dao/platformStaffDao": typeof dao_platformStaffDao;
  "dao/storeStaffSignInDao": typeof dao_storeStaffSignInDao;
  "dao/userDao": typeof dao_userDao;
  dataTypes: typeof dataTypes;
  http: typeof http;
  "service/auth/authChannelCatalog": typeof service_auth_authChannelCatalog;
  "service/auth/authenticateWithChannel": typeof service_auth_authenticateWithChannel;
  "service/auth/partnerAuth": typeof service_auth_partnerAuth;
  "service/auth/partnerChannelPolicy": typeof service_auth_partnerChannelPolicy;
  "service/auth/platformAuth": typeof service_auth_platformAuth;
  "service/auth/platformClientUser": typeof service_auth_platformClientUser;
  "service/auth/platformJwt": typeof service_auth_platformJwt;
  "service/auth/platformJwtConstants": typeof service_auth_platformJwtConstants;
  "service/auth/platformJwtVerify": typeof service_auth_platformJwtVerify;
  "service/auth/platformUid": typeof service_auth_platformUid;
  "service/auth/webConsoleAuth": typeof service_auth_webConsoleAuth;
  "service/auth/webPassword": typeof service_auth_webPassword;
  "service/AuthManager": typeof service_AuthManager;
  "service/bridge/merchantCampaignResolve": typeof service_bridge_merchantCampaignResolve;
  "service/bridge/merchantCampaignStaffBridge": typeof service_bridge_merchantCampaignStaffBridge;
  "service/bridge/portalAdReplayCapPush": typeof service_bridge_portalAdReplayCapPush;
  "service/bridge/portalPartnerVoucherSkuBridge": typeof service_bridge_portalPartnerVoucherSkuBridge;
  "service/bridge/ssoBridgeSecret": typeof service_bridge_ssoBridgeSecret;
  "service/clerk/completeClerkSession": typeof service_clerk_completeClerkSession;
  "service/embed/completeEmbedSession": typeof service_embed_completeEmbedSession;
  "service/embed/embedAuthConstants": typeof service_embed_embedAuthConstants;
  "service/embed/embedAuthOrchestrator": typeof service_embed_embedAuthOrchestrator;
  "service/embed/embedAuthRegistry": typeof service_embed_embedAuthRegistry;
  "service/embed/embedAuthTypes": typeof service_embed_embedAuthTypes;
  "service/embed/partnerEmbedConfig": typeof service_embed_partnerEmbedConfig;
  "service/embed/providers/CrazyGamesEmbedAuthProvider": typeof service_embed_providers_CrazyGamesEmbedAuthProvider;
  "service/embed/providers/JwtLocalEmbedAuthProvider": typeof service_embed_providers_JwtLocalEmbedAuthProvider;
  "service/partner/ensureStaffIdentity": typeof service_partner_ensureStaffIdentity;
  "service/partner/partnerAdmin": typeof service_partner_partnerAdmin;
  "service/partner/partnerAdReplayConfig": typeof service_partner_partnerAdReplayConfig;
  "service/partner/partnerAdReplayConfigInternal": typeof service_partner_partnerAdReplayConfigInternal;
  "service/partner/partnerCapabilities": typeof service_partner_partnerCapabilities;
  "service/partner/partnerEmbedBootstrap": typeof service_partner_partnerEmbedBootstrap;
  "service/partner/partnerPartnerShopSkuAdmin": typeof service_partner_partnerPartnerShopSkuAdmin;
  "service/partner/partnerPartnerVoucherAdmin": typeof service_partner_partnerPartnerVoucherAdmin;
  "service/partner/partnerStaff": typeof service_partner_partnerStaff;
  "service/partner/platformAdmin": typeof service_partner_platformAdmin;
  "service/partner/platformAdminAccount": typeof service_partner_platformAdminAccount;
  "service/partner/platformAdminAuth": typeof service_partner_platformAdminAuth;
  "service/partner/platformAdminBootstrap": typeof service_partner_platformAdminBootstrap;
  "service/partner/platformAdminBrandSync": typeof service_partner_platformAdminBrandSync;
  "service/partner/platformOperator": typeof service_partner_platformOperator;
  "service/partner/platformStaff": typeof service_partner_platformStaff;
  "service/partner/portalPartnerConfig": typeof service_partner_portalPartnerConfig;
  "service/partner/staffAccountActions": typeof service_partner_staffAccountActions;
  "service/partner/storeAdmin": typeof service_partner_storeAdmin;
  "service/partner/storeStaff": typeof service_partner_storeStaff;
  "service/partner/storeStaffIdentity": typeof service_partner_storeStaffIdentity;
  "service/PartnerManager": typeof service_PartnerManager;
  "service/provider/AuthenticatorFactory": typeof service_provider_AuthenticatorFactory;
  "service/provider/ClerkAuthenticator": typeof service_provider_ClerkAuthenticator;
  "service/provider/EmbedAuthenticator": typeof service_provider_EmbedAuthenticator;
  "service/provider/TelegramAuthenticator": typeof service_provider_TelegramAuthenticator;
  "service/provider/WebAuthenticator": typeof service_provider_WebAuthenticator;
  "utils/hashUtils": typeof utils_hashUtils;
  "utils/webIdentity": typeof utils_webIdentity;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
