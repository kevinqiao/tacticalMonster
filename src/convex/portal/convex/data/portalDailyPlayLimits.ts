/**
 * Portal 每日免费场次上限（单人挑战 / 多人竞技）。
 * Partner may override these through portal_partner_play_entry_settings.
 * Bot virtual tracks intentionally keep using the defaults.
 */
export type PortalDailyPlayLimits = {
  solo: number;
  multi: number;
};

export type PortalDailyPlayMode = "solo" | "multi";

/** 默认：单人每天 3 场，多人每天 10 场 */
export const PORTAL_DAILY_PLAY_LIMITS: PortalDailyPlayLimits = {
  solo: 3,
  multi: 10,
};

export const PORTAL_FREE_PLAY_DAILY_CAP_MAX = 100;

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
