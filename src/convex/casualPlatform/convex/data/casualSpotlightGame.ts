import { weeklyPeriodKey } from "../utils/casualTaskPeriod.js";

/** 主题游戏周轮换列表（多游戏平台 Pass · 板 B） */
export const PLATFORM_SPOTLIGHT_GAMES = ["solitaire", "block_blast"] as const;

export type PlatformSpotlightGameId = (typeof PLATFORM_SPOTLIGHT_GAMES)[number];

/** 按运营周 `periodKey` 稳定轮换 spotlight `gameId` */
export function weeklySpotlightPlatformGameId(nowMs: number): PlatformSpotlightGameId {
  const weekKey = weeklyPeriodKey(nowMs);
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PLATFORM_SPOTLIGHT_GAMES.length;
  return PLATFORM_SPOTLIGHT_GAMES[idx]!;
}
