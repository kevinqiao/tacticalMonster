/** Portal 看广告领金币（商店入口；与广告再战独立）。 */

export const PORTAL_AD_COIN_ENABLED = true;

/** 单次发放金币（服务端写死，客户端不可改） */
export const PORTAL_AD_COIN_REWARD_AMOUNT = 30;

/** 每日上限（Asia/Shanghai dayKey） */
export const PORTAL_AD_COIN_DAILY_CAP = 5;

/** begin → complete 会话有效期 */
export const PORTAL_AD_COIN_SESSION_TTL_MS = 120_000;

/**
 * 支持的广告渠道。不含 crazygames：CG 包走平台独家广告，不开放自营领币。
 */
export const PORTAL_AD_COIN_CHANNELS = ["partner", "poki", "dev"] as const;

export type PortalAdCoinChannel = (typeof PORTAL_AD_COIN_CHANNELS)[number];

export function isPortalAdCoinChannel(channel: string): channel is PortalAdCoinChannel {
  return (PORTAL_AD_COIN_CHANNELS as readonly string[]).includes(channel);
}

/** Convex env `PORTAL_AD_COIN_MOCK=1` 或复用 `PORTAL_AD_REPLAY_MOCK`；dev/preview 部署默认开 */
export function isPortalAdCoinMockEnabled(): boolean {
  const v = (process.env.PORTAL_AD_COIN_MOCK ?? process.env.PORTAL_AD_REPLAY_MOCK ?? "")
    .trim()
    .toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  const deployment = (process.env.CONVEX_DEPLOYMENT ?? "").trim();
  return deployment.startsWith("dev:") || deployment.startsWith("preview:");
}
