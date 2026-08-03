/**
 * Portal 礼品卡定价基准（赚取型金币，非 IAP）。
 * 数字来自 portalEconomyGenerated（SSOT: scripts/portal/economy/portal-economy.json）。
 */

import {
  PORTAL_COINS_PER_USD,
  PORTAL_REDEMPTION_REGION_LOCK_MS,
  PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS,
  PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS,
  PORTAL_REDEMPTION_REGIONS,
} from "./portalEconomyGenerated";

export {
  PORTAL_COINS_PER_USD,
  PORTAL_REDEMPTION_REGION_LOCK_MS,
  PORTAL_GIFTCARD_DEFAULT_MIN_ACCOUNT_AGE_DAYS,
  PORTAL_GIFTCARD_REWARD_LINK_CACHE_MS,
  PORTAL_REDEMPTION_REGIONS,
};

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
