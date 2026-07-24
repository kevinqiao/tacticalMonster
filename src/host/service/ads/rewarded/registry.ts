import { isDevMockRewardedAdEnabled } from "./devMockRewardedAdConfig";
import { crazyGamesRewardedProvider } from "./providers/crazyGamesRewardedProvider";
import { devMockRewardedProvider } from "./providers/devMockRewardedProvider";
import type { RewardedAdProvider, RewardedAdChannel } from "./types";

const PROVIDERS: RewardedAdProvider[] = [
  crazyGamesRewardedProvider,
  devMockRewardedProvider,
].sort((a, b) => a.priority - b.priority);

export function listRewardedAdProviders(): RewardedAdProvider[] {
  return [...PROVIDERS];
}

/**
 * Prefer explicit mock (`VITE_AD_REPLAY_MOCK=1` / `?adReplay=mock`) over CrazyGames SDK.
 * Otherwise CG hosts always pick the SDK first, and a failed CG auction never reaches mock.
 */
export function resolveRewardedAdProvider(): RewardedAdProvider | null {
  if (isDevMockRewardedAdEnabled() && devMockRewardedProvider.isSupported()) {
    return devMockRewardedProvider;
  }
  return PROVIDERS.find((p) => p.isSupported()) ?? null;
}

export function resolveRewardedAdChannel(): RewardedAdChannel | null {
  return resolveRewardedAdProvider()?.channel ?? null;
}

export function resetRewardedAdProvidersForTests(): void {
  // reserved for future dynamic registration
}
