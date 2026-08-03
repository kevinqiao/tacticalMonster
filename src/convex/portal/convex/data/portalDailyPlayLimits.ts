/**
 * Portal 每日免费场次上限（单人挑战 / 多人竞技）。
 * Partner may override these through portal_partner_play_entry_settings.
 * Bot virtual tracks intentionally keep using the defaults.
 * Defaults ← portalEconomyGenerated（SSOT: portal-economy.json）。
 */

import {
  PORTAL_DAILY_PLAY_LIMITS,
  PORTAL_FREE_PLAY_DAILY_CAP_MAX,
} from "./portalEconomyGenerated";

export type PortalDailyPlayLimits = {
  solo: number;
  multi: number;
};

export type PortalDailyPlayMode = "solo" | "multi";

export { PORTAL_DAILY_PLAY_LIMITS, PORTAL_FREE_PLAY_DAILY_CAP_MAX };

export function getPortalDailyPlayLimits(): PortalDailyPlayLimits {
  return {
    solo: PORTAL_DAILY_PLAY_LIMITS.solo,
    multi: PORTAL_DAILY_PLAY_LIMITS.multi,
  };
}

/** Zero means no free plays; invalid input falls back to the mode default. */
export function clampFreePlayDailyCap(
  value: unknown,
  mode: PortalDailyPlayMode
): number {
  const fallback = PORTAL_DAILY_PLAY_LIMITS[mode];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const result = Math.floor(value);
  return result >= 0 && result <= PORTAL_FREE_PLAY_DAILY_CAP_MAX
    ? result
    : fallback;
}
