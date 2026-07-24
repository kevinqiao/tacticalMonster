import { isCrazyGamesDevFlag } from "../../platformAuth/embedSources/runtimeContext";
import { isCrazyGamesSdkUsable } from "../../platformAuth/embedSources/crazyGamesSdk";
import { resolveRewardedAdProvider } from "./registry";
import type { RewardedAdChannel } from "./types";

const AD_COIN_CHANNELS: ReadonlySet<RewardedAdChannel> = new Set([
  "partner",
  "poki",
  "dev",
]);

/** CrazyGames 包不展示自营「看广告领金币」 */
export function isCrazyGamesAdExclusiveSurface(): boolean {
  if (typeof window === "undefined") return false;
  return (
    isCrazyGamesSdkUsable() || isCrazyGamesDevFlag(window.location.search)
  );
}

/**
 * 客户端是否可展示/触发看广告领金币。
 * CG 隐藏；需存在 partner/poki/dev 激励 Provider（AppLixir 或本地 mock）。
 */
export function isPortalAdCoinClientSurfaceEnabled(): boolean {
  if (isCrazyGamesAdExclusiveSurface()) return false;
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
