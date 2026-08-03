/** Portal 看广告领金币（商店入口；与广告再战独立）。数字 ← portalEconomyGenerated。 */

import {
  PORTAL_AD_COIN_ENABLED,
  PORTAL_AD_COIN_REWARD_AMOUNT,
  PORTAL_AD_COIN_DAILY_CAP,
  PORTAL_AD_COIN_SESSION_TTL_MS,
  PORTAL_AD_COIN_CHANNELS,
} from "./portalEconomyGenerated";
import { resolvePortalRewardedAdMode } from "./portalAdReplayConfig";

export {
  PORTAL_AD_COIN_ENABLED,
  PORTAL_AD_COIN_REWARD_AMOUNT,
  PORTAL_AD_COIN_DAILY_CAP,
  PORTAL_AD_COIN_SESSION_TTL_MS,
  PORTAL_AD_COIN_CHANNELS,
};

export type PortalAdCoinChannel = (typeof PORTAL_AD_COIN_CHANNELS)[number];

export function isPortalAdCoinChannel(channel: string): channel is PortalAdCoinChannel {
  return (PORTAL_AD_COIN_CHANNELS as readonly string[]).includes(channel);
}

/**
 * Ad-coin mock follows the same rollout switch as ad-replay, unless
 * `PORTAL_AD_COIN_MOCK` explicitly overrides.
 */
export function isPortalAdCoinMockEnabled(): boolean {
  const v = (process.env.PORTAL_AD_COIN_MOCK ?? "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  const m = resolvePortalRewardedAdMode();
  return m === "idle" || m === "mock";
}
