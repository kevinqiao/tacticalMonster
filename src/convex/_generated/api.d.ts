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
import type * as asset from "../asset.js";
import type * as auth_twilio from "../auth/twilio.js";
import type * as authchannel from "../authchannel.js";
import type * as botHook from "../botHook.js";
import type * as cuser from "../cuser.js";
import type * as custom_session from "../custom/session.js";
import type * as dao_tmCharacterDataDao from "../dao/tmCharacterDataDao.js";
import type * as dao_tmEventDao from "../dao/tmEventDao.js";
import type * as dao_tmGameCharacterDao from "../dao/tmGameCharacterDao.js";
import type * as dao_tmGameDao from "../dao/tmGameDao.js";
import type * as dao_tmGameRoundDao from "../dao/tmGameRoundDao.js";
import type * as dao_tmLevelDataDao from "../dao/tmLevelDataDao.js";
import type * as dao_tmMapDataDao from "../dao/tmMapDataDao.js";
import type * as dao_tmPlayerCharacterDao from "../dao/tmPlayerCharacterDao.js";
import type * as dao_tmPlayerDao from "../dao/tmPlayerDao.js";
import type * as dao_tmSkillDataDao from "../dao/tmSkillDataDao.js";
import type * as data_TournamentData from "../data/TournamentData.js";
import type * as localization from "../localization.js";
import type * as model_CharacterModels from "../model/CharacterModels.js";
import type * as model_Defender from "../model/Defender.js";
import type * as model_Tournament from "../model/Tournament.js";
import type * as rule_test from "../rule/test.js";
import type * as service_tmEventService from "../service/tmEventService.js";
import type * as service_tmGameManager from "../service/tmGameManager.js";
import type * as service_tmGameProxy from "../service/tmGameProxy.js";
import type * as user from "../user.js";
import type * as utils_gameUtils from "../utils/gameUtils.js";
import type * as utils_Utlis from "../utils/Utlis.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  asset: typeof asset;
  "auth/twilio": typeof auth_twilio;
  authchannel: typeof authchannel;
  botHook: typeof botHook;
  cuser: typeof cuser;
  "custom/session": typeof custom_session;
  "dao/tmCharacterDataDao": typeof dao_tmCharacterDataDao;
  "dao/tmEventDao": typeof dao_tmEventDao;
  "dao/tmGameCharacterDao": typeof dao_tmGameCharacterDao;
  "dao/tmGameDao": typeof dao_tmGameDao;
  "dao/tmGameRoundDao": typeof dao_tmGameRoundDao;
  "dao/tmLevelDataDao": typeof dao_tmLevelDataDao;
  "dao/tmMapDataDao": typeof dao_tmMapDataDao;
  "dao/tmPlayerCharacterDao": typeof dao_tmPlayerCharacterDao;
  "dao/tmPlayerDao": typeof dao_tmPlayerDao;
  "dao/tmSkillDataDao": typeof dao_tmSkillDataDao;
  "data/TournamentData": typeof data_TournamentData;
  localization: typeof localization;
  "model/CharacterModels": typeof model_CharacterModels;
  "model/Defender": typeof model_Defender;
  "model/Tournament": typeof model_Tournament;
  "rule/test": typeof rule_test;
  "service/tmEventService": typeof service_tmEventService;
  "service/tmGameManager": typeof service_tmGameManager;
  "service/tmGameProxy": typeof service_tmGameProxy;
  user: typeof user;
  "utils/gameUtils": typeof utils_gameUtils;
  "utils/Utlis": typeof utils_Utlis;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
