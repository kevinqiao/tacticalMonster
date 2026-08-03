import { isDevMockRewardedAdEnabled } from "./devMockRewardedAdConfig";
import { getPortalRewardedAdClientMode } from "./portalRewardedAdMode";
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
 * Resolve provider from Convex mode:
 * idle/mock → dev mock · crazygames → CG SDK · other → non-CG SDK (when registered).
 */
export function resolveRewardedAdProvider(): RewardedAdProvider | null {
  const mode = getPortalRewardedAdClientMode();

  if (mode === "idle" || mode === "mock") {
    if (isDevMockRewardedAdEnabled() && devMockRewardedProvider.isSupported()) {
      return devMockRewardedProvider;
    }
    return null;
  }

  if (mode === "crazygames") {
    if (crazyGamesRewardedProvider.isSupported()) return crazyGamesRewardedProvider;
    // URL debug override while mode is crazygames
    if (isDevMockRewardedAdEnabled() && devMockRewardedProvider.isSupported()) {
      return devMockRewardedProvider;
    }
    return null;
  }

  if (mode === "other") {
    const other = PROVIDERS.find(
      (p) =>
        p.isSupported() &&
        p.channel !== "crazygames" &&
        p.channel !== "dev"
    );
    if (other) return other;
    if (isDevMockRewardedAdEnabled() && devMockRewardedProvider.isSupported()) {
      return devMockRewardedProvider;
    }
    return null;
  }

  // Pre-hydrate: prefer mock when enabled (local DEV), else first supported.
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
