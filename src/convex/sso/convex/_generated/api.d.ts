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
import type * as dao_userDao from "../dao/userDao.js";
import type * as dataTypes from "../dataTypes.js";
import type * as http from "../http.js";
import type * as service_AuthManager from "../service/AuthManager.js";
import type * as service_PartnerManager from "../service/PartnerManager.js";
import type * as service_provider_AuthenticatorFactory from "../service/provider/AuthenticatorFactory.js";
import type * as service_provider_TelegramAuthenticator from "../service/provider/TelegramAuthenticator.js";
import type * as service_provider_WebAuthenticator from "../service/provider/WebAuthenticator.js";
import type * as utils_hashUtils from "../utils/hashUtils.js";

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
  "dao/userDao": typeof dao_userDao;
  dataTypes: typeof dataTypes;
  http: typeof http;
  "service/AuthManager": typeof service_AuthManager;
  "service/PartnerManager": typeof service_PartnerManager;
  "service/provider/AuthenticatorFactory": typeof service_provider_AuthenticatorFactory;
  "service/provider/TelegramAuthenticator": typeof service_provider_TelegramAuthenticator;
  "service/provider/WebAuthenticator": typeof service_provider_WebAuthenticator;
  "utils/hashUtils": typeof utils_hashUtils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
