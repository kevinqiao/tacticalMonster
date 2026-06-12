import { weeklyPeriodKey } from "../utils/casualTaskPeriod.js";
import {
  CASUAL_GAME_REGISTRY,
  listSpotlightEligibleGameTypes,
  type RegisteredCasualGameType,
} from "./casualGameRegistry";

/** 主题游戏周轮换列表（来自游戏注册表） */
export const PLATFORM_SPOTLIGHT_GAMES = listSpotlightEligibleGameTypes();

export type PlatformSpotlightGameType = RegisteredCasualGameType;

/** 按运营周 `periodKey` 稳定轮换 spotlight 玩法类型 */
export function weeklySpotlightPlatformGameType(nowMs: number): PlatformSpotlightGameType {
  const games = PLATFORM_SPOTLIGHT_GAMES;
  if (games.length === 0) {
    return Object.keys(CASUAL_GAME_REGISTRY)[0] as PlatformSpotlightGameType;
  }
  const weekKey = weeklyPeriodKey(nowMs);
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % games.length;
  return games[idx]!;
}
