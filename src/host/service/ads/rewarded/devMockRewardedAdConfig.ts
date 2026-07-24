/**
 * Mock rewarded ad: local Vite dev, `?adReplay=mock`, or `VITE_AD_REPLAY_MOCK=1`.
 * When enabled, `resolveRewardedAdProvider` prefers this over CrazyGames SDK
 * (CG auction errors like "Something is wrong" would otherwise block mock).
 */

const SESSION_KEY = "portal.adReplay.mock";

function readUrlMockFlag(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("adReplay") === "mock";
}

function persistMockFlagFromUrl(): void {
  if (typeof window === "undefined" || !readUrlMockFlag()) return;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // ignore storage policy errors
  }
}

function readPersistedMockFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function isDevMockRewardedAdEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_AD_REPLAY_MOCK === "0") return false;
  if (import.meta.env.VITE_AD_REPLAY_MOCK === "1") return true;
  if (readUrlMockFlag()) {
    persistMockFlagFromUrl();
    return true;
  }
  if (readPersistedMockFlag()) return true;
  if (import.meta.env.DEV || isLocalDevHost()) return true;
  return false;
}

export function getDevMockRewardedAdDurationMs(): number {
  const raw = import.meta.env.VITE_AD_REPLAY_MOCK_DURATION_MS;
  const n = raw ? Number(raw) : 3000;
  return Number.isFinite(n) && n > 0 ? n : 3000;
}
