/** Portal 广告再战：局末看激励视频直接重开本局（无再战令）。 */

export const PORTAL_AD_REPLAY_ENABLED = true;

/** 每日广告再战上限（Asia/Shanghai dayKey） */
export const PORTAL_AD_REPLAY_DAILY_CAP = 5;

/** begin → complete 会话有效期 */
export const PORTAL_AD_REPLAY_SESSION_TTL_MS = 120_000;

/** 支持的广告渠道标识（客户端 Provider channel） */
export const PORTAL_AD_REPLAY_CHANNELS = [
  "crazygames",
  "poki",
  "partner",
  "dev",
] as const;

export type PortalAdReplayChannel = (typeof PORTAL_AD_REPLAY_CHANNELS)[number];

export function isPortalAdReplayTemplate(templateId: string): boolean {
  return templateId.startsWith("portal_");
}

export function isPortalAdReplayChannel(channel: string): channel is PortalAdReplayChannel {
  return (PORTAL_AD_REPLAY_CHANNELS as readonly string[]).includes(channel);
}

/** Convex env `PORTAL_AD_REPLAY_MOCK=1` 时允许 dev 渠道完成广告再战（本地/测试） */
export function isPortalAdReplayMockEnabled(): boolean {
  const v = (process.env.PORTAL_AD_REPLAY_MOCK ?? "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  const deployment = (process.env.CONVEX_DEPLOYMENT ?? "").trim();
  return deployment.startsWith("dev:") || deployment.startsWith("preview:");
}
