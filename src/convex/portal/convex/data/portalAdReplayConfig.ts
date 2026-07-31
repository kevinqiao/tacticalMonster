/** Portal 广告再战：局末看激励视频直接重开本局（无再战令）。Defaults ← portalEconomyGenerated. */

import {
  PORTAL_AD_REPLAY_ENABLED,
  PORTAL_AD_REPLAY_DAILY_CAP_UNLIMITED,
  PORTAL_AD_REPLAY_DAILY_CAP,
  PORTAL_AD_REPLAY_SESSION_TTL_MS,
  PORTAL_AD_REPLAY_CHANNELS,
} from "./portalEconomyGenerated";

export {
  PORTAL_AD_REPLAY_ENABLED,
  PORTAL_AD_REPLAY_DAILY_CAP_UNLIMITED,
  PORTAL_AD_REPLAY_DAILY_CAP,
  PORTAL_AD_REPLAY_SESSION_TTL_MS,
  PORTAL_AD_REPLAY_CHANNELS,
};

export function isUnlimitedAdReplayDailyCap(cap: number): boolean {
  return cap >= PORTAL_AD_REPLAY_DAILY_CAP_UNLIMITED;
}

export type PortalAdReplayChannel = (typeof PORTAL_AD_REPLAY_CHANNELS)[number];

export function isPortalAdReplayTemplate(templateId: string): boolean {
  return templateId.startsWith("portal_");
}

export function isPortalAdReplayChannel(channel: string): channel is PortalAdReplayChannel {
  return (PORTAL_AD_REPLAY_CHANNELS as readonly string[]).includes(channel);
}

/**
 * Rewarded-ad rollout mode (Portal Convex env) — same switch for dev & prod.
 *
 * | mode          | client                         | allowed channel(s)   |
 * |---------------|--------------------------------|----------------------|
 * | `idle`        | instant success, no UI         | `dev`                |
 * | `mock`        | DEV MOCK overlay + timer       | `dev`                |
 * | `crazygames`  | CrazyGames SDK                 | `crazygames`         |
 * | `other`       | partner / poki / future SDKs   | `partner`, `poki`    |
 *
 * Set: `npx convex env set PORTAL_REWARDED_AD_MODE idle|mock|crazygames|other [--prod]`
 * Legacy: `live`/`sdk` → crazygames; `instant` → idle; `PORTAL_AD_REPLAY_MOCK=1` → idle, `=0` → crazygames
 * Default: dev/preview → idle; prod → crazygames
 */
export type PortalRewardedAdMode = "idle" | "mock" | "crazygames" | "other";

export function resolvePortalRewardedAdMode(): PortalRewardedAdMode {
  const mode = (process.env.PORTAL_REWARDED_AD_MODE ?? "").trim().toLowerCase();
  if (mode === "idle" || mode === "instant") return "idle";
  if (mode === "mock") return "mock";
  if (
    mode === "crazygames" ||
    mode === "cg" ||
    mode === "live" ||
    mode === "real" ||
    mode === "sdk"
  ) {
    return "crazygames";
  }
  if (mode === "other" || mode === "poki" || mode === "partner") return "other";

  const legacy = (process.env.PORTAL_AD_REPLAY_MOCK ?? "").trim().toLowerCase();
  if (legacy === "1" || legacy === "true" || legacy === "yes") return "idle";
  if (legacy === "0" || legacy === "false" || legacy === "no") return "crazygames";

  const deployment = (process.env.CONVEX_DEPLOYMENT ?? "").trim();
  if (deployment.startsWith("dev:") || deployment.startsWith("preview:")) {
    return "idle";
  }
  return "crazygames";
}

/** True when `channel=dev` (idle / mock UI) is allowed. */
export function isPortalAdReplayMockEnabled(): boolean {
  const m = resolvePortalRewardedAdMode();
  return m === "idle" || m === "mock";
}

/** Whether a client ad channel is valid for the current Convex mode. */
export function portalRewardedAdModeAllowsChannel(channel: string): boolean {
  const m = resolvePortalRewardedAdMode();
  if (channel === "dev") return m === "idle" || m === "mock";
  if (channel === "crazygames") return m === "crazygames";
  if (channel === "poki" || channel === "partner") return m === "other";
  return false;
}
