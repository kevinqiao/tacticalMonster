/**
 * Remote Portal rewarded-ad mode from Convex `PORTAL_REWARDED_AD_MODE`.
 * idle | mock | crazygames | other — flip env, no rebuild (dev & prod).
 */

export type PortalRewardedAdClientMode =
  | "idle"
  | "mock"
  | "crazygames"
  | "other"
  | null;

const MODES = new Set(["idle", "mock", "crazygames", "other"]);

let remoteMode: PortalRewardedAdClientMode = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

export function subscribePortalRewardedAdMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPortalRewardedAdClientMode(): PortalRewardedAdClientMode {
  return remoteMode;
}

export function isPortalRewardedAdIdleMode(): boolean {
  return remoteMode === "idle";
}

export function isPortalRewardedAdMockUiMode(): boolean {
  return remoteMode === "mock";
}

/** Real SDK modes (not idle/mock). */
export function isPortalRewardedAdSdkMode(): boolean {
  return remoteMode === "crazygames" || remoteMode === "other";
}

/** @deprecated use isPortalRewardedAdSdkMode / mode === "crazygames" */
export function isPortalRewardedAdLiveMode(): boolean {
  return isPortalRewardedAdSdkMode();
}

export function setPortalRewardedAdClientMode(
  mode: PortalRewardedAdClientMode
): void {
  if (remoteMode === mode) return;
  remoteMode = mode;
  notify();
}

function clearSessionMockOverride(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("portal.adReplay.mock");
    sessionStorage.removeItem("portal.adReplay.mockMode");
  } catch {
    // ignore
  }
}

function parseMode(row: {
  mode?: string;
  idle?: boolean;
} | null | undefined): PortalRewardedAdClientMode {
  if (!row) return null;
  // Legacy query payloads that only set idle:true
  if (row.mode == null && row.idle === true) return "idle";
  if (typeof row.mode === "string" && MODES.has(row.mode)) {
    return row.mode as Exclude<PortalRewardedAdClientMode, null>;
  }
  // Legacy "live"
  if (row.mode === "live") return "crazygames";
  return null;
}

export async function hydratePortalRewardedAdMode(
  fetchMode: () => Promise<{ mode?: string; idle?: boolean } | null | undefined>
): Promise<PortalRewardedAdClientMode> {
  try {
    const row = await fetchMode();
    const mode = parseMode(row);
    // Drop URL/session leftovers so Convex mode wins (e.g. mock after prior instant).
    if (mode === "crazygames" || mode === "other" || mode === "mock" || mode === "idle") {
      clearSessionMockOverride();
    }
    setPortalRewardedAdClientMode(mode);
    if (mode) {
      console.info("[Portal] rewardedAdMode", mode);
    } else {
      console.warn("[Portal] rewardedAdMode: unexpected response", row);
    }
    return mode;
  } catch (e) {
    console.warn("[Portal] rewardedAdMode hydrate failed", e);
    return remoteMode;
  }
}
