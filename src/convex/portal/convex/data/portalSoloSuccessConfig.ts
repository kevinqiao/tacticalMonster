/**
 * Solo challenge daily rewarded-success cap.
 * Defaults ← portalEconomyGenerated (portal-economy.json playDefaults.soloSuccessDaily).
 */

import {
  PORTAL_SOLO_SUCCESS_DAILY_CAP_MAX,
  PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS,
} from "./portalEconomyGenerated";

export type PortalSoloSuccessAfterCapMode = "zero_all";

export type PortalSoloSuccessDailyConfig = {
  enabled: boolean;
  dailyCap: number;
  afterCapMode: PortalSoloSuccessAfterCapMode;
  allowPlayAfterCap: boolean;
};

export {
  PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS,
  PORTAL_SOLO_SUCCESS_DAILY_CAP_MAX,
};

export function clampSoloSuccessDailyCap(value: unknown): number {
  const fallback = PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.dailyCap;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const result = Math.floor(value);
  return result >= 0 && result <= PORTAL_SOLO_SUCCESS_DAILY_CAP_MAX
    ? result
    : fallback;
}

export function resolveSoloSuccessDailyEnabled(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.enabled;
}

export function resolveSoloSuccessAfterCapMode(
  value: unknown
): PortalSoloSuccessAfterCapMode {
  if (value === "zero_all") return value;
  return PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.afterCapMode;
}

export function resolveSoloSuccessAllowPlayAfterCap(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return PORTAL_SOLO_SUCCESS_DAILY_DEFAULTS.allowPlayAfterCap;
}

export function soloSuccessConfigFromFields(fields: {
  soloSuccessDailyEnabled?: boolean;
  soloSuccessDailyCap?: number;
  soloSuccessAfterCapMode?: PortalSoloSuccessAfterCapMode | string;
  soloSuccessAllowPlayAfterCap?: boolean;
}): PortalSoloSuccessDailyConfig {
  return {
    enabled: resolveSoloSuccessDailyEnabled(fields.soloSuccessDailyEnabled),
    dailyCap: clampSoloSuccessDailyCap(fields.soloSuccessDailyCap),
    afterCapMode: resolveSoloSuccessAfterCapMode(fields.soloSuccessAfterCapMode),
    allowPlayAfterCap: resolveSoloSuccessAllowPlayAfterCap(
      fields.soloSuccessAllowPlayAfterCap
    ),
  };
}

/** True when today's rewarded successes already fill the daily cap. */
export function isSoloSuccessDailyCapped(
  usedToday: number,
  config: PortalSoloSuccessDailyConfig
): boolean {
  if (!config.enabled) return false;
  return Math.max(0, Math.floor(usedToday)) >= config.dailyCap;
}
