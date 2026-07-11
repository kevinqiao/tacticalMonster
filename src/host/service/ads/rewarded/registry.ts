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

export function resolveRewardedAdProvider(): RewardedAdProvider | null {
  return PROVIDERS.find((p) => p.isSupported()) ?? null;
}

export function resolveRewardedAdChannel(): RewardedAdChannel | null {
  return resolveRewardedAdProvider()?.channel ?? null;
}

export function resetRewardedAdProvidersForTests(): void {
  // reserved for future dynamic registration
}
