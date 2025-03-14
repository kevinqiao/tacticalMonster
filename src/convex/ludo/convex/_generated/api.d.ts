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
import type * as dao_botDao from "../dao/botDao.js";
import type * as dao_gameDao from "../dao/gameDao.js";
import type * as dao_gameEventDao from "../dao/gameEventDao.js";
import type * as dao_gamePlayerDao from "../dao/gamePlayerDao.js";
import type * as http from "../http.js";
import type * as service_aiAgent from "../service/aiAgent.js";
import type * as service_auth from "../service/auth.js";
import type * as service_gameData from "../service/gameData.js";
import type * as service_gameManager from "../service/gameManager.js";
import type * as service_gameProxy from "../service/gameProxy.js";
import type * as service_localProxy from "../service/localProxy.js";
import type * as service_TileEventHandler from "../service/TileEventHandler.js";
import type * as service_tokenRoutes from "../service/tokenRoutes.js";

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
  "dao/botDao": typeof dao_botDao;
  "dao/gameDao": typeof dao_gameDao;
  "dao/gameEventDao": typeof dao_gameEventDao;
  "dao/gamePlayerDao": typeof dao_gamePlayerDao;
  http: typeof http;
  "service/aiAgent": typeof service_aiAgent;
  "service/auth": typeof service_auth;
  "service/gameData": typeof service_gameData;
  "service/gameManager": typeof service_gameManager;
  "service/gameProxy": typeof service_gameProxy;
  "service/localProxy": typeof service_localProxy;
  "service/TileEventHandler": typeof service_TileEventHandler;
  "service/tokenRoutes": typeof service_tokenRoutes;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
