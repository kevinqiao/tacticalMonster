import { resolveRewardedAdProvider } from "./registry";
import type { RewardedAdChannel } from "./types";

/** Channels that can power the first-party shop「看广告领金币」entry. */
const AD_COIN_CHANNELS: ReadonlySet<RewardedAdChannel> = new Set([
  "partner",
  "poki",
  "dev",
  "crazygames",
]);

/**
 * 客户端是否可展示/触发看广告领金币。
 * 需存在可用激励 Provider（CG SDK / AppLixir / 本地 mock），且商店后台已开启。
 */
export function isPortalAdCoinClientSurfaceEnabled(): boolean {
  const provider = resolveRewardedAdProvider();
  if (!provider) return false;
  return AD_COIN_CHANNELS.has(provider.channel);
}

export function resolvePortalAdCoinChannel(): RewardedAdChannel | null {
  if (!isPortalAdCoinClientSurfaceEnabled()) return null;
  const channel = resolveRewardedAdProvider()?.channel ?? null;
  if (!channel || !AD_COIN_CHANNELS.has(channel)) return null;
  return channel;
}
