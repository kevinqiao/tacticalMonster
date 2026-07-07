/**
 * Portal 礼品卡定价基准（赚取型金币，非 IAP）。
 * 中度玩家约 5 周活跃可换 $5（~150 币/USD）。
 */

export const PORTAL_COINS_PER_USD = 150;

/** 地区锁定后多少天内不可更改 */
export const PORTAL_REDEMPTION_REGION_LOCK_MS = 30 * 24 * 60 * 60 * 1000;

/** 默认账号最短注册天数 */
export const PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS = 7;

/** Reward Link 在库内最长缓存（毫秒） */
export const PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS = 72 * 60 * 60 * 1000;

export const PORTAL_REDEMPTION_REGIONS = ["US", "CA", "GB", "EU"] as const;
export type PortalRedemptionRegion = (typeof PORTAL_REDEMPTION_REGIONS)[number];

export function giftCardPriceCoins(faceValueUsd: number, scarcity = 1.0): number {
  return Math.round(faceValueUsd * PORTAL_COINS_PER_USD * scarcity);
}

export function formatFaceValueDisplay(
  faceValueLocal: number,
  currency: string
): string {
  const sym =
    currency === "USD"
      ? "$"
      : currency === "CAD"
        ? "CA$"
        : currency === "GBP"
          ? "£"
          : currency === "EUR"
            ? "€"
            : "";
  return `${sym}${faceValueLocal}`;
}
