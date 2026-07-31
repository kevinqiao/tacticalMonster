/**
 * Mock / idle rewarded ads driven by Convex `PORTAL_REWARDED_AD_MODE`
 * plus optional URL / Vite overrides.
 *
 * - idle → instant success, no UI
 * - mock → DEV MOCK overlay
 * - crazygames / other → mock only via `?adReplay=mock|instant`
 */

import {
  getPortalRewardedAdClientMode,
  isPortalRewardedAdIdleMode,
  isPortalRewardedAdMockUiMode,
  isPortalRewardedAdSdkMode,
} from "./portalRewardedAdMode";

type UrlMockMode = "mock" | "instant";

function readUrlAdReplayParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("adReplay");
}

/** Only current URL — session leftovers must not override Convex mode. */
function readUrlMockMode(): UrlMockMode | null {
  const v = readUrlAdReplayParam();
  if (v === "instant" || v === "idle") return "instant";
  if (v === "mock") return "mock";
  return null;
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function envMockValue(): string {
  return String(import.meta.env.VITE_AD_REPLAY_MOCK ?? "").trim().toLowerCase();
}

/** Mock provider is eligible (idle noop or mock overlay). */
export function isDevMockRewardedAdEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const env = envMockValue();
  if (env === "0") return false;

  // SDK modes: only current-page URL debug override.
  if (isPortalRewardedAdSdkMode()) {
    return readUrlMockMode() != null;
  }

  if (isPortalRewardedAdIdleMode() || isPortalRewardedAdMockUiMode()) return true;

  // Before hydrate: local DEV / URL / Vite.
  if (getPortalRewardedAdClientMode() == null) {
    if (env === "1" || env === "mock" || env === "instant") return true;
    if (readUrlMockMode()) return true;
    if (import.meta.env.DEV || isLocalDevHost()) return true;
  }

  return false;
}

/**
 * Instant (空转) vs timed mock UI.
 * Convex remote mode wins over Vite/session; only current `?adReplay=` can override.
 */
export function isDevMockRewardedAdInstant(): boolean {
  if (typeof window === "undefined") return false;
  if (!isDevMockRewardedAdEnabled()) return false;

  const urlMode = readUrlMockMode();
  if (urlMode === "instant") return true;
  if (urlMode === "mock") return false;

  // Hydrated Convex mode — authoritative.
  if (isPortalRewardedAdIdleMode()) return true;
  if (isPortalRewardedAdMockUiMode()) return false;

  const env = envMockValue();
  if (env === "instant") return true;
  if (env === "mock") return false;
  if (env === "1") return getDevMockRewardedAdDurationMs() === 0;

  // Pre-hydrate local: show mock UI (not 空转) so mode=mock is testable before hydrate races.
  if (getPortalRewardedAdClientMode() == null && (import.meta.env.DEV || isLocalDevHost())) {
    return false;
  }
  return getDevMockRewardedAdDurationMs() === 0;
}

export function getDevMockRewardedAdDurationMs(): number {
  const raw = import.meta.env.VITE_AD_REPLAY_MOCK_DURATION_MS;
  if (raw === undefined || raw === "") return 3000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 3000;
  return n;
}
