/** Portal ad entry: after free plays, before ticket entry. */

import {
  isPortalAdReplayChannel,
  PORTAL_AD_REPLAY_CHANNELS,
  type PortalAdReplayChannel,
} from "./portalAdReplayConfig";

export type PortalAdEntryMode = "solo" | "multi";

export type PortalAdEntryModeConfig = {
  enabled: boolean;
  dailyCap: number;
};

/** Missing partner overrides use these values. */
export const PORTAL_AD_ENTRY_DEFAULTS: Record<PortalAdEntryMode, PortalAdEntryModeConfig> = {
  solo: { enabled: true, dailyCap: 5 },
  multi: { enabled: true, dailyCap: 10 },
};

export const PORTAL_AD_ENTRY_DAILY_CAP_MAX = 100;
export const PORTAL_AD_ENTRY_SESSION_TTL_MS = 120_000;
export const PORTAL_AD_ENTRY_GRANT_TTL_MS = 120_000;

export const PORTAL_AD_ENTRY_CHANNELS = PORTAL_AD_REPLAY_CHANNELS;
export type PortalAdEntryChannel = PortalAdReplayChannel;

export function isPortalAdEntryChannel(channel: string): channel is PortalAdEntryChannel {
  return isPortalAdReplayChannel(channel);
}

export function clampAdEntryDailyCap(
  value: unknown,
  mode: PortalAdEntryMode
): number {
  const fallback = PORTAL_AD_ENTRY_DEFAULTS[mode].dailyCap;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const result = Math.floor(value);
  return result >= 0 && result <= PORTAL_AD_ENTRY_DAILY_CAP_MAX ? result : fallback;
}

export function resolveAdEntryEnabled(
  value: unknown,
  mode: PortalAdEntryMode
): boolean {
  if (typeof value === "boolean") return value;
  return PORTAL_AD_ENTRY_DEFAULTS[mode].enabled;
}
